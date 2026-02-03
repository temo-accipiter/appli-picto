# DB_BLUEPRINT.md — Database Design Blueprint

> **Date** : 2026-01-29
> **PRODUCT_MODEL.md** : v15 (Corrections finales cohérence)
> **Sources** : `docs/refonte-ux-dbfirst/ux.md` + `docs/refonte-ux-dbfirst/PRODUCT_MODEL.md`
> **Approche** : DB-first, migrations SQL uniquement, pas de dashboard Supabase

---

## Changelog

**2026-01-29 (révision 2)** — Corrections cohérence PRODUCT_MODEL.md v15 + ux.md :

1. **Confidentialité images personnelles** : Ajout section Storage/Privacy explicite — priorité Storage policies owner-only (PRODUCT_MODEL.md Ch.10.4.3)
2. **Visitor retiré de accounts.status** : Visitor est local-only, n'existe pas en DB avant signup (PRODUCT_MODEL.md Ch.2.2.1, ux.md L2838-2841)
3. **Clarification RLS Admin sur accounts** : Admin = accès minimal métadonnées, pas lecture globale (PRODUCT_MODEL.md Ch.10.4)

---

## 0. Principes directeurs

Ce document traduit le contrat produit (PRODUCT_MODEL.md v15) en design DB conceptuel pour reconstruction Supabase.

### Règles absolues

- **Aucune invention** : toute table/colonne/contrainte est sourcée depuis ux.md ou PRODUCT_MODEL.md
- **DB-first** : modifications via migrations SQL uniquement (pas de dashboard)
- **Pas de SQL** : ce document reste conceptuel (colonnes sans types SQL)
- **Séparation systèmes** : Planning visuel / Économie jetons / Séquençage restent distincts en DB
- **Ambiguïtés explicites** : si non spécifié, marqué "Non spécifié — à trancher" avec options

### Objectifs UX TSA (impact DB)

- **Prévisibilité** : états stables, pas de surprise visuelle → epoch de session, fusion monotone
- **Protection enfant** : pas de messages techniques côté Tableau → séparation stricte données structure/exécution
- **Multi-appareils** : sync sans conflit → union ensembliste validations, epoch
- **Offline** : exécution hors ligne → progression locale fusionnable

_(Référence : PRODUCT_MODEL.md Ch.0, ux.md L70-164)_

---

## 1. Cartographie "Concepts → Tables"

| Concept métier                 | Table DB               | Référence                 | Notes                                |
| ------------------------------ | ---------------------- | ------------------------- | ------------------------------------ |
| **Compte utilisateur**         | `accounts`             | PRODUCT_MODEL.md Ch.3.1   | Extension auth.users Supabase        |
| **Appareil autorisé**          | `devices`              | PRODUCT_MODEL.md Ch.3.2   | device_id UUID, revoked_at           |
| **Profil enfant**              | `child_profiles`       | PRODUCT_MODEL.md Ch.3.3   | Statut active/locked, ancienneté     |
| **Carte (banque + perso)**     | `cards`                | PRODUCT_MODEL.md Ch.3.4   | Type bank/personal, image URL        |
| **Catégorie (personnelle)**    | `categories`           | PRODUCT_MODEL.md Ch.3.5   | "Sans catégorie" système             |
| **Pivot user↔card↔category** | `user_card_categories` | PRODUCT_MODEL.md Ch.3.6   | UNIQUE (user_id, card_id)            |
| **Timeline**                   | `timelines`            | PRODUCT_MODEL.md Ch.3.7   | 1:1 avec child_profile               |
| **Slot (Étape/Récompense)**    | `slots`                | PRODUCT_MODEL.md Ch.3.8   | slot_id UUID, position, type, tokens |
| **Session**                    | `sessions`             | PRODUCT_MODEL.md Ch.3.9   | epoch (int), état, 1 active max      |
| **Validation (slot validé)**   | `session_validations`  | PRODUCT_MODEL.md Ch.3.10  | (session_id, slot_id) pour union     |
| **Séquence (carte mère)**      | `sequences`            | PRODUCT_MODEL.md Ch.3.11  | 0..1 par carte par compte            |
| **Étapes de séquence**         | `sequence_steps`       | PRODUCT_MODEL.md Ch.3.11  | Liste ordonnée, sans doublons        |
| **État "fait" (séquence)**     | ❌ **Pas de table**    | PRODUCT_MODEL.md Ch.3.12  | Local-only, non sync cloud           |
| **Plan/Quotas (compteurs)**    | ⚠️ **À trancher**      | PRODUCT_MODEL.md Ch.9     | Voir section 6 (quotas)              |
| **Visitor (profil local)**     | ❌ **Pas de table**    | PRODUCT_MODEL.md Ch.2.2.1 | Stockage local uniquement            |

---

## 2. Dictionnaire des tables

### Table: `accounts`

**But** : Extension du compte auth Supabase avec données métier utilisateur

**Owner / visibilité** : `owner_id = auth.uid()` (RLS)

**Colonnes conceptuelles** :

| Colonne      | Description                          | Référence               |
| ------------ | ------------------------------------ | ----------------------- |
| `id`         | PK, UUID (= auth.users.id)           | —                       |
| `status`     | Enum : free / subscriber / admin     | PRODUCT_MODEL.md Ch.1.2 |
| `timezone`   | Timezone IANA, défaut 'Europe/Paris' | PRODUCT_MODEL.md Ch.3.1 |
| `created_at` | Timestamp création compte            | —                       |
| `updated_at` | Timestamp dernière modification      | —                       |

**Note Visitor** : Visitor n'existe PAS en DB (local-only). Lors d'un signup, le compte est créé avec `status='free'` et les données locales Visitor sont importées. _(PRODUCT_MODEL.md Ch.2.2.1, ux.md L2838-2841)_

**Clés** :

- PK : `id`
- FK : `id` → `auth.users(id)` ON DELETE CASCADE

**Contraintes** :

- `status` NOT NULL
- `timezone` NOT NULL, défaut 'Europe/Paris'
- `timezone` doit être une timezone IANA valide (contrainte DB : `accounts_timezone_valid_chk` via fonction `public.is_valid_timezone(text)`)

**Cardinalités** :

- 1 compte → 0..n profils enfants
- 1 compte → 0..n cartes personnelles
- 1 compte → 0..n catégories
- 1 compte → 0..n appareils (selon plan)

**Lifecycle** :

- Création : lors de signup (extension auth.users)
- **Trigger automatique** : à la création d'un compte, un profil enfant "Mon enfant" est créé automatiquement (PRODUCT_MODEL.md Ch.2.6)
- Archivage : ❌ Suppression définitive uniquement (RGPD)
- Suppression : CASCADE sur toutes tables enfants

**RLS conceptuelle** :

- SELECT : `id = auth.uid()` (owner-only)
- INSERT : Impossible (créé via trigger auth)
- UPDATE : `id = auth.uid()` (owner-only)
- DELETE : `id = auth.uid()` (owner-only)

**⚠️ Non spécifié — à trancher** : Accès Admin aux comptes

PRODUCT_MODEL.md Ch.10.4 indique "Admin accède aux données strictement nécessaires (support, sécurité, intégrité)" mais n'explicite pas l'étendue exacte sur `accounts`.

**Options** :

- **A) Admin strict** : Aucun accès global `accounts` (owner-only uniquement)
- **B) Admin support** : SELECT métadonnées non sensibles (`status`, `created_at`, `timezone`) pour support technique, SANS accès données privées

**Impacts** :

- **A)** : RLS minimal, Admin doit passer par outils dédiés si nécessaire
- **B)** : Facilite support (ex: diagnostic quota), mais requiert RLS précis (masquer données sensibles si ajoutées)

**Recommandation** : **Option A** (strict) par défaut, sauf besoin explicite support défini ultérieurement

---

### Table: `devices`

**But** : Gérer multi-appareils avec quotas et révocation non-destructive

**Owner / visibilité** : `account_id = auth.uid()` (RLS)

**Colonnes conceptuelles** :

| Colonne      | Description                                                                           | Référence                     |
| ------------ | ------------------------------------------------------------------------------------- | ----------------------------- |
| `id`         | PK, UUID auto                                                                         | —                             |
| `device_id`  | UUID généré côté client (installation), UNIQUE par compte (`account_id`, `device_id`) | PRODUCT_MODEL.md Ch.3.2       |
| `account_id` | FK → accounts(id), NOT NULL                                                           | PRODUCT_MODEL.md Ch.3.2       |
| `revoked_at` | Timestamp révocation, NULL si actif                                                   | PRODUCT_MODEL.md Ch.3.2 (v14) |
| `created_at` | Timestamp première connexion                                                          | —                             |
| `updated_at` | Timestamp dernière activité                                                           | —                             |

**Clés** :

- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE (aligné DB / RGPD)
- UNIQUE : (`account_id`, `device_id`)

**Contraintes** :

- `device_id` NOT NULL
- `account_id` NOT NULL
- UNIQUE (`account_id`, `device_id`)
- `revoked_at` NULL si actif
- Cohérence temporelle : `revoked_at IS NULL OR revoked_at >= created_at`

**Cardinalités** :

- 1 compte → 0..n appareils (quota selon plan : 1 Free, 3 Abonné, ∞ Admin)
- 1 appareil (device_id) → 0..n comptes (tablette partagée / multi-login possible)

**Lifecycle** :

- Création : au premier usage appareil
- Révocation : `revoked_at` = NOW() (manuelle Page Profil)
- Suppression : ❌ Jamais (conservation audit)

**RLS conceptuelle** :

- SELECT : `account_id = auth.uid()` (owner-only)
- INSERT : Bloqué si quota atteint (fonction serveur)
- UPDATE : `account_id = auth.uid()` (révocation uniquement)
- DELETE : ❌ Interdit (non-destructive)

---

### Table: `child_profiles`

**But** : Profils enfants avec statut verrouillage (downgrade) et ancienneté

**Owner / visibilité** : `account_id = auth.uid()` (RLS)

**Colonnes conceptuelles** :

| Colonne      | Description                     | Référence               |
| ------------ | ------------------------------- | ----------------------- |
| `id`         | PK, UUID auto                   | —                       |
| `account_id` | FK → accounts(id)               | PRODUCT_MODEL.md Ch.3.3 |
| `name`       | Nom affiché                     | —                       |
| `status`     | Enum : active / locked          | PRODUCT_MODEL.md Ch.3.3 |
| `created_at` | Timestamp création (ancienneté) | PRODUCT_MODEL.md Ch.3.3 |
| `updated_at` | Timestamp dernière modification | —                       |

**Clés** :

- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE

**Contraintes** :

- `account_id` NOT NULL
- `status` NOT NULL, défaut 'active'
- `name` NOT NULL

**Cardinalités** :

- 1 compte → 0..n profils enfants (quota : 1 Free, 3 Abonné, ∞ Admin)
- 1 profil enfant → 1 timeline
- 1 profil enfant → 0..n sessions

**Lifecycle** :

- **Création automatique** : Le premier profil enfant est créé automatiquement à la création du compte (nom "Mon enfant") via trigger (PRODUCT_MODEL.md Ch.2.6)
- **Création manuelle** : Page Profil (Contexte Édition), soumis à quota (1 Free, 3 Abonné, ∞ Admin)
- **Trigger automatique** : à la création d'un profil enfant (auto ou manuel), une timeline + slots minimaux (1 step + 1 reward, tokens=0) sont créés automatiquement (PRODUCT_MODEL.md Ch.2.6)
- Verrouillage : `status` = 'locked' (downgrade, toutes sessions terminées)
- **Suppression** : ❌ Pas de suppression standard exposée à l'utilisateur (PRODUCT_MODEL.md Ch.2.6)
- **Suppression autorisée uniquement** : CASCADE compte (RGPD), suppression explicite RGPD, maintenance technique

**RLS conceptuelle** :

- SELECT : `account_id = auth.uid()` (owner-only)
- INSERT : `account_id = auth.uid()` ET quota non atteint
- UPDATE : `account_id = auth.uid()` (owner-only)
- DELETE : ❌ Interdit en usage standard. DELETE autorisé uniquement pour : suppression complète du compte (cascade), demande RGPD, opérations techniques/maintenance (admin)

---

### Table: `cards`

**But** : Cartes visuelles (banque Admin + personnelles utilisateurs)

**Owner / visibilité** : Banque = lecture publique ; Personnelles = owner-only

**Colonnes conceptuelles** :

| Colonne      | Description                             | Référence                 |
| ------------ | --------------------------------------- | ------------------------- |
| `id`         | PK, UUID auto                           | —                         |
| `type`       | Enum : bank / personal                  | PRODUCT_MODEL.md Ch.3.4   |
| `account_id` | FK → accounts(id), NULL si bank         | PRODUCT_MODEL.md Ch.3.4   |
| `name`       | Nom carte                               | PRODUCT_MODEL.md Ch.3.4   |
| `image_url`  | URL image (Supabase Storage)            | PRODUCT_MODEL.md Ch.3.4   |
| `published`  | Boolean (bank uniquement), défaut FALSE | PRODUCT_MODEL.md Ch.5.5.5 |
| `created_at` | Timestamp création (quota mensuel)      | PRODUCT_MODEL.md Ch.9.3.2 |
| `updated_at` | Timestamp dernière modification         | —                         |

**Clés** :

- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE (personal uniquement)

**Contraintes** :

- `type` NOT NULL
- `name` NOT NULL
- `image_url` NOT NULL
- `published` défaut FALSE, NULL si type = personal
- CHECK : `type = 'bank' AND account_id IS NULL` OU `type = 'personal' AND account_id IS NOT NULL`

**Cardinalités** :

- 1 compte → 0..n cartes personnelles (quota : 50 Abonné, ∞ Admin)
- 1 carte → 0..n usages (slots, séquences)
- 1 carte → 0..1 séquence (carte mère)

**Lifecycle** :

- Création : Admin (bank) OU Abonné/Admin (personal)
- Publication : Admin uniquement (bank)
- Dépublication : `published` = FALSE (≠ suppression)
- Suppression : Si personal ET pas de références OU confirmation + réinitialisation sessions actives
- **Invariant banque** : Jamais supprimer carte bank si référencée (DB: trigger BEFORE DELETE)

**RLS conceptuelle (table `cards`)** :

- SELECT : `type = 'bank' AND published = TRUE` (tous) OU `account_id = auth.uid()` (owner)
- INSERT : `account_id = auth.uid()` ET quota non atteint OU `auth.uid() IN (SELECT id FROM accounts WHERE status = 'admin')`
- UPDATE : `account_id = auth.uid()` (owner-only) OU admin (bank)
- DELETE : `account_id = auth.uid()` (owner-only) OU admin (bank) — suppression bank référencée bloquée par trigger DB

**🔒 CRITIQUE — Confidentialité images personnelles (Storage)** _(PRODUCT_MODEL.md Ch.10.4.3)_

**Règle contractuelle obligatoire** : Admin ne voit **JAMAIS** les images personnelles.

**Enforcement prioritaire** :

1. **Storage Policies** (PRIORITÉ ABSOLUE) :
   - Images personnelles stockées dans bucket privé (owner-only)
   - Policies Supabase Storage : SELECT/INSERT/UPDATE/DELETE = `account_id = auth.uid()`
   - **Aucun bypass Admin** sur ce bucket (Admin n'a AUCUN accès aux images `type='personal'`)

2. **RLS table `cards` (mesure secondaire)** :
   - Admin peut lire métadonnées (`name`, `type`, `created_at`) pour support
   - Admin **ne peut PAS** lire `image_url` si `type='personal'` (politique masquage ou exclusion colonne)

**Note** : La RLS table seule ne suffit PAS — la confidentialité réelle repose sur les **Storage Policies**. Un Admin ne doit jamais pouvoir accéder aux fichiers images personnelles, même s'il connaît l'URL.

---

### Table: `categories`

**But** : Catégories personnelles utilisateur avec "Sans catégorie" système

**Owner / visibilité** : `account_id = auth.uid()` (RLS)

**Colonnes conceptuelles** :

| Colonne      | Description                         | Référence               |
| ------------ | ----------------------------------- | ----------------------- |
| `id`         | PK, UUID auto                       | —                       |
| `account_id` | FK → accounts(id)                   | PRODUCT_MODEL.md Ch.3.5 |
| `name`       | Nom catégorie                       | PRODUCT_MODEL.md Ch.3.5 |
| `is_system`  | Boolean, TRUE pour "Sans catégorie" | PRODUCT_MODEL.md Ch.3.5 |
| `created_at` | Timestamp création                  | —                       |
| `updated_at` | Timestamp dernière modification     | —                       |

**Clés** :

- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE

**Contraintes** :

- `account_id` NOT NULL
- `name` NOT NULL
- `is_system` NOT NULL, défaut FALSE
- UNIQUE : `(account_id, name)` (pas de doublons nom par user)

**Cardinalités** :

- 1 compte → 0..n catégories (illimité)
- 1 catégorie → 0..n cartes (via pivot)

**Lifecycle** :

- Création : Automatique "Sans catégorie" à création compte OU manuelle Page Édition
- Suppression : Interdit si `is_system = TRUE` ; sinon cartes réassignées à "Sans catégorie"

**RLS conceptuelle** :

- SELECT : `account_id = auth.uid()` (owner-only)
- INSERT : `account_id = auth.uid()` (owner-only)
- UPDATE : `account_id = auth.uid()` ET `is_system = FALSE` (owner-only, pas système)
- DELETE : `account_id = auth.uid()` ET `is_system = FALSE` (owner-only, pas système)

---

### Table: `user_card_categories` (PIVOT)

**But** : Lier cartes visibles à catégories par utilisateur (CONTRAT EXPLICITE)

**Owner / visibilité** : `user_id = auth.uid()` (RLS)

**Colonnes conceptuelles** :

| Colonne       | Description                     | Référence               |
| ------------- | ------------------------------- | ----------------------- |
| `id`          | PK, UUID auto                   | —                       |
| `user_id`     | FK → accounts(id)               | PRODUCT_MODEL.md Ch.3.6 |
| `card_id`     | FK → cards(id)                  | PRODUCT_MODEL.md Ch.3.6 |
| `category_id` | FK → categories(id)             | PRODUCT_MODEL.md Ch.3.6 |
| `created_at`  | Timestamp création              | —                       |
| `updated_at`  | Timestamp dernière modification | —                       |

**Clés** :

- PK : `id`
- FK : `user_id` → `accounts(id)` ON DELETE CASCADE
- FK : `card_id` → `cards(id)` ON DELETE CASCADE
- FK : category_id → categories(id) ON DELETE RESTRICT (ou NO ACTION) ; la suppression d’une catégorie est gérée par trigger de réassignation vers la catégorie système "Sans catégorie"- **UNIQUE : `(user_id, card_id)`** (CONTRAT EXPLICITE, PRODUCT_MODEL.md Ch.3.6)

**Contraintes** :

- `user_id` NOT NULL
- `card_id` NOT NULL
- `category_id` NOT NULL
- UNIQUE `(user_id, card_id)` : **une carte = 1 catégorie par utilisateur**

**Cardinalités** :

- 1 utilisateur + 1 carte → 1 catégorie (pas de multi-catégories)

**Lifecycle** :

- Création : Assignation catégorie Page Édition
- Modification : Changement catégorie
- Suppression : Si carte supprimée OU catégorie supprimée (fallback "Sans catégorie")

**Fallback applicatif** : Si aucune ligne pour `(user_id, card_id)`, carte affichée dans "Sans catégorie" côté front (PRODUCT_MODEL.md Ch.3.6)

**RLS conceptuelle** :

- SELECT : `user_id = auth.uid()` (owner-only)
- INSERT : `user_id = auth.uid()` (owner-only)
- UPDATE : `user_id = auth.uid()` (owner-only)
- DELETE : `user_id = auth.uid()` (owner-only)

---

### Table: `timelines`

**But** : Structure timeline par profil enfant (1:1)

**Owner / visibilité** : `account_id = auth.uid()` via child_profile (RLS)

**Colonnes conceptuelles** :

| Colonne            | Description                     | Référence               |
| ------------------ | ------------------------------- | ----------------------- |
| `id`               | PK, UUID auto                   | —                       |
| `child_profile_id` | FK → child_profiles(id), UNIQUE | PRODUCT_MODEL.md Ch.3.7 |
| `created_at`       | Timestamp création              | —                       |
| `updated_at`       | Timestamp dernière modification | —                       |

**Clés** :

- PK : `id`
- FK : `child_profile_id` → `child_profiles(id)` ON DELETE CASCADE
- **UNIQUE : `child_profile_id`** (1 timeline par profil enfant)

**Contraintes** :

- `child_profile_id` NOT NULL, UNIQUE

**Cardinalités** :

- 1 profil enfant → 1 timeline (1:1 strict)
- 1 timeline → 1..n slots (min 1 Étape + 1 Récompense)

**Lifecycle** :

- **Création automatique** : Automatique à création profil enfant via trigger (PRODUCT_MODEL.md Ch.2.6)
- **Trigger automatique** : à la création d'une timeline, 2 slots minimaux sont insérés automatiquement (PRODUCT_MODEL.md Ch.2.6) :
  - 1 slot step (position 0, card_id NULL, tokens = 0)
  - 1 slot reward (position 1, card_id NULL, tokens = NULL)
- Structure minimale : 1 slot Étape vide + 1 slot Récompense vide (PRODUCT_MODEL.md Ch.5.1.2)
- Suppression : CASCADE avec profil enfant (autorisée uniquement via cascade compte, RGPD, maintenance)

**Invariants structurels** (PRODUCT_MODEL.md Ch.3.7) :

- Une timeline contient au minimum 1 slot Récompense. La suppression du dernier slot Récompense est interdite
- Minimum 1 slot Étape (dernier non supprimable)

**RLS conceptuelle** :

- SELECT : `child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid())` (owner via profil)
- INSERT : Automatique (trigger création profil)
- UPDATE : `child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid())` (owner via profil)
- DELETE : CASCADE avec profil

---

### Table: `slots`

**But** : Emplacements timeline (Étapes + Récompense) avec slot_id stable

**Owner / visibilité** : `account_id = auth.uid()` via timeline (RLS)

**Colonnes conceptuelles** :

| Colonne       | Description                                   | Référence               |
| ------------- | --------------------------------------------- | ----------------------- |
| `id`          | PK, UUID (`slot_id` métier)                   | PRODUCT_MODEL.md Ch.3.8 |
| `timeline_id` | FK → timelines(id)                            | PRODUCT_MODEL.md Ch.3.8 |
| `kind`        | Enum : step / reward                          | PRODUCT_MODEL.md Ch.3.8 |
| `position`    | Integer, ordre affichage (modifiable DnD)     | PRODUCT_MODEL.md Ch.3.8 |
| `card_id`     | FK → cards(id), NULL si vide                  | PRODUCT_MODEL.md Ch.3.8 |
| `tokens`      | Integer 0-5 (step uniquement), NULL si reward | PRODUCT_MODEL.md Ch.3.8 |
| `created_at`  | Timestamp création                            | —                       |
| `updated_at`  | Timestamp dernière modification               | —                       |

**Clés** :

- PK : `id` (= slot_id métier, UUID stable)
- FK : `timeline_id` → `timelines(id)` ON DELETE CASCADE
- FK : `card_id` → `cards(id)` ON DELETE SET NULL (slot devient vide)
- UNIQUE : `(timeline_id, position)` (pas de doublons position)

**Contraintes** :

- `timeline_id` NOT NULL
- `kind` NOT NULL
- `position` NOT NULL, >= 0
- `card_id` NULL autorisé (slot vide)
- `tokens` NULL si `kind = 'reward'`, 0-5 si `kind = 'step'`
- CHECK : `kind = 'step' AND tokens BETWEEN 0 AND 5` OU `kind = 'reward' AND tokens IS NULL`
- UNIQUE : `(timeline_id) WHERE kind='reward'` (exactement 1 slot Récompense par timeline)

**Cardinalités** :

- 1 timeline → 1..n slots (min 2 : 1 step + 1 reward)
- 1 slot → 0..1 carte (peut être vide)

**Lifecycle** :

- Création : Ajout slot Page Édition OU structure minimale timeline
- Drag & drop : Modification `position` uniquement (slot_id stable)
- Suppression : Interdit si dernier slot step OU slot déjà validé en session active
- Slot Récompense : **ne peut pas changer de `kind` ni de `timeline_id`** (guard DB)

**Règles verrouillage** (PRODUCT_MODEL.md Ch.5.4) :

- Session active Démarrée : slot validé = verrouillé (pas de modification/suppression/déplacement)
- Session active Démarrée : slot non validé = modifiable

**Invariants** :

- `slot_id` (PK `id`) indépendant de `position` (stable lors drag & drop)
- Slot step vide ignoré en Tableau (pas affiché, pas exécutable)
- Slot reward vide n'occupe aucun espace côté Tableau
- **Exactement 1 slot Récompense par timeline** (unique index + trigger anti-contournement)

**RLS conceptuelle** :

- SELECT : `timeline_id IN (SELECT id FROM timelines WHERE child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid()))` (owner via timeline)
- INSERT : Idem + vérif session active (verrouillage)
- UPDATE : Idem + vérif session active (verrouillage)
- DELETE : Idem + vérif session active (verrouillage) + pas dernier step

---

### Table: `sessions`

**But** : Sessions d'exécution timeline avec epoch et état

**Owner / visibilité** : `account_id = auth.uid()` via child_profile (RLS)

**Colonnes conceptuelles** :

**Colonnes conceptuelles** :

| Colonne                | Description                                                                    | Référence                  |
| ---------------------- | ------------------------------------------------------------------------------ | -------------------------- |
| `id`                   | PK, UUID auto                                                                  | —                          |
| `child_profile_id`     | FK → child_profiles(id)                                                        | PRODUCT_MODEL.md Ch.5.3    |
| `timeline_id`          | FK → timelines(id)                                                             | PRODUCT_MODEL.md Ch.5.3    |
| `state`                | Enum : active_preview / active_started / completed                             | PRODUCT_MODEL.md Ch.5.3    |
| `epoch`                | Integer, version de session (sync multi-appareils), monotone croissante        | PRODUCT_MODEL.md Ch.5.3    |
| `steps_total_snapshot` | Snapshot du nb d’étapes “comptées” au **démarrage effectif** (1ère validation) | PRODUCT_MODEL.md Ch.5.3    |
| `started_at`           | Timestamp fixé à la 1ère validation (transition vers active_started)           | ux.md (démarrage effectif) |
| `completed_at`         | Timestamp fixé à la complétion (transition vers completed)                     | ux.md (terminaison)        |
| `created_at`           | Timestamp création                                                             | —                          |
| `updated_at`           | Timestamp dernière modification                                                | —                          |

**Clés** :

- PK : `id`
- FK : `child_profile_id` → `child_profiles(id)` ON DELETE CASCADE
- FK : `timeline_id` → `timelines(id)` ON DELETE CASCADE

**Contraintes & invariants défendus DB** :

- `child_profile_id` NOT NULL
- `timeline_id` NOT NULL
- `state` NOT NULL
- `epoch` NOT NULL, défaut 1
- **1 session active max** par (child_profile_id, timeline_id) :
  - contrainte DB via **partial UNIQUE index** sur `(child_profile_id, timeline_id)`
  - condition : `state IN ('active_preview', 'active_started')`
- **Cohérence profil ↔ timeline (1:1)** :
  - `sessions.timeline_id` doit appartenir au même `child_profile_id` (timeline.owner)
  - toute incohérence est rejetée (defense-in-depth DB)
- **Epoch monotone** :
  - une session existante ne peut pas voir `epoch` décroître
  - création d’une nouvelle session = `epoch = MAX(epoch)+1` pour (child_profile_id, timeline_id)

**Cardinalités** :

- 1 profil enfant + 1 timeline → 0..n sessions (historique)
- 1 profil enfant + 1 timeline → 0..1 session active (INVARIANT, PRODUCT_MODEL.md Ch.3.9)
- 1 session → 0..n validations (slots validés)

**Lifecycle** :

- Création : Automatique à entrée Contexte Tableau, `state = 'active_preview'`, `epoch = 1`
- Démarrage effectif : 1ère validation → `state = 'active_started'` + `started_at` fixé + `steps_total_snapshot` fixé
- Terminaison : quand `COUNT(validations)` atteint `steps_total_snapshot` → `state = 'completed'` + `completed_at` fixé
- Réinitialisation : **création d’une nouvelle session** (historique conservé), avec `epoch = MAX(epoch)+1`, `state = 'active_preview'`

**États & transitions** (PRODUCT_MODEL.md Ch.5.3) :

```
Inexistante → active_preview (epoch=1)
  ↓ Première validation
active_started
  ↓ Dernière validation
completed
  ↓ Réinitialisation (epoch++)
active_preview (epoch=N+1)
```

**Epoch & sync multi-appareils** (PRODUCT_MODEL.md Ch.8.5.3) :

- Réinitialisation = exception fusion monotone
- Toute progression avec `epoch < epoch_courant` = obsolète (écrasée)
- Règle anti-choc TSA : écrasement appliqué au prochain Chargement Contexte Tableau (jamais en direct)

**RLS conceptuelle** :

- SELECT : `child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid())` (owner via profil)
- INSERT : Automatique (trigger entrée Tableau)
- UPDATE : Idem + vérif état (transition valide)
- DELETE : ❌ Interdit (conservation historique) sauf réinitialisation (nouvelle session)

---

### Table: `session_validations`

**But** : Ensemble validations (union ensembliste pour fusion multi-appareils)

**Owner / visibilité** : `account_id = auth.uid()` via session (RLS)

**Colonnes conceptuelles** :

| Colonne        | Description          | Référence                |
| -------------- | -------------------- | ------------------------ |
| `id`           | PK, UUID auto        | —                        |
| `session_id`   | FK → sessions(id)    | PRODUCT_MODEL.md Ch.3.10 |
| `slot_id`      | FK → slots(id)       | PRODUCT_MODEL.md Ch.3.10 |
| `validated_at` | Timestamp validation | —                        |

**Clés** :

- PK : `id`
- FK : `session_id` → `sessions(id)` ON DELETE CASCADE
- FK : `slot_id` → `slots(id)` ON DELETE CASCADE
- **UNIQUE : `(session_id, slot_id)`** (pas de doublon validation)

**Contraintes** :

- `session_id` NOT NULL
- `slot_id` NOT NULL
- `validated_at` NOT NULL
- UNIQUE `(session_id, slot_id)`

**Contraintes & invariants défendus DB (defense-in-depth)** :

- Validation possible **uniquement** si la session n’est pas `completed` (lecture seule)
- Validation possible **uniquement** sur un slot de kind=`step` (reward non validable)
- Validation refusée si le slot step est **vide** (`card_id IS NULL`)
- `slot.timeline_id` doit être **égal** à `session.timeline_id` (anti-cross-timeline)
- Validations immuables : pas d’UPDATE métier (INSERT only) ; l’unicité `(session_id, slot_id)` garantit l’idempotence
- `validated_at` est conservé **uniquement pour audit** (aucune règle métier ne dépend du timestamp)

**Cardinalités** :

- 1 session → 0..n validations (ensemble de slot_id validés)
- 1 slot → 0..n validations (dans différentes sessions)

**Lifecycle** :

- Création : Validation checkbox côté Tableau
- Suppression : Réinitialisation session (nouvelle session)

**Fusion monotone multi-appareils** (PRODUCT_MODEL.md Ch.8.5.2) :

- **Union ensembliste** : Appareil A valide {slot_1, slot_2} + Appareil B valide {slot_2, slot_3} = {slot_1, slot_2, slot_3}
- Jetons collectés **recalculés** depuis validations (pas source indépendante)
- Progression **ne régresse jamais automatiquement** (sauf réinitialisation = epoch++)

**RLS conceptuelle** :

- SELECT : `session_id IN (SELECT id FROM sessions WHERE child_profile_id IN (SELECT id FROM child_profiles WHERE account_id = auth.uid()))` (owner via session)
- INSERT : Idem + vérif session active
- UPDATE : ❌ Interdit (validations immuables)
- DELETE : Réinitialisation uniquement (nouvelle session)

---

### Table: `sequences`

**But** : Séquences visuelles (aide décomposition carte mère)

**Owner / visibilité** : **pas de RLS dans cette phase** ; ownership gardé par triggers (cartes personnelles uniquement pour leur compte, cartes bank autorisées)

**Colonnes conceptuelles** :

| Colonne          | Description                     | Référence                |
| ---------------- | ------------------------------- | ------------------------ |
| `id`             | PK, UUID auto                   | —                        |
| `account_id`     | FK → accounts(id)               | PRODUCT_MODEL.md Ch.3.11 |
| `mother_card_id` | FK → cards(id), UNIQUE par user | PRODUCT_MODEL.md Ch.3.11 |
| `created_at`     | Timestamp création              | —                        |
| `updated_at`     | Timestamp dernière modification | —                        |

**Clés** :

- PK : `id`
- FK : `account_id` → `accounts(id)` ON DELETE CASCADE
- FK : `mother_card_id` → `cards(id)` ON DELETE CASCADE
- **UNIQUE : `(account_id, mother_card_id)`** (0..1 séquence par carte par user)

**Contraintes** :

- `account_id` NOT NULL
- `mother_card_id` NOT NULL
- UNIQUE `(account_id, mother_card_id)`
- **Ownership guard** : si `mother_card_id` est personnelle, elle doit appartenir au même `account_id` (bank autorisée)

**Cardinalités** :

- 1 compte → 0..n séquences (illimité)
- 1 carte → 0..1 séquence par user (carte mère)
- 1 séquence → 2..n étapes (min 2, max illimité)

**Lifecycle** :

- Création : Mode Séquençage Page Édition
- Suppression : **manuelle** (séquence explicite) OU cascade si carte mère supprimée (si suppression autorisée)

**Cascades suppression** (PRODUCT_MODEL.md Ch.3.11) :

- Suppression carte mère → séquence supprimée
- Suppression carte utilisée comme étape → suppression des steps référencés ; **transaction refusée** si <2 étapes restantes
- Suppression carte bank référencée → **interdite** (guard global sur `cards`)

**RLS** : **non implémentée** dans cette phase.

---

### Table: `sequence_steps`

**But** : Étapes de séquence (liste ordonnée, sans doublons)

**Owner / visibilité** : **pas de RLS dans cette phase** ; ownership gardé par triggers (step_card personnelle doit appartenir au compte de la séquence, bank autorisée)

**Colonnes conceptuelles** :

| Colonne        | Description                     | Référence                |
| -------------- | ------------------------------- | ------------------------ |
| `id`           | PK, UUID auto                   | —                        |
| `sequence_id`  | FK → sequences(id)              | PRODUCT_MODEL.md Ch.3.11 |
| `step_card_id` | FK → cards(id)                  | PRODUCT_MODEL.md Ch.3.11 |
| `position`     | Integer, ordre affichage        | PRODUCT_MODEL.md Ch.3.11 |
| `created_at`   | Timestamp création              | —                        |
| `updated_at`   | Timestamp dernière modification | —                        |

**Clés** :

- PK : `id`
- FK : `sequence_id` → `sequences(id)` ON DELETE CASCADE
- FK : `step_card_id` → `cards(id)` ON DELETE CASCADE (déclenche vérif min 2 étapes)
- UNIQUE : `(sequence_id, position)` **DEFERRABLE INITIALLY DEFERRED** (reorder multi-lignes)
- **UNIQUE : `(sequence_id, step_card_id)`** (pas de doublons carte dans même séquence)

**Contraintes** :

- `sequence_id` NOT NULL
- `step_card_id` NOT NULL
- `position` NOT NULL, >= 0
- UNIQUE `(sequence_id, position)` (DEFERRABLE)
- **UNIQUE `(sequence_id, step_card_id)`** (PRODUCT_MODEL.md Ch.3.11 : sans doublons)
- **Min 2 étapes** : constraint triggers DEFERRABLE (commit-safe) sur `sequences` et `sequence_steps`
- **Aucun imposé gapless** : la DB n’impose pas l’absence de trous (responsabilité UI)

**Cardinalités** :

- 1 séquence → 2..n étapes (min 2, max illimité)

**Lifecycle** :

- Création : Ajout étape Mode Séquençage
- Drag & drop : Modification `position` uniquement
- Suppression : Retrait étape ; **refusé** si <2 restantes (pas d’auto-suppression)

**RLS** : **non implémentée** dans cette phase.

---

## 3. Enums & états

### Enum: `account_status`

**Valeurs** :

- `free` : Authentifié sans abonnement
- `subscriber` : Authentifié avec abonnement actif
- `admin` : Mainteneur

**Référence** : PRODUCT_MODEL.md Ch.1.2, ux.md L221-232

**Note Visitor** : Visitor n'est PAS une valeur de cet enum. Visitor est local-only (pas de compte DB) jusqu'au signup, moment où le compte est créé avec `status='free'`. _(PRODUCT_MODEL.md Ch.2.2.1, ux.md L2838-2841)_

---

### Enum: `child_profile_status`

**Valeurs** :

- `active` : Profil accessible, toutes actions autorisées selon plan
- `locked` : Profil verrouillé (downgrade), lecture seule

**Référence** : PRODUCT_MODEL.md Ch.3.3, ux.md L3209-3214

**Transitions** :

- `active` → `active` (downgrade + au-delà limite, peut terminer sessions)
- `active` → `locked` (toutes sessions terminées sur profil excédentaire)
- `locked` → `active` (upgrade Abonné)

---

### Enum: `card_type`

**Valeurs** :

- `bank` : Carte de banque (Admin, publique, non modifiable)
- `personal` : Carte personnelle (Abonné/Admin, privée, consomme quota)

**Référence** : PRODUCT_MODEL.md Ch.3.4

---

### Enum: `slot_kind`

**Valeurs** :

- `step` : Slot Étape (peut porter jetons 0-5, validable)
- `reward` : Slot Récompense (sans jetons, non validable)

**Référence** : PRODUCT_MODEL.md Ch.3.8

---

### Enum: `session_state`

**Valeurs** :

- `active_preview` : Session active, 0 validation (sous-état Prévisualisation)
- `active_started` : Session active, ≥1 validation (Démarrée)
- `completed` : Session terminée, toutes étapes validées, lecture seule

**Référence** : PRODUCT_MODEL.md Ch.5.3, ux.md L429-451

**Note** : "Prévisualisation" n'est PAS un état séparé, c'est un sous-état de `active_preview` (PRODUCT_MODEL.md Ch.5.3.1)

---

## 4. Invariants DB à défendre côté serveur

### Invariants structurels

| #   | Invariant                                            | Référence                 | Mécanisme DB                                                                                         |
| --- | ---------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | **Profil enfant auto-créé à création compte**        | PRODUCT_MODEL.md Ch.2.6   | Trigger AFTER INSERT `accounts` → INSERT `child_profiles` nom "Mon enfant"                           |
| 2   | **Timeline auto-créée à création profil**            | PRODUCT_MODEL.md Ch.2.6   | Trigger AFTER INSERT `child_profiles` → INSERT `timelines`                                           |
| 3   | **Slots minimaux auto-créés à création timeline**    | PRODUCT_MODEL.md Ch.2.6   | Trigger AFTER INSERT `timelines` → INSERT 2 slots (1 step position 0 tokens=0 + 1 reward position 1) |
| 4   | **Timeline unique par enfant**                       | PRODUCT_MODEL.md Ch.3.7   | UNIQUE `child_profile_id` sur `timelines`                                                            |
| 5   | **Slot_id stable (UUID indépendant position)**       | PRODUCT_MODEL.md Ch.3.8   | PK `id` (UUID) ≠ `position` (modifiable)                                                             |
| 6   | **Au minimum 1 slot Récompense**                     | PRODUCT_MODEL.md Ch.5.1.1 | Trigger/constraint : COUNT(kind='reward') >= 1 par timeline (suppression dernier interdit)           |
| 7   | **Minimum 1 slot Étape**                             | PRODUCT_MODEL.md Ch.5.1.1 | Trigger/constraint : COUNT(kind='step') >= 1 par timeline                                            |
| 8   | **card_id nullable (slot vide autorisé)**            | PRODUCT_MODEL.md Ch.3.8   | `card_id` NULL autorisé                                                                              |
| 9   | **Tokens 0-5 sur step uniquement**                   | PRODUCT_MODEL.md Ch.3.8   | CHECK `(kind='step' AND tokens BETWEEN 0 AND 5) OR (kind='reward' AND tokens IS NULL)`               |
| 10  | **Cascades DELETE autorisées (min_step/min_reward)** | PRODUCT_MODEL.md Ch.2.6   | Triggers min_step/min_reward détectent contexte cascade (timeline supprimée) et autorisent           |

### Invariants sessions & sync

| #   | Invariant                                       | Référence                 | Mécanisme DB                                                                                               |
| --- | ----------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 11  | **1 session active max par (profil, timeline)** | PRODUCT_MODEL.md Ch.3.9   | UNIQUE partial index `(child_profile_id, timeline_id) WHERE state IN ('active_preview', 'active_started')` |
| 12  | **Epoch monotone (création=1, reset=epoch+1)**  | PRODUCT_MODEL.md Ch.3.9   | Trigger création `epoch = 1` ; trigger réinitialisation `epoch = MAX(epoch) + 1`                           |
| 13  | **Validations = ensemble slot_id (union)**      | PRODUCT_MODEL.md Ch.3.10  | UNIQUE `(session_id, slot_id)` sur `session_validations`                                                   |
| 14  | **Fusion monotone (union ensembliste)**         | PRODUCT_MODEL.md Ch.8.5.2 | Logique applicative + UNIQUE sur validations (pas de régression)                                           |

### Invariants cartes & catégories

| #     | Invariant                                                     | Référence                   | Mécanisme DB                                                                                                                               |
| ----- | ------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 15    | **Pivot catégorie unique (user, card)**                       | PRODUCT_MODEL.md Ch.3.6     | UNIQUE `(user_id, card_id)` sur `user_card_categories`                                                                                     |
| 16    | "Sans catégorie" = catégorie système DB seedée                | PRODUCT_MODEL.md Ch.3.5/3.6 | Trigger AFTER INSERT accounts → create category (is_system=TRUE, name='Sans catégorie'), index unique partiel (account_id) WHERE is_system |
| 16bis | Lecture UX: si aucune ligne pivot, affichage "Sans catégorie" | PRODUCT_MODEL.md Ch.3.6     | Règle de lecture (non-stockée) — mais la DB garantit l’existence d’une cible stable pour remap                                             |
| 17    | **Carte banque jamais supprimée si référencée**               | PRODUCT_MODEL.md Ch.3.4     | Trigger vérif références avant DELETE + dépublication ≠ suppression                                                                        |
| 18    | **Image figée après création (personal)**                     | PRODUCT_MODEL.md Ch.3.4     | Trigger/constraint : UPDATE interdit sur `image_url` si `type='personal'`                                                                  |

### Invariants séquençage

| #   | Invariant                                | Référence                | Mécanisme DB                                              |
| --- | ---------------------------------------- | ------------------------ | --------------------------------------------------------- |
| 19  | **0..1 séquence par carte par compte**   | PRODUCT_MODEL.md Ch.3.11 | UNIQUE `(account_id, mother_card_id)` sur `sequences`     |
| 20  | **Min 2 étapes par séquence (strict)**   | PRODUCT_MODEL.md Ch.3.11 | Constraint triggers DEFERRABLE : COUNT(steps) >= 2        |
| 21  | **Pas de doublons étapes dans séquence** | PRODUCT_MODEL.md Ch.3.11 | UNIQUE `(sequence_id, step_card_id)` sur `sequence_steps` |
| 22  | **Ownership séquences/étapes (no RLS)**  | PRODUCT_MODEL.md Ch.3.11 | Triggers : personal cards must match `account_id`         |

### Invariants révocation & downgrade

| #   | Invariant                                       | Référence               | Mécanisme DB                                                                             |
| --- | ----------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| 22  | **Profil enfant : pas de suppression standard** | PRODUCT_MODEL.md Ch.2.6 | Pas de RLS DELETE exposée (suppression uniquement via cascade compte, RGPD, maintenance) |
| 23  | **Révocation device non-destructive**           | PRODUCT_MODEL.md Ch.3.2 | `revoked_at` timestamp (NULL si actif), pas de DELETE                                    |
| 24  | **Profil verrouillé = lecture seule**           | PRODUCT_MODEL.md Ch.3.3 | RLS : UPDATE/DELETE interdit si `status='locked'`                                        |

---

## 5. Plan RLS conceptuel (par table)

### Principe général

- **Owner-only** : `account_id = auth.uid()` (ou via FK child_profile/timeline)
- **Banque publique** : `type='bank' AND published=TRUE` (lecture seule)
- **Admin** : Accès métadonnées textuelles ; **JAMAIS images personnelles**

### 🔒 Storage Policies (CRITIQUE — Confidentialité images)

**PRODUCT_MODEL.md Ch.10.4.3** : Admin ne voit **JAMAIS** les images personnelles.

**Enforcement prioritaire** : Les RLS table `cards` sont **insuffisantes** pour garantir la confidentialité des images.

**Règles Storage obligatoires** :

1. **Bucket privé** pour images personnelles (cartes `type='personal'`)
2. **Policies Supabase Storage** :
   - SELECT : `account_id = auth.uid()` (owner-only)
   - INSERT : `account_id = auth.uid()` (owner-only)
   - UPDATE : `account_id = auth.uid()` (owner-only)
   - DELETE : `account_id = auth.uid()` (owner-only)
3. **Aucun bypass Admin** : Admin ne peut JAMAIS accéder aux fichiers images personnelles, même avec l'URL

**Note** : La colonne `cards.image_url` contient l'URL Supabase Storage. Même si Admin connaît l'URL, les Storage Policies empêchent l'accès au fichier.

### RLS par table

| Table                  | SELECT                                   | INSERT                                  | UPDATE                                         | DELETE                                         |
| ---------------------- | ---------------------------------------- | --------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `accounts`             | `id = auth.uid()` (owner-only)           | ❌ Trigger auth                         | `id = auth.uid()`                              | `id = auth.uid()`                              |
| `devices`              | `account_id = auth.uid()`                | Vérif quota + `account_id = auth.uid()` | `account_id = auth.uid()` (révocation)         | ❌ Interdit                                    |
| `child_profiles`       | `account_id = auth.uid()`                | Vérif quota + `account_id = auth.uid()` | `account_id = auth.uid()`                      | `account_id = auth.uid()`                      |
| `cards`                | Bank public OU `account_id = auth.uid()` | Vérif quota + `account_id = auth.uid()` | `account_id = auth.uid()` OU admin (bank)      | `account_id = auth.uid()` OU admin (vérif réf) |
| `categories`           | `account_id = auth.uid()`                | `account_id = auth.uid()`               | `account_id = auth.uid()` ET `is_system=FALSE` | `account_id = auth.uid()` ET `is_system=FALSE` |
| `user_card_categories` | `user_id = auth.uid()`                   | `user_id = auth.uid()`                  | `user_id = auth.uid()`                         | `user_id = auth.uid()`                         |
| `timelines`            | Owner via `child_profile_id`             | Trigger auto                            | Owner via `child_profile_id`                   | Owner via `child_profile_id`                   |
| `slots`                | Owner via `timeline_id`                  | Owner + vérif verrouillage              | Owner + vérif verrouillage                     | Owner + vérif verrouillage                     |
| `sessions`             | Owner via `child_profile_id`             | Trigger auto                            | Owner + vérif transition état                  | ❌ Sauf réinit                                 |
| `session_validations`  | Owner via `session_id`                   | Owner + vérif session active            | ❌ Interdit (immuables)                        | Réinit uniquement                              |
| `sequences`            | `account_id = auth.uid()`                | `account_id = auth.uid()`               | `account_id = auth.uid()`                      | `account_id = auth.uid()`                      |
| `sequence_steps`       | Owner via `sequence_id`                  | Owner + vérif min 2                     | Owner + vérif min 2 après                      | Owner + vérif min 2 après                      |

### RLS spécial Admin (confidentialité)

**PRODUCT_MODEL.md Ch.10.4.3** : Admin ne voit **JAMAIS** les images personnelles.

**Confidentialité garantie par Storage Policies** (voir section ci-dessus) — pas uniquement par RLS table `cards`.

**RLS table `cards` (mesure secondaire)** :

- Policy SELECT : `(type='bank') OR (account_id = auth.uid())` (Admin ne peut PAS lire cartes `type='personal'` d'autres users)
- Admin peut lire cartes `type='bank'` pour gestion banque
- Admin **ne peut jamais** accéder aux métadonnées (`name`, `image_url`) des cartes personnelles d'autres utilisateurs

**⚠️ Note** : Si Admin doit accéder à des métadonnées textuelles (ex: support), voir section "Non spécifié — à trancher" sur `accounts` (Option B : Admin support)

---

## 6. Quotas & downgrade : où et comment les "enforcer"

### Quotas définis (PRODUCT_MODEL.md Ch.9)

| Ressource                         | Visitor     | Free     | Abonné   | Admin    |
| --------------------------------- | ----------- | -------- | -------- | -------- |
| **Cartes personnelles (stock)**   | N/A         | N/A      | 50       | ∞        |
| **Cartes personnelles (mensuel)** | N/A         | N/A      | 100/mois | ∞        |
| **Profils enfants**               | 1 (struct.) | 1        | 3        | ∞        |
| **Appareils**                     | 1 (struct.) | 1        | 3        | ∞        |
| **Timelines**                     | ∞           | ∞        | ∞        | ∞        |
| **Sessions actives**              | 1/profil    | 1/profil | 1/profil | 1/profil |
| **Séquences**                     | ∞           | ∞        | ∞        | ∞        |

_(Référence : PRODUCT_MODEL.md Ch.12.2)_

### Enforcement côté serveur

#### 1. Cartes personnelles (stock)

**Opération bloquée** : INSERT `cards` WHERE `type='personal'`

**Mécanisme** :

- Fonction serveur : `check_card_quota_stock(account_id)`
- Compte `SELECT COUNT(*) FROM cards WHERE account_id = ? AND type='personal'`
- Compare avec `50` si Abonné, `∞` si Admin, `N/A` (refuse) si Free/Visitor
- Trigger BEFORE INSERT sur `cards` appelle fonction

**Table dédiée ?** : ❌ Non nécessaire (comptage direct sur `cards`)

---

#### 2. Cartes personnelles (mensuel)

**Opération bloquée** : INSERT `cards` WHERE `type='personal'`

**Mécanisme** :

- Fonction serveur : `check_card_quota_monthly(account_id)`
- Lit `timezone` depuis `accounts`
- Calcule début mois : `DATE_TRUNC('month', NOW() AT TIME ZONE timezone)`
- Compte `SELECT COUNT(*) FROM cards WHERE account_id = ? AND type='personal' AND created_at >= debut_mois`
- Compare avec `100` si Abonné, `∞` si Admin, `N/A` (refuse) si Free/Visitor
- Trigger BEFORE INSERT sur `cards` appelle fonction

**Anti-abus timezone** (PRODUCT_MODEL.md Ch.9.3.3) :

- `created_at` stocké en **UTC**
- `timezone` utilisé pour bornes mois uniquement
- Changement timezone = effet au prochain mois (mois en cours conserve timezone initiale)

**Table dédiée ?** : ❌ Non nécessaire (comptage direct sur `cards` + `accounts.timezone`)

---

#### 3. Profils enfants

**Opération bloquée** : INSERT `child_profiles`

**Mécanisme** :

- Fonction serveur : `check_profile_quota(account_id)`
- Compte `SELECT COUNT(*) FROM child_profiles WHERE account_id = ?`
- Compare avec `1` si Free, `3` si Abonné, `∞` si Admin, `1` (struct.) si Visitor
- Trigger BEFORE INSERT sur `child_profiles` appelle fonction

**Table dédiée ?** : ❌ Non nécessaire (comptage direct sur `child_profiles`)

---

#### 4. Appareils

**Opération bloquée** : INSERT `devices` (rattachement device_id à compte)

**Mécanisme** :

- Fonction serveur : `check_device_quota(account_id)`
- Compte `SELECT COUNT(*) FROM devices WHERE account_id = ? AND revoked_at IS NULL`
- Compare avec `1` si Free, `3` si Abonné, `∞` si Admin, `1` (struct.) si Visitor
- Trigger BEFORE INSERT sur `devices` appelle fonction

**Table dédiée ?** : ❌ Non nécessaire (comptage direct sur `devices` WHERE `revoked_at IS NULL`)

---

#### 5. Sessions actives (structurel, pas quota commercial)

**Opération bloquée** : INSERT `sessions` WHERE état = active_preview/active_started

**Mécanisme** :

- UNIQUE partial index : `(child_profile_id, timeline_id) WHERE state IN ('active_preview', 'active_started')`
- DB refuse automatiquement doublon (erreur UNIQUE constraint)

**Table dédiée ?** : ❌ Non (constraint DB direct)

---

### Downgrade Abonné → Free (PRODUCT_MODEL.md Ch.9.8)

**Règle** :

- Exécution uniquement (pas de modification structurelle)
- Profils au-delà limite Free : accessibles pour terminer sessions actives
- Session terminée sur profil excédentaire → profil verrouillé (`status='locked'`)

**Mécanisme** :

1. Fonction serveur : `handle_downgrade(account_id)`
   - Liste profils par ancienneté (`ORDER BY created_at ASC`)
   - Profil le plus ancien = actif (Free)
   - Profils excédentaires : `status = 'active'` tant que sessions actives
   - Trigger : session terminée → vérif si profil excédentaire → `status = 'locked'`

2. RLS : `status = 'locked'` → UPDATE/DELETE interdit (lecture seule)

**Table dédiée ?** : ❌ Non (utilise `child_profiles.status` + `child_profiles.created_at`)

---

### ⚠️ Non spécifié — à trancher

**Question** : Faut-il une table `subscription_plans` dédiée pour gérer quotas dynamiques ?

**Options** :

- **A) Quotas hardcodés** (fonctions serveur avec valeurs fixes : 1 Free, 3 Abonné, etc.)
- **B) Table `subscription_plans`** avec colonnes `max_profiles`, `max_devices`, `max_cards_stock`, `max_cards_monthly`

**Impacts** :

- **A)** : Migrations simples, quotas changent via migrations SQL
- **B)** : Quotas modifiables sans migration (admin dashboard), mais table supplémentaire non spécifiée dans ux.md/PRODUCT_MODEL.md

**Recommandation** : **Option A** (hardcodés) car ux.md/PRODUCT_MODEL.md ne mentionnent pas table plans dynamiques

---

## 7. Local-only Visitor (hors DB)

### Principe fondamental

**Visitor n'existe PAS en DB** _(PRODUCT_MODEL.md Ch.2.2.1, ux.md L2838-2841)_

- Visitor est **structurellement local-only** (stockage navigateur uniquement, aucune sync cloud)
- **Aucun compte authentifié** = aucune ligne dans `accounts` (ni `child_profiles`, `timelines`, `sessions`, etc.)
- Visitor n'est **pas un statut DB** — c'est un **état applicatif** (pas de `status='visitor'` dans `accounts`)

**Transition Visitor → Free** :

- Lors d'un **signup**, un compte est créé avec `status='free'` (jamais `status='visitor'`)
- Les données locales Visitor sont **importées** en DB (voir section Import ci-dessous)

---

### Données Visitor locales (pas de table DB)

**Ce que Visitor fait en local** (PRODUCT_MODEL.md Ch.2.2.1, Ch.8.2) :

- Profil enfant local implicite unique (pas de `child_profiles` DB)
- Timeline composée (pas de `timelines`/`slots` DB)
- Sessions d'exécution + progression (pas de `sessions`/`session_validations` DB)
- Séquences personnelles (pas de `sequences`/`sequence_steps` DB)

**Stockage** : IndexedDB navigateur (local uniquement, aucune sync cloud)

**Accès banque** : Visitor peut lire `cards WHERE type='bank' AND published=TRUE` (read-only)

---

### Import Visitor → Compte

**Déclencheur** (PRODUCT_MODEL.md Ch.8.6.1) :

- Visitor crée compte sur même appareil
- Import **explicite** proposé (choix utilisateur)

**Périmètre import** (PRODUCT_MODEL.md Ch.8.6.2) :

- Timelines (structure)
- Sessions + progression
- Séquences
- Mapping catégories

**Ce que la DB doit prévoir** :

1. **Cartes dépubliées** : Si timeline Visitor utilise carte banque dépubliée (`published=FALSE`), carte **reste utilisable** dans usages importés (PRODUCT_MODEL.md Ch.8.6.3)
   - Mécanisme : `slots.card_id` référence carte même si `published=FALSE` (pas de contrainte CHECK sur published)

2. **Création données importées** :
   - INSERT `child_profiles` (depuis profil local implicite Visitor)
   - INSERT `timelines` (rattachée au child_profile créé)
   - INSERT `slots` (avec `card_id` référençant cartes banque existantes)
   - INSERT `sessions` (historique si nécessaire)
   - INSERT `session_validations` (progression)
   - INSERT `sequences` + `sequence_steps` (séquences personnelles)

3. **Gestion device_id** :
   - `devices.device_id` Visitor devient `device_id` rattaché au nouveau compte
   - INSERT `devices` avec `device_id` existant + `account_id` nouveau

**Table dédiée import ?** : ❌ Non nécessaire (logique applicative avec transactions)

---

## 8. Points "Non spécifié — à trancher"

### 1. Timestamps validation (résolution conflits multi-appareils)

**Contexte** : PRODUCT_MODEL.md Ch.11.1.2 marque "Non spécifié"

**Question** : Stocker `validated_at` sur `session_validations` pour résolution conflits avancée ?

**Options** :

- **A) Union simple de `slot_id`** (comme spécifié PRODUCT_MODEL.md Ch.3.10) — pas de timestamp
- **B) `validated_at` timestamp** pour tri/résolution conflits si nécessaire

**Impacts** :

- **A)** : Schéma minimal, fusion ensembliste pure
- **B)** : Permet résolution conflits temporels (ex: slot validé puis dé-validé offline) mais non spécifié dans ux.md
- **UX TSA** : Aucun impact (fusion monotone garantit pas de régression visuelle)

**Recommandation** : **Option A** (union simple) car PRODUCT_MODEL.md Ch.3.10 dit "ensemble de slot_id", pas "liste horodatée"

---

### 2. Quotas : table dédiée vs hardcodés

**Contexte** : Voir section 6 (Quotas)

**Question** : Table `subscription_plans` pour quotas dynamiques ?

**Options** :

- **A) Hardcodés** (fonctions serveur avec valeurs fixes)
- **B) Table `subscription_plans`** avec colonnes quotas

**Impacts** :

- **A)** : Quotas changent via migrations SQL (simple, ux.md ne mentionne pas table plans)
- **B)** : Quotas modifiables sans migration (flexibilité) mais invention (pas dans ux.md)

**Recommandation** : **Option A** (hardcodés) car ux.md/PRODUCT_MODEL.md ne spécifient pas table plans

---

### 3. Aucun slot vide disponible lors ajout carte

**Contexte** : PRODUCT_MODEL.md Ch.7 Points ambigus #2

**Question** : Si adulte veut ajouter carte dans timeline mais tous slots step occupés, que faire ?

**Options** :

- **A) Auto-créer slot step** à la fin de timeline
- **B) Checkbox grisée** (carte non ajoutée)
- **C) Toast explicatif** "Ajouter d'abord un slot Étape vide"

**Impacts DB** :

- **A)** : Déclenche INSERT `slots` automatique (logique applicative)
- **B/C)** : Aucun impact DB (bloqué côté front)
- **UX TSA** : A = prévisible (carte toujours ajoutée), B/C = frustrant ?

**Recommandation** : **Non bloquant DB** (A ou B/C peuvent être implémentés sans changement schéma)

---

### 4. Protection accès Page Édition (enfant)

**Contexte** : PRODUCT_MODEL.md Ch.2 Points ambigus #1

**Question** : Mécanisme empêchant enfant d'atteindre Page Édition ?

**Options** :

- **A) Verrou parental** (code PIN)
- **B) Code numérique** 4 chiffres
- **C) Geste tactile** caché
- **D) Aucun** (distinction UX uniquement)

**Impacts DB** :

- **A/B)** : Colonne `accounts.parental_lock_code` (hash)
- **C/D)** : Aucun impact DB (logique front uniquement)
- **UX TSA** : A/B = sécurisé mais complexité, C/D = risque enfant accède Édition

**Recommandation** : **Non bloquant DB** (A/B/C/D implémentables sans changement schéma majeur)

---

## 9. Verdict "Ready for migrations ?"

### ✅ **READY pour migrations DB-first**

---

### Checklist finale

| Élément                               | Statut | Notes                                                                                           |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| **Tables conceptuelles définies**     | ✅     | 12 tables + 2 exclusions (État "fait", Visitor)                                                 |
| **Colonnes conceptuelles spécifiées** | ✅     | Sans types SQL (conceptuel)                                                                     |
| **Clés & contraintes documentées**    | ✅     | PK, FK, UNIQUE, CHECK conceptuels                                                               |
| **Enums & états listés**              | ✅     | 4 enums (account_status [3 valeurs], child_profile_status, card_type, slot_kind, session_state) |
| **Invariants DB identifiés**          | ✅     | 19 invariants à défendre côté serveur                                                           |
| **Plan RLS conceptuel**               | ✅     | Owner-only, banque publique, **Storage Policies critiques**                                     |
| **Quotas enforcement**                | ✅     | Mécanismes serveur (triggers/fonctions) sans table dédiée                                       |
| **Local-only Visitor**                | ✅     | Hors DB (pas de statut DB) + import vers compte `status='free'`                                 |
| **Points ambigus tranchés**           | ⚠️     | 5 points listés (1 nouveau : Admin accès `accounts`)                                            |
| **Aucune invention**                  | ✅     | Tout sourcé depuis ux.md ou PRODUCT_MODEL.md v15                                                |
| **Séparation systèmes**               | ✅     | Planning visuel / Économie jetons / Séquençage distincts                                        |
| **Confidentialité images**            | ✅     | **Storage Policies prioritaires** (RLS table insuffisant)                                       |

---

### Points à trancher AVANT migrations (optionnels, non bloquants)

| #   | Point                            | Impact                       | Urgence                                | Statut     |
| --- | -------------------------------- | ---------------------------- | -------------------------------------- | ---------- |
| 1   | Timestamps validation            | Schéma `session_validations` | ⚠️ Faible (union simple suffit)        | À trancher |
| 2   | Table quotas dédiée vs hardcodés | Flexibilité quotas           | ⚠️ Faible (hardcodés OK)               | À trancher |
| 3   | Aucun slot vide disponible       | Logique ajout carte          | ❌ Non bloquant DB                     | À trancher |
| 4   | Protection Page Édition          | Verrou parental              | ❌ Non bloquant DB                     | À trancher |
| 5   | **Admin accès `accounts`**       | RLS `accounts` SELECT        | ⚠️ **Nouveau** (voir Table `accounts`) | À trancher |

**Décisions confirmées** :

- ✅ **Images banque** : Supabase Storage bucket `bank-images` public (lecture tous) — Option A
- ✅ **Images personnelles** : Supabase Storage bucket `personal-images` privé (owner-only, policies RLS Storage)
- ✅ **Timezone validation IANA** : Responsabilité applicative (pas de CHECK DB, validation front/edge functions)

**Recommandation** : Démarrer migrations avec **Option A** (union simple validations) + **quotas hardcodés** + **Admin strict** (conformément aux sources).

---

### Prochaines étapes

1. ✅ **Migrations SQL DB-first** : Traduire ce blueprint en migrations Supabase
2. 🔒 **Storage Policies** : **PRIORITÉ ABSOLUE** — Configurer bucket privé + policies owner-only pour images personnelles
3. ✅ **RLS Policies** : Implémenter plan RLS conceptuel (section 5)
4. ✅ **Triggers & Fonctions** : Défendre invariants (section 4) + quotas (section 6)
5. ✅ **Tests DB** : Vérifier contraintes, cardinalités, cascades
6. ⚠️ **Import Visitor** : Logique applicative avec transactions (section 7)

---

**📄 Document prêt pour traduction en migrations SQL DB-first.**

**🔒 CRITIQUE** : Les **Storage Policies** (step 2) doivent être implémentées **AVANT** tout upload d'image personnelle en production.
