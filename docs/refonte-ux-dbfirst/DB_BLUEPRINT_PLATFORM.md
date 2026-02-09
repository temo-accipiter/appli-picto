# DB_BLUEPRINT_PLATFORM.md

> **Version** : 1 (dérivé de PLATFORM.md v5 + PRODUCT_MODEL_PLATFORM.md v1)  
> **Date** : 2026-02-08  
> **Périmètre** : module **plateforme** (billing Stripe, RGPD, suppression compte, préférences, admin audit).  
> **DB-first strict** : ce blueprint décrit **les tables/contraintes/RLS/triggers** nécessaires ; toute règle “invariant” doit être enforce côté DB.

---

## 0. Dépendances avec le schéma “core”

Ce module dépend des entités **déjà existantes** dans le core (non redéfinies ici) :

- `accounts(id, status, …)` (statut `free/subscriber/admin` déjà utilisé pour quotas/RLS).
- Auth Supabase (edge functions avec `service_role`).

Ce module **ne doit créer aucun accès** aux contenus privés (ex : Storage images).

---

## 1. Billing Stripe

### 1.1 Table `subscriptions`

**Rôle** : projection locale minimaliste de l’abonnement Stripe, utilisée pour piloter `accounts.status`.  
**Cardinalité** : `accounts (1) → subscriptions (0..n)` avec contrainte “au plus 1 actif”.

#### Colonnes (source PLATFORM §1.4.3)

| Colonne                  | Type        |     Null | Défaut              | Notes                                 |
| ------------------------ | ----------- | -------: | ------------------- | ------------------------------------- |
| `id`                     | uuid        | NOT NULL | `gen_random_uuid()` | PK                                    |
| `account_id`             | uuid        | NOT NULL | —                   | FK → `accounts(id)` ON DELETE CASCADE |
| `stripe_customer_id`     | text        |     NULL | —                   | `cus_…`                               |
| `stripe_subscription_id` | text        |     NULL | —                   | `sub_…`, **UNIQUE**                   |
| `status`                 | text        | NOT NULL | —                   | Statut Stripe brut (voir contraintes) |
| `price_id`               | text        |     NULL | —                   | `price_…`                             |
| `current_period_start`   | timestamptz |     NULL | —                   | —                                     |
| `current_period_end`     | timestamptz |     NULL | —                   | —                                     |
| `cancel_at_period_end`   | boolean     | NOT NULL | `false`             | —                                     |
| `cancel_at`              | timestamptz |     NULL | —                   | —                                     |
| `last_event_id`          | text        |     NULL | —                   | idempotence webhook                   |
| `created_at`             | timestamptz | NOT NULL | `now()`             | —                                     |
| `updated_at`             | timestamptz | NOT NULL | `now()`             | —                                     |

#### Contraintes (source PLATFORM §1.4.4)

- **CHECK `status`** ∈ {`active`, `past_due`, `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, `trialing`, `paused`}
- **UNIQUE** (`stripe_subscription_id`) (si non NULL)
- **UNIQUE partiel** “1 actif par compte” : `account_id` unique lorsque `status` ∈ (`active`, `trialing`, `past_due`, `paused`)
- **CHECK période cohérente** : `current_period_end >= current_period_start` si les deux non NULL
- FK `account_id` → `accounts(id)` ON DELETE CASCADE

#### Index (minimum)

- PK (`id`)
- Unique partiel “active per account”
- Unique (`stripe_subscription_id`)

#### RLS (principes)

- **INSERT/UPDATE/DELETE** : **service_role uniquement** (webhook / fonctions serveur).
- **SELECT** : **`is_admin()` uniquement** (owner/support).
- **Contrat** : `subscriptions` n’est pas exposée au client ; l’état d’accès côté UI provient de `accounts.status`.

---

### 1.2 Table `subscription_logs` (append-only)

**Rôle** : journal d’audit Stripe/support, INSERT-only.  
**Règle** : survivre à la suppression de compte (preuve/audit), donc FK `ON DELETE SET NULL`.

#### Colonnes (source PLATFORM §1.5.2)

| Colonne      | Type        |     Null | Défaut              | Notes                                   |
| ------------ | ----------- | -------: | ------------------- | --------------------------------------- |
| `id`         | uuid        | NOT NULL | `gen_random_uuid()` | PK                                      |
| `account_id` | uuid        |     NULL | —                   | FK → accounts(id) ON DELETE SET NULL    |
| `event_type` | text        | NOT NULL | —                   | ex `webhook.checkout.session.completed` |
| `details`    | jsonb       |     NULL | —                   | détails structurés (bornés)             |
| `created_at` | timestamptz | NOT NULL | `now()`             | —                                       |

#### Contraintes (source PLATFORM §1.5.3)

- FK `account_id` ON DELETE SET NULL
- `event_type` NOT NULL

#### RLS (source PLATFORM §1.5.4)

- SELECT : `is_admin()` uniquement (owner/support)
- INSERT : interdit côté client (service_role uniquement)
- UPDATE/DELETE : interdit

#### Rétention (source PLATFORM §1.5.5)

- purge possible après 12 mois (mécanisme à définir : CRON / job owner/service)

---

### 1.3 Trigger de projection `subscriptions → accounts.status`

**Rôle** : maintenir la cohérence Stripe ↔ application (source PLATFORM §1.6).  
**Déclencheur** : AFTER INSERT OR UPDATE sur `subscriptions`.  
**Logique** (résumé) :

1. si compte admin → no-op (admin immunisé)
2. si existe une subscription active (statuts listés) → `accounts.status = 'subscriber'`
3. sinon → `accounts.status = 'free'`

**Pré-requis** : une manière DB de tester “admin” (fonction `is_admin()` ou champ `accounts.status = 'admin'` selon le core).

**Invariant** : aucune action UI ne peut définir `accounts.status` directement.

---

## 2. RGPD & consentement

### 2.1 Table `consent_events` (append-only)

**Rôle** : preuve serveur de consentement cookies (et potentiellement autres types).  
**Règle** : survivre à la suppression du compte (preuve légale), donc FK `ON DELETE SET NULL`.

#### Colonnes (source PLATFORM §2.5.2)

| Colonne        | Type        |     Null | Défaut              | Notes                                  |
| -------------- | ----------- | -------: | ------------------- | -------------------------------------- |
| `id`           | uuid        | NOT NULL | `gen_random_uuid()` | PK                                     |
| `account_id`   | uuid        |     NULL | —                   | FK → accounts(id) ON DELETE SET NULL   |
| `consent_type` | text        | NOT NULL | —                   | ex `cookie_banner`                     |
| `mode`         | text        | NOT NULL | `'refuse_all'`      | `accept_all` / `refuse_all` / `custom` |
| `choices`      | jsonb       | NOT NULL | `'{}'::jsonb`       | objet JSON (choix)                     |
| `action`       | text        |     NULL | —                   | contexte : `first_load`/`update`/…     |
| `ip_hash`      | text        |     NULL | —                   | SHA-256 (minimisation)                 |
| `ua`           | text        |     NULL | —                   | user-agent                             |
| `locale`       | text        |     NULL | —                   | —                                      |
| `app_version`  | text        |     NULL | —                   | —                                      |
| `origin`       | text        |     NULL | —                   | URL origine                            |
| `ts_client`    | timestamptz |     NULL | —                   | informatif                             |
| `version`      | text        | NOT NULL | `'1.0.0'`           | version format                         |
| `created_at`   | timestamptz | NOT NULL | `now()`             | preuve serveur                         |

#### Contraintes (source PLATFORM §2.5.3)

- CHECK `mode` ∈ {`accept_all`, `refuse_all`, `custom`}
- CHECK `action` (si non NULL) ∈ {`first_load`, `update`, `withdraw`, `restore`, `revoke`}
- CHECK `choices` : `jsonb_typeof(choices) = 'object'`
- CHECK `ip_hash` : si non NULL, longueur entre 32 et 128
- FK `account_id` ON DELETE SET NULL

#### RLS (principes)

- INSERT : service_role uniquement (Edge Function `log-consent`)
- SELECT : owner-only (et éventuellement self-read si requis produit ; PLATFORM insiste surtout sur preuve, pas sur UX)
- UPDATE/DELETE : interdit (append-only)

> Décision safe : pas de self-read en V1 (réduit surface). Si un écran “mes consentements” existe, alors self-read limité.

---

## 3. Préférences utilisateur

### 3.1 Table `account_preferences`

**Rôle** : préférences persistantes cross-device, liste fermée.  
**Cardinalité** : `accounts (1) → account_preferences (0..1)` transitoire, cible `1..1` (création DB-first).

#### Colonnes minimales (source PLATFORM §5.3)

| Colonne            | Type    |     Null | Défaut     | Notes                                    |
| ------------------ | ------- | -------: | ---------- | ---------------------------------------- |
| `account_id`       | uuid    | NOT NULL | —          | PK + FK → accounts(id) ON DELETE CASCADE |
| `toasts_enabled`   | boolean | NOT NULL | (décision) |                                          |
| `reduced_motion`   | boolean | NOT NULL | (décision) |                                          |
| `confetti_enabled` | boolean | NOT NULL | (décision) | optionnel V1 si conservé                 |

#### Valeurs par défaut recommandées (source PLATFORM §5.4)

- `reduced_motion = true` (safe TSA)
- `toasts_enabled = true`
- `confetti_enabled = false` (si colonne conservée)

#### Création DB-first (source PLATFORM §5.3.2)

- trigger/fonction : à la création d’un `accounts`, créer automatiquement `account_preferences`.

#### RLS (source PLATFORM §5.6)

- SELECT : propriétaire uniquement (`account_id = auth.uid()`)
- INSERT/UPDATE : propriétaire uniquement **ou** DB automation à la création du compte
- DELETE : inutile (si autorisé : owner-only)

#### Invariants

- Interdit : fallback UI si ligne absente.
- Interdit : préférences qui unlock une règle métier (quota, status, RLS…).

---

## 4. Administration & audit (Owner-only)

### 4.1 Table `admin_audit_log` (append-only)

> Cette table est **décrite conceptuellement** dans PLATFORM §6.3 ; les types exacts doivent être figés avant migration.

#### Colonnes minimales (source PLATFORM §6.3.3)

| Colonne             | Type        |     Null | Défaut              | Notes                             |
| ------------------- | ----------- | -------: | ------------------- | --------------------------------- |
| `id`                | uuid        | NOT NULL | `gen_random_uuid()` | PK (proposé)                      |
| `actor_account_id`  | uuid        | NOT NULL | —                   | FK → accounts(id) (owner)         |
| `target_account_id` | uuid        |     NULL | —                   | FK → accounts(id) (cible)         |
| `action`            | text / enum | NOT NULL | —                   | **liste fermée** (voir catalogue) |
| `reason`            | text        | NOT NULL | —                   | justification courte obligatoire  |
| `metadata`          | jsonb       |     NULL | `'{}'::jsonb`       | borné, non sensible               |
| `created_at`        | timestamptz | NOT NULL | `now()`             | —                                 |

#### Catalogue d’actions V1 (source PLATFORM §6.4)

- `revoke_sessions`
- `disable_device` (si applicable)
- `resync_subscription_from_stripe`
- `append_subscription_log`
- `request_account_deletion`
- `export_proof_evidence` (lecture)

> À figer : la liste exacte des valeurs (enum) et leur orthographe stable (DB = source de vérité).

#### Contraintes / invariants (source PLATFORM §6.3.2)

- append-only : UPDATE/DELETE interdits
- `reason` obligatoire (non vide)
- `action` liste fermée (enum ou CHECK)
- `metadata` bornée + non sensible (taille max / structure)

#### RLS (principes)

- SELECT : owner-only
- INSERT : owner-only **via fonctions dédiées** (ou service_role)
- UPDATE/DELETE : interdit

---

## 5. Conventions transversales (module plateforme)

### 5.1 Append-only (logs / preuves / audit)

- Interdire UPDATE/DELETE côté client via RLS.
- Option DB : triggers “anti-update/delete” pour rendre la contrainte non contournable même en cas d’erreur de policy.

### 5.2 Idempotence

- Webhooks Stripe : `subscriptions.last_event_id` + unique sur `stripe_event_id` si stocké ailleurs (non demandé ici).
- Delete account : verrou opérationnel (ex : table de jobs) — **hors périmètre DB** tant que non spécifié ; minimum : opérations DB idempotentes.

### 5.3 Confidentialité (non-négociable)

- Aucune policy/fonction admin ne doit donner accès aux images privées (Storage), ni à des payloads sensibles.
