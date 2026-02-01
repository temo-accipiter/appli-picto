### Phase 7 — Storage (CRITIQUE — Confidentialité images)

**Objectif** : Buckets + policies owner-only images personnelles

⚠️ **CRITIQUE** : Cette phase doit être faite **AVANT** tout upload image personnelle en production

#### Migration 15 : `20260130******_create_storage_buckets.sql`

**Intention** : Créer buckets Supabase Storage pour images

**Contenu conceptuel** :

- Bucket `personal-images` (privé, owner-only)
- Bucket `bank-images` (public, lecture seule pour tous) — **À trancher** selon implémentation (peut être CDN externe)

**Dépendances** : Aucune (Supabase Storage API)

**Vérifications** :

- `SELECT * FROM storage.buckets WHERE name IN ('personal-images', 'bank-images');` retourne 2 lignes

---

#### Migration 16 : `20260130******_create_storage_policies.sql`

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

#### Migration 17 : `20260130******_enable_rls_core_tables.sql`

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

#### Migration 18 : `20260130******_rls_accounts.sql`

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

#### Migration 19 : `20260130******_rls_devices.sql`

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

#### Migration 20 : `20260130******_rls_child_profiles.sql`

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

#### Migration 21 : `20260130******_rls_cards.sql`

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

#### Migration 22 : `20260130******_rls_categories_pivot.sql`

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

#### Migration 23 : `20260130******_rls_timelines_slots.sql`

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

#### Migration 24 : `20260130******_rls_sessions_validations.sql`

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

#### Migration 25 : `20260130******_rls_sequences.sql`

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

#### Migration 26 : `20260130******_quota_functions_cards.sql`

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

#### Migration 27 : `20260130******_quota_functions_profiles_devices.sql`

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

#### Migration 28 : `20260130******_downgrade_functions.sql`

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

#### Migration 29 : `20260130******_session_state_transitions.sql`

⚠️ OBSOLÈTE — déplacée et implémentée en Phase 5 :

- `20260130116000_add_session_state_transitions.sql`
- `20260130117000_phase5_fix_sessions_validations_snapshot.sql`

Cette migration ne doit pas exister dans la timeline finale.

#### Migration 30 : `20260130******_seed_system_categories.sql`

**Intention** : Créer catégorie "Sans catégorie" pour chaque compte existant (si applicable)

**Contenu conceptuel** :

- Fonction trigger : à création `accounts`, INSERT `categories` avec `name='Sans catégorie'`, `is_system=TRUE`

**Dépendances** : `accounts`, `categories`

**⚠️ À trancher** : Si "Sans catégorie" est purement applicatif (fallback front si aucune ligne pivot), cette migration peut être **SKIP** (pas de seed DB)

**Vérifications** :

- INSERT account → SELECT categories WHERE account_id = ... AND is_system=TRUE retourne 1 ligne "Sans catégorie"

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

Ces gates ne s’appliquent que lorsque les phases Storage/RLS/Quotas entrent dans le scope.

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
