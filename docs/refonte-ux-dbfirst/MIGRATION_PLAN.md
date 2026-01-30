# MIGRATION_PLAN.md — Plan d'exécution migrations DB-first Supabase

> **Date** : 2026-01-30
> **Sources** :
> - `docs/refonte-ux-dbfirst/DB_BLUEPRINT.md` (révision 2, 2026-01-29)
> - `docs/refonte-ux-dbfirst/PRODUCT_MODEL.md` (v15, 2026-01-29)
> - `docs/refonte-ux-dbfirst/ux.md`
>
> **Approche** : DB-first, migrations SQL uniquement (pas de dashboard Supabase)
> **Aucun SQL dans ce document** — plan conceptuel exécutable

---

## 0. En-tête & règles de travail

### Règles de travail

- **DB-first strict** : toutes modifications via `supabase/migrations/` uniquement
- **Aucun dashboard** : pas de modification manuelle via interface Supabase
- **Format migrations** : `YYYYMMDDHHMMSS_description.sql`
- **Atomicité** : 1 intention principale par fichier migration
- **Séquencement rigoureux** : ordre exact imposé par dépendances FK et RLS
- **Pas de SQL ici** : ce plan décrit conceptuellement le contenu attendu

### Hypothèses explicites

1. **Supabase local** : Développement via `pnpm supabase start` (Docker)
2. **Extension auth** : Supabase Auth (`auth.users`) déjà disponible (fournie par défaut)
3. **PostgreSQL 15+** : Support types modernes, RLS, partial indexes
4. **Timezone compte** : Stocké comme string IANA, défaut `Europe/Paris`
5. **Visitor hors DB** : Aucune table dédiée (local-only jusqu'au signup)
6. **Quotas hardcodés** : Pas de table `subscription_plans` (comme recommandé DB_BLUEPRINT.md §6)
7. **Storage Supabase** : Bucket séparé images personnelles avec policies owner-only (CRITIQUE)

---

## 1. Principes de séquencement

### Pourquoi cet ordre ?

#### 1.1 Dépendances FK

- **Enums/types avant tables** : Les types custom (`account_status`, `card_type`, etc.) doivent exister avant création des tables qui les utilisent
- **Ownership avant dépendants** : `accounts` avant `child_profiles`, `cards`, `categories`, `devices`
- **Structure avant exécution** : `timelines` → `slots` → `sessions` → `session_validations`
- **FK circulaires impossibles** : Ordre garantit qu'aucune FK ne référence une table non encore créée

#### 1.2 RLS en dernier (par itérations)

- **Tables d'abord** : Créer toutes les tables avec contraintes structurelles
- **RLS ensuite** : Appliquer policies une fois toutes tables existantes (pour éviter références RLS vers tables inexistantes)
- **Itérations** : RLS peut être déployé en plusieurs vagues (core ownership, puis banque publique, puis admin spécial)

#### 1.3 Storage policies AVANT tout upload

- **CRITIQUE** (DB_BLUEPRINT.md §5) : Policies Storage doivent être en place **avant** premier upload image personnelle en production
- **Raison** : Confidentialité Admin — un upload sans policy = risque exposition temporaire

#### 1.4 Triggers/quotas après tables concernées

- **Ordre logique** : Les fonctions triggers référencent les tables, donc créées après
- **Contraintes applicatives** : Triggers pour invariants "non exprimables" via contraintes SQL pures (ex: "min 2 étapes séquence")

#### 1.5 Enums/types au début si utilisés partout

- **account_status**, **card_type**, **slot_kind**, **session_state**, **child_profile_status** : Créés dès Phase 1 car utilisés dans plusieurs tables

---

## 2. Lots de migrations (phases)

### Phase 1 — Fondation (types/enums/extensions)

**Objectif** : Créer types de base utilisés partout

**Contenu** :
- Extension `pgcrypto` (génération UUID via `gen_random_uuid()`, fournie par défaut PostgreSQL 13+)
- Extension `pg_cron` (si quotas mensuels nécessitent cron) — **À trancher** selon implémentation
- Enum `account_status` : `free`, `subscriber`, `admin` (**pas** `visitor`, voir DB_BLUEPRINT.md L83)
- Enum `child_profile_status` : `active`, `locked`
- Enum `card_type` : `bank`, `personal`
- Enum `slot_kind` : `step`, `reward`
- Enum `session_state` : `active_preview`, `active_started`, `completed`

**Note UUID** : Utilisation de `pgcrypto` + `gen_random_uuid()` partout (standard PostgreSQL moderne, fourni par défaut)

**Pourquoi** :
- Ces types sont référencés dans les tables créées en Phase 2-6
- Créer enums en amont évite erreurs de dépendance

**Vérifications attendues** :
- `SELECT typname FROM pg_type WHERE typname IN ('account_status', 'card_type', 'slot_kind', 'session_state', 'child_profile_status');` retourne 5 lignes

---

### Phase 2 — Core ownership (comptes & ownership racine)

**Objectif** : Établir la hiérarchie propriétaire (accounts, devices, child_profiles)

#### Migration 1 : `20260130100000_create_accounts.sql`

**Intention** : Extension de `auth.users` avec données métier utilisateur

**Tables concernées** : `accounts`

**Colonnes conceptuelles** :
- `id` (PK, UUID = auth.users.id)
- `status` (account_status NOT NULL)
- `timezone` (TEXT NOT NULL, défaut `Europe/Paris`)
- `created_at`, `updated_at` (timestamps)

**Contraintes** :
- PK : `id`
- FK : `id` → `auth.users(id)` ON DELETE CASCADE
- `status` NOT NULL
- `timezone` NOT NULL, défaut `Europe/Paris`

**Dépendances** : Extension auth (fournie Supabase), enum `account_status` (Phase 1)

**Vérifications** :
- Table existe : `SELECT * FROM accounts LIMIT 0;` ne doit pas échouer
- Contrainte timezone : `INSERT INTO accounts (id, status) VALUES (gen_random_uuid(), 'free');` doit utiliser défaut `Europe/Paris`

---

#### Migration 2 : `20260130101000_create_devices.sql`

**Intention** : Gérer multi-appareils avec révocation non-destructive

**Tables concernées** : `devices`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `device_id` (UUID UNIQUE NOT NULL, généré client)
- `account_id` (FK → accounts(id) NOT NULL)
- `revoked_at` (TIMESTAMP NULL si actif)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE (pas de devices orphelins)
- UNIQUE : `device_id`
- `device_id` NOT NULL
- `account_id` NOT NULL

**Dépendances** : `accounts`

**Vérifications** :
- INSERT device sans `account_id` échoue (NOT NULL)
- DELETE account cascade sur devices (CASCADE)
- UNIQUE `device_id` : double INSERT même `device_id` échoue

---

#### Migration 3 : `20260130102000_create_child_profiles.sql`

**Intention** : Profils enfants avec statut verrouillage (downgrade) et ancienneté

**Tables concernées** : `child_profiles`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `account_id` (FK → accounts(id) NOT NULL)
- `name` (TEXT NOT NULL)
- `status` (child_profile_status NOT NULL, défaut `active`)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE
- `status` défaut `active`

**Dépendances** : `accounts`, enum `child_profile_status`

**Vérifications** :
- INSERT profil sans `status` → défaut `active`
- DELETE account cascade sur profils

---

### Phase 3 — Cards & catégories (bibliothèque & mapping)

**Objectif** : Cartes (banque + personnelles), catégories personnelles, table pivot

#### Migration 4 : `20260130103000_create_cards.sql`

**Intention** : Cartes visuelles (banque Admin + personnelles utilisateurs)

**Tables concernées** : `cards`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `type` (card_type NOT NULL)
- `account_id` (FK → accounts(id), NULL si bank)
- `name` (TEXT NOT NULL)
- `image_url` (TEXT NOT NULL, URL Supabase Storage)
- `published` (BOOLEAN, défaut FALSE si bank, NULL si personal)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE (personal uniquement)
- CHECK : `(type = 'bank' AND account_id IS NULL) OR (type = 'personal' AND account_id IS NOT NULL)`
- `published` : NULL si `type = 'personal'`, défaut FALSE si `type = 'bank'`

**Dépendances** : `accounts`, enum `card_type`

**Vérifications** :
- INSERT carte banque avec `account_id` non NULL échoue (CHECK)
- INSERT carte personal sans `account_id` échoue (CHECK)
- `created_at` utilisé pour quota mensuel (vérif timestamp UTC)

---

#### Migration 5 : `20260130104000_create_categories.sql`

**Intention** : Catégories personnelles avec "Sans catégorie" système

**Tables concernées** : `categories`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `account_id` (FK → accounts(id) NOT NULL)
- `name` (TEXT NOT NULL)
- `is_system` (BOOLEAN NOT NULL, défaut FALSE)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE
- UNIQUE : `(account_id, name)` (pas doublons nom par user)
- `is_system` défaut FALSE

**Dépendances** : `accounts`

**Vérifications** :
- Double INSERT même `(account_id, name)` échoue (UNIQUE)

---

#### Migration 6 : `20260130105000_create_user_card_categories.sql`

**Intention** : Pivot liant cartes visibles à catégories par utilisateur (CONTRAT EXPLICITE)

**Tables concernées** : `user_card_categories`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `user_id` (FK → accounts(id) NOT NULL)
- `card_id` (FK → cards(id) NOT NULL)
- `category_id` (FK → categories(id) NOT NULL)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `user_id` → `accounts(id)` ON DELETE CASCADE
- FK : `card_id` → `cards(id)` ON DELETE CASCADE
- FK : `category_id` → `categories(id)` ON DELETE SET NULL (puis fallback applicatif "Sans catégorie")
- **UNIQUE : `(user_id, card_id)`** (CONTRAT EXPLICITE, DB_BLUEPRINT.md §2.322)

**Dépendances** : `accounts`, `cards`, `categories`

**Vérifications** :
- Double INSERT même `(user_id, card_id)` échoue (UNIQUE)
- Fallback "Sans catégorie" : si aucune ligne pour `(user_id, card_id)`, carte affichée dans "Sans catégorie" côté front (logique applicative, pas DB)

---

### Phase 4 — Timeline & slots (structure planning visuel)

**Objectif** : Structure timeline par profil enfant + slots (Étapes + Récompense)

#### Migration 7 : `20260130106000_create_timelines.sql`

**Intention** : Structure timeline par profil enfant (1:1)

**Tables concernées** : `timelines`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `child_profile_id` (FK → child_profiles(id) UNIQUE NOT NULL)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `child_profile_id` → `child_profiles(id)` ON DELETE CASCADE
- **UNIQUE : `child_profile_id`** (1 timeline par profil enfant, DB_BLUEPRINT.md invariant #1)

**Dépendances** : `child_profiles`

**Vérifications** :
- Double INSERT même `child_profile_id` échoue (UNIQUE)

---

#### Migration 8 : `20260130107000_create_slots.sql`

**Intention** : Emplacements timeline (Étapes + Récompense) avec slot_id stable

**Tables concernées** : `slots`

**Colonnes conceptuelles** :
- `id` (PK, UUID = slot_id métier, stable)
- `timeline_id` (FK → timelines(id) NOT NULL)
- `kind` (slot_kind NOT NULL)
- `position` (INTEGER NOT NULL >= 0)
- `card_id` (FK → cards(id), NULL si vide)
- `tokens` (INTEGER 0-5 si step, NULL si reward)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id` (= slot_id métier)
- FK : `timeline_id` → `timelines(id)` ON DELETE CASCADE
- FK : `card_id` → `cards(id)` ON DELETE SET NULL (slot devient vide)
- UNIQUE : `(timeline_id, position)` (pas doublons position)
- CHECK : `(kind = 'step' AND tokens BETWEEN 0 AND 5) OR (kind = 'reward' AND tokens IS NULL)`
- `position` >= 0

**Invariants structurels** (DB_BLUEPRINT.md §4.753-763) :
- **Toujours 1 slot Récompense par timeline** (trigger/constraint : COUNT(kind='reward') = 1)
- **Minimum 1 slot Étape par timeline** (trigger/constraint : COUNT(kind='step') >= 1)

**Dépendances** : `timelines`, `cards`, enum `slot_kind`

**Vérifications** :
- INSERT slot step avec `tokens > 5` échoue (CHECK)
- INSERT slot reward avec `tokens` non NULL échoue (CHECK)

---

#### Migration 9 : `20260130108000_add_timeline_slot_invariants.sql`

**Intention** : Triggers pour invariants structurels timeline/slots

**Contenu conceptuel** :
- Fonction + trigger : empêcher suppression dernier slot step (COUNT(kind='step') >= 1)
- Fonction + trigger : garantir exactement 1 slot reward par timeline (COUNT(kind='reward') = 1)
- Fonction + trigger : à création timeline, insérer automatiquement 1 slot step vide + 1 slot reward vide (structure minimale)

**Dépendances** : `timelines`, `slots`

**Vérifications** :
- DELETE dernier slot step échoue (trigger bloque)
- INSERT 2e slot reward même timeline échoue (trigger bloque)
- INSERT timeline → SELECT COUNT(*) FROM slots WHERE timeline_id = ... retourne 2 (1 step + 1 reward)

---

### Phase 5 — Sessions & progression (exécution timeline)

**Objectif** : Sessions d'exécution avec epoch et validations (union ensembliste)

#### Migration 10 : `20260130109000_create_sessions.sql`

**Intention** : Sessions d'exécution timeline avec epoch et état

**Tables concernées** : `sessions`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `child_profile_id` (FK → child_profiles(id) NOT NULL)
- `timeline_id` (FK → timelines(id) NOT NULL)
- `state` (session_state NOT NULL)
- `epoch` (INTEGER NOT NULL, défaut 1)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `child_profile_id` → `child_profiles(id)` ON DELETE CASCADE
- FK : `timeline_id` → `timelines(id)` ON DELETE CASCADE
- `state` NOT NULL
- `epoch` NOT NULL, défaut 1
- **Partial index UNIQUE** : `(child_profile_id, timeline_id) WHERE state IN ('active_preview', 'active_started')` (DB_BLUEPRINT.md invariant #7 : 1 session active max)

**Dépendances** : `child_profiles`, `timelines`, enum `session_state`

**Vérifications** :
- INSERT 2 sessions actives même (child_profile_id, timeline_id) échoue (partial index)
- INSERT session completed puis active même profil réussit (completed exclue de l'index)

---

#### Migration 11 : `20260130110000_create_session_validations.sql`

**Intention** : Ensemble validations (union ensembliste pour fusion multi-appareils)

**Tables concernées** : `session_validations`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `session_id` (FK → sessions(id) NOT NULL)
- `slot_id` (FK → slots(id) NOT NULL)
- `validated_at` (TIMESTAMP NOT NULL)

**Contraintes** :
- PK : `id`
- FK : `session_id` → `sessions(id)` ON DELETE CASCADE
- FK : `slot_id` → `slots(id)` ON DELETE CASCADE
- **UNIQUE : `(session_id, slot_id)`** (pas doublon validation, DB_BLUEPRINT.md invariant #9)
- `validated_at` NOT NULL

**Dépendances** : `sessions`, `slots`

**Vérifications** :
- Double INSERT même `(session_id, slot_id)` échoue (UNIQUE)

---

### Phase 6 — Séquences (aide visuelle décomposition)

**Objectif** : Séquences visuelles (carte mère → étapes)

#### Migration 12 : `20260130111000_create_sequences.sql`

**Intention** : Séquences visuelles (aide décomposition carte mère)

**Tables concernées** : `sequences`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `account_id` (FK → accounts(id) NOT NULL)
- `mother_card_id` (FK → cards(id) NOT NULL)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE
- FK : `mother_card_id` → `cards(id)` ON DELETE CASCADE
- **UNIQUE : `(account_id, mother_card_id)`** (0..1 séquence par carte par user, DB_BLUEPRINT.md invariant #15)

**Dépendances** : `accounts`, `cards`

**Vérifications** :
- Double INSERT même `(account_id, mother_card_id)` échoue (UNIQUE)

---

#### Migration 13 : `20260130112000_create_sequence_steps.sql`

**Intention** : Étapes de séquence (liste ordonnée, sans doublons)

**Tables concernées** : `sequence_steps`

**Colonnes conceptuelles** :
- `id` (PK, UUID auto)
- `sequence_id` (FK → sequences(id) NOT NULL)
- `step_card_id` (FK → cards(id) NOT NULL)
- `position` (INTEGER NOT NULL >= 0)
- `created_at`, `updated_at`

**Contraintes** :
- PK : `id`
- FK : `sequence_id` → `sequences(id)` ON DELETE CASCADE
- FK : `step_card_id` → `cards(id)` ON DELETE CASCADE (déclenche vérif min 2 étapes)
- UNIQUE : `(sequence_id, position)` (ordre stable)
- **UNIQUE : `(sequence_id, step_card_id)`** (pas doublons carte dans même séquence, DB_BLUEPRINT.md invariant #17)

**Invariant** : Minimum 2 étapes par séquence (trigger/vérif applicative, DB_BLUEPRINT.md invariant #16)

**Dépendances** : `sequences`, `cards`

**Vérifications** :
- Double INSERT même `(sequence_id, step_card_id)` échoue (UNIQUE)

---

#### Migration 14 : `20260130113000_add_sequence_invariants.sql`

**Intention** : Triggers pour invariants séquences (min 2 étapes)

**Contenu conceptuel** :
- Fonction + trigger : empêcher DELETE `sequence_steps` si COUNT(steps) <= 2
- Fonction + trigger : si DELETE `cards` utilisée comme étape → retrait séquences ; si <2 étapes restantes → DELETE séquence

**Dépendances** : `sequences`, `sequence_steps`, `cards`

**Vérifications** :
- DELETE étape si COUNT = 2 échoue (trigger bloque)
- DELETE carte utilisée → séquence supprimée si reste <2 étapes

---

### Phase 7 — Storage (CRITIQUE — Confidentialité images)

**Objectif** : Buckets + policies owner-only images personnelles

⚠️ **CRITIQUE** : Cette phase doit être faite **AVANT** tout upload image personnelle en production

#### Migration 15 : `20260130114000_create_storage_buckets.sql`

**Intention** : Créer buckets Supabase Storage pour images

**Contenu conceptuel** :
- Bucket `personal-images` (privé, owner-only)
- Bucket `bank-images` (public, lecture seule pour tous) — **À trancher** selon implémentation (peut être CDN externe)

**Dépendances** : Aucune (Supabase Storage API)

**Vérifications** :
- `SELECT * FROM storage.buckets WHERE name IN ('personal-images', 'bank-images');` retourne 2 lignes

---

#### Migration 16 : `20260130115000_create_storage_policies.sql`

**Intention** : Policies Storage owner-only images personnelles (PRIORITÉ ABSOLUE)

**Contenu conceptuel** (DB_BLUEPRINT.md §5.807-823) :
- **Bucket `personal-images`** :
  - Policy SELECT : `account_id = auth.uid()` (owner-only)
  - Policy INSERT : `account_id = auth.uid()` (owner-only)
  - Policy UPDATE : `account_id = auth.uid()` (owner-only)
  - Policy DELETE : `account_id = auth.uid()` (owner-only)
  - **AUCUN bypass Admin** : Admin ne peut JAMAIS accéder aux fichiers images personnelles

- **Bucket `bank-images` (si applicable)** :
  - Policy SELECT : public (tous)
  - Policy INSERT/UPDATE/DELETE : Admin uniquement

**Règle contractuelle** (DB_BLUEPRINT.md L261-276) :
> Admin ne voit **JAMAIS** les images personnelles.
> Enforcement prioritaire : **Storage Policies** (priorité absolue) — RLS table `cards` insuffisant.

**Dépendances** : Buckets créés (Migration 15)

**Vérifications** :
- Non-owner tente SELECT image personnelle → 403 Forbidden
- Admin tente SELECT image personnelle → 403 Forbidden
- Owner tente SELECT image autre owner → 403 Forbidden

---

### Phase 8 — RLS (table par table)

**Objectif** : Row-Level Security owner-only, banque publique, exceptions admin

⚠️ **Note Visitor** : Visitor est local-only (pas de statut DB), donc RLS traite uniquement Free/Abonné/Admin

#### Migration 17 : `20260130116000_enable_rls_core_tables.sql`

**Intention** : Activer RLS sur toutes tables core

**Contenu conceptuel** :
- `ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE devices ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE cards ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE categories ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE user_card_categories ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE slots ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE session_validations ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;`

**Dépendances** : Toutes tables Phase 2-6

**Vérifications** :
- `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;` retourne toutes tables

---

#### Migration 18 : `20260130117000_rls_accounts.sql`

**Intention** : Policies RLS table `accounts`

**Contenu conceptuel** (DB_BLUEPRINT.md §5.828) :
- SELECT : `id = auth.uid()` (owner-only)
- INSERT : ❌ Interdit (créé via trigger auth)
- UPDATE : `id = auth.uid()` (owner-only)
- DELETE : `id = auth.uid()` (owner-only)

**⚠️ Non spécifié — à trancher** (DB_BLUEPRINT.md L110-123) :
- **Accès Admin aux comptes** : Option A (strict, aucun accès global) recommandée par défaut

**Dépendances** : RLS activé (Migration 17)

**Vérifications** :
- User A SELECT account user B → 0 ligne
- User A UPDATE account user A → réussit

---

#### Migration 19 : `20260130118000_rls_devices.sql`

**Intention** : Policies RLS table `devices`

**Contenu conceptuel** (DB_BLUEPRINT.md §5.829) :
- SELECT : `account_id = auth.uid()` (owner-only)
- INSERT : Vérif quota + `account_id = auth.uid()` (bloqué si quota atteint, fonction serveur)
- UPDATE : `account_id = auth.uid()` (révocation uniquement)
- DELETE : ❌ Interdit (non-destructive)

**Dépendances** : RLS activé

**Vérifications** :
- User A SELECT device user B → 0 ligne
- User A UPDATE device user A avec `revoked_at = NOW()` → réussit
- User A DELETE device → échoue (policy bloque)

---

#### Migration 20 : `20260130119000_rls_child_profiles.sql`

**Intention** : Policies RLS table `child_profiles`

**Contenu conceptuel** (DB_BLUEPRINT.md §5.830) :
- SELECT : `account_id = auth.uid()` (owner-only)
- INSERT : Vérif quota + `account_id = auth.uid()` (bloqué si quota atteint)
- UPDATE : `account_id = auth.uid()` (owner-only)
- DELETE : `account_id = auth.uid()` (owner-only)

**Dépendances** : RLS activé

**Vérifications** :
- User A SELECT profil user B → 0 ligne
- User A INSERT profil si quota atteint → échoue (trigger quota)

---

#### Migration 21 : `20260130120000_rls_cards.sql`

**Intention** : Policies RLS table `cards`

**Contenu conceptuel** (DB_BLUEPRINT.md §5.831) :
- SELECT : `(type='bank' AND published=TRUE)` (tous) OU `account_id = auth.uid()` (owner)
- INSERT : Vérif quota + `account_id = auth.uid()` (bloqué si quota atteint)
- UPDATE : `account_id = auth.uid()` (owner-only) OU admin (bank)
- DELETE : `account_id = auth.uid()` (owner-only) OU admin (vérif références)

**Confidentialité Admin** (DB_BLUEPRINT.md §5.841-853) :
- Admin peut lire cartes `type='bank'` pour gestion banque
- Admin **ne peut jamais** lire cartes `type='personal'` d'autres users
- Confidentialité réelle garantie par **Storage Policies** (Phase 7), pas uniquement RLS table

**Dépendances** : RLS activé

**Vérifications** :
- User A SELECT carte banque published=TRUE → réussit
- User A SELECT carte banque published=FALSE → 0 ligne (sauf usages existants)
- User A SELECT carte personal user B → 0 ligne

---

#### Migration 22 : `20260130121000_rls_categories_pivot.sql`

**Intention** : Policies RLS tables `categories` et `user_card_categories`

**Contenu conceptuel** (DB_BLUEPRINT.md §5.832-833) :

**`categories`** :
- SELECT : `account_id = auth.uid()` (owner-only)
- INSERT : `account_id = auth.uid()` (owner-only)
- UPDATE : `account_id = auth.uid()` ET `is_system=FALSE` (owner-only, pas système)
- DELETE : `account_id = auth.uid()` ET `is_system=FALSE` (owner-only, pas système)

**`user_card_categories`** :
- SELECT : `user_id = auth.uid()` (owner-only)
- INSERT : `user_id = auth.uid()` (owner-only)
- UPDATE : `user_id = auth.uid()` (owner-only)
- DELETE : `user_id = auth.uid()` (owner-only)

**Dépendances** : RLS activé

**Vérifications** :
- User A SELECT catégorie user B → 0 ligne
- User A UPDATE catégorie système → échoue (is_system=TRUE bloqué)

---

#### Migration 23 : `20260130122000_rls_timelines_slots.sql`

**Intention** : Policies RLS tables `timelines` et `slots`

**Contenu conceptuel** (DB_BLUEPRINT.md §5.834-835) :

**`timelines`** :
- SELECT : Owner via `child_profile_id` → `child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid())`
- INSERT : Trigger auto (pas policy INSERT, création auto avec profil)
- UPDATE : Owner via `child_profile_id`
- DELETE : Owner via `child_profile_id`

**`slots`** :
- SELECT : Owner via `timeline_id` → `timeline_id IN (SELECT id FROM timelines WHERE child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid()))`
- INSERT : Owner + vérif verrouillage (fonction serveur)
- UPDATE : Owner + vérif verrouillage (fonction serveur)
- DELETE : Owner + vérif verrouillage (fonction serveur) + pas dernier step

**Dépendances** : RLS activé

**Vérifications** :
- User A SELECT slot timeline user B → 0 ligne
- User A UPDATE slot validé pendant session active → échoue (trigger verrouillage)

---

#### Migration 24 : `20260130123000_rls_sessions_validations.sql`

**Intention** : Policies RLS tables `sessions` et `session_validations`

**Contenu conceptuel** (DB_BLUEPRINT.md §5.836-837) :

**`sessions`** :
- SELECT : Owner via `child_profile_id` → `child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid())`
- INSERT : Trigger auto (pas policy INSERT, création auto entrée Tableau)
- UPDATE : Owner + vérif transition état (fonction serveur)
- DELETE : ❌ Sauf réinit (fonction serveur uniquement)

**`session_validations`** :
- SELECT : Owner via `session_id` → `session_id IN (SELECT id FROM sessions WHERE child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid()))`
- INSERT : Owner + vérif session active (fonction serveur)
- UPDATE : ❌ Interdit (validations immuables)
- DELETE : Réinit uniquement (fonction serveur)

**Dépendances** : RLS activé

**Vérifications** :
- User A SELECT session user B → 0 ligne
- User A UPDATE validation → échoue (immuable)

---

#### Migration 25 : `20260130124000_rls_sequences.sql`

**Intention** : Policies RLS tables `sequences` et `sequence_steps`

**Contenu conceptuel** (DB_BLUEPRINT.md §5.838-839) :

**`sequences`** :
- SELECT : `account_id = auth.uid()` (owner-only)
- INSERT : `account_id = auth.uid()` (owner-only)
- UPDATE : `account_id = auth.uid()` (owner-only)
- DELETE : `account_id = auth.uid()` (owner-only)

**`sequence_steps`** :
- SELECT : Owner via `sequence_id` → `sequence_id IN (SELECT id FROM sequences WHERE account_id = auth.uid())`
- INSERT : Owner + vérif min 2 (fonction serveur)
- UPDATE : Owner + vérif min 2 après (fonction serveur)
- DELETE : Owner + vérif min 2 après (fonction serveur)

**Dépendances** : RLS activé

**Vérifications** :
- User A SELECT séquence user B → 0 ligne
- User A DELETE étape si COUNT = 2 → échoue (trigger min 2)

---

### Phase 9 — Triggers/Fonctions invariants & quotas

**Objectif** : Défendre invariants DB + enforcement quotas côté serveur

#### Migration 26 : `20260130125000_quota_functions_cards.sql`

**Intention** : Fonctions + triggers quotas cartes personnelles (stock + mensuel)

**Contenu conceptuel** (DB_BLUEPRINT.md §6.874-906) :

**Fonction `check_card_quota_stock(account_id)`** :
- Compte `SELECT COUNT(*) FROM cards WHERE account_id = ? AND type='personal'`
- Compare avec : Free/Visitor = refuse (N/A), Abonné = 50, Admin = ∞
- Trigger BEFORE INSERT sur `cards` appelle fonction

**Fonction `check_card_quota_monthly(account_id)`** :
- Lit `timezone` depuis `accounts`
- Calcule début mois : `DATE_TRUNC('month', NOW() AT TIME ZONE timezone)`
- Compte `SELECT COUNT(*) FROM cards WHERE account_id = ? AND type='personal' AND created_at >= debut_mois`
- Compare avec : Free/Visitor = refuse (N/A), Abonné = 100/mois, Admin = ∞
- Trigger BEFORE INSERT sur `cards` appelle fonction

**Anti-abus timezone** (DB_BLUEPRINT.md L900-905, PRODUCT_MODEL.md §9.3.3) :
- `created_at` stocké en **UTC**
- `timezone` utilisé pour bornes mois uniquement
- Changement timezone = effet au prochain mois (mois en cours conserve timezone initiale)

**Dépendances** : `accounts`, `cards`

**Vérifications** :
- User Free INSERT carte personal → échoue (quota N/A)
- User Abonné INSERT 51e carte personal → échoue (quota stock)
- User Abonné INSERT 101e carte personal même mois → échoue (quota mensuel)

---

#### Migration 27 : `20260130126000_quota_functions_profiles_devices.sql`

**Intention** : Fonctions + triggers quotas profils enfants et appareils

**Contenu conceptuel** (DB_BLUEPRINT.md §6.909-934) :

**Fonction `check_profile_quota(account_id)`** :
- Compte `SELECT COUNT(*) FROM child_profiles WHERE account_id = ?`
- Compare avec : Visitor (struct.) = 1, Free = 1, Abonné = 3, Admin = ∞
- Trigger BEFORE INSERT sur `child_profiles` appelle fonction

**Fonction `check_device_quota(account_id)`** :
- Compte `SELECT COUNT(*) FROM devices WHERE account_id = ? AND revoked_at IS NULL`
- Compare avec : Visitor (struct.) = 1, Free = 1, Abonné = 3, Admin = ∞
- Trigger BEFORE INSERT sur `devices` appelle fonction

**Dépendances** : `accounts`, `child_profiles`, `devices`

**Vérifications** :
- User Free INSERT 2e profil → échoue (quota 1)
- User Abonné INSERT 4e appareil actif → échoue (quota 3)

---

#### Migration 28 : `20260130127000_downgrade_functions.sql`

**Intention** : Fonctions + triggers downgrade Abonné → Free

**Contenu conceptuel** (DB_BLUEPRINT.md §6.949-966) :

**Fonction `handle_downgrade(account_id)`** :
- Liste profils par ancienneté (`ORDER BY created_at ASC`)
- Profil le plus ancien = actif (Free, 1 seul)
- Profils excédentaires : `status = 'active'` tant que sessions actives
- Trigger : session terminée → vérif si profil excédentaire → `status = 'locked'`

**Fonction `lock_profile_if_exceeds_quota(child_profile_id)`** :
- Appelée par trigger AFTER UPDATE sur `sessions` (transition vers `completed`)
- Vérifie si profil au-delà quota Free (1) après downgrade
- Si oui et toutes sessions terminées : `UPDATE child_profiles SET status='locked'`

**Dépendances** : `accounts`, `child_profiles`, `sessions`

**Vérifications** :
- User avec 3 profils downgrade Free → profil #2 et #3 restent actifs tant que sessions en cours
- Session terminée profil #2 → `status='locked'`

---

#### Migration 29 : `20260130128000_session_state_transitions.sql`

**Intention** : Fonctions + triggers transitions état sessions

**Contenu conceptuel** :

**Fonction `validate_session_state_transition(old_state, new_state)`** :
- Vérifie transitions autorisées :
  - `active_preview` → `active_started` (première validation)
  - `active_started` → `completed` (dernière validation)
  - **Pas** `completed` → `active_*` (réinitialisation crée nouvelle session)
- Trigger BEFORE UPDATE sur `sessions` appelle fonction

**Fonction `auto_transition_session_on_validation(session_id)`** :
- Appelée par trigger AFTER INSERT sur `session_validations`
- Si session en `active_preview` et ≥1 validation : `UPDATE sessions SET state='active_started'`
- Si session en `active_started` et toutes étapes validées : `UPDATE sessions SET state='completed'`

**Dépendances** : `sessions`, `session_validations`

**Vérifications** :
- INSERT validation en `active_preview` → transition automatique `active_started`
- Dernière validation → transition automatique `completed`

---

### Phase 10 — Seed minimal (si nécessaire)

**Objectif** : Insérer données système obligatoires (uniquement si requises par contrat)

#### Migration 30 : `20260130129000_seed_system_categories.sql`

**Intention** : Créer catégorie "Sans catégorie" pour chaque compte existant (si applicable)

**Contenu conceptuel** :
- Fonction trigger : à création `accounts`, INSERT `categories` avec `name='Sans catégorie'`, `is_system=TRUE`

**Dépendances** : `accounts`, `categories`

**⚠️ À trancher** : Si "Sans catégorie" est purement applicatif (fallback front si aucune ligne pivot), cette migration peut être **SKIP** (pas de seed DB)

**Vérifications** :
- INSERT account → SELECT categories WHERE account_id = ... AND is_system=TRUE retourne 1 ligne "Sans catégorie"

---

## 3. Liste exhaustive des migrations (noms de fichiers)

| # | Fichier | Intention | Tables/Objets | Dépendances | Vérifications |
|---|---------|-----------|---------------|-------------|---------------|
| 1 | `20260130100000_create_enums.sql` | Créer enums de base | account_status, card_type, slot_kind, session_state, child_profile_status | Extensions (fournis) | SELECT pg_type |
| 2 | `20260130100000_create_accounts.sql` | Extension auth.users avec métier | accounts | auth.users, account_status | INSERT avec défaut timezone |
| 3 | `20260130101000_create_devices.sql` | Multi-appareils révocation | devices | accounts | UNIQUE device_id, CASCADE DELETE |
| 4 | `20260130102000_create_child_profiles.sql` | Profils enfants + statut | child_profiles | accounts, child_profile_status | CASCADE DELETE |
| 5 | `20260130103000_create_cards.sql` | Cartes banque + personnelles | cards | accounts, card_type | CHECK type/account_id |
| 6 | `20260130104000_create_categories.sql` | Catégories personnelles | categories | accounts | UNIQUE (account_id, name) |
| 7 | `20260130105000_create_user_card_categories.sql` | Pivot carte↔catégorie | user_card_categories | accounts, cards, categories | UNIQUE (user_id, card_id) |
| 8 | `20260130106000_create_timelines.sql` | Timeline 1:1 profil | timelines | child_profiles | UNIQUE child_profile_id |
| 9 | `20260130107000_create_slots.sql` | Slots (step/reward) slot_id stable | slots | timelines, cards, slot_kind | CHECK tokens |
| 10 | `20260130108000_add_timeline_slot_invariants.sql` | Triggers slots (min 1 step, 1 reward) | Triggers | timelines, slots | Bloque DELETE dernier step |
| 11 | `20260130109000_create_sessions.sql` | Sessions epoch + état | sessions | child_profiles, timelines, session_state | Partial index 1 active max |
| 12 | `20260130110000_create_session_validations.sql` | Validations union ensembliste | session_validations | sessions, slots | UNIQUE (session_id, slot_id) |
| 13 | `20260130111000_create_sequences.sql` | Séquences carte mère | sequences | accounts, cards | UNIQUE (account_id, mother_card_id) |
| 14 | `20260130112000_create_sequence_steps.sql` | Étapes séquence | sequence_steps | sequences, cards | UNIQUE (sequence_id, step_card_id) |
| 15 | `20260130113000_add_sequence_invariants.sql` | Triggers séquences (min 2 étapes) | Triggers | sequences, sequence_steps | Bloque DELETE si COUNT=2 |
| 16 | `20260130114000_create_storage_buckets.sql` | Buckets Storage | personal-images, bank-images | Storage API | SELECT storage.buckets |
| 17 | `20260130115000_create_storage_policies.sql` | Policies owner-only images | Storage policies | Buckets | Non-owner → 403 |
| 18 | `20260130116000_enable_rls_core_tables.sql` | Activer RLS toutes tables | RLS enabled | Toutes tables | SELECT pg_tables rowsecurity |
| 19 | `20260130117000_rls_accounts.sql` | RLS accounts owner-only | Policies | RLS enabled | User A ≠ User B → 0 ligne |
| 20 | `20260130118000_rls_devices.sql` | RLS devices owner-only | Policies | RLS enabled | User A ≠ User B → 0 ligne |
| 21 | `20260130119000_rls_child_profiles.sql` | RLS profils owner-only | Policies | RLS enabled | User A ≠ User B → 0 ligne |
| 22 | `20260130120000_rls_cards.sql` | RLS cartes (banque public, personal privé) | Policies | RLS enabled | Banque published=TRUE visible |
| 23 | `20260130121000_rls_categories_pivot.sql` | RLS catégories + pivot | Policies | RLS enabled | User A ≠ User B → 0 ligne |
| 24 | `20260130122000_rls_timelines_slots.sql` | RLS timelines + slots | Policies | RLS enabled | User A ≠ User B → 0 ligne |
| 25 | `20260130123000_rls_sessions_validations.sql` | RLS sessions + validations | Policies | RLS enabled | User A ≠ User B → 0 ligne |
| 26 | `20260130124000_rls_sequences.sql` | RLS séquences + étapes | Policies | RLS enabled | User A ≠ User B → 0 ligne |
| 27 | `20260130125000_quota_functions_cards.sql` | Quotas cartes (stock + mensuel) | Fonctions + triggers | accounts, cards | INSERT 51e carte → échoue |
| 28 | `20260130126000_quota_functions_profiles_devices.sql` | Quotas profils + devices | Fonctions + triggers | accounts, child_profiles, devices | INSERT 2e profil Free → échoue |
| 29 | `20260130127000_downgrade_functions.sql` | Downgrade Abonné → Free | Fonctions + triggers | accounts, child_profiles, sessions | Profil excédentaire → locked |
| 30 | `20260130128000_session_state_transitions.sql` | Transitions état sessions | Fonctions + triggers | sessions, session_validations | 1ère validation → active_started |
| 31 | `20260130129000_seed_system_categories.sql` | Seed "Sans catégorie" (si nécessaire) | Trigger auto | accounts, categories | INSERT account → catégorie système créée |

---

## 4. Gates de validation (obligatoires)

### Gate 1 — Après Phase 3 (Cards/Catégories/Pivot)

**Point STOP/GO** : Cards + catégories + pivot ok

**Vérifications** :
- [ ] Table `cards` existe avec types bank/personal
- [ ] Table `categories` existe avec `is_system`
- [ ] Table `user_card_categories` existe avec UNIQUE `(user_id, card_id)`
- [ ] INSERT carte banque avec `account_id` non NULL échoue (CHECK)
- [ ] Double INSERT même `(user_id, card_id)` échoue (UNIQUE)

**Verdict** : ✅ GO si toutes vérifications passent, ❌ STOP sinon

---

### Gate 2 — Après Phase 5 (Sessions/Progression)

**Point STOP/GO** : Sessions + progression ok

**Vérifications** :
- [ ] Table `sessions` existe avec `epoch` et partial index 1 active max
- [ ] Table `session_validations` existe avec UNIQUE `(session_id, slot_id)`
- [ ] INSERT 2 sessions actives même (child_profile_id, timeline_id) échoue (partial index)
- [ ] Double INSERT même `(session_id, slot_id)` échoue (UNIQUE)

**Verdict** : ✅ GO si toutes vérifications passent, ❌ STOP sinon

---

### Gate 3 — Avant Phase 7 (Storage)

**Point STOP/GO** : Storage policies prêtes AVANT tout upload image personnelle

**Vérifications** :
- [ ] Plan Storage policies relu et validé
- [ ] Bucket `personal-images` privé confirmé (pas public)
- [ ] Policies owner-only `account_id = auth.uid()` confirmées
- [ ] **AUCUN bypass Admin** confirmé

**Verdict** : ✅ GO uniquement si 100% sûr, ❌ STOP sinon (CRITIQUE)

---

### Gate 4 — Avant Phase 8 (RLS)

**Point STOP/GO** : RLS design relu

**Vérifications** :
- [ ] Toutes tables RLS enabled
- [ ] Policies owner-only confirmées
- [ ] Banque publique (cards published=TRUE) confirmée
- [ ] Admin accès métadonnées uniquement (pas images) confirmé

**Verdict** : ✅ GO si design validé, ❌ STOP si doutes

---

### Gate 5 — Après Phase 9 (Quotas)

**Point STOP/GO** : Quotas testés

**Vérifications** :
- [ ] Quota cartes stock testé (Free/Abonné/Admin)
- [ ] Quota cartes mensuel testé avec timezone
- [ ] Quota profils testé (Free 1, Abonné 3)
- [ ] Quota devices testé (revoked_at exclu du COUNT)
- [ ] Downgrade profils locked testé

**Verdict** : ✅ GO si tous quotas fonctionnent, ❌ STOP sinon

---

## 5. Tests de contrat (sans code)

### Après Phase 4 (Timeline/Slots)

**Assertions à vérifier** :
- [ ] **Timeline unique par enfant** : Double INSERT même `child_profile_id` → échoue (UNIQUE)
- [ ] **Slot reward toujours présent** : DELETE dernier slot reward → échoue (trigger)
- [ ] **Slot card nullable** : INSERT slot sans `card_id` → réussit (NULL autorisé)
- [ ] **Slot_id stable** : UPDATE `position` ne change PAS le `slot_id` (UUID PK)

---

### Après Phase 5 (Sessions/Validations)

**Assertions à vérifier** :
- [ ] **Session_validations union monotone** : INSERT 2x `(session_id, slot_id)` → 1 seule ligne (UNIQUE)
- [ ] **1 session active max** : INSERT 2 sessions actives → échoue (partial index)
- [ ] **Epoch monotone** : Création session → `epoch=1` ; réinitialisation → `epoch++`

---

### Après Phase 6 (Séquences)

**Assertions à vérifier** :
- [ ] **Min 2 étapes** : DELETE étape si COUNT=2 → échoue (trigger)
- [ ] **Pas doublons étapes** : INSERT 2x `(sequence_id, step_card_id)` → échoue (UNIQUE)
- [ ] **Cascade suppression** : DELETE carte mère → séquence supprimée

---

### Après Phase 7 (Storage)

**Assertions à vérifier** :
- [ ] **Owner-only images** : Non-owner tente SELECT image personnelle → 403 Forbidden
- [ ] **Admin bloqué images privées** : Admin tente SELECT image personnelle → 403 Forbidden

---

### Après Phase 8 (RLS)

**Assertions à vérifier** :
- [ ] **Owner-only** : User A SELECT données user B → 0 ligne (toutes tables)
- [ ] **Banque visible à tous** : User A SELECT carte banque published=TRUE → réussit
- [ ] **Personal privée** : User A SELECT carte personal user B → 0 ligne

---

### Après Phase 9 (Quotas)

**Assertions à vérifier** :
- [ ] **Revoked_at bloque device quota** : Device révoqué exclu du COUNT quotas
- [ ] **Downgrade locked profiles** : Profil excédentaire après downgrade → `status='locked'` après session terminée

---

## 6. Points "Non spécifié — à trancher"

### 6.1 Accès Admin aux comptes (DB_BLUEPRINT.md L110-123)

**Question** : Admin peut-il accéder métadonnées `accounts` (support technique) ?

**Options** :
- **A) Admin strict** : Aucun accès global `accounts` (owner-only uniquement)
- **B) Admin support** : SELECT métadonnées non sensibles (`status`, `created_at`, `timezone`) pour support

**Recommandation DB_BLUEPRINT** : **Option A** (strict) par défaut

**✅ DÉCISION CONFIRMÉE** : **Option A strict** — Admin n'a AUCUN accès global aux comptes (owner-only uniquement)

**Impact migrations** :
- RLS `accounts` SELECT policy = `id = auth.uid()` uniquement (pas de clause admin)

**Décision requise avant** : Migration 19 (`rls_accounts.sql`)

---

### 6.2 Bucket banque images (Migration 15)

**Question** : Images banque stockées dans Supabase Storage ou CDN externe ?

**Options** :
- **A) Supabase Storage** : Bucket `bank-images` public (lecture tous)
- **B) CDN externe** : Pas de bucket banque, `image_url` pointe vers CDN

**✅ DÉCISION CONFIRMÉE** : **Option A — Supabase Storage**
- Bucket `bank-images` public (lecture tous, policies SELECT publiques)
- Bucket `personal-images` privé (owner-only, policies RLS Storage strictes)

**Impact migrations** :
- Migration 15 : Créer 2 buckets (`bank-images` public + `personal-images` privé)
- Migration 16 : Policies Storage (public lecture bank + owner-only personal)

**Décision requise avant** : Migration 15 (`create_storage_buckets.sql`)

---

### 6.3 Seed "Sans catégorie" (Migration 31)

**Question** : "Sans catégorie" créé en DB ou fallback applicatif pur ?

**Options** :
- **A) Seed DB** : Trigger auto-création `categories` avec `is_system=TRUE` à création compte
- **B) Fallback applicatif** : Pas de ligne DB, front affiche "Sans catégorie" si aucune association pivot

**Recommandation DB_BLUEPRINT** (§2.322 L361) : **Fallback applicatif** ("si aucune ligne pour (user_id, card_id), carte affichée dans 'Sans catégorie' côté front")

**Impact migrations** :
- **A)** : Migration 31 requise
- **B)** : Migration 31 SKIP (pas de seed)

**Décision requise avant** : Phase 10

---

### 6.4 Timestamps validation (DB_BLUEPRINT.md L1049-1065)

**Question** : Stocker `validated_at` sur `session_validations` pour résolution conflits avancée ?

**Options** :
- **A) Union simple de `slot_id`** (comme spécifié DB_BLUEPRINT.md Ch.3.10) — pas de timestamp
- **B) `validated_at` timestamp** pour tri/résolution conflits si nécessaire

**Recommandation DB_BLUEPRINT** : **Option A** (union simple)

**Impact migrations** :
- **A)** : `validated_at` peut être SKIP (ou conservé pour audit sans logique métier)
- **B)** : `validated_at` utilisé pour résolution conflits temporels

**Décision requise avant** : Migration 12 (`create_session_validations.sql`)

**Note** : Migration 12 inclut `validated_at` par défaut (audit), mais logique métier utilise **uniquement union ensembliste** (set de `slot_id`)

---

### 6.5 Aucun slot vide disponible lors ajout carte (PRODUCT_MODEL.md Ch.7)

**Question** : Si adulte veut ajouter carte mais tous slots step occupés, que faire ?

**Options** :
- **A) Auto-créer slot step** à la fin de timeline
- **B) Checkbox grisée** (carte non ajoutée)
- **C) Toast explicatif** "Ajouter d'abord un slot Étape vide"

**Impact migrations** : **Aucun** (purement logique applicative front)

**Décision requise** : Avant implémentation UI, **pas bloquant migrations**

---

## 7. Verdict final

### ✅ **READY sous conditions**

**Checklist des conditions** :

- [x] **Décision 6.1** (Admin accès `accounts`) → ✅ **CONFIRMÉ Option A strict** (owner-only uniquement)
- [x] **Décision 6.2** (Bucket banque) → ✅ **CONFIRMÉ Option A Supabase Storage** (bank-images public + personal-images privé)
- [ ] **Décision 6.3** (Seed "Sans catégorie") tranchée → recommandation **Option B fallback applicatif**
- [ ] **Décision 6.4** (Timestamps validation) tranchée → recommandation **Option A union simple** (conserver `validated_at` audit uniquement)
- [x] **Décision 6.5** : ✅ Aucune décision DB requise (logique UI)
- [x] **UUID** : ✅ **CONFIRMÉ pgcrypto** + `gen_random_uuid()` partout
- [x] **devices.account_id** : ✅ **CONFIRMÉ NOT NULL** + ON DELETE CASCADE
- [x] **Timezone validation** : ✅ **CONFIRMÉ responsabilité applicative** (pas de CHECK DB, validation front/edge functions)

**Points bloquants si non tranchés** :
- **6.1** : ✅ **CONFIRMÉ Option A strict** — Admin n'a AUCUN accès global `accounts`
- **6.2** : ✅ **CONFIRMÉ Option A Supabase Storage** — 2 buckets (bank-images public + personal-images privé)
- **6.3** : Bloque Migration 31 (`seed_system_categories.sql`) — mais peut être SKIP si fallback applicatif
- **6.4** : Non bloquant (choix design, Migration 12 inclut colonne par défaut)

**Décisions confirmées** :
- ✅ **6.1 = Option A strict** : RLS `accounts` = owner-only uniquement (pas d'accès admin global)
- ✅ **6.2 = Option A Supabase Storage** : Buckets `bank-images` (public) + `personal-images` (privé owner-only)
- ✅ **Timezone validation IANA** : Responsabilité applicative (pas de CHECK DB, validation front/edge functions)
- ✅ **UUID = pgcrypto** : Utiliser `gen_random_uuid()` partout (standard PostgreSQL moderne)
- ✅ **devices.account_id = NOT NULL** : FK ON DELETE CASCADE (pas de devices orphelins)

**Recommandations pour démarrer** :
1. ✅ Utiliser décisions confirmées ci-dessus
2. ✅ Démarrer migrations Phase 1-6 sans blocage
3. ✅ Phase 7 (Storage) : 2 buckets Supabase (bank-images public + personal-images privé)
4. ⚠️ Trancher 6.3 avant Phase 10 (Seed "Sans catégorie" — recommandation fallback applicatif)
5. ⚠️ Trancher 6.4 avant Phase 5 (session_validations — recommandation union simple)

---

### Prochaines étapes

1. ✅ **Traduction SQL** : Convertir ce plan conceptuel en migrations SQL concrètes
2. 🔒 **Storage Policies** : **PRIORITÉ ABSOLUE** — Configurer avant tout upload image personnelle
3. ✅ **RLS Policies** : Implémenter plan RLS (Phase 8)
4. ✅ **Triggers & Fonctions** : Défendre invariants (Phase 9-10)
5. ✅ **Tests DB** : Vérifier tous tests de contrat (section 5)
6. ⚠️ **Import Visitor** : Logique applicative avec transactions (hors périmètre migrations)

---

**📄 Document prêt pour traduction en migrations SQL DB-first.**

**🔒 CRITIQUE** : Les **Storage Policies** (Phase 7, Migrations 16-17) doivent être implémentées **AVANT** tout upload d'image personnelle en production.
