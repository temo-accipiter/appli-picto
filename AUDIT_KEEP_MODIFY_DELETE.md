# 📋 RAPPORT KEEP / MODIFY / DELETE

**Date** : 2026-02-20
**Audit** : Conformité FRONTEND_CONTRACT.md v3.0 + EXECUTION_PLAN.md v1.0

---

## 🎯 Méthodologie

Ce rapport identifie les fichiers/dossiers clés du codebase et les classe en 3 catégories :

- **✅ KEEP** (OK) : Conforme au contrat DB-first + UX TSA, à conserver
- **⚠️ MODIFY** (À corriger) : Partiellement conforme, nécessite modifications
- **❌ DELETE** (À supprimer) : Legacy ou non-conforme, doit être supprimé

Chaque point est justifié par **référence explicite** aux sections du contrat.

---

## 📂 HOOKS (`src/hooks/`)

### ❌ DELETE — Hooks Tables Legacy

| Fichier               | Statut    | Justification                                                                                                                                                                              |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useTaches.ts`        | ❌ DELETE | **Réf. §Phase3 FRONTEND_CONTRACT** : Table `taches` legacy à supprimer. Utilise ancien modèle (toggle fait, resetFait, position). Remplacé par système `timelines` + `slots` + `sessions`. |
| `useTachesEdition.ts` | ❌ DELETE | Même justification que `useTaches.ts`. CRUD sur table legacy `taches`.                                                                                                                     |
| `useTachesDnd.ts`     | ❌ DELETE | Même justification. Drag & drop sur table legacy `taches`.                                                                                                                                 |
| `useRecompenses.ts`   | ❌ DELETE | **Réf. §Phase3 FRONTEND_CONTRACT** : Table `recompenses` legacy à supprimer. Remplacé par système `slots` (kind='reward') + `bank_cards`/`personal_cards`.                                 |
| `useCategories.ts`    | ⚠️ MODIFY | **Réf. §2.3.1 FRONTEND_CONTRACT** : Table `categories` existe dans nouvelles migrations (20260130105000) mais hook doit être adapté pour `user_card_categories` (S3).                      |

### ❌ DELETE — Hooks Tests Legacy

| Fichier                      | Statut    | Justification                                           |
| ---------------------------- | --------- | ------------------------------------------------------- |
| `useTaches.test.ts`          | ❌ DELETE | Tests pour hook legacy `useTaches`.                     |
| `useTaches.msw.test.ts`      | ❌ DELETE | Tests MSW pour hook legacy `useTaches`.                 |
| `useTachesEdition.test.ts`   | ❌ DELETE | Tests pour hook legacy `useTachesEdition`.              |
| `useTachesDnd.test.ts`       | ❌ DELETE | Tests pour hook legacy `useTachesDnd`.                  |
| `useRecompenses.test.ts`     | ❌ DELETE | Tests pour hook legacy `useRecompenses`.                |
| `useRecompenses.msw.test.ts` | ❌ DELETE | Tests MSW pour hook legacy `useRecompenses`.            |
| `useCategories.test.ts`      | ⚠️ MODIFY | Adapter au nouveau système `user_card_categories` (S3). |
| `useCategories.msw.test.ts`  | ⚠️ MODIFY | Adapter au nouveau système `user_card_categories` (S3). |

### ⚠️ MODIFY — Hook RBAC (Logique Métier Côté Front)

| Fichier      | Statut    | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useRBAC.ts` | ⚠️ MODIFY | **Réf. §1.1 FRONTEND_CONTRACT** : "Toute validation métier doit être en DB (RLS), pas côté UI." <br>**Problèmes** :<br>1. **Ligne 270-282** : Realtime sur tables legacy (`taches`, `recompenses`, `categories`) → changer pour écouter `bank_cards`, `personal_cards`.<br>2. **Ligne 296-334** : Logique `canCreate()` calcule quotas côté front (usage vs limit) → VIOLATION DB-FIRST. La DB doit rejeter via RLS si quota dépassé. <br>**Correction** : Transformer en hook lecture-seule (affichage UI uniquement). Supprimer `canCreate()` ou le rendre cosmétique (la vraie validation est RLS). |

### ✅ KEEP — Hooks Conformes DB-First

| Fichier                    | Statut  | Justification                                                                                                                                                                       |
| -------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTimelines.ts`          | ✅ KEEP | **Réf. §3.1 FRONTEND_CONTRACT** : Lecture-seule timeline (1:1 avec child_profile). Pattern DB-FIRST STRICT (commentaires lignes 3-11). Trigger DB crée timeline automatiquement. ✅ |
| `useSlots.ts`              | ✅ KEEP | **Réf. §3.1 FRONTEND_CONTRACT** : CRUD slots avec invariants DB (min 1 step + 1 reward via triggers). Pattern DB-FIRST STRICT (commentaires lignes 3-10). ✅                        |
| `useSessions.ts`           | ✅ KEEP | **Réf. §4 FRONTEND_CONTRACT** : Gestion sessions avec transitions d'état strictes (trigger DB). Epoch monotone (trigger). Pattern DB-FIRST STRICT (commentaires lignes 3-22). ✅    |
| `useSessionValidations.ts` | ✅ KEEP | **Réf. §4 FRONTEND_CONTRACT** : INSERT validations idempotent (DB gère transitions). Pattern conforme. ✅                                                                           |
| `useSequences.ts`          | ✅ KEEP | **Réf. §S7 EXECUTION_PLAN** : Séquences d'étapes (S7). Pattern conforme. ✅                                                                                                         |
| `useSequenceSteps.ts`      | ✅ KEEP | **Réf. §S7 EXECUTION_PLAN** : Étapes de séquences (S7). Pattern conforme. ✅                                                                                                        |
| `useBankCards.ts`          | ✅ KEEP | **Réf. §2 FRONTEND_CONTRACT** : Cartes banque (lecture publique). Pattern conforme. ✅                                                                                              |
| `usePersonalCards.ts`      | ✅ KEEP | **Réf. §2 FRONTEND_CONTRACT** : Cartes personnelles utilisateur. Pattern conforme. ✅                                                                                               |
| `useChildProfiles.ts`      | ✅ KEEP | **Réf. §S2 EXECUTION_PLAN** : Profils enfants (S2). Pattern conforme. ✅                                                                                                            |
| `useDevices.ts`            | ✅ KEEP | **Réf. §S10 EXECUTION_PLAN** : Devices lifecycle (S10). Pattern conforme. ✅                                                                                                        |
| `useDeviceRegistration.ts` | ✅ KEEP | **Réf. §S10 EXECUTION_PLAN** : Enregistrement device (S10). Pattern conforme. ✅                                                                                                    |
| `useOnlineStatus.ts`       | ✅ KEEP | **Réf. §S8 EXECUTION_PLAN** : Détection offline (S8). Pattern conforme. ✅                                                                                                          |
| `useExecutionOnly.ts`      | ✅ KEEP | **Réf. §S9 EXECUTION_PLAN** : Guard execution-only (S9). Pattern conforme. ✅                                                                                                       |
| `useAccountPreferences.ts` | ✅ KEEP | **Réf. §S11 EXECUTION_PLAN** : Préférences compte (S11). Pattern conforme. ✅                                                                                                       |
| `useAdminSupportInfo.ts`   | ✅ KEEP | **Réf. §S11 EXECUTION_PLAN** : Support admin (S11). Pattern conforme. ✅                                                                                                            |

### ✅ KEEP — Hooks Utilitaires & UX (Non-DB)

| Fichier                      | Statut    | Justification                                                                                                                                    |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useAuth.ts`                 | ✅ KEEP   | Hook authentification Supabase. Indépendant du modèle métier. ✅                                                                                 |
| `useSimpleRole.ts`           | ✅ KEEP   | Lecture rôle utilisateur (accounts.status). Conforme. ✅                                                                                         |
| `useAdminPermissions.ts`     | ✅ KEEP   | Permissions admin. Conforme. ✅                                                                                                                  |
| `useAccountStatus.ts`        | ✅ KEEP   | Statut compte (accounts.status). Lecture seule. ✅                                                                                               |
| `useAccountStatus.legacy.ts` | ❌ DELETE | Fichier explicitement marqué "legacy". Supprimer.                                                                                                |
| `useSubscriptionStatus.ts`   | ✅ KEEP   | Statut abonnement Stripe. Conforme. ✅                                                                                                           |
| `useCheckout.ts`             | ✅ KEEP   | Stripe checkout. Conforme. ✅                                                                                                                    |
| `useMetrics.ts`              | ✅ KEEP   | Métriques admin. Conforme. ✅                                                                                                                    |
| `useI18n.ts`                 | ✅ KEEP   | Internationalisation. Utilitaire pur. ✅                                                                                                         |
| `useToast.ts`                | ✅ KEEP   | Notifications UX. Utilitaire pur. ✅                                                                                                             |
| `useLoading.ts`              | ✅ KEEP   | État chargement global. Utilitaire pur. ✅                                                                                                       |
| `useDebounce.ts`             | ✅ KEEP   | Debounce inputs. Utilitaire pur. ✅                                                                                                              |
| `useReducedMotion.ts`        | ✅ KEEP   | **Réf. §6 FRONTEND_CONTRACT** : Détection prefers-reduced-motion (TSA). ✅                                                                       |
| `useAudioContext.ts`         | ✅ KEEP   | Sons TimeTimer. Utilitaire pur. ✅                                                                                                               |
| `useTimerPreferences.ts`     | ✅ KEEP   | Préférences TimeTimer localStorage. Utilitaire pur. ✅                                                                                           |
| `useTimerSvgPath.ts`         | ✅ KEEP   | Géométrie SVG TimeTimer. Utilitaire pur. ✅                                                                                                      |
| `useDragAnimation.ts`        | ✅ KEEP   | Animations DnD. Utilitaire pur. ✅                                                                                                               |
| `useFocusTrap.ts`            | ✅ KEEP   | Piège focus modal (accessibilité). ✅                                                                                                            |
| `useEscapeKey.ts`            | ✅ KEEP   | Fermeture modal (ESC). ✅                                                                                                                        |
| `useScrollLock.ts`           | ✅ KEEP   | Verrouillage scroll modal. ✅                                                                                                                    |
| `useCategoryValidation.ts`   | ⚠️ MODIFY | Validation client-side catégorie. **Réf. §1.1** : Supprimer validation métier côté front si existante. Garder uniquement validation format (UX). |
| `useDbPseudo.ts`             | ✅ KEEP   | Fetch pseudo utilisateur. Conforme. ✅                                                                                                           |
| `useDemoCards.ts`            | ✅ KEEP   | Cartes démo visiteurs. Conforme. ✅                                                                                                              |
| `useFallbackData.ts`         | ✅ KEEP   | Données fallback. Conforme. ✅                                                                                                                   |
| `useStations.ts`             | ✅ KEEP   | Stations (lieux). Conforme. ✅                                                                                                                   |
| `useParametres.ts`           | ✅ KEEP   | Paramètres utilisateur. Conforme. ✅                                                                                                             |
| `_net.ts`                    | ✅ KEEP   | Utilitaires réseau (withAbortSafe). ✅                                                                                                           |
| `index.ts`                   | ⚠️ MODIFY | Barrel export. Supprimer exports hooks legacy (`useTaches`, `useRecompenses`, etc.).                                                             |

---

## 📂 CONTEXTS (`src/contexts/`)

| Fichier                       | Statut    | Justification                                                                                        |
| ----------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `AuthContext.tsx`             | ✅ KEEP   | Authentification Supabase. Indépendant modèle métier. ✅                                             |
| `ToastContext.tsx`            | ✅ KEEP   | Notifications UX. Indépendant modèle métier. ✅                                                      |
| `LoadingContext.tsx`          | ✅ KEEP   | État chargement global. Indépendant modèle métier. ✅                                                |
| `DisplayContext.tsx`          | ✅ KEEP   | Préférences affichage (train, time-timer). Indépendant modèle métier. ✅                             |
| `ChildProfileContext.tsx`     | ✅ KEEP   | **Réf. §S2 EXECUTION_PLAN** : Profil enfant actif (S2). ✅                                           |
| `OfflineContext.tsx`          | ✅ KEEP   | **Réf. §S8 EXECUTION_PLAN** : Offline sync queue (S8). ✅                                            |
| `PermissionsContext.stub.tsx` | ❌ DELETE | **Commentaire ligne 3** : "⚠️ STUB TEMPORAIRE - Sera supprimé en S2+". Retourne valeurs factices. ❌ |

---

## 📂 PAGE COMPONENTS (`src/page-components/`)

| Fichier                                   | Statut    | Justification                                                                                                                                                                                                                                |
| ----------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `edition/Edition.tsx`                     | ❌ DELETE | **Réf. §Phase3 FRONTEND_CONTRACT** : Utilise hooks legacy (`useTaches`, `useRecompenses`, `useCategories`). Remplacé par `EditionTimeline.tsx`. ❌                                                                                           |
| `edition/Edition.test.tsx`                | ❌ DELETE | Tests pour page legacy `Edition.tsx`. ❌                                                                                                                                                                                                     |
| `edition/Edition.scss`                    | ❌ DELETE | Styles pour page legacy `Edition.tsx`. ❌                                                                                                                                                                                                    |
| `edition-timeline/EditionTimeline.tsx`    | ✅ KEEP   | **Réf. §3.1, S4, S6 FRONTEND_CONTRACT** : Édition timeline conforme. Utilise `useTimelines`, `useSlots`, `useSessions`. Commentaires "⚠️ RÈGLES DB-FIRST" et "⚠️ RÈGLES TSA". ✅                                                             |
| `edition-timeline/EditionTimeline.scss`   | ✅ KEEP   | Styles pour page conforme `EditionTimeline.tsx`. ✅                                                                                                                                                                                          |
| `tableau/Tableau.tsx`                     | ✅ KEEP   | **Réf. §4, §6.2 FRONTEND_CONTRACT** : Contexte Tableau TSA. Utilise sessions + validations. Commentaires "⚠️ DB-FIRST STRICT" et "⚠️ Règle anti-choc". **Vérifié ligne 1-424** : Neutre TSA (pas de messages techniques visibles enfant). ✅ |
| `tableau/Tableau.test.tsx`                | ✅ KEEP   | Tests pour page conforme `Tableau.tsx`. ✅                                                                                                                                                                                                   |
| `tableau/Tableau.scss`                    | ✅ KEEP   | Styles pour page conforme `Tableau.tsx`. ✅                                                                                                                                                                                                  |
| `profil/Profil.tsx`                       | ✅ KEEP   | **Réf. §S10, S11 EXECUTION_PLAN** : Gestion devices + préférences. ✅                                                                                                                                                                        |
| `profil/Profil.test.tsx`                  | ✅ KEEP   | Tests pour page `Profil.tsx`. ✅                                                                                                                                                                                                             |
| `admin/logs/Logs.tsx`                     | ✅ KEEP   | **Réf. §S12 EXECUTION_PLAN** : Admin logs. ✅                                                                                                                                                                                                |
| `admin/metrics/Metrics.tsx`               | ✅ KEEP   | **Réf. §S12 EXECUTION_PLAN** : Admin metrics. ✅                                                                                                                                                                                             |
| `admin-permissions/AdminPermissions.tsx`  | ✅ KEEP   | **Réf. §S12 EXECUTION_PLAN** : Admin permissions. ✅                                                                                                                                                                                         |
| Autres pages (login, signup, legal, etc.) | ✅ KEEP   | Indépendantes modèle métier. ✅                                                                                                                                                                                                              |

---

## 📂 COMPONENTS (`src/components/`)

### ❌ DELETE — Composants Legacy (Taches/Recompenses)

**Pattern** : Tous les composants utilisant tables `taches`, `recompenses` legacy.

| Dossier/Fichier          | Statut    | Justification                                                                                                                                                                   |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/taches/*`      | ❌ DELETE | Tous composants tâches legacy (TacheCard, TachesListe, TachesEdition, TachesDnd, etc.). Remplacés par système `slots`.                                                          |
| `features/recompenses/*` | ❌ DELETE | Tous composants récompenses legacy (RecompenseCard, RecompensesEdition, etc.). Remplacés par système `slots` + `bank_cards`/`personal_cards`.                                   |
| `features/categories/*`  | ⚠️ MODIFY | **Réf. §S3 EXECUTION_PLAN** : Adapter au système `user_card_categories` (S3). Table `categories` existe mais doit être utilisée avec la nouvelle association cards↔categories. |

### ✅ KEEP — Composants Conformes (Timeline/Slots/Sessions)

| Dossier/Fichier            | Statut  | Justification                                                                                |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `features/timeline/*`      | ✅ KEEP | **Réf. §S4 EXECUTION_PLAN** : SlotsEditor, SlotCard, etc. (S4). ✅                           |
| `features/tableau/*`       | ✅ KEEP | **Réf. §S5, S6, S7 EXECUTION_PLAN** : SessionComplete, TokensGrid, TrainProgressBar, etc. ✅ |
| `features/child-profile/*` | ✅ KEEP | **Réf. §S2 EXECUTION_PLAN** : ChildProfileSelector, etc. (S2). ✅                            |
| `features/sequence/*`      | ✅ KEEP | **Réf. §S7 EXECUTION_PLAN** : SequenceSteps, etc. (S7). ✅                                   |

### ⚠️ MODIFY — Composants Quotas/Guards (Logique Métier)

| Fichier                                     | Statut    | Justification                                                                                                                                                                                                  |
| ------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/quota-indicator/QuotaIndicator.tsx` | ⚠️ MODIFY | **Réf. §1.1 FRONTEND_CONTRACT** : Indicateur quotas (affichage OK). Vérifier qu'il n'effectue PAS de validation métier côté front (canCreate, etc.). Si oui, supprimer logique et garder uniquement affichage. |
| `shared/feature-gate/FeatureGate.tsx`       | ⚠️ MODIFY | **Réf. §1.1 FRONTEND_CONTRACT** : Guard UI basée sur rôle. Vérifier qu'elle ne calcule PAS de quotas côté front. Doit être COSMÉTIQUE uniquement (la vraie protection est RLS).                                |

### ✅ KEEP — Composants UI Purs & Shared

| Dossier                          | Statut  | Justification                                                                                 |
| -------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `ui/*`                           | ✅ KEEP | Primitives UI pures (Button, Input, Modal, etc.). Indépendantes modèle métier. ✅             |
| `layout/*`                       | ✅ KEEP | Layout app (Navbar, Footer, UserMenu, etc.). Indépendantes modèle métier. ✅                  |
| `shared/modal/*`                 | ✅ KEEP | Modales génériques. ✅                                                                        |
| `shared/offline-banner/*`        | ✅ KEEP | **Réf. §S8 EXECUTION_PLAN** : Bandeau offline (affiché en Édition, PAS en Tableau). ✅        |
| `shared/execution-only-banner/*` | ✅ KEEP | **Réf. §S9 EXECUTION_PLAN** : Bandeau execution-only (affiché en Édition, PAS en Tableau). ✅ |
| Autres shared/\*                 | ✅ KEEP | SignedImage, etc. Indépendants modèle métier. ✅                                              |

### ✅ KEEP — Composants Features TSA (Time-Timer, etc.)

| Dossier                   | Statut  | Justification                                                                         |
| ------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `features/time-timer/*`   | ✅ KEEP | **Réf. §6 FRONTEND_CONTRACT** : TimeTimer TSA-friendly. Indépendant modèle métier. ✅ |
| `features/consent/*`      | ✅ KEEP | RGPD consent. Indépendant modèle métier. ✅                                           |
| `features/subscription/*` | ✅ KEEP | Stripe subscription. Indépendant modèle métier. ✅                                    |
| `features/legal/*`        | ✅ KEEP | Pages légales. Indépendantes modèle métier. ✅                                        |

---

## 📂 UTILS (`src/utils/`)

| Fichier/Dossier                | Statut    | Justification                                                                                                                 |
| ------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `supabaseClient.ts`            | ✅ KEEP   | Instance unique Supabase. CRITIQUE. ✅                                                                                        |
| `validationRules.ts`           | ✅ KEEP   | Validations format client (email, password, images). **Réf. §1.1** : Validation FORMAT OK, validation MÉTIER doit être DB. ✅ |
| `consent.ts`                   | ✅ KEEP   | RGPD consent. ✅                                                                                                              |
| `rgpdExport.ts`                | ⚠️ MODIFY | Export RGPD. Adapter pour nouvelles tables (supprimer `taches`, `recompenses`).                                               |
| `roleUtils.ts`                 | ✅ KEEP   | Helpers rôles (isAdmin, isFree, etc.). Lecture seule OK. ✅                                                                   |
| `getDisplayPseudo.ts`          | ✅ KEEP   | Affichage pseudo. ✅                                                                                                          |
| `permissions-api.ts`           | ⚠️ MODIFY | API permissions. Vérifier qu'elle ne calcule PAS quotas côté front. Doit fetch depuis DB uniquement.                          |
| `supabaseVisibilityHandler.ts` | ✅ KEEP   | Reconnexion Supabase. ✅                                                                                                      |
| `images/*`                     | ✅ KEEP   | Validation/compression images. Indépendant modèle métier. ✅                                                                  |
| `storage/*`                    | ✅ KEEP   | Upload Storage Supabase. Indépendant modèle métier. ✅                                                                        |
| `logs/*`                       | ✅ KEEP   | Logging. ✅                                                                                                                   |
| `auth/*`                       | ✅ KEEP   | Helpers auth. ✅                                                                                                              |

---

## 📂 TYPES (`src/types/`)

| Fichier       | Statut    | Justification                                                                                                                         |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase.ts` | ✅ KEEP   | Types générés depuis DB. AUTO-GÉNÉRÉ. ✅                                                                                              |
| `global.d.ts` | ⚠️ MODIFY | Types globaux. Vérifier présence types `Tache`, `Recompense` legacy. Supprimer si présents (doivent utiliser types Supabase générés). |

---

## 📂 SUPABASE (`supabase/`)

### ✅ KEEP — Migrations Conformes (Phase 1-12)

**Toutes les migrations 20260130100000 → 20260208148000 sont conformes au contrat.**

Elles créent le nouveau système :

- Accounts, devices, child_profiles
- Bank_cards, personal_cards, categories
- Timelines, slots, sessions, session_validations
- Sequences, sequence_steps
- RLS policies, quotas, storage buckets

**✅ KEEP TOUTES.**

### ❌ DELETE — Anciennes Tables (si présentes)

| Tables                                        | Statut    | Justification                                                                                                                |
| --------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `taches`                                      | ❌ DELETE | **Réf. §Phase3 FRONTEND_CONTRACT** : Table legacy à supprimer. PAS dans nouvelles migrations → doit être dans ancien schéma. |
| `recompenses`                                 | ❌ DELETE | Même justification.                                                                                                          |
| `profiles` (si différent de `child_profiles`) | ❌ DELETE | **Réf. §Phase3** : Remplacé par `child_profiles`.                                                                            |

**Action** : Vérifier schéma DB actuel via `pnpm db:dump`. Si tables `taches`, `recompenses`, `profiles` présentes, créer migration DROP TABLE.

---

## 📂 TESTS E2E (`tests/e2e/`)

| Fichier                    | Statut    | Justification                                                                                                     |
| -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `account-deletion.spec.ts` | ✅ KEEP   | Test RGPD. ✅                                                                                                     |
| `quotas-upgrade.spec.ts`   | ✅ KEEP   | Test quotas. ✅                                                                                                   |
| `stripe-payment.spec.ts`   | ✅ KEEP   | Test Stripe. ✅                                                                                                   |
| `helpers/database.ts`      | ⚠️ MODIFY | Helper DB tests E2E. Vérifier s'il utilise tables legacy (`taches`, `recompenses`). Adapter aux nouvelles tables. |

---

## 🎯 SYNTHÈSE

### Comptages

- **✅ KEEP** : ~120 fichiers (hooks conformes, composants timeline/tableau, utils, migrations)
- **⚠️ MODIFY** : ~15 fichiers (useRBAC, useCategories, QuotaIndicator, etc.)
- **❌ DELETE** : ~40 fichiers (hooks legacy, composants taches/recompenses, tests legacy, Edition.tsx)

### Actions Prioritaires

**1. Supprimer Système Legacy (DELETE)** :

- Hooks : `useTaches`, `useTachesEdition`, `useTachesDnd`, `useRecompenses` + tests
- Page : `edition/Edition.tsx` + styles + tests
- Composants : `features/taches/*`, `features/recompenses/*`
- Context : `PermissionsContext.stub.tsx`

**2. Corriger Logique Métier Côté Front (MODIFY)** :

- **`useRBAC.ts`** (PRIORITÉ 1) :
  - Supprimer Realtime sur tables legacy (lignes 270-282)
  - Transformer `canCreate()` en lecture-seule (affichage UI uniquement)
  - **Réf. §1.1** : Validation métier doit être RLS, pas UI
- **`QuotaIndicator.tsx`** : Vérifier pas de logique validation
- **`FeatureGate.tsx`** : Idem

**3. Adapter Catégories (MODIFY)** :

- `useCategories.ts` : Adapter au système `user_card_categories` (S3)
- Tests catégories : Adapter

**4. Nettoyer Barrel Exports** :

- `src/hooks/index.ts` : Supprimer exports hooks legacy

**5. Vérifier DB Locale** :

- Exécuter `pnpm db:dump` pour vérifier présence tables `taches`, `recompenses`, `profiles`
- Si présentes, créer migration `DROP TABLE`

---

## 📚 Références Contrat

- **§1.1 (DB-FIRST)** : Toute validation métier doit être en DB (RLS), pas côté UI
- **§3.1 (Timelines/Slots)** : Nouveau système planning (remplace `taches`)
- **§4 (Sessions)** : Système validations + progression
- **§6.2 (Tableau TSA)** : Contexte enfant neutre (zéro message technique)
- **§Phase3** : Suppression tables legacy (`taches`, `recompenses`, `categories` ancien modèle, `profiles`)

- **EXECUTION_PLAN S2-S12** : Implémentation slices (child_profiles, timeline, sessions, offline, quotas, etc.)

---

**Fin du rapport KEEP/MODIFY/DELETE**
