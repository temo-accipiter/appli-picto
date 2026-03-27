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
- FK : category_id → categories(id) (RESTRICT/NO ACTION) ; suppression de catégorie = trigger de réassignation vers catégorie système "Sans catégorie"
- **UNIQUE : `(user_id, card_id)`** (CONTRAT EXPLICITE, DB_BLUEPRINT.md §2.322)

**Dépendances** : `accounts`, `cards`, `categories`

**Vérifications** :

- Double INSERT même `(user_id, card_id)` échoue (UNIQUE)
- "Sans catégorie" : la catégorie système existe toujours en DB (seed automatique à création account).
  L’absence de ligne pivot peut être interprétée en lecture UI comme "Sans catégorie", mais la DB garantit une cible stable ("Sans catégorie") pour les opérations DB (remap lors suppression de catégorie, intégrité).

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

#### Migration 13.6 : `20260202121000_phase5_8_invariants_reward_bank_guard.sql`

**Intention** : Invariants DB critiques (reward unique + suppression carte bank référencée)

- Slots : **exactement 1 slot Récompense par timeline**
  - UNIQUE partiel : `UNIQUE (timeline_id) WHERE kind='reward'`
  - Trigger anti-contournement (INSERT/UPDATE sur `kind`/`timeline_id`)
  - STOP si données existantes avec >1 reward (exception explicite)
- Cards : interdire DELETE d’une carte bank si référencée
  - Trigger BEFORE DELETE sur `cards` (check `slots` + `user_card_categories`)

**Vérifications** :

- INSERT d’un 2e reward pour une timeline échoue (UNIQUE/trigger)
- UPDATE step → reward échoue si reward déjà présent
- UPDATE reward → step ou reward → autre timeline échoue (trigger)
- DELETE carte bank référencée (slots/pivot) échoue
- DELETE carte bank non référencée réussit

---

### Phase 6 — Séquences (aide visuelle décomposition)

**Objectif** : Séquences visuelles (carte mère → étapes)

#### Migration 22 : `20260202122000_phase6_create_sequences.sql`

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
- **UNIQUE : `(account_id, mother_card_id)`** (0..1 séquence par carte par compte, DB_BLUEPRINT.md invariant #19)

**Dépendances** : `accounts`, `cards`

**Vérifications** :

- Double INSERT même `(account_id, mother_card_id)` échoue (UNIQUE)

---

#### Migration 23 : `20260202123000_phase6_create_sequence_steps.sql`

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
- FK : `step_card_id` → `cards(id)` ON DELETE CASCADE
- UNIQUE : `(sequence_id, position)` **DEFERRABLE** (reorder multi-lignes)
- **UNIQUE : `(sequence_id, step_card_id)`** (pas doublons carte dans même séquence, DB_BLUEPRINT.md invariant #21)
- `position` >= 0 (aucun gapless imposé par la DB)

**Invariant** : Minimum 2 étapes par séquence **ajouté en migration suivante** (triggers DEFERRABLE)

**Dépendances** : `sequences`, `cards`

**Vérifications** :

- Double INSERT même `(sequence_id, step_card_id)` échoue (UNIQUE)
- Reorder transactionnel (swap positions) passe grâce à DEFERRABLE

---

#### Migration 24 : `20260202124000_phase6_add_sequence_invariants.sql`

**Intention** : Invariants DB séquences (min 2 strict) + ownership guards + durcissement delete bank

**Contenu conceptuel** :

- Fonction + constraint triggers DEFERRABLE : **min 2 étapes strict** (commit-safe) sur `sequences` et `sequence_steps`
- Ownership guard (sans RLS) :
  - `sequences.mother_card_id` personnelle → même `account_id`
  - `sequence_steps.step_card_id` personnelle → même compte que la séquence
  - cartes bank autorisées
- Extension du guard suppression carte bank : inclut `sequences` + `sequence_steps`

**Dépendances** : `sequences`, `sequence_steps`, `cards`

**Vérifications** :

- INSERT séquence sans 2 étapes dans la même transaction échoue au COMMIT
- DELETE étape si COUNT = 2 échoue (constraint trigger)
- DELETE carte bank référencée (slots/categories/séquences/étapes) échoue

---

## 3. Liste exhaustive des migrations

> **41 migrations** réparties sur 10 phases. Toutes appliquées et validées par 130 smoke tests.

### Phase 1 — Fondation

|   # | Fichier                                      | Intention                       |
| --: | -------------------------------------------- | ------------------------------- |
|   0 | `20260130100000_create_extensions_enums.sql` | Extensions (pgcrypto) + 5 enums |

### Phase 2 — Core ownership

|   # | Fichier                                    | Intention                           |
| --: | ------------------------------------------ | ----------------------------------- |
|   1 | `20260130101000_create_accounts.sql`       | accounts (extension auth.users)     |
|   2 | `20260130102000_create_devices.sql`        | devices (multi-device + révocation) |
|   3 | `20260130103000_create_child_profiles.sql` | profils enfants                     |

### Phase 3 — Cards & catégories

|   # | Fichier                                          | Intention                         |
| --: | ------------------------------------------------ | --------------------------------- |
|   4 | `20260130104000_create_cards.sql`                | cards (bank/personal)             |
|   5 | `20260130105000_create_categories.sql`           | categories                        |
|   6 | `20260130106000_create_user_card_categories.sql` | pivot user↔card↔category        |
|   7 | `20260130107000_cards_normalize_published.sql`   | normalisation published (trigger) |
|   8 | `20260130108000_categories_remap_on_delete.sql`  | remap catégories à la suppression |

### Phase 4 — Timeline & slots

|   # | Fichier                                                 | Intention                                        |
| --: | ------------------------------------------------------- | ------------------------------------------------ |
|   9 | `20260130109000_create_timelines.sql`                   | timelines (1:1 child_profile)                    |
|  10 | `20260130110000_create_slots.sql`                       | slots (step/reward, position, tokens)            |
|  11 | `20260130111000_slots_enforce_min_step.sql`             | invariant min 1 step                             |
|  12 | `20260130112000_slots_enforce_min_reward.sql`           | invariant min 1 reward                           |
|  13 | `20260130113000_auto_create_child_profile_timeline.sql` | auto-create profil+timeline+slots + cascade-safe |

### Phase 5 — Sessions, progression & hardening

|   # | Fichier                                                              | Intention                                                      |
| --: | -------------------------------------------------------------------- | -------------------------------------------------------------- |
|  14 | `20260130114000_create_sessions.sql`                                 | sessions (epoch, state machine, partial UNIQUE)                |
|  15 | `20260130115000_create_session_validations.sql`                      | session_validations (union ensembliste)                        |
|  16 | `20260130116000_add_session_state_transitions.sql`                   | transitions sessions + règles validations                      |
|  17 | `20260130117000_phase5_fix_sessions_validations_snapshot.sql`        | snapshot steps_total + auto-completion                         |
|  18 | `20260130118000_phase5_5_hardening_accounts_devices.sql`             | timezone IANA CHECK + devices UNIQUE composite + CHECK revoked |
|  19 | `20260201119000_phase5_6_corrective_integrity.sql`                   | hardening intégrité (ownership + reset/guards)                 |
|  20 | `20260201120000_phase5_7_seed_system_category_on_account_create.sql` | seed catégorie système "Sans catégorie"                        |
|  21 | `20260202121000_phase5_8_invariants_reward_bank_guard.sql`           | reward unique + delete guard cartes bank référencées           |

### Phase 6 — Séquences

|   # | Fichier                                             | Intention                                           |
| --: | --------------------------------------------------- | --------------------------------------------------- |
|  22 | `20260202122000_phase6_create_sequences.sql`        | sequences (0..1 par carte par compte)               |
|  23 | `20260202123000_phase6_create_sequence_steps.sql`   | sequence_steps (ordre, doublons, DEFERRABLE)        |
|  24 | `20260202124000_phase6_add_sequence_invariants.sql` | min 2 strict + ownership guards + bank guard étendu |

### Phase 7 — RLS (Row Level Security)

|   # | Fichier                                                        | Intention                                                      |
| --: | -------------------------------------------------------------- | -------------------------------------------------------------- |
|  25 | `20260203125000_phase7_0_bugfix_cards_image_url_immutable.sql` | Bugfix image_url immutable (personal)                          |
|  26 | `20260203126000_phase7_1_rls_helpers.sql`                      | Helpers `is_admin()`, `is_execution_only()` (SECURITY DEFINER) |
|  27 | `20260203127000_phase7_2_enable_rls_and_grants.sql`            | Enable RLS + REVOKE/GRANT strict 12 tables                     |
|  28 | `20260203128000_phase7_3_rls_identity.sql`                     | RLS Identity (accounts, devices, child_profiles)               |
|  29 | `20260203129000_phase7_4_rls_library.sql`                      | RLS Library (cards, categories, pivot) + D2 admin isolation    |
|  30 | `20260203130000_phase7_5_admin_support_channel.sql`            | Admin support ciblé (no mass surveillance)                     |
|  31 | `20260203131000_phase7_6_rls_planning.sql`                     | RLS Planning (timelines, slots)                                |
|  32 | `20260203132000_phase7_7_rls_sessions.sql`                     | RLS Sessions (sessions, session_validations)                   |
|  33 | `20260203133000_phase7_8_rls_sequences.sql`                    | RLS Sequences (sequences, sequence_steps)                      |

### Phase 8 — Storage (migration à deux niveaux)

|   # | Fichier                                                                  | Runner                        | Intention                                              |
| --: | ------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------ |
|  34 | `migrations/20260204134000_phase8_1_create_storage_buckets.sql`          | `postgres` (standard)         | Buckets personal-images (privé) + bank-images (public) |
|  35 | `migrations_privileged/20260204102000_phase8_2_storage_rls_policies.sql` | `supabase_admin` (privilégié) | 7 RLS policies sur storage.objects                     |

### Phase 9 — Quotas & downgrade

|   # | Fichier                                                                     | Intention                                                       |
| --: | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
|  36 | `20260204135000_phase9_1_quota_month_context.sql`                           | Table account_quota_months + ensure_quota_month_context()       |
|  37 | `20260204136000_phase9_2_quota_helpers.sql`                                 | Helpers get*account_status(), quota*\*\_limit(), feature gating |
|  38 | `20260204137000_phase9_3_quota_check_cards.sql`                             | Trigger BEFORE INSERT cards (personal) — quota stock + mensuel  |
|  39 | `20260204138000_phase9_4_quota_check_profiles_devices.sql`                  | Triggers BEFORE INSERT child_profiles + devices                 |
|  40 | `20260204139000_phase9_5_downgrade_lock_profiles_on_session_completion.sql` | SECURITY DEFINER trigger — verrouillage progressif downgrade    |
|  41 | `20260204140000_phase9_6_fix_child_profiles_auto_timeline_privileges.sql`   | Fix privilèges auto-création timeline sous RLS                  |

### Phase 10 — Synchronisation & offline

|   # | Fichier                  | Intention                                  |
| --: | ------------------------ | ------------------------------------------ |
|   — | `SYNC_CONTRACT.md`       | Contrat sync/offline (0 migration DB)      |
|   — | `phase10_sync_smoke.sql` | 9 smoke tests validant les invariants sync |

---

## 4. Gates de validation — RÉSULTATS

> Toutes les gates ont été passées avec succès. Les vérifications sont assurées par les smoke tests automatisés.

### Gate 1 — Après Phase 3 (Cards/Catégories/Pivot) ✅

- [x] Table `cards` existe avec types bank/personal
- [x] Table `categories` existe avec `is_system`
- [x] Table `user_card_categories` existe avec UNIQUE `(user_id, card_id)`
- [x] INSERT carte banque avec `account_id` non NULL échoue (CHECK)
- [x] Double INSERT même `(user_id, card_id)` échoue (UNIQUE)

**Couvert par** : `phase3_smoke.sql` (15 tests)

---

### Gate 2 — Après Phase 5 (Sessions/Progression) ✅

- [x] Table `sessions` existe avec `epoch`, `started_at`, `completed_at`, `steps_total_snapshot`
- [x] Partial UNIQUE index : 1 session active max par (child_profile_id, timeline_id)
- [x] Création session incohérente (child_profile_id != owner de timeline_id) échoue
- [x] UPDATE epoch décroissant échoue
- [x] Table `session_validations` existe avec UNIQUE `(session_id, slot_id)`
- [x] Validation reward échoue
- [x] Validation step vide (card_id NULL) échoue
- [x] Validation slot d'une autre timeline échoue
- [x] Validation sur session completed échoue (lecture seule)
- [x] 1ère validation : session passe active_started + snapshot fixé
- [x] Dernière validation selon snapshot : session passe completed + completed_at fixé

**Couvert par** : `phase5_smoke.sql` (15 tests)

---

### Gate 3 — Après Phase 7 (RLS) ✅

- [x] RLS activé sur 12 tables
- [x] Isolation accounts, profiles, timelines, slots, sessions, categories, sequences
- [x] Cards : bank published visible, personal owner-only, admin ne voit pas personal
- [x] Execution-only enforcement (INSERT structural bloqué)
- [x] Locked profile = read-only
- [x] Devices DELETE bloqué (révocation non-destructive)
- [x] Session completed = read-only via RLS
- [x] image_url immutable (personal)
- [x] Admin support ciblé (non-admin bloqué)

**Couvert par** : `phase7_smoke.sql` (20 tests)

---

### Gate 4 — Après Phase 9 (Quotas) ✅

- [x] Feature gating free → personal cards indisponibles
- [x] Quotas profils/devices/cards respectés par tier
- [x] Downgrade lock : session completed → profils excédentaires verrouillés (déterministe)
- [x] Admin illimité
- [x] SECURITY DEFINER functions protégées (pg_trigger_depth guard)

**Couvert par** : `phase9_smoke.sql` (20 tests)

---

## 5. Tests de contrat — RÉSULTATS

> **130 smoke tests** couvrant 100% des invariants DB. Tous PASS.

### Récapitulatif par phase

| Phase                             | Fichier smoke test       | Tests   | Statut |
| --------------------------------- | ------------------------ | ------- | ------ |
| **1** — Extensions/Enums          | `phase1_smoke.sql`       | 8       | ✅     |
| **2** — Accounts/Devices/Profiles | `phase2_smoke.sql`       | 15      | ✅     |
| **3** — Cards/Categories/Pivot    | `phase3_smoke.sql`       | 15      | ✅     |
| **4** — Timelines/Slots           | `phase4_smoke.sql`       | 12      | ✅     |
| **5** — Sessions/Validations      | `phase5_smoke.sql`       | 15      | ✅     |
| **6** — Sequences                 | `phase6_smoke.sql`       | 14      | ✅     |
| **7** — RLS                       | `phase7_smoke.sql`       | 20      | ✅     |
| **8** — Storage                   | `phase8_smoke.sql`       | 2+9\*   | ✅     |
| **9** — Quotas/Downgrade          | `phase9_smoke.sql`       | 20      | ✅     |
| **10** — Sync/Offline             | `phase10_sync_smoke.sql` | 9       | ✅     |
| **Total**                         |                          | **130** | ✅     |

\*Phase 8 : 2 tests PASS (buckets) + 9 tests SKIP gracieux si migration privilégiée non appliquée. Tous PASS avec `scripts/db-reset-with-storage.sh`.

### Commande d'exécution

```bash
for f in supabase/tests/smoke-tests/phase*.sql; do
  echo "=== $(basename $f) ==="
  psql "postgresql://postgres:postgres@127.0.0.1:5432/postgres" \
    -v ON_ERROR_STOP=1 -f "$f" || exit 1
done
```

### Couverture invariants

Les 24 invariants identifiés dans DB_BLUEPRINT.md §4 sont tous couverts par au moins un smoke test :

| Invariant                               | Couvert par                      |
| --------------------------------------- | -------------------------------- |
| #1 Profil auto-créé                     | phase2 TEST 3                    |
| #2 Timeline auto-créée                  | phase2 TEST 3                    |
| #3 Slots minimaux auto-créés            | phase2 TEST 3, 13                |
| #4 Timeline unique par enfant           | phase4 TEST 2                    |
| #5 Slot_id stable (UUID ≠ position)     | phase4 TEST 12                   |
| #6 Min 1 reward                         | phase4 TEST 7                    |
| #7 Min 1 step                           | phase4 TEST 6                    |
| #8 card_id nullable                     | phase4 TEST 5 (implicite)        |
| #9 Tokens 0-5 step, NULL reward         | phase4 TEST 5                    |
| #10 Cascade DELETE autorisée            | phase2 TEST 12                   |
| #11 1 session active max                | phase5 TEST 3                    |
| #12 Epoch monotone                      | phase5 TEST 8, 9                 |
| #13 Validations = union slot_id         | phase5 TEST 10, phase10 TEST 1-2 |
| #14 Fusion monotone                     | phase10 TEST 1-2                 |
| #15 Pivot unique (user, card)           | phase3 TEST 9                    |
| #16 "Sans catégorie" seedée             | phase2 TEST 4                    |
| #17 Bank jamais supprimée si référencée | phase6 TEST 12                   |
| #18 Image figée personal                | phase7 TEST 13                   |
| #19 0..1 séquence par carte             | phase6 TEST 5                    |
| #20 Min 2 steps séquence                | phase6 TEST 3, 4                 |
| #21 Pas doublons steps                  | phase6 TEST 6                    |
| #22 Ownership séquences                 | phase6 TEST 7, 8                 |
| #23 Révocation non-destructive          | phase7 TEST 16                   |
| #24 Profil locked = lecture seule       | phase7 TEST 15                   |

---

## 6. Architecture migrations privilégiées

La Phase 8 a introduit une architecture de migration à deux niveaux :

```
supabase/
├── migrations/                          # Migrations standard (supabase db reset)
│   └── ...41 fichiers...
├── migrations_privileged/               # Migrations privilégiées (supabase_admin)
│   └── 20260204102000_phase8_2_storage_rls_policies.sql
scripts/
└── db-reset-with-storage.sh             # Wrapper pour reset complet
```

**Raison** : le runner standard (`postgres`) ne peut pas créer de policies sur `storage.objects`. Seul `supabase_admin` a les droits nécessaires.

**Workflow de reset** :

```bash
# Recommandé : script wrapper
./scripts/db-reset-with-storage.sh

# Manuel :
supabase db reset
psql postgresql://supabase_admin:postgres@127.0.0.1:5432/postgres \
  -v ON_ERROR_STOP=1 \
  -f supabase/migrations_privileged/20260204102000_phase8_2_storage_rls_policies.sql
```

---

## 7. Verdict final

### ✅ IMPLÉMENTATION COMPLÈTE

| Critère                                             | Statut |
| --------------------------------------------------- | ------ |
| 41 migrations appliquées sans erreur                | ✅     |
| 13 tables + 5 enums créés                           | ✅     |
| 24 invariants défendus (triggers, constraints, RLS) | ✅     |
| 20 RLS policies actives (12 tables)                 | ✅     |
| 7 Storage policies (2 buckets)                      | ✅     |
| Quotas hardcodés (3 tiers)                          | ✅     |
| Downgrade lock (SECURITY DEFINER)                   | ✅     |
| Contrat sync formalisé (SYNC_CONTRACT.md)           | ✅     |
| 130 smoke tests PASS                                | ✅     |
| Tag Git : `smoke-tests-v1.0`                        | ✅     |

### Décisions confirmées et implémentées

- ✅ **Timezone IANA** : CHECK DB `accounts_timezone_valid_chk` (fonction `is_valid_timezone()`)
- ✅ **UUID** : `pgcrypto` + `gen_random_uuid()` partout
- ✅ **Admin strict** : owner-only + canal support ciblé
- ✅ **Quotas hardcodés** : fonctions SQL (free/subscriber/admin)
- ✅ **Union simple validations** : fusion ensembliste, `validated_at` = audit-only
- ✅ **Storage** : personal-images privé (no UPDATE = immutabilité), bank-images public
- ✅ **devices.account_id** : NOT NULL + ON DELETE CASCADE

### Étapes restantes (hors périmètre DB)

1. ⚠️ **Import Visitor** : Logique applicative avec transactions (section 2, Phase 2 notes)
2. 🚀 **Frontend** : Implémentation client basée sur SYNC_CONTRACT.md et les invariants DB

---

### Principe de clôture des phases

Chaque phase a respecté les règles suivantes :

- aucune dette conceptuelle introduite,
- aucun mélange de responsabilités (planning / jetons / séquences),
- aucune règle métier critique déplacée côté frontend,
- documentation mise à jour après validation complète.

---

**📄 Base de données complète — 41 migrations, 13 tables, 24 invariants, 130 smoke tests.**

**Prête pour l'implémentation frontend.**
