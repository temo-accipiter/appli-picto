# MIGRATION_PLAN.md — Plan d'exécution migrations DB-first Supabase

> **Date** : 2026-01-30
> **Sources** :
>
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

#### Migration 1 : `20260130101000_create_accounts.sql`

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
- `timezone` doit être une timezone IANA valide (contrainte CHECK : `accounts_timezone_valid_chk`)
- `timezone` : CHECK timezone IANA valide (Phase 5.5 : `accounts_timezone_valid_chk`)

**Dépendances** : Extension auth (fournie Supabase), enum `account_status` (Phase 1)

**Vérifications** :

- Table existe : `SELECT * FROM accounts LIMIT 0;` ne doit pas échouer
- Défaut timezone présent :
  - `SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='accounts' AND column_name='timezone';`
  - doit contenir `Europe/Paris`
- Contrainte timezone IANA active :
  - `SELECT conname FROM pg_constraint WHERE conrelid='public.accounts'::regclass AND conname='accounts_timezone_valid_chk';`
  - doit retourner 1 ligne

**⚠️ Note PRODUCT_MODEL.md Ch.2.6** : Cette migration sera complétée ultérieurement par un trigger auto-création profil enfant (voir Phase 4.x corrective)

---

#### Migration 2 : `20260130102000_create_devices.sql`

**Intention** : Gérer multi-appareils avec révocation non-destructive

**Tables concernées** : `devices`

**Colonnes conceptuelles** :

- `id` (PK, UUID auto)
- device_id (UUID NOT NULL, généré client ; UNIQUE par compte via (account_id, device_id))- `account_id` (FK → accounts(id) NOT NULL)
- `revoked_at` (TIMESTAMP NULL si actif)
- `created_at`, `updated_at`

**Contraintes** :

- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE (pas de devices orphelins)
- UNIQUE : (`account_id`, `device_id`) (Phase 5.5)
- CHECK : `revoked_at IS NULL OR revoked_at >= created_at` (Phase 5.5)
- CHECK : `revoked_at IS NULL OR revoked_at >= created_at` (Phase 5.5 corrective)
- `device_id` NOT NULL
- `account_id` NOT NULL

**Dépendances** : `accounts`

**Vérifications** :

- Contrainte UNIQUE attendue :
  - `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.devices'::regclass AND contype IN ('u','p') ORDER BY conname;`
  - doit contenir `UNIQUE (account_id, device_id)` et ne pas contenir `UNIQUE (device_id)`
- CHECK cohérence temporelle :
  - `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.devices'::regclass AND contype='c' ORDER BY conname;`
  - doit contenir `revoked_at >= created_at`
- DELETE account cascade sur devices (CASCADE)

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

**⚠️ Note PRODUCT_MODEL.md Ch.2.6** : Cette migration sera complétée ultérieurement par un trigger auto-création timeline + slots minimaux (voir Phase 4.x corrective)

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

**⚠️ Note PRODUCT_MODEL.md Ch.2.6** : Cette migration sera complétée ultérieurement par un trigger auto-création slots minimaux (voir Phase 4.x corrective)

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
- Fonction + trigger : garantir au minimum 1 slot reward par timeline (COUNT(kind='reward') >= 1, suppression dernier interdit)
- ~~Fonction + trigger : à création timeline, insérer automatiquement 1 slot step vide + 1 slot reward vide (structure minimale)~~ → **DÉPLACÉ vers Phase 4.x corrective** (PRODUCT_MODEL.md Ch.2.6)

**Dépendances** : `timelines`, `slots`

**Vérifications** :

- DELETE dernier slot step échoue (trigger bloque)
- INSERT 2e slot reward même timeline échoue (trigger bloque)
- ~~INSERT timeline → SELECT COUNT(\*) FROM slots WHERE timeline_id = ... retourne 2 (1 step + 1 reward)~~ → **Vérification déplacée Phase 4.x**

**⚠️ Note PRODUCT_MODEL.md Ch.2.6** : Les triggers min_step/min_reward devront être modifiés en Phase 4.x pour autoriser les cascades DELETE (suppression compte, RGPD, maintenance)

---

### Phase 4.x — Corrective : Auto-création profil enfant + timeline + slots (PRODUCT_MODEL.md Ch.2.6)

**Objectif** : Implémenter le contrat produit "application jamais vide" via triggers automatiques

**Référence** : PRODUCT_MODEL.md § 2.6 "Gestion des profils enfants — règles contractuelles"

#### Migration 9.5 : `20260130113000_auto_create_child_profile_timeline.sql`

**Intention** : Créer automatiquement profil enfant + timeline + slots minimaux à création compte

**Contenu conceptuel** :

1. **Trigger auto-création profil enfant** (AFTER INSERT `accounts`)
   - Fonction : `accounts_auto_create_first_child_profile()`
   - Action : INSERT `child_profiles` avec `name='Mon enfant'`, `status='active'`
   - Résultat : 1 profil enfant créé automatiquement à la création du compte

2. **Trigger auto-création timeline** (AFTER INSERT `child_profiles`)
   - Fonction : `child_profiles_auto_create_timeline()`
   - Action : INSERT `timelines` avec `child_profile_id = NEW.id`
   - Résultat : 1 timeline créée automatiquement pour chaque nouveau profil enfant

3. **Trigger auto-création slots minimaux** (AFTER INSERT `timelines`)
   - Fonction : `timelines_auto_create_minimal_slots()`
   - Action : INSERT 2 slots :
     - 1 slot step (kind='step', position=0, card_id=NULL, tokens=0)
     - 1 slot reward (kind='reward', position=1, card_id=NULL, tokens=NULL)
   - Résultat : Structure minimale initialisée automatiquement

4. **Modification triggers min_step/min_reward** (autoriser cascades)
   - Fonction modifiée : `slots_enforce_min_step()` et `slots_enforce_min_reward()`
   - Logique : Détecter contexte cascade (timeline supprimée) et autoriser DELETE
   - Cas autorisés : suppression compte, RGPD, maintenance technique
   - Cas bloqués : suppression manuelle standard dernier slot step/reward

**Dépendances** : `accounts`, `child_profiles`, `timelines`, `slots`, triggers min_step/min_reward existants (Migration 9)

**Vérifications** :

- INSERT `accounts` → 1 `child_profiles` créé automatiquement avec nom "Mon enfant"
- SELECT `timelines` WHERE `child_profile_id` = ... → 1 ligne
- SELECT `slots` WHERE `timeline_id` = ... → 2 lignes (1 step position 0 + 1 reward position 1)
- DELETE `accounts` → CASCADE fonctionne (pas d'erreur trigger min_step/min_reward)
- DELETE `slots` WHERE kind='step' AND dernier → échoue (trigger bloque) sauf si cascade
- Création manuelle profil enfant → déclenche aussi auto-création timeline + slots

**Effet produit** :

- ✅ Utilisateur arrive immédiatement dans une application fonctionnelle
- ✅ Jamais d'état vide (toujours 1 profil + 1 timeline + 2 slots minimaux)
- ✅ Cohérence entre création automatique (signup) et manuelle (Page Profil)

---

### Phase 5 — Sessions & progression (exécution timeline)

**Objectif** : Sessions d'exécution avec epoch + progression (union ensembliste) + transitions strictes + snapshot de fin (prévisibilité TSA)

#### Migration 10 : `20260130114000_create_sessions.sql`

**Intention** : Créer `sessions` (machine à états + epoch)

**Tables concernées** : `sessions`

**Colonnes conceptuelles** :

- `id` (PK, UUID auto)
- `child_profile_id` (FK → child_profiles(id) NOT NULL)
- `timeline_id` (FK → timelines(id) NOT NULL)
- `state` (session_state NOT NULL : active_preview / active_started / completed)
- `epoch` (INTEGER NOT NULL, défaut 1)
- `steps_total_snapshot` (INTEGER NULL ; fixé à la 1ère validation)
- `started_at` (TIMESTAMPTZ NULL ; fixé à la 1ère validation)
- `completed_at` (TIMESTAMPTZ NULL ; fixé à la complétion)
- `created_at`, `updated_at`

**Contraintes** :

- FK CASCADE : `child_profile_id`, `timeline_id`
- **Partial UNIQUE index** : `(child_profile_id, timeline_id)` WHERE state IN ('active_preview','active_started')

**Vérifications** :

- INSERT 2 sessions actives même (child_profile_id, timeline_id) échoue
- INSERT session completed puis nouvelle active réussit

---

#### Migration 11 : `20260130115000_create_session_validations.sql`

**Intention** : Créer `session_validations` (ensemble de slot_id validés)

**Tables concernées** : `session_validations`

**Colonnes conceptuelles** :

- `id` (PK, UUID auto)
- `session_id` (FK → sessions(id) NOT NULL)
- `slot_id` (FK → slots(id) NOT NULL)
- `validated_at` (TIMESTAMPTZ NOT NULL, audit uniquement)

**Contraintes** :

- FK CASCADE : `session_id`, `slot_id`
- **UNIQUE : (session_id, slot_id)**

**Vérifications** :

- Double INSERT même (session_id, slot_id) échoue (UNIQUE)

---

#### Migration 12 : `20260130116000_add_session_state_transitions.sql`

**Intention** : Défendre les invariants métier critiques DB-first

- transitions état strictes
- session completed = lecture seule
- validations : step-only, step non vide, même timeline que la session

**Objets** : fonctions + triggers sur `sessions` et `session_validations`

**Vérifications** :

- 1ère validation : active_preview → active_started + started_at fixé
- reward non validable
- step vide non validable
- validation d’un slot d’une autre timeline échoue
- validation sur session completed échoue

---

#### Migration 13 : `20260130117000_phase5_fix_sessions_validations_snapshot.sql`

**Intention** : Snapshot de fin (prévisibilité TSA)

- `steps_total_snapshot` fixé à la 1ère validation = nb de slots step non vides au démarrage effectif
- complétion quand nb validations atteint `steps_total_snapshot`

**Vérifications** :

- session démarre → snapshot fixé
- valider jusqu’au snapshot → session devient completed + completed_at fixé
- ajout d’étape après démarrage n’empêche pas la fin déjà “promise” par le snapshot

---

#### Migration 13.5 : `20260130118000_phase5_5_hardening_accounts_devices.sql`

**Intention** : Hardening foundations (timezone + devices) sans toucher sessions

- `accounts.timezone` : validation timezone IANA (fonction `public.is_valid_timezone(text)` + CHECK `accounts_timezone_valid_chk`)
- `devices` : remplacer unicité globale `device_id` par unicité composite `UNIQUE(account_id, device_id)`
- `devices` : interdire incohérence temporelle (`revoked_at` >= `created_at`)

**Vérifications** :

- `INSERT accounts.timezone = 'Paris/Europe'` rejeté (CHECK)
- `devices` : contraintes visibles via `pg_constraint` (UNIQUE composite + CHECK revoked_at)

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

## 3. Liste exhaustive des migrations (réellement présentes dans ce repo)

|   # | Fichier                                                       | Intention (résumé)                                       |
| --: | ------------------------------------------------------------- | -------------------------------------------------------- |
|   0 | `20260130100000_create_extensions_enums.sql`                  | Extensions + enums de base                               |
|   1 | `20260130101000_create_accounts.sql`                          | accounts (extension auth.users)                          |
|   2 | `20260130102000_create_devices.sql`                           | devices (multi-device + révocation)                      |
|   3 | `20260130103000_create_child_profiles.sql`                    | profils enfants                                          |
|   4 | `20260130104000_create_cards.sql`                             | cards (bank/personal)                                    |
|   5 | `20260130105000_create_categories.sql`                        | categories                                               |
|   6 | `20260130106000_create_user_card_categories.sql`              | pivot user↔card↔category                               |
|   7 | `20260130107000_cards_normalize_published.sql`                | normalisation published                                  |
|   8 | `20260130108000_categories_remap_on_delete.sql`               | remap catégories à la suppression                        |
|   9 | `20260130109000_create_timelines.sql`                         | timelines (1:1 child_profile)                            |
|  10 | `20260130110000_create_slots.sql`                             | slots                                                    |
|  11 | `20260130111000_slots_enforce_min_step.sql`                   | invariant min step                                       |
|  12 | `20260130112000_slots_enforce_min_reward.sql`                 | invariant min reward                                     |
|  13 | `20260130113000_auto_create_child_profile_timeline.sql`       | auto-create profil+timeline+slots                        |
|  14 | `20260130114000_create_sessions.sql`                          | sessions                                                 |
|  15 | `20260130115000_create_session_validations.sql`               | session_validations                                      |
|  16 | `20260130116000_add_session_state_transitions.sql`            | transitions sessions + règles validations                |
|  17 | `20260130117000_phase5_fix_sessions_validations_snapshot.sql` | snapshot steps_total + completion                        |
|  18 | `20260130118000_phase5_5_hardening_accounts_devices.sql`      | timezone IANA + devices UNIQUE composite + CHECK revoked |

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

- [ ] Table `sessions` existe avec `epoch`, `started_at`, `completed_at`, `steps_total_snapshot`
- [ ] Partial UNIQUE index : 1 session active max par (child_profile_id, timeline_id)
- [ ] Création session incohérente (child_profile_id != owner de timeline_id) échoue
- [ ] UPDATE epoch décroissant échoue
- [ ] Table `session_validations` existe avec UNIQUE `(session_id, slot_id)`
- [ ] Validation reward échoue
- [ ] Validation step vide (card_id NULL) échoue
- [ ] Validation slot d’une autre timeline échoue
- [ ] Validation sur session completed échoue (lecture seule)
- [ ] 1ère validation : session passe active_started + snapshot fixé
- [ ] Dernière validation selon snapshot : session passe completed + completed_at fixé

**Verdict** : ✅ GO si toutes vérifications passent, ❌ STOP sinon

---

## 5. Tests de contrat (sans code)

### Après Phase 4 (Timeline/Slots)

**Assertions à vérifier** :

- [ ] **Timeline unique par enfant** : Double INSERT même `child_profile_id` → échoue (UNIQUE)
- [ ] **Slot reward toujours présent** : DELETE dernier slot reward → échoue (trigger)
- [ ] **Slot card nullable** : INSERT slot sans `card_id` → réussit (NULL autorisé)
- [ ] **Slot_id stable** : UPDATE `position` ne change PAS le `slot_id` (UUID PK)

---

### Après Phase 4.x (Auto-création profil + timeline + slots) — PRODUCT_MODEL.md Ch.2.6

**Assertions CRITIQUES à vérifier** :

- [ ] **Profil enfant auto-créé** : INSERT `accounts` → 1 `child_profiles` créé avec `name='Mon enfant'`
- [ ] **Timeline auto-créée** : Profil enfant créé → 1 `timelines` créée avec `child_profile_id` correspondant
- [ ] **Slots minimaux auto-créés** : Timeline créée → 2 `slots` créés :
  - 1 slot step (kind='step', position=0, card_id=NULL, tokens=0)
  - 1 slot reward (kind='reward', position=1, card_id=NULL, tokens=NULL)
- [ ] **Cascade complète** : INSERT `accounts` → 1 profil + 1 timeline + 2 slots (4 lignes au total)
- [ ] **Création manuelle profil** : INSERT `child_profiles` manuel → 1 timeline + 2 slots créés automatiquement
- [ ] **CASCADE DELETE autorisé** : DELETE `accounts` → pas d'erreur trigger min_step/min_reward (cascade fonctionne)
- [ ] **DELETE manuel bloqué** : DELETE dernier slot step hors cascade → échoue (trigger bloque)
- [ ] **Application jamais vide** : Compte créé → toujours au moins 1 profil + 1 timeline + 2 slots

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
- [x] **Timezone validation** : ✅ **enforced en DB** via CHECK `accounts_timezone_valid_chk` (fonction `public.is_valid_timezone(text)`), en plus de toute validation applicative éventuelle

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
3. ⚠️ Trancher 6.3 avant Phase 10 (Seed "Sans catégorie" — recommandation fallback applicatif)
4. ⚠️ Trancher 6.4 avant Phase 5 (session_validations — recommandation union simple)

---

### Prochaines étapes

1. ✅ **Traduction SQL** : Convertir ce plan conceptuel en migrations SQL concrètes
2. 🔒 **Storage Policies** : **PRIORITÉ ABSOLUE** — Configurer avant tout upload image personnelle
3. ✅ **Triggers & Fonctions** : Défendre invariants (Phase 9-10)
4. ✅ **Tests DB** : Vérifier tous tests de contrat (section 5)
5. ⚠️ **Import Visitor** : Logique applicative avec transactions (hors périmètre migrations)

---

**📄 Document prêt pour traduction en migrations SQL DB-first.**

**🔒 CRITIQUE** : Les **Storage Policies** (Migrations 16-17) doivent être implémentées **AVANT** tout upload d'image personnelle en production.
