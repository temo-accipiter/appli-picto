# Phase 2 - Cartographie des Parcours Utilisateurs

**Date :** 2025-11-09
**Projet :** Appli-Picto
**Référence :** Phase 1 - Audit des Tests Existants
**Stack :** React 19 + Vite + TypeScript + Supabase + Stripe + Cloudflare

---

## 📋 Résumé Exécutif

Ce document cartographie **tous les parcours utilisateurs critiques** de l'application Appli-Picto, identifie les composants impliqués, les services tiers, et évalue le niveau de criticité et la couverture de tests.

| Catégorie               | Nombre de Parcours | Criticité Haute (🔴) | Criticité Moyenne (🟠) | Criticité Basse (🟡) |
| ----------------------- | ------------------ | -------------------- | ---------------------- | -------------------- |
| **Authentification**    | 6                  | 6                    | 0                      | 0                    |
| **Gestion Tâches**      | 8                  | 6                    | 2                      | 0                    |
| **Gestion Récompenses** | 6                  | 4                    | 2                      | 0                    |
| **Gestion Catégories**  | 3                  | 2                    | 1                      | 0                    |
| **Progression Train**   | 2                  | 2                    | 0                      | 0                    |
| **Quotas & RBAC**       | 4                  | 4                    | 0                      | 0                    |
| **Paiements Stripe**    | 5                  | 5                    | 0                      | 0                    |
| **Gestion Compte**      | 5                  | 4                    | 1                      | 0                    |
| **Paramètres**          | 2                  | 1                    | 1                      | 0                    |
| **Admin**               | 3                  | 3                    | 0                      | 0                    |
| **TOTAL**               | **44**             | **37**               | **7**                  | **0**                |

**Taux de criticité :** 84% critique (🔴), 16% important (🟠), 0% secondaire (🟡)

---

## 🗺️ Architecture des Routes

### Routes Publiques (accessibles sans compte)

| Route              | Page           | Description                                   | Auth Requise |
| ------------------ | -------------- | --------------------------------------------- | ------------ |
| `/`                | HomeRedirect   | Redirection intelligente selon rôle           | ❌           |
| `/tableau`         | Tableau        | Planning visuel drag-and-drop (mode visiteur) | ❌           |
| `/time-timer`      | TimeTimerPage  | Timer visuel pour enfants TSA                 | ❌           |
| `/login`           | Login          | Connexion utilisateur                         | ❌           |
| `/signup`          | Signup         | Inscription utilisateur                       | ❌           |
| `/forgot-password` | ForgotPassword | Demande de réinitialisation mot de passe      | ❌           |
| `/reset-password`  | ResetPassword  | Réinitialisation mot de passe                 | ❌           |

### Routes Protégées (authentification requise)

| Route                | Page             | Description                          | Rôle Minimum |
| -------------------- | ---------------- | ------------------------------------ | ------------ |
| `/edition`           | Edition          | Édition des tâches et récompenses    | user/free    |
| `/profil`            | Profil           | Gestion du profil utilisateur        | user/free    |
| `/abonnement`        | Abonnement       | Gestion abonnement Stripe            | user/free    |
| `/admin/logs`        | Logs             | Logs système et événements           | admin        |
| `/admin/permissions` | AdminPermissions | Gestion des permissions utilisateurs | admin        |

### Routes Légales (RGPD/CNIL)

| Route                        | Page                     | Description                                      |
| ---------------------------- | ------------------------ | ------------------------------------------------ |
| `/mentions-legales`          | MentionsLegales          | Mentions légales                                 |
| `/cgu`                       | CGU                      | Conditions générales d'utilisation               |
| `/cgv`                       | CGV                      | Conditions générales de vente                    |
| `/politique-confidentialite` | PolitiqueConfidentialite | Politique de confidentialité                     |
| `/politique-cookies`         | PolitiqueCookies         | Politique de cookies                             |
| `/accessibilite`             | Accessibilite            | Déclaration d'accessibilité WCAG 2.2 AA          |
| `/rgpd`                      | PortailRGPD              | Portail RGPD (accès, rectification, suppression) |

---

## 👥 Système RBAC (Rôles & Permissions)

### Rôles Utilisateurs

| Rôle         | Valeur DB | Description                       | Quotas                                                   | Permissions           |
| ------------ | --------- | --------------------------------- | -------------------------------------------------------- | --------------------- |
| **Unknown**  | `unknown` | État transitoire (auth non prête) | -                                                        | Aucune                |
| **Visiteur** | `visitor` | Mode démo sans compte             | 3 tâches démo fixes                                      | Lecture seule         |
| **Free**     | `free`    | Compte gratuit avec quotas        | Quotas mensuels (5 tâches, 2 récompenses, 2 catégories)  | CRUD limité           |
| **Abonné**   | `abonne`  | Abonnement actif Stripe           | Quotas pleins (40 tâches, 10 récompenses, 50 catégories) | CRUD complet          |
| **Admin**    | `admin`   | Administrateur système            | Illimité                                                 | Accès complet + admin |

### Système de Quotas

**Implémentation :** `useRBAC` + RPC `get_usage_fast(p_user_id)`

**Types de quotas :**

- `task` : Nombre de tâches
- `reward` : Nombre de récompenses
- `category` : Nombre de catégories

**Périodes de quotas :**

- `total` : Quota total (lifetime)
- `monthly` : Quota mensuel (réinitialisé chaque mois)

**Compteurs :**

- `max_tasks`, `max_rewards`, `max_categories` : Compteurs totaux
- `monthly_tasks`, `monthly_rewards`, `monthly_categories` : Compteurs mensuels

**Vérifications :**

- `canCreate(contentType)` : Vérifie si l'utilisateur peut créer un élément
- `getQuotaInfo(contentType)` : Retourne les détails du quota (limit, current, remaining, percentage, isAtLimit, isNearLimit)

**Synchronisation temps réel :**

- Realtime Supabase sur tables `taches`, `recompenses`, `categories`
- Mise à jour automatique des compteurs lors de créations/suppressions

### Permissions Granulaires

**Implémentation :** `PermissionsContext` + RPC `get_my_primary_role()` + `get_my_permissions()`

**API :**

- `can(featureName)` : Vérifie une permission spécifique
- `canAll(featureNames[])` : Vérifie plusieurs permissions (ET logique)
- `canAny(featureNames[])` : Vérifie plusieurs permissions (OU logique)

**Tables DB :**

- `user_roles` : Association user ↔ role
- `user_permissions` : Permissions granulaires par feature

---

## 📊 Parcours Utilisateurs Critiques

### 1️⃣ Authentification (6 parcours)

#### 1.1 Inscription Utilisateur (🔴 Critique)

**Description :** Création d'un nouveau compte utilisateur avec vérification email.

**Composants impliqués :**

- Page : `src/pages/signup/Signup.tsx`
- Hook : `src/hooks/useAuth.ts`
- Contexte : `src/contexts/AuthContext.tsx`
- Service : Supabase Auth
- Sécurité : Cloudflare Turnstile (CAPTCHA)

**Flow :**

1. Utilisateur remplit formulaire (email + mot de passe)
2. Validation Turnstile (CAPTCHA)
3. Appel `supabase.auth.signUp({ email, password })`
4. Envoi email de confirmation (template `confirm-signup.html`)
5. Utilisateur clique sur lien dans email
6. Redirection vers `/login`
7. Suppression automatique session temporaire (src/main.tsx:133-142)

**Services tiers :**

- Supabase Auth
- Cloudflare Turnstile
- Email service (Supabase)

**Couverture tests :**

- ✅ Test unitaire : `src/contexts/AuthContext.test.tsx`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Validation email obligatoire (sécurité)
- Suppression session auto après confirmation (évite session orpheline)
- Nettoyage comptes non confirmés via `cleanup-unconfirmed` edge function

---

#### 1.2 Connexion Utilisateur (🔴 Critique)

**Description :** Connexion d'un utilisateur existant.

**Composants impliqués :**

- Page : `src/pages/login/Login.tsx`
- Hook : `src/hooks/useAuth.ts`
- Contexte : `src/contexts/AuthContext.tsx`
- Service : Supabase Auth

**Flow :**

1. Utilisateur saisit email + mot de passe
2. Appel `supabase.auth.signInWithPassword({ email, password })`
3. Supabase retourne session JWT
4. `AuthContext` met à jour `user` state
5. `PermissionsContext` charge rôle + permissions via RPC
6. Redirection vers `/tableau` ou `/edition` selon rôle

**Services tiers :**

- Supabase Auth

**Couverture tests :**

- ✅ Test unitaire : `src/contexts/AuthContext.test.tsx`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Gestion timeout `getSession()` (5s max, sinon recréation client SDK - src/contexts/AuthContext.tsx:100-129)
- Retry avec exponential backoff en cas d'erreur transitoire (PermissionsContext.tsx:110-127)

---

#### 1.3 Déconnexion Utilisateur (🔴 Critique)

**Description :** Déconnexion et nettoyage de session.

**Composants impliqués :**

- Contexte : `src/contexts/AuthContext.tsx`
- Service : Supabase Auth

**Flow :**

1. Utilisateur clique "Déconnexion"
2. Appel `supabase.auth.signOut()`
3. Nettoyage session côté serveur
4. Reset `user` state à `null`
5. Reset permissions à `visitor`
6. Redirection vers `/login`

**Services tiers :**

- Supabase Auth

**Couverture tests :**

- ✅ Test unitaire : `src/contexts/AuthContext.test.tsx`
- ❌ Test E2E : **Manquant**

---

#### 1.4 Mot de Passe Oublié (🔴 Critique)

**Description :** Demande de réinitialisation de mot de passe.

**Composants impliqués :**

- Page : `src/pages/forgot-password/ForgotPassword.tsx`
- Service : Supabase Auth
- Email : Template `reset-password.html`

**Flow :**

1. Utilisateur saisit email
2. Appel `supabase.auth.resetPasswordForEmail({ email })`
3. Envoi email avec lien de réinitialisation
4. Utilisateur clique sur lien → redirection vers `/reset-password#type=recovery`
5. Nettoyage hash URL (src/main.tsx:123-131)

**Services tiers :**

- Supabase Auth
- Email service

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

---

#### 1.5 Réinitialisation Mot de Passe (🔴 Critique)

**Description :** Définir un nouveau mot de passe après demande de réinitialisation.

**Composants impliqués :**

- Page : `src/pages/reset-password/ResetPassword.tsx`
- Service : Supabase Auth

**Flow :**

1. Utilisateur arrive sur `/reset-password#type=recovery`
2. Formulaire nouveau mot de passe
3. Appel `supabase.auth.updateUser({ password: newPassword })`
4. Mise à jour mot de passe côté serveur
5. Redirection vers `/login`

**Services tiers :**

- Supabase Auth

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

---

#### 1.6 Récupération Session au Démarrage (🔴 Critique)

**Description :** Restauration de la session utilisateur au chargement de l'app.

**Composants impliqués :**

- Contexte : `src/contexts/AuthContext.tsx`
- Service : Supabase Auth

**Flow :**

1. App démarre
2. `AuthContext.init()` appelé
3. Appel `supabase.auth.getSession()` avec timeout 5s
4. Si timeout → recréation client SDK (deadlock fix)
5. Si session valide → restore `user`
6. Écoute `onAuthStateChange` pour mises à jour
7. `authReady` passe à `true` (débloque UI)

**Services tiers :**

- Supabase Auth

**Couverture tests :**

- ✅ Test unitaire : `src/contexts/AuthContext.test.tsx`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Timeout 5s pour éviter blocage SDK (deadlock après suspension onglet)
- Recréation client si timeout (src/contexts/AuthContext.tsx:114-128)
- Visibility handler pour reconnexion realtime (src/utils/supabaseVisibilityHandler.ts)

---

### 2️⃣ Gestion des Tâches (8 parcours)

#### 2.1 Lecture des Tâches (🔴 Critique)

**Description :** Chargement de toutes les tâches de l'utilisateur.

**Composants impliqués :**

- Hook : `src/hooks/useTaches.ts`
- Table DB : `taches`
- RLS Policy : `user_id = auth.uid()`

**Flow :**

1. Hook `useTaches(reload)` appelé
2. Attente `authReady` + `user.id`
3. Query : `SELECT * FROM taches WHERE user_id = $1 ORDER BY position ASC`
4. Normalisation booléens (`aujourdhui`, `fait`)
5. Mise à jour state `taches`

**Services tiers :**

- Supabase PostgreSQL
- Supabase RLS

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTaches.test.ts`
- ✅ Test MSW : `src/hooks/useTaches.msw.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 2.2 Création de Tâche avec Image (🔴 Critique)

**Description :** Ajout d'une nouvelle tâche avec pictogramme.

**Composants impliqués :**

- Hook : `src/hooks/useTachesEdition.ts`
- Fonction : `src/utils/storage/modernUploadImage.ts`
- Table DB : `taches`, `user_assets`
- Bucket Storage : `images`

**Flow :**

1. Utilisateur sélectionne image (PNG, JPG, WEBP, HEIC)
2. Vérification quotas : `useRBAC.canCreateTask()`
3. Compression image → WebP (max 100KB)
4. Upload vers `images/{user_id}/taches/{hash}.webp`
5. Enregistrement dans `user_assets` (déduplication par hash)
6. Insert dans `taches` avec `imagepath`
7. Mise à jour state local

**Services tiers :**

- Supabase Storage
- Supabase PostgreSQL
- Compression WebP (client-side)

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTachesEdition.test.ts`
- ✅ Test E2E : `tests/e2e/image-upload.spec.ts`

**Points critiques :**

- Compression automatique (100KB max)
- Déduplication par hash SHA-256 (évite doublons)
- Support HEIC (conversion WebP)
- Versioning des images (invalidation cache)

---

#### 2.3 Modification Label/Catégorie (🟠 Important)

**Description :** Renommer une tâche ou changer sa catégorie.

**Composants impliqués :**

- Hook : `src/hooks/useTachesEdition.ts`
- Table DB : `taches`

**Flow :**

1. Utilisateur modifie label ou catégorie
2. `updateLabel(id, newLabel)` ou `updateCategorie(id, categoryId)`
3. Query : `UPDATE taches SET ... WHERE id = $1 AND user_id = $2`
4. Mise à jour state local
5. Toast confirmation

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTachesEdition.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 2.4 Toggle "Aujourd'hui" (🟠 Important)

**Description :** Marquer/démarquer une tâche pour le planning du jour.

**Composants impliqués :**

- Hook : `src/hooks/useTachesEdition.ts`
- Table DB : `taches`

**Flow :**

1. Utilisateur coche/décoche checkbox "Aujourd'hui"
2. `toggleAujourdhui(id, currentValue)`
3. Query : `UPDATE taches SET aujourdhui = NOT $1, fait = false WHERE id = $2`
4. Mise à jour state local
5. **Pas de toast** (action discrète)

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTachesEdition.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 2.5 Toggle "Fait" (Validation Tâche) (🔴 Critique)

**Description :** Marquer une tâche comme complétée (progression train).

**Composants impliqués :**

- Hook : `src/hooks/useTaches.ts`
- Hook : `src/hooks/useTachesDnd.ts` (drag-and-drop mode)
- Table DB : `taches`
- Composant : Train de progression

**Flow :**

1. Utilisateur clique sur tâche (ou drag vers zone "Fait")
2. `toggleFait(id, currentValue)` ou `toggleDone(id, newValue)`
3. Query : `UPDATE taches SET fait = $1 WHERE id = $2 AND user_id = $3`
4. Mise à jour state local
5. Recalcul progression train (nombre de tâches complétées)
6. Animation confettis si toutes tâches complétées (paramètre `confettis`)

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTaches.test.ts`
- ✅ Test E2E : `tests/e2e/task-completion.spec.ts`

**Points critiques :**

- Progression temps réel (train avance)
- Animation confettis si 100% complété
- Mode drag-and-drop avec @dnd-kit

---

#### 2.6 Réinitialisation Tâches (Reset "Fait") (🔴 Critique)

**Description :** Remettre toutes les tâches à "non fait" (nouveau jour).

**Composants impliqués :**

- Hook : `src/hooks/useTaches.ts`
- Hook : `src/hooks/useTachesDnd.ts`
- Table DB : `taches`

**Flow :**

1. Utilisateur clique "Recommencer"
2. `resetFait()` ou `resetAll()`
3. Query : `UPDATE taches SET fait = false WHERE user_id = $1`
4. Mise à jour state local
5. Réinitialisation progression train
6. Toast confirmation

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTaches.test.ts`
- ✅ Test E2E : `tests/e2e/task-completion.spec.ts`

---

#### 2.7 Suppression Tâche (🔴 Critique)

**Description :** Supprimer une tâche et son image associée.

**Composants impliqués :**

- Hook : `src/hooks/useTaches.ts`, `src/hooks/useTachesEdition.ts`
- Fonction : `src/utils/storage/deleteImageIfAny.ts`
- Table DB : `taches`, `user_assets`
- Bucket Storage : `images`

**Flow :**

1. Utilisateur clique "Supprimer"
2. `deleteTache(tache)`
3. Si image présente → suppression Storage
4. Delete dans `user_assets`
5. Query : `DELETE FROM taches WHERE id = $1 AND user_id = $2`
6. Mise à jour state local
7. Mise à jour quotas (si compte free)
8. Toast confirmation

**Services tiers :**

- Supabase Storage
- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTaches.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 2.8 Réorganisation Ordre (Drag-and-Drop) (🔴 Critique)

**Description :** Changer l'ordre des tâches par glisser-déposer.

**Composants impliqués :**

- Hook : `src/hooks/useTachesDnd.ts`
- Library : `@dnd-kit`
- Table DB : `taches`

**Flow :**

1. Utilisateur glisse tâche vers nouvelle position
2. `moveTask(activeId, overId)` → mise à jour state immédiate (UI fluide)
3. `saveOrder(newList)` → sauvegarde en DB par batch (5 tâches à la fois)
4. Query : `UPDATE taches SET position = $1 WHERE id = $2` (batch)
5. Délai 100ms entre batches (évite surcharge DB)
6. En cas d'erreur → reload automatique (rollback)

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTachesDnd.test.ts`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Mise à jour optimiste (UI fluide)
- Batch updates (performance)
- Rollback automatique en cas d'erreur
- Retry avec exponential backoff

---

### 3️⃣ Gestion des Récompenses (6 parcours)

#### 3.1 Lecture des Récompenses (🔴 Critique)

**Description :** Chargement de toutes les récompenses de l'utilisateur.

**Composants impliqués :**

- Hook : `src/hooks/useRecompenses.ts`
- Table DB : `recompenses`
- RLS Policy : `user_id = auth.uid()`

**Flow :**

1. Hook `useRecompenses(reload)` appelé
2. Attente `authReady` + `user.id`
3. Query : `SELECT * FROM recompenses WHERE user_id = $1 ORDER BY created_at ASC`
4. Mise à jour state `recompenses`

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRecompenses.test.ts`
- ✅ Test MSW : `src/hooks/useRecompenses.msw.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 3.2 Création Récompense avec Image (🔴 Critique)

**Description :** Ajout d'une nouvelle récompense avec pictogramme.

**Composants impliqués :**

- Hook : `src/hooks/useRecompenses.ts`
- Fonction : `src/utils/storage/modernUploadImage.ts`
- Table DB : `recompenses`, `user_assets`
- Bucket Storage : `images`

**Flow :**

1. Utilisateur sélectionne image
2. Vérification quotas : `useRBAC.canCreateReward()`
3. Compression image → WebP (max 100KB)
4. Upload vers `images/{user_id}/recompenses/{hash}.webp`
5. Enregistrement dans `user_assets`
6. Insert dans `recompenses` avec `imagepath`
7. Mise à jour state local
8. Toast confirmation

**Services tiers :**

- Supabase Storage
- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRecompenses.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 3.3 Modification Label (🟠 Important)

**Description :** Renommer une récompense.

**Composants impliqués :**

- Hook : `src/hooks/useRecompenses.ts`
- Table DB : `recompenses`

**Flow :**

1. Utilisateur modifie label
2. `updateLabel(id, newLabel)`
3. Query : `UPDATE recompenses SET label = $1 WHERE id = $2 AND user_id = $3`
4. Mise à jour state local
5. Toast confirmation

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRecompenses.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 3.4 Sélection Récompense (🔴 Critique)

**Description :** Définir la récompense active affichée en grand.

**Composants impliqués :**

- Hook : `src/hooks/useRecompenses.ts`
- RPC : `select_recompense_atomic(p_reward_id)`
- Table DB : `recompenses`
- Index : `recompenses_one_selected_per_user` (unique constraint)

**Flow :**

1. Utilisateur clique sur récompense
2. `selectRecompense(id)`
3. Appel RPC atomique (transaction SQL)
4. Désélection toutes récompenses utilisateur
5. Sélection récompense cible
6. Mise à jour state local
7. **Pas de toast** (action visuelle)

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRecompenses.test.ts`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- 1 seul appel réseau (optimisation)
- Atomicité garantie (RPC transaction)
- Pas de race condition (index unique)

---

#### 3.5 Suppression Récompense (🔴 Critique)

**Description :** Supprimer une récompense et son image.

**Composants impliqués :**

- Hook : `src/hooks/useRecompenses.ts`
- Fonction : `src/utils/storage/deleteImageIfAny.ts`
- Table DB : `recompenses`, `user_assets`
- Bucket Storage : `images`

**Flow :**

1. Utilisateur clique "Supprimer"
2. `deleteRecompense(reward)`
3. Si image présente → suppression Storage
4. Delete dans `user_assets`
5. Query : `DELETE FROM recompenses WHERE id = $1 AND user_id = $2`
6. Mise à jour state local
7. Mise à jour quotas
8. Toast confirmation

**Services tiers :**

- Supabase Storage
- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRecompenses.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 3.6 Remplacement Image Récompense (🟠 Important)

**Description :** Changer l'image d'une récompense existante.

**Composants impliqués :**

- Hook : `src/hooks/useRecompenses.ts`
- Fonction : `src/utils/storage/replaceImage.ts`
- Table DB : `recompenses`, `user_assets`
- Bucket Storage : `images`

**Flow :**

1. Utilisateur sélectionne nouvelle image
2. `updateRecompenseImage(id, file)`
3. Recherche `asset_id` dans `user_assets`
4. Upload nouvelle version avec versioning (timestamp)
5. Invalidation cache (query param `?v=timestamp`)
6. Update `imagepath` dans `recompenses`
7. Mise à jour state local

**Services tiers :**

- Supabase Storage
- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRecompenses.test.ts`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Versioning automatique (cache-busting)
- Pas de suppression ancienne version (historique)
- Invalidation cache navigateur

---

### 4️⃣ Gestion des Catégories (3 parcours)

#### 4.1 Lecture des Catégories (🔴 Critique)

**Description :** Chargement catégories utilisateur + catégories globales.

**Composants impliqués :**

- Hook : `src/hooks/useCategories.ts`
- Table DB : `categories`
- RLS Policy : `user_id = auth.uid() OR user_id IS NULL`

**Flow :**

1. Hook `useCategories(reload)` appelé
2. Query : `SELECT * FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY label ASC`
3. Mise à jour state `categories`

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useCategories.test.ts`
- ✅ Test MSW : `src/hooks/useCategories.msw.test.ts`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Catégories globales (`user_id IS NULL`) visibles par tous
- Catégories utilisateur (`user_id = auth.uid()`) privées

---

#### 4.2 Création Catégorie (🔴 Critique)

**Description :** Ajout d'une nouvelle catégorie.

**Composants impliqués :**

- Hook : `src/hooks/useCategories.ts`
- Table DB : `categories`

**Flow :**

1. Utilisateur saisit label + value
2. Vérification quotas : `useRBAC.canCreateCategory()`
3. `addCategory({ label, value })`
4. Query : `INSERT INTO categories (label, value) VALUES ($1, $2)`
5. Trigger DB auto-set `user_id = auth.uid()`
6. Reload catégories
7. Toast confirmation

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useCategories.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 4.3 Suppression Catégorie (🟠 Important)

**Description :** Supprimer une catégorie utilisateur.

**Composants impliqués :**

- Hook : `src/hooks/useCategories.ts`
- Table DB : `categories`, `taches`

**Flow :**

1. Utilisateur clique "Supprimer"
2. `deleteCategory(value)`
3. Query : `DELETE FROM categories WHERE value = $1 AND user_id = $2`
4. Tâches associées → catégorie mise à `NULL` (ON DELETE SET NULL)
5. Reload catégories
6. Toast confirmation

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useCategories.test.ts`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Cascade `ON DELETE SET NULL` (tâches non supprimées)
- Impossible de supprimer catégories globales (`user_id IS NULL`)

---

### 5️⃣ Progression Train (2 parcours)

#### 5.1 Affichage Progression (🔴 Critique)

**Description :** Calcul et affichage de la progression train (stations).

**Composants impliqués :**

- Hook : `src/hooks/useTachesDnd.ts`
- Hook : `src/hooks/useStations.ts`
- Table DB : `stations`
- Composant : Train de progression

**Flow :**

1. Chargement tâches du jour (`aujourdhui = true`)
2. Calcul ratio : `done / total`
3. Mapping vers stations de métro (lignes 1-14)
4. Affichage train à la station correspondante
5. Mise à jour temps réel sur toggle tâche

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useTachesDnd.test.ts`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Temps réel (mise à jour immédiate)
- Stations par ligne de métro (thème motivationnel)
- Animation train (CSS transitions)

---

#### 5.2 Animation Confettis (100% Complété) (🔴 Critique)

**Description :** Animation de célébration quand toutes tâches complétées.

**Composants impliqués :**

- Hook : `src/hooks/useTachesDnd.ts`
- Hook : `src/hooks/useParametres.ts`
- Paramètre : `confettis` (booléen)

**Flow :**

1. Utilisateur valide dernière tâche
2. Vérification : `done === total`
3. Vérification paramètre : `parametres.confettis === true`
4. Déclenchement animation confettis (CSS/JS)
5. Affichage récompense sélectionnée en grand

**Services tiers :**

- Supabase PostgreSQL (paramètres)

**Couverture tests :**

- ❌ Test unitaire : **Manquant** (useParametres testé séparément)
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Paramètre désactivable (éviter surcharge sensorielle TSA)
- Animation douce et courte (WCAG 2.2 AA)

---

### 6️⃣ Quotas & RBAC (4 parcours)

#### 6.1 Vérification Quotas Avant Création (🔴 Critique)

**Description :** Bloquer création si quota atteint (compte free).

**Composants impliqués :**

- Hook : `src/hooks/useRBAC.ts`
- RPC : `get_usage_fast(p_user_id)`
- Table DB : `quotas`, `taches`, `recompenses`, `categories`

**Flow :**

1. Utilisateur clique "Ajouter tâche/récompense/catégorie"
2. Appel `useRBAC.canCreate(contentType)`
3. RPC `get_usage_fast()` → récupère quotas + usage
4. Comparaison : `current < limit`
5. Si quota atteint → affichage modal upgrade
6. Si quota OK → création autorisée

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRBAC.test.tsx`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Vérification avant création (UX)
- RPC optimisé (1 seul appel pour tous quotas)
- Realtime sync (mise à jour immédiate après création)

---

#### 6.2 Affichage Indicateur Quotas (🔴 Critique)

**Description :** Afficher quotas utilisés/totaux en temps réel.

**Composants impliqués :**

- Hook : `src/hooks/useRBAC.ts`
- Composant : `src/components/shared/quota-indicator/QuotaIndicator.tsx`

**Flow :**

1. Appel `useRBAC.getQuotaInfo(contentType)`
2. Retourne : `{ limit, current, remaining, percentage, isAtLimit, isNearLimit }`
3. Affichage indicateur visuel (progress bar)
4. Couleur : vert (< 80%), orange (80-99%), rouge (100%)
5. Mise à jour temps réel (Realtime Supabase)

**Services tiers :**

- Supabase PostgreSQL
- Supabase Realtime

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRBAC.test.tsx`
- ❌ Test unitaire composant : **Manquant**
- ❌ Test E2E : **Manquant**

---

#### 6.3 Chargement Rôle & Permissions au Login (🔴 Critique)

**Description :** Récupération rôle + permissions après authentification.

**Composants impliqués :**

- Contexte : `src/contexts/PermissionsContext.tsx`
- RPC : `get_my_primary_role()`, `get_my_permissions()`
- Table DB : `user_roles`, `user_permissions`

**Flow :**

1. `AuthContext.authReady` passe à `true`
2. `PermissionsContext.load()` appelé
3. Appel RPC `get_my_primary_role()` → rôle primaire
4. Appel RPC `get_my_permissions()` → liste permissions
5. Normalisation rôle (visitor, free, abonne, admin)
6. Mapping permissions → objet `{ feature_name: boolean }`
7. `ready` passe à `true` (débloque UI)

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/contexts/PermissionsContext.test.tsx`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Retry avec exponential backoff (erreurs transitoires)
- Débounce 100ms sur `onAuthStateChange` (fix deadlock SDK)
- Jamais de rôle `visitor` tant que `authReady = false`

---

#### 6.4 Synchronisation Realtime Quotas (🔴 Critique)

**Description :** Mise à jour automatique quotas lors de créations/suppressions.

**Composants impliqués :**

- Hook : `src/hooks/useRBAC.ts`
- Service : Supabase Realtime
- Tables : `taches`, `recompenses`, `categories`

**Flow :**

1. Hook `useRBAC` souscrit aux changements tables
2. Channel Realtime : `rbac:quotas:changes`
3. Écoute events : `INSERT`, `UPDATE`, `DELETE`
4. Sur event → appel `get_usage_fast()` (100ms debounce)
5. Mise à jour compteurs quotas
6. UI réagit automatiquement (indicateurs)

**Services tiers :**

- Supabase Realtime
- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useRBAC.test.tsx`
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Channel fixe (évite accumulation channels zombies)
- Debounce 100ms (évite flood requêtes)
- Cleanup automatique sur unmount

---

### 7️⃣ Paiements Stripe (5 parcours)

#### 7.1 Création Session Checkout (🔴 Critique)

**Description :** Créer session Stripe pour souscrire abonnement.

**Composants impliqués :**

- Page : `src/pages/abonnement/Abonnement.tsx`
- Edge Function : `supabase/functions/create-checkout-session/index.ts`
- Service : Stripe API
- Table DB : `abonnements`

**Flow :**

1. Utilisateur clique "S'abonner"
2. Appel edge function `create-checkout-session`
3. Vérification auth JWT
4. Si abonnement actif → redirect Billing Portal
5. Sinon → création Stripe Checkout Session
6. Paramètres : `price_id`, `success_url`, `cancel_url`
7. Métadonnées : `supabase_user_id`
8. Redirection vers Stripe Checkout
9. Log événement dans `subscription_logs`

**Services tiers :**

- Stripe API
- Supabase Edge Functions
- Supabase PostgreSQL

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Validation `price_id` (regex `price_[a-zA-Z0-9]+`)
- Validation URLs (whitelist `ALLOWED_RETURN_HOSTS`)
- Gestion customer existant (search by email)
- Métadonnées pour webhook reconciliation

---

#### 7.2 Webhook Checkout Completed (🔴 Critique)

**Description :** Activer abonnement après paiement réussi.

**Composants impliqués :**

- Edge Function : `supabase/functions/stripe-webhook/index.ts`
- Service : Stripe Webhooks
- Table DB : `abonnements`

**Flow :**

1. Stripe envoie event `checkout.session.completed`
2. Vérification signature webhook (`STRIPE_WEBHOOK_SECRET`)
3. Extraction `subscription_id` + `supabase_user_id`
4. Vérification idempotence (`last_event_id`)
5. Récupération détails subscription depuis Stripe API
6. Upsert dans `abonnements` (conflict sur `stripe_subscription_id`)
7. Log événement dans `subscription_logs`
8. Réponse 200 OK

**Services tiers :**

- Stripe Webhooks
- Stripe API
- Supabase Edge Functions
- Supabase PostgreSQL

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Vérification signature (sécurité)
- Idempotence (évite double-traitement)
- Upsert atomique (pas de duplicates)
- Logs détaillés pour debug

---

#### 7.3 Webhook Subscription Updated (🔴 Critique)

**Description :** Mettre à jour abonnement (renouvellement, annulation, etc.).

**Composants impliqués :**

- Edge Function : `supabase/functions/stripe-webhook/index.ts`
- Service : Stripe Webhooks
- Table DB : `abonnements`

**Flow :**

1. Stripe envoie event `customer.subscription.updated`
2. Vérification signature webhook
3. Extraction `subscription` object + `supabase_user_id` (metadata)
4. Vérification idempotence
5. Extraction champs : `status`, `current_period_end`, `cancel_at`, etc.
6. Upsert dans `abonnements`
7. Log événement
8. Réponse 200 OK

**Services tiers :**

- Stripe Webhooks
- Supabase Edge Functions
- Supabase PostgreSQL

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

**Points critiques :**

- Gestion statuts : `active`, `trialing`, `past_due`, `canceled`, `unpaid`
- Champ `cancel_at_period_end` (annulation future)
- Mise à jour `current_period_end` (renouvellement)

---

#### 7.4 Vérification Statut Abonnement (🔴 Critique)

**Description :** Vérifier si utilisateur a abonnement actif.

**Composants impliqués :**

- Hook : `src/hooks/useSubscriptionStatus.ts`
- Table DB : `abonnements`

**Flow :**

1. Hook `useSubscriptionStatus()` appelé
2. Query : `SELECT status, current_period_end FROM abonnements WHERE user_id = $1 ORDER BY current_period_end DESC LIMIT 1`
3. Vérification status dans `['active', 'trialing', 'past_due', 'paused']`
4. Calcul jours avant expiration
5. Flag `isExpiringSoon` si < 7 jours
6. Mise à jour state

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useSubscriptionStatus.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 7.5 Accès Billing Portal (🔴 Critique)

**Description :** Redirection vers Stripe Billing Portal (gérer abonnement).

**Composants impliqués :**

- Page : `src/pages/abonnement/Abonnement.tsx`
- Edge Function : `supabase/functions/create-checkout-session/index.ts`
- Service : Stripe Billing Portal

**Flow :**

1. Utilisateur abonné clique "Gérer abonnement"
2. Appel edge function `create-checkout-session`
3. Détection abonnement actif
4. Création Stripe Billing Portal Session
5. Paramètre : `customer_id`, `return_url`
6. Redirection vers Billing Portal
7. Utilisateur peut : annuler, mettre à jour carte, voir factures
8. Retour vers app après action

**Services tiers :**

- Stripe Billing Portal
- Supabase Edge Functions

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

---

### 8️⃣ Gestion Compte (5 parcours)

#### 8.1 Affichage Profil Utilisateur (🔴 Critique)

**Description :** Afficher informations compte utilisateur.

**Composants impliqués :**

- Page : `src/pages/profil/Profil.tsx`
- Hook : `src/hooks/useAuth.ts`
- Table DB : `profiles`

**Flow :**

1. Chargement profil via `user.id`
2. Query : `SELECT * FROM profiles WHERE id = $1`
3. Affichage : email, created_at, account_status
4. Affichage rôle actuel
5. Affichage statut abonnement

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/pages/profil/Profil.test.tsx`
- ❌ Test E2E : **Manquant**

---

#### 8.2 Vérification Statut Compte (🔴 Critique)

**Description :** Vérifier si compte actif/suspendu/en attente de suppression.

**Composants impliqués :**

- Hook : `src/hooks/useAccountStatus.ts`
- Table DB : `profiles`

**Flow :**

1. Hook `useAccountStatus()` appelé
2. Query : `SELECT account_status, deletion_scheduled_at FROM profiles WHERE id = $1`
3. Statuts possibles : `active`, `suspended`, `deletion_scheduled`, `pending_verification`
4. Mise à jour state
5. Écoute changements Realtime
6. Flags : `isSuspended`, `isPendingVerification`, `isScheduledForDeletion`

**Services tiers :**

- Supabase PostgreSQL
- Supabase Realtime

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useAccountStatus.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 8.3 Suppression Compte (🔴 Critique)

**Description :** Supprimer compte utilisateur + toutes données.

**Composants impliqués :**

- Page : `src/pages/profil/Profil.tsx`
- Edge Function : `supabase/functions/delete-account/index.ts`
- Service : Cloudflare Turnstile
- Tables DB : Toutes (`taches`, `recompenses`, `categories`, `parametres`, `profiles`, `abonnements`)
- Buckets Storage : `images`, `avatars`

**Flow :**

1. Utilisateur clique "Supprimer mon compte"
2. Confirmation modale + CAPTCHA Turnstile
3. Appel edge function `delete-account`
4. Vérification Turnstile serveur
5. Vérification JWT auth
6. Annulation abonnement Stripe (si actif)
7. Purge Storage : `images/{user_id}/*`, `avatars/{user_id}/*`
8. Purge DB : toutes tables avec `user_id`
9. Suppression utilisateur Auth (`admin.deleteUser()`)
10. Réponse 200 + déconnexion auto

**Services tiers :**

- Cloudflare Turnstile
- Stripe API (annulation)
- Supabase Storage
- Supabase PostgreSQL
- Supabase Auth

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

**Points critiques :**

- CAPTCHA obligatoire (évite suppression accidentelle)
- Purge idempotente (safe retry)
- Annulation Stripe optionnelle (pas de blocage si échec)
- Cascade delete (toutes données utilisateur)

---

#### 8.4 Programmation Suppression Compte (🟠 Important)

**Description :** Programmer suppression compte dans X jours (RGPD).

**Composants impliqués :**

- Hook : `src/hooks/useAccountStatus.ts`
- Edge Function : `change-account-status` (si existe)
- Table DB : `profiles`

**Flow :**

1. Utilisateur clique "Programmer suppression"
2. Appel `scheduleDeletion()`
3. Update : `account_status = 'deletion_scheduled'`, `deletion_scheduled_at = NOW() + 30 days`
4. Notification email (si configuré)
5. Affichage bannière avec date suppression
6. Option "Annuler suppression" disponible

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useAccountStatus.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 8.5 Annulation Suppression Programmée (🔴 Critique)

**Description :** Annuler suppression programmée (réactivation compte).

**Composants impliqués :**

- Hook : `src/hooks/useAccountStatus.ts`
- Table DB : `profiles`

**Flow :**

1. Utilisateur clique "Annuler suppression"
2. Appel `cancelDeletion()`
3. Update : `account_status = 'active'`, `deletion_scheduled_at = NULL`
4. Notification confirmation
5. Compte réactivé immédiatement

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useAccountStatus.test.ts`
- ❌ Test E2E : **Manquant**

---

### 9️⃣ Paramètres (2 parcours)

#### 9.1 Lecture Paramètres Globaux (🔴 Critique)

**Description :** Charger paramètres utilisateur (confettis, toasts).

**Composants impliqués :**

- Hook : `src/hooks/useParametres.ts`
- Table DB : `parametres`

**Flow :**

1. Hook `useParametres(reload)` appelé
2. Query : `SELECT * FROM parametres WHERE id = 1`
3. Si pas de ligne → auto-insertion defaults (`confettis: true`, `toasts_enabled: true`)
4. Mise à jour state `parametres`

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useParametres.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 9.2 Modification Paramètres (🟠 Important)

**Description :** Changer paramètres (confettis, toasts).

**Composants impliqués :**

- Hook : `src/hooks/useParametres.ts`
- Table DB : `parametres`

**Flow :**

1. Utilisateur toggle switch (confettis ou toasts)
2. Appel `updateParametres({ confettis: newValue })`
3. Upsert : `INSERT INTO parametres (...) ON CONFLICT (id) DO UPDATE`
4. Mise à jour state local
5. Application immédiate (ex: confettis désactivés)

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useParametres.test.ts`
- ❌ Test E2E : **Manquant**

---

### 🔟 Admin (3 parcours)

#### 10.1 Affichage Logs Système (🔴 Critique)

**Description :** Visualiser logs d'événements (abonnements, erreurs).

**Composants impliqués :**

- Page : `src/pages/admin/logs/Logs.tsx`
- Table DB : `subscription_logs`
- Rôle : `admin`

**Flow :**

1. Admin accède `/admin/logs`
2. Vérification rôle : `useRBAC.isAdmin`
3. Query : `SELECT * FROM subscription_logs ORDER BY timestamp DESC LIMIT 100`
4. Affichage tableau : timestamp, user_id, event_type, details
5. Filtres : type, date, user_id

**Services tiers :**

- Supabase PostgreSQL

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

---

#### 10.2 Gestion Permissions Utilisateurs (🔴 Critique)

**Description :** Attribuer/retirer permissions à un utilisateur.

**Composants impliqués :**

- Page : `src/pages/admin/permissions/AdminPermissions.tsx`
- Hook : `src/hooks/useAdminPermissions.ts`
- Table DB : `user_permissions`
- Rôle : `admin`

**Flow :**

1. Admin accède `/admin/permissions`
2. Recherche utilisateur par email/ID
3. Affichage permissions actuelles
4. Toggle permission
5. Appel RPC ou mutation directe
6. Mise à jour permissions
7. Utilisateur impacté voit changements immédiatement (Realtime)

**Services tiers :**

- Supabase PostgreSQL
- Supabase Realtime

**Couverture tests :**

- ✅ Test unitaire : `src/hooks/useAdminPermissions.test.ts`
- ❌ Test E2E : **Manquant**

---

#### 10.3 Attribution Rôle Utilisateur (🔴 Critique)

**Description :** Changer le rôle d'un utilisateur (free → abonné, etc.).

**Composants impliqués :**

- Page : `src/pages/admin/permissions/AdminPermissions.tsx`
- Table DB : `user_roles`
- Rôle : `admin`

**Flow :**

1. Admin sélectionne utilisateur
2. Choix nouveau rôle (visitor, free, abonne, admin)
3. Update : `user_roles SET role_name = $1 WHERE user_id = $2`
4. Invalidation cache permissions utilisateur
5. Utilisateur impacté recharge permissions (Realtime)

**Services tiers :**

- Supabase PostgreSQL
- Supabase Realtime

**Couverture tests :**

- ❌ Test unitaire : **Manquant**
- ❌ Test E2E : **Manquant**

---

## 🎯 Matrice de Criticité

### Légende

| Symbole | Criticité      | Définition                                                  |
| ------- | -------------- | ----------------------------------------------------------- |
| 🔴      | **Critique**   | Blocage complet de l'app ou perte de données si défaillance |
| 🟠      | **Important**  | Dégradation UX majeure mais workaround possible             |
| 🟡      | **Secondaire** | Nice-to-have, impact UX mineur                              |

### Parcours par Criticité

#### 🔴 Critique (37 parcours)

**Authentification :**

1. Inscription Utilisateur
2. Connexion Utilisateur
3. Déconnexion Utilisateur
4. Mot de Passe Oublié
5. Réinitialisation Mot de Passe
6. Récupération Session au Démarrage

**Tâches :** 7. Lecture des Tâches 8. Création de Tâche avec Image 9. Toggle "Fait" (Validation) 10. Réinitialisation Tâches 11. Suppression Tâche 12. Réorganisation Ordre (Drag-and-Drop)

**Récompenses :** 13. Lecture des Récompenses 14. Création Récompense avec Image 15. Sélection Récompense 16. Suppression Récompense

**Catégories :** 17. Lecture des Catégories 18. Création Catégorie

**Progression :** 19. Affichage Progression Train 20. Animation Confettis (100% Complété)

**Quotas & RBAC :** 21. Vérification Quotas Avant Création 22. Affichage Indicateur Quotas 23. Chargement Rôle & Permissions 24. Synchronisation Realtime Quotas

**Paiements Stripe :** 25. Création Session Checkout 26. Webhook Checkout Completed 27. Webhook Subscription Updated 28. Vérification Statut Abonnement 29. Accès Billing Portal

**Gestion Compte :** 30. Affichage Profil Utilisateur 31. Vérification Statut Compte 32. Suppression Compte 33. Annulation Suppression Programmée

**Paramètres :** 34. Lecture Paramètres Globaux

**Admin :** 35. Affichage Logs Système 36. Gestion Permissions Utilisateurs 37. Attribution Rôle Utilisateur

---

#### 🟠 Important (7 parcours)

**Tâches :**

1. Modification Label/Catégorie
2. Toggle "Aujourd'hui"

**Récompenses :** 3. Modification Label 4. Remplacement Image Récompense

**Catégories :** 5. Suppression Catégorie

**Gestion Compte :** 6. Programmation Suppression Compte

**Paramètres :** 7. Modification Paramètres

---

#### 🟡 Secondaire (0 parcours)

Aucun parcours identifié comme secondaire. Tous les parcours sont critiques ou importants.

---

## 📊 Couverture de Tests Actuelle

### Par Type de Parcours

| Catégorie            | Tests Unitaires | Tests MSW     | Tests E2E     | Taux Couverture |
| -------------------- | --------------- | ------------- | ------------- | --------------- |
| **Authentification** | 1/6 (17%)       | 0/6           | 0/6           | 🔴 17%          |
| **Tâches**           | 4/8 (50%)       | 1/8           | 2/8           | 🟠 50%          |
| **Récompenses**      | 6/6 (100%)      | 1/6           | 0/6           | 🟠 67%          |
| **Catégories**       | 3/3 (100%)      | 1/3           | 0/3           | 🟠 67%          |
| **Progression**      | 1/2 (50%)       | 0/2           | 0/2           | 🔴 25%          |
| **Quotas & RBAC**    | 4/4 (100%)      | 0/4           | 0/4           | 🟠 50%          |
| **Paiements**        | 0/5 (0%)        | 0/5           | 0/5           | 🔴 0%           |
| **Compte**           | 2/5 (40%)       | 0/5           | 0/5           | 🔴 20%          |
| **Paramètres**       | 2/2 (100%)      | 0/2           | 0/2           | 🟠 50%          |
| **Admin**            | 1/3 (33%)       | 0/3           | 0/3           | 🔴 17%          |
| **TOTAL**            | **24/44 (55%)** | **4/44 (9%)** | **2/44 (5%)** | 🔴 **39%**      |

### Parcours SANS Aucun Test

**🚨 Priorité Haute (Critique + Aucun Test) :**

1. **Authentification** (4/6)
   - Mot de Passe Oublié
   - Réinitialisation Mot de Passe
   - Inscription Utilisateur (E2E manquant)
   - Connexion Utilisateur (E2E manquant)

2. **Paiements Stripe** (5/5) 🚨
   - Création Session Checkout
   - Webhook Checkout Completed
   - Webhook Subscription Updated
   - Vérification Statut Abonnement (E2E manquant)
   - Accès Billing Portal

3. **Gestion Compte** (3/5)
   - Suppression Compte
   - Programmation Suppression Compte (E2E manquant)
   - Affichage Profil (E2E manquant)

4. **Admin** (2/3)
   - Affichage Logs Système
   - Attribution Rôle Utilisateur

5. **Progression** (1/2)
   - Animation Confettis

### Parcours avec Tests Partiels (Unitaires Uniquement)

**🟠 Priorité Moyenne (Tests Unitaires OK, E2E Manquants) :**

1. **Quotas & RBAC** (4/4)
   - Tous parcours testés en unitaire mais aucun E2E

2. **Récompenses** (4/6)
   - Sélection Récompense (E2E manquant)
   - Suppression Récompense (E2E manquant)
   - Modification Label (E2E manquant)
   - Remplacement Image (E2E manquant)

3. **Catégories** (3/3)
   - Tous parcours testés en unitaire mais aucun E2E

4. **Tâches** (2/8)
   - Modification Label/Catégorie (E2E manquant)
   - Toggle "Aujourd'hui" (E2E manquant)
   - Suppression Tâche (E2E manquant)
   - Réorganisation Ordre (E2E manquant)

---

## 🔗 Dépendances Critiques

### Services Tiers

| Service                  | Parcours Dépendants        | Criticité    | Fallback            |
| ------------------------ | -------------------------- | ------------ | ------------------- |
| **Supabase Auth**        | 6 (authentification)       | 🔴 Critique  | ❌ Aucun            |
| **Supabase PostgreSQL**  | 41 (tous sauf storage)     | 🔴 Critique  | ❌ Aucun            |
| **Supabase Storage**     | 6 (images)                 | 🔴 Critique  | ⚠️ Fallback icônes  |
| **Supabase Realtime**    | 4 (quotas, account status) | 🟠 Important | ✅ Polling fallback |
| **Stripe API**           | 5 (paiements)              | 🔴 Critique  | ❌ Aucun            |
| **Cloudflare Turnstile** | 2 (signup, delete)         | 🟠 Important | ⚠️ Bypass dev       |
| **Email Service**        | 3 (confirmation, reset)    | 🔴 Critique  | ❌ Aucun            |

### Vulnérabilités Identifiées

**🚨 Points de Défaillance Uniques :**

1. **Supabase Auth Deadlock** (Critique)
   - Problème : SDK bloqué après suspension onglet
   - Mitigation : Timeout 5s + recréation client
   - Impact : Connexion, récupération session
   - Fichier : `src/contexts/AuthContext.tsx:100-129`

2. **Stripe Webhooks Idempotence** (Critique)
   - Problème : Double-traitement events (retry Stripe)
   - Mitigation : Champ `last_event_id` + vérification
   - Impact : Paiements, abonnements
   - Fichier : `supabase/functions/stripe-webhook/index.ts:83-108`

3. **Quotas Realtime Channels Zombies** (Important)
   - Problème : Accumulation channels non fermés
   - Mitigation : Nom channel fixe + cleanup
   - Impact : Performance, quotas
   - Fichier : `src/hooks/useRBAC.ts:242-293`

4. **Image Upload Quota Enforcement** (Critique)
   - Problème : Vérification quotas côté client (bypassable)
   - Mitigation : RLS policies côté serveur
   - Impact : Quotas, stockage
   - Fichier : `src/hooks/useTachesEdition.ts:172`, RLS `taches` table

---

## 📝 Recommandations Stratégiques

### 1. Priorités Tests E2E

**🔴 Urgent (Semaine 1) :**

1. Parcours complet Stripe (checkout → webhook → activation)
2. Suppression compte (RGPD critique)
3. Inscription + Confirmation email
4. Connexion + Récupération session

**🟠 Important (Semaine 2) :** 5. Création tâche + Validation + Progression train 6. Gestion quotas (blocage + upgrade) 7. Réorganisation tâches (drag-and-drop)

**🟡 Nice-to-have (Semaine 3) :** 8. Admin permissions 9. Reset mot de passe complet 10. Mode visiteur (demo)

### 2. Architecture de Tests

**Recommandation : Pyramid Testing**

```
           /\
          /E2E\        5 tests (parcours critiques complets)
         /------\
        /  API  \      15 tests (edge functions, webhooks)
       /----------\
      / UNIT/MSW  \   50+ tests (hooks, composants, logique)
     /--------------\
```

**Couverture cible :**

- Tests unitaires : 80% code coverage
- Tests MSW : 100% hooks Supabase
- Tests E2E : 100% parcours critiques (37 parcours)

### 3. Stratégie CI/CD

**Pipeline Recommandé :**

```yaml
stages:
  - lint # ESLint + Prettier
  - test-unit # Vitest (fast)
  - test-msw # Vitest + MSW (moyen)
  - build # Vite build
  - test-e2e # Playwright (slow)
  - deploy # Vercel/Netlify
```

**Déclencheurs :**

- Push branches → lint + test-unit + test-msw
- PR → full pipeline
- Main branch → full pipeline + deploy

### 4. Monitoring Production

**Métriques Critiques :**

1. **Auth Success Rate** (cible : > 99%)
   - Login réussis / tentatives
   - Session recovery success
   - Alert si < 95%

2. **Stripe Webhook Latency** (cible : < 5s)
   - Temps entre event Stripe et upsert DB
   - Alert si > 10s

3. **Quota Enforcement** (cible : 100%)
   - Créations bloquées si quota atteint
   - Alert si bypass détecté

4. **Realtime Connection** (cible : > 95%)
   - Taux connexion Realtime Supabase
   - Alert si < 90%

---

## 📚 Annexes

### A. Tables Supabase Critiques

| Table               | Rôle                         | Parcours Dépendants | RLS                                          |
| ------------------- | ---------------------------- | ------------------- | -------------------------------------------- |
| `taches`            | Tâches utilisateur           | 8                   | ✅ `user_id = auth.uid()`                    |
| `recompenses`       | Récompenses utilisateur      | 6                   | ✅ `user_id = auth.uid()`                    |
| `categories`        | Catégories                   | 3                   | ✅ `user_id = auth.uid() OR user_id IS NULL` |
| `parametres`        | Paramètres globaux           | 2                   | ✅ `id = 1` (global)                         |
| `abonnements`       | Abonnements Stripe           | 5                   | ✅ `user_id = auth.uid()`                    |
| `profiles`          | Profils utilisateurs         | 5                   | ✅ `id = auth.uid()`                         |
| `user_roles`        | Rôles RBAC                   | 4                   | ✅ `user_id = auth.uid()`                    |
| `user_permissions`  | Permissions RBAC             | 4                   | ✅ `user_id = auth.uid()`                    |
| `user_assets`       | Tracking fichiers            | 6                   | ✅ `user_id = auth.uid()`                    |
| `subscription_logs` | Logs Stripe                  | 1                   | ✅ Admin only                                |
| `stations`          | Stations métro (progression) | 2                   | ✅ Public                                    |

### B. Edge Functions Critiques

| Fonction                  | Rôle               | Webhook/API | Auth Requise       |
| ------------------------- | ------------------ | ----------- | ------------------ |
| `create-checkout-session` | Stripe checkout    | API         | ✅ JWT             |
| `stripe-webhook`          | Stripe events      | Webhook     | ❌ Signature       |
| `delete-account`          | Suppression compte | API         | ✅ JWT + Turnstile |
| `log-consent`             | Logs cookies RGPD  | API         | ❌                 |
| `cleanup-unconfirmed`     | Nettoyage comptes  | Cron        | ❌ Service role    |

### C. RPC Functions Critiques

| RPC                                   | Rôle                        | Parcours    | Complexité |
| ------------------------------------- | --------------------------- | ----------- | ---------- |
| `get_my_primary_role()`               | Récupère rôle utilisateur   | Auth        | Faible     |
| `get_my_permissions()`                | Récupère permissions        | Auth        | Faible     |
| `get_usage_fast(user_id)`             | Calcul quotas + usage       | Quotas      | Moyenne    |
| `select_recompense_atomic(reward_id)` | Sélection unique récompense | Récompenses | Faible     |

### D. Hooks React Critiques

| Hook                    | Responsabilité       | Tables                                | Realtime               |
| ----------------------- | -------------------- | ------------------------------------- | ---------------------- |
| `useAuth`               | Authentification     | `auth.users`                          | ✅ `onAuthStateChange` |
| `usePermissions`        | Permissions RBAC     | `user_roles`, `user_permissions`      | ✅ Debounced           |
| `useRBAC`               | Quotas + Permissions | `taches`, `recompenses`, `categories` | ✅ Channel fixe        |
| `useTaches`             | CRUD tâches          | `taches`                              | ❌                     |
| `useTachesEdition`      | Édition tâches       | `taches`                              | ❌                     |
| `useTachesDnd`          | Drag-and-drop tâches | `taches`                              | ❌                     |
| `useRecompenses`        | CRUD récompenses     | `recompenses`                         | ❌                     |
| `useCategories`         | CRUD catégories      | `categories`                          | ❌                     |
| `useSubscriptionStatus` | Statut abonnement    | `abonnements`                         | ❌                     |
| `useAccountStatus`      | Statut compte        | `profiles`                            | ✅ User-specific       |
| `useParametres`         | Paramètres globaux   | `parametres`                          | ❌                     |

---

**Fin du rapport - Phase 2**
