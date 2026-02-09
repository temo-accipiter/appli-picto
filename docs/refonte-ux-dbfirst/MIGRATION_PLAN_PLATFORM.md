# MIGRATION_PLAN_PLATFORM.md

> **Version** : 1  
> **Date** : 2026-02-08  
> **But** : exécuter le module plateforme en migrations SQL **sans toucher** aux migrations core déjà validées.

---

## 0. Principes d’exécution

- **DB-first strict** : migrations SQL uniquement.
- **Isolation** : toutes les migrations plateforme sont ajoutées **après** le core.
- **No refactor core** : pas de modifications structurelles des tables core (sauf ajout minimal strictement nécessaire et explicitement documenté).
- **RLS + invariants** : toute table créée doit sortir avec ses policies et ses “guardrails” (anti-update/delete si append-only).

---

## 1. Dépendances & prérequis

### 1.1 Extensions

- `pgcrypto` (UUID) : déjà présent côté core (supposé). Sinon l’ajouter dans une migration plateforme précoce.

### 1.2 Fonctions utilitaires

- `is_admin()` : déjà utilisé dans le core (Phase 7 / RLS). Si absent, **ne pas l’inventer** ici : documenter la dépendance et l’implémenter dans le module core (migration séparée).

---

## 2. Lot P1 — Billing Stripe

### 2.1 Créer table `subscriptions`

1. CREATE TABLE + colonnes (cf. DB_BLUEPRINT_PLATFORM §1.1)
2. Contraintes :
   - CHECK `status` (liste fermée)
   - UNIQUE `stripe_subscription_id`
   - UNIQUE partiel “1 actif par compte”
   - CHECK période cohérente
   - FK `account_id` ON DELETE CASCADE
3. Indexes (PK + uniques)

### 2.2 Créer table `subscription_logs` (append-only)

1. CREATE TABLE + colonnes
2. FK `account_id` ON DELETE SET NULL
3. (Optionnel mais recommandé) trigger “anti-update/delete” pour solidifier l’append-only

### 2.3 Trigger de projection `subscriptions → accounts.status`

1. Créer fonction `apply_subscription_to_account_status(account_id uuid)` (ou équivalent)
2. Créer trigger AFTER INSERT OR UPDATE sur `subscriptions`
3. Smoke tests :
   - compte non-admin : INSERT sub active ⇒ `accounts.status = subscriber`
   - UPDATE sub vers canceled ⇒ `accounts.status = free`
   - compte admin : aucun changement de status

### 2.4 RLS billing

- `subscriptions` :
  - SELECT : `is_admin()` uniquement (admin-only, pas de self-read client)
  - INSERT/UPDATE/DELETE : service_role only
- `subscription_logs` :
  - SELECT : `is_admin()` uniquement
  - INSERT : service_role only
  - UPDATE/DELETE : interdit

---

## 3. Lot P2 — RGPD consentement

### 3.1 Créer table `consent_events` (append-only)

1. CREATE TABLE + colonnes (cf. DB_BLUEPRINT_PLATFORM §2.1)
2. Contraintes :
   - CHECK `mode`
   - CHECK `action` (si non NULL)
   - CHECK `choices` est objet JSON
   - CHECK `ip_hash` longueur
   - FK `account_id` ON DELETE SET NULL
3. (Optionnel recommandé) trigger anti-update/delete (append-only)

### 3.2 RLS consent

- INSERT : service_role only (Edge Function)
- SELECT : owner-only (safe) ou self-read limité (si écran “mes consentements” existe)
- UPDATE/DELETE : interdit

### 3.3 Smoke tests

- insert avec `mode` invalide ⇒ rejet
- insert avec `choices` non objet ⇒ rejet
- suppression compte ⇒ `account_id` devient NULL (preuve survit)

---

## 4. Lot P3 — Préférences utilisateur

### 4.1 Créer table `account_preferences`

1. CREATE TABLE avec PK = `account_id` (FK → accounts ON DELETE CASCADE)
2. Colonnes bool + defaults (recommandés) :
   - `reduced_motion` default true
   - `toasts_enabled` default true
   - `confetti_enabled` default false (si conservé)
3. Contraintes NOT NULL

### 4.2 Création DB-first de la ligne de préférences

1. Créer fonction trigger `create_default_account_preferences()` (sur INSERT accounts)
2. Créer trigger AFTER INSERT sur `accounts`

> Important : ce trigger ne doit pas casser les imports/migrations existants (prévoir “IF NOT EXISTS” / idempotence transactionnelle).

### 4.3 RLS preferences

- SELECT/INSERT/UPDATE : owner-only (`account_id = auth.uid()`)
- DELETE : interdit ou owner-only selon décision (recommandé : interdit)

### 4.4 Smoke tests

- création compte ⇒ `account_preferences` existe automatiquement
- un compte ne peut pas lire/écrire les préférences d’un autre
- defaults = valeurs attendues

---

## 5. Lot P4 — Admin audit log (Owner-only)

### 5.1 Créer type `admin_action` (enum) ou CHECK

- Recommandation DB : enum pour figer le catalogue V1.
- Valeurs (à figer) : `revoke_sessions`, `disable_device`, `resync_subscription_from_stripe`, `append_subscription_log`, `request_account_deletion`, `export_proof_evidence`

### 5.2 Créer table `admin_audit_log` (append-only)

1. CREATE TABLE + colonnes minimales
2. Contraintes :
   - `reason` non vide (CHECK length > 0)
   - `metadata` bornée (CHECK size) — à définir
3. (Optionnel recommandé) trigger anti-update/delete

### 5.3 RLS admin audit

- SELECT : owner-only (`is_admin()` ou `accounts.status='admin'` selon core)
- INSERT : owner-only via fonction dédiée (ou service_role)
- UPDATE/DELETE : interdit

### 5.4 Smoke tests

- update/delete ⇒ rejet
- insert sans reason ⇒ rejet
- insert action hors enum ⇒ rejet
- select par non-admin ⇒ rejet

---

## 6. Packaging des migrations

### 6.1 Ordre recommandé (fichiers)

1. `*_platform_billing_subscriptions.sql`
2. `*_platform_billing_logs_and_rls.sql`
3. `*_platform_billing_trigger_accounts_status.sql`
4. `*_platform_rgpd_consent_events.sql`
5. `*_platform_account_preferences.sql`
6. `*_platform_admin_audit_log.sql`
7. `*_platform_smoke_tests.sql` (ou tests séparés par lot)

### 6.2 Règle “pas de dette”

- Toute table doit sortir avec :
  - contraintes,
  - indexes,
  - RLS activée + policies,
  - triggers (si requis),
  - smoke tests prouvant les invariants.

---

## 7. Points à trancher avant de générer le SQL

1. `subscriptions` : décision = admin-only (SELECT `is_admin()` uniquement ; pas de lecture client) - ✅ tranché
2. `consent_events` : self-read nécessaire ou non ?
3. `admin_audit_log.metadata` : bornage (taille max) et structure minimale
4. Stratégie de purge (12 mois) : CRON Supabase / job externe / manuel owner
