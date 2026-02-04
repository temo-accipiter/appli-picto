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

## 3. Liste exhaustive des migrations (réellement présentes dans ce repo)

|   # | Fichier                                                              | Intention (résumé)                                           |
| --: | -------------------------------------------------------------------- | ------------------------------------------------------------ |
|   0 | `20260130100000_create_extensions_enums.sql`                         | Extensions + enums de base                                   |
|   1 | `20260130101000_create_accounts.sql`                                 | accounts (extension auth.users)                              |
|   2 | `20260130102000_create_devices.sql`                                  | devices (multi-device + révocation)                          |
|   3 | `20260130103000_create_child_profiles.sql`                           | profils enfants                                              |
|   4 | `20260130104000_create_cards.sql`                                    | cards (bank/personal)                                        |
|   5 | `20260130105000_create_categories.sql`                               | categories                                                   |
|   6 | `20260130106000_create_user_card_categories.sql`                     | pivot user↔card↔category                                   |
|   7 | `20260130107000_cards_normalize_published.sql`                       | normalisation published                                      |
|   8 | `20260130108000_categories_remap_on_delete.sql`                      | remap catégories à la suppression                            |
|   9 | `20260130109000_create_timelines.sql`                                | timelines (1:1 child_profile)                                |
|  10 | `20260130110000_create_slots.sql`                                    | slots                                                        |
|  11 | `20260130111000_slots_enforce_min_step.sql`                          | invariant min step                                           |
|  12 | `20260130112000_slots_enforce_min_reward.sql`                        | invariant min reward                                         |
|  13 | `20260130113000_auto_create_child_profile_timeline.sql`              | auto-create profil+timeline+slots                            |
|  14 | `20260130114000_create_sessions.sql`                                 | sessions                                                     |
|  15 | `20260130115000_create_session_validations.sql`                      | session_validations                                          |
|  16 | `20260130116000_add_session_state_transitions.sql`                   | transitions sessions + règles validations                    |
|  17 | `20260130117000_phase5_fix_sessions_validations_snapshot.sql`        | snapshot steps_total + completion                            |
|  18 | `20260130118000_phase5_5_hardening_accounts_devices.sql`             | timezone IANA + devices UNIQUE composite + CHECK revoked     |
|  19 | `20260201119000_phase5_6_corrective_integrity.sql`                   | hardening intégrité (ownership + reset/guards)               |
|  20 | `20260201120000_phase5_7_seed_system_category_on_account_create.sql` | seed DB catégorie système “Sans catégorie”                   |
|  21 | `20260202121000_phase5_8_invariants_reward_bank_guard.sql`           | reward unique + delete guard cartes bank référencées         |
|  22 | `20260202122000_phase6_create_sequences.sql`                         | sequences (0..1 par carte par compte)                        |
|  23 | `20260202123000_phase6_create_sequence_steps.sql`                    | sequence_steps (ordre, doublons, deferrable)                 |
|  24 | `20260202124000_phase6_add_sequence_invariants.sql`                  | invariants séquences (min 2 strict + ownership + bank guard) |

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

### Après Phase 5.8 (Invariants reward + bank)

**Assertions à vérifier** :

- [ ] **Reward unique** : INSERT 2e slot reward même `timeline_id` → échoue (UNIQUE/trigger)
- [ ] **Contournement UPDATE bloqué** : UPDATE step → reward quand reward existe → échoue
- [ ] **Reward immuable** : UPDATE reward `kind` ou `timeline_id` → échoue
- [ ] **Bank delete guard** : DELETE carte bank référencée (slot/pivot) → échoue
- [ ] **Bank delete OK si non référencée** : DELETE carte bank non utilisée → OK

---

### Après Phase 6 — Séquences

Les phases suivantes ne doivent être abordées **qu’après validation complète de la Phase 6 (Séquences)**,
incluant :

- migrations DB appliquées sans erreur,
- smoke tests manuels validant les invariants,
- alignement documenté entre PRODUCT_MODEL, DB_BLUEPRINT et la DB réelle.

#### Phase 7 — RLS (Row Level Security)

Objectif :

- Activer les politiques RLS sur l'ensemble des tables persistantes.
- Traduire strictement les règles d'accès définies dans le contrat produit :
  - isolation par `account_id`,
  - accès en lecture/écriture selon le rôle (visitor / free / subscriber / admin),
  - aucune règle métier critique portée côté frontend.

**Migrations implémentées** :

- **Phase 7.0** : Bugfix `cards.image_url` immutable (personal) - trigger enforcement
- **Phase 7.1** : RLS helpers (`is_admin()`, `is_execution_only()`) - SECURITY DEFINER minimal
- **Phase 7.2** : Enable RLS + REVOKE/GRANT strict sur 12 tables
- **Phase 7.3** : RLS Identity (accounts, devices, child_profiles) + execution-only enforcement
- **Phase 7.4** : RLS Library (cards, categories, pivot) + D2 admin isolation + BLOCKER 5 (bank unpublished readable if referenced)
- **Phase 7.5** : Admin support channel (targeted access, no mass surveillance)
- **Phase 7.6** : RLS Planning (timelines, slots)
- **Phase 7.7** : RLS Sessions (sessions, session_validations)
- **Phase 7.8** : RLS Sequences (sequences, sequence_steps)

**Blockers résolus** :

1. **BLOCKER 1** : `admin_list_accounts_summary` supprimée (violait owner-only strict + mass surveillance)
2. **BLOCKER 2** : `search_path` hardened sur toutes fonctions SECURITY DEFINER (`SET search_path = public, pg_temp`)
3. **BLOCKER 3** : REVOKE/GRANT explicit sur toutes fonctions (pas de PUBLIC)
4. **BLOCKER 4** : execution-only enforcement (child_profiles, cards, categories, sequences INSERT/UPDATE/DELETE bloqués)
5. **BLOCKER 5** : bank unpublished readable if referenced by owned objects (TSA critical, prévisibilité)

**Décisions appliquées** :

- **D2** : Admin ne peut JAMAIS accéder personal cards d'autres users (RLS + Storage Policies primaires)
- **D3** : execution-only := `status='free' AND COUNT(child_profiles) > 1` (détection sans flag)
- **D4** : is_admin() minimal (lit uniquement compte courant, pas mass surveillance)

Contraintes :

- Aucune modification de structure DB ne doit être introduite à cette phase.
- Les policies doivent s’appuyer exclusivement sur les invariants déjà garantis par la DB.

---

#### Phase 8 — Storage (images cartes)

Objectif :

- Mettre en place le stockage des images associées aux cartes.
- Respecter strictement les règles produit :
  - images personnelles privées,
  - images banque accessibles en lecture,
  - aucune modification d'image après création pour les cartes personnelles.

**🔒 CRITIQUE — Storage Policies obligatoires AVANT upload production** :

- **Bucket `personal-images` (privé)** :
  - SELECT : `account_id = auth.uid()` (owner-only)
  - INSERT : `account_id = auth.uid()` (owner-only)
  - UPDATE : `account_id = auth.uid()` (owner-only)
  - DELETE : `account_id = auth.uid()` (owner-only)
  - **AUCUN bypass Admin** (Admin ne peut JAMAIS accéder fichiers images personal)

- **Bucket `bank-images` (public)** :
  - SELECT : PUBLIC (lecture tous)
  - INSERT/UPDATE/DELETE : Admin uniquement

**Note** : Les RLS table `cards` (Phase 7.4) sont une mesure secondaire. La confidentialité réelle des images personnelles repose sur les **Storage Policies** (un Admin ne doit jamais pouvoir accéder aux fichiers, même en connaissant l'URL).

Contraintes :

- Le storage ne doit pas introduire de nouvelle logique métier.
- Toute règle critique (immutabilité, ownership) doit déjà être garantie par la DB.

---

#### Phase 9 — Quotas & plans

Objectif :

- Appliquer les limites liées aux plans (free / subscriber / admin) :
  - nombre de profils enfants,
  - nombre d’appareils,
  - création de cartes personnelles.

Contraintes :

- Les quotas sont des **règles métier DB**, jamais des règles UI.
- Les dépassements doivent être bloqués côté serveur (DB ou policies), avec un retour explicite.

---

#### Phase 10 — Synchronisation & offline

Objectif :

- Formaliser les règles de synchronisation cloud / local.
- Définir explicitement :
  - les états persistés en DB,
  - les états purement locaux (non synchronisés),
  - les comportements en cas de conflit ou de reprise.

Contraintes :

- Aucun état ambigu entre local et cloud.
- Les états critiques (sessions, progression, séquences) restent toujours DB-authoritative.

---

#### Principe de clôture des phases

Chaque phase post-Phase 6 doit respecter les règles suivantes :

- aucune dette conceptuelle introduite,
- aucun mélange de responsabilités (planning / jetons / séquences),
- aucune règle métier critique déplacée côté frontend,
- documentation mise à jour **avant** passage à la phase suivante.

---

## 7. Verdict final

### ✅ **READY sous conditions**

**Checklist des conditions** :

- [x] **Décision 6.1** (Admin accès `accounts`) → ✅ **CONFIRMÉ Option A strict** (owner-only uniquement)
- [x] **Décision 6.2** (Bucket banque) → ✅ **CONFIRMÉ Option A Supabase Storage** (bank-images public + personal-images privé)
- [x] Décision 6.3 (Catégorie système "Sans catégorie") → ✅ implémentée en DB (migration 20260201120000_phase5_7_seed_system_category_on_account_create.sql)
- [ ] **Décision 6.4** (Timestamps validation) tranchée → recommandation **Option A union simple** (conserver `validated_at` audit uniquement)
- [x] **Décision 6.5** : ✅ Aucune décision DB requise (logique UI)
- [x] **UUID** : ✅ **CONFIRMÉ pgcrypto** + `gen_random_uuid()` partout
- [x] **devices.account_id** : ✅ **CONFIRMÉ NOT NULL** + ON DELETE CASCADE
- [x] **Timezone validation** : ✅ **enforced en DB** via CHECK `accounts_timezone_valid_chk` (fonction `public.is_valid_timezone(text)`), en plus de toute validation applicative éventuelle

**Points bloquants si non tranchés** :

- **6.1** : ✅ **CONFIRMÉ Option A strict** — Admin n'a AUCUN accès global `accounts`
- **6.2** : ✅ **CONFIRMÉ Option A Supabase Storage** — 2 buckets (bank-images public + personal-images privé)
- 6.3 : ✅ Déjà implémentée (seed DB + unicité catégorie système + delete interdit/remap).
- **6.4** : Non bloquant (choix design, Migration 12 inclut colonne par défaut)

**Décisions confirmées** :

- ✅ **6.1 = Option A strict** : RLS `accounts` = owner-only uniquement (pas d'accès admin global)
- ✅ **6.2 = Option A Supabase Storage** : Buckets `bank-images` (public) + `personal-images` (privé owner-only)
- ✅ **Timezone validation IANA** : Responsabilité applicative (pas de CHECK DB, validation front/edge functions)
- ✅ **UUID = pgcrypto** : Utiliser `gen_random_uuid()` partout (standard PostgreSQL moderne)
- ✅ **devices.account_id = NOT NULL** : FK ON DELETE CASCADE (pas de devices orphelins)

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
