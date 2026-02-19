# 📋 DEFERRED DECISIONS — Décisions Différées Post-Slices

**Principe** : Ces items ne bloquent pas l'intégration des slices.
Ils sont traités **après** que toutes les slices soient intégrées.

**Comment retrouver un item dans le code** :

```bash
git grep -n "TODO(S3-post)" src   # items S3
git grep -n "TODO(S" src          # tous les items différés
```

---

## 🔴 S1-bis — Post-Corrections Restantes

> Référence complète : `docs/refonte_front/AUDIT_POST_S1_CORRECTIONS.md`

| #   | Fichier                                 | Problème                                         | Tag code               |
| --- | --------------------------------------- | ------------------------------------------------ | ---------------------- |
| 1   | `layout/user-menu/UserMenu.tsx`         | Hints admin visibles pour non-admin (DOM exposé) | _(pas encore taggeré)_ |
| 2   | `layout/navbar/Navbar.tsx`              | Route `/admin/permissions` hardcodée dans le DOM | _(pas encore taggeré)_ |
| 3   | `app/(protected)/layout.tsx`            | Routes admin hardcodées dans `navbarRoutes[]`    | _(pas encore taggeré)_ |
| 4   | `app/(protected)/admin/*/page.tsx` (×3) | Pages admin sans lazy + sans 404 neutre          | _(pas encore taggeré)_ |

**Action requise** : Voir le fichier audit pour les patchs exacts.

---

## 🟡 S3 — Cartes + Catégories + Storage

| #   | Fichier                               | Problème                                                                                                                               | Tag code                                |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | `page-components/tableau/Tableau.tsx` | `PersonalizationModal` utilisé dans le Contexte Tableau (enfant), viole §6.4 — doit être remplacé par une solution légère non-invasive | `TODO(S3-post)`                         |
| 2   | `hooks/useCategories.test.ts`         | Fichier test référence l'ancien schéma (`user_id`, `label`, `value`) — tests tous en `.skip`, TypeScript en erreur                     | _(à mettre à jour avec nouveau schéma)_ |
| 3   | `hooks/useCategories.msw.test.ts`     | Idem — MSW tests ancien schéma, tous en `.skip`                                                                                        | _(à mettre à jour avec nouveau schéma)_ |
| 4   | `utils/storage/deleteImageIfAny.ts`   | Code mort commenté référençant l'ancien bucket `images` (lignes 33-39) — peut être supprimé proprement                                 | _(nettoyage cosmétique)_                |

---

## 🔴 Système user_assets — Migration Upload/Storage Legacy

> Ces erreurs TypeScript sont **pré-existantes** (avant S3). Elles concernent
> l'ancien système de déduplication d'images (`user_assets` table supprimée en S3).

| #   | Fichier                                                 | Problème                                                                        | Impact                     |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| 1   | `utils/storage/modernUploadImage.ts` (~l.526, 550, 555) | Requêtes sur `user_assets` (table inexistante) + champs `asset_type`, `version` | TypeScript TS2769 / TS2339 |
| 2   | `hooks/useRecompenses.ts` (~l.263)                      | Requête `.from('user_assets')`                                                  | TypeScript TS2769          |
| 3   | `hooks/useTachesEdition.ts` (~l.243)                    | Requête `.from('user_assets')`                                                  | TypeScript TS2769          |
| 4   | `lib/services/imageUploadService.ts` (~l.255, 309, 330) | Requêtes `user_assets` + RPC `get_user_assets_stats`                            | TypeScript TS2769          |
| 5   | `types/global.d.ts:13`                                  | `UserAsset = Database['public']['Tables']['user_assets']`                       | TypeScript TS2344          |

**Cause** : La table `user_assets` (ancien système déduplication SHA-256) a été supprimée
lors de la migration S3. L'ensemble de la chaîne upload (modernUploadImage → imageUploadService
→ replaceImage → useRecompenses/useTachesEdition) doit être migré vers le nouveau
schéma (`cards` table, bucket `personal-images/{account_id}/{card_id}.ext`).

**Action requise** : Migration dédiée du système upload — à planifier comme slice distincte.

---

## 🔴 Composants Admin — Tables Legacy

> Erreurs TypeScript pré-existantes (avant S3). Tables `profiles`, `roles`, `role_quotas`
> et fonctions RPC supprimées lors des migrations précédentes.

| #   | Fichier                                                      | Problème                                      |
| --- | ------------------------------------------------------------ | --------------------------------------------- |
| 1   | `features/admin/AccountManagement.tsx` (~l.67, 72, 156, 225) | Table `profiles` introuvable                  |
| 2   | `features/admin/ImageAnalytics.tsx` (~l.30, 37)              | RPC `get_image_analytics_summary` introuvable |
| 3   | `features/admin/permissions/HistoryTab.tsx` (~l.46)          | Select invalide (colonnes inexistantes)       |
| 4   | `features/admin/permissions/LogsTab.tsx` (~l.58)             | Type mismatch `SubscriptionLog[]`             |

**Action requise** : Mise à jour des composants admin vers le nouveau schéma DB — à planifier
dans un slice admin dédié.

---

## 🟡 timelines.name — Ajout potentiel de colonne

**Statut** : Deferred — aucune décision produit prise à ce jour.

### Contexte

La table `timelines` (migration [`20260130109000_create_timelines.sql`](../../supabase/migrations/20260130109000_create_timelines.sql)) contient uniquement :
`id`, `child_profile_id`, `created_at`, `updated_at`.

**Il n'existe pas de colonne `name`** sur `timelines`.

Une fonctionnalité de renommage côté front (`renameTimeline` dans `useTimelines.ts`) a été implémentée pendant S4, puis **revert complet en S4.1.1** car elle reposait sur une colonne absente du schéma DB.
Le revert a supprimé : hook `renameTimeline`, états `renaming`/`renameError`, UI formulaire, styles associés.

### Questions ouvertes produit

- **Une timeline doit-elle être nommable ?** La relation est strictement 1:1 (`UNIQUE(child_profile_id)`) : la timeline est déjà identifiable par le profil enfant lui-même. Un `name` est-il utile pour l'adulte dans l'UI ?
- **Y aura-t-il plusieurs timelines par `child_profile` ?** Si la contrainte 1:1 évolue vers 1:N (plusieurs timelines nommées par enfant), le schéma DB devra changer avant toute implémentation front.
- **Le `name` a-t-il un sens si la relation reste 1:1 ?** Si chaque enfant n'a qu'une seule timeline, lui donner un nom distinct apporte peu de valeur — le nom du profil enfant suffit à l'identifier.

### Action future si décision positive

1. **Migration DB** : `ALTER TABLE timelines ADD COLUMN name TEXT` (+ contrainte de longueur si nécessaire)
2. **Adaptation RLS** : vérifier que `timelines_update_owner` (migration [`20260203131000_phase7_6_rls_planning.sql`](../../supabase/migrations/20260203131000_phase7_6_rls_planning.sql)) couvre bien la colonne `name` (UPDATE)
3. **Mise à jour types** : `pnpm context:update` pour régénérer `src/types/supabase.ts`
4. **Mise à jour FRONTEND_CONTRACT** : documenter le champ `name`, les permissions et les contraintes
5. **Réintégration front propre** : réimplémenter `renameTimeline` dans `useTimelines.ts` sans `as any`, avec les types générés corrects

---

## 🔴 Migration Tâches + Récompenses — Slice dédiée requise

**Statut** : Bloqué — hooks legacy incompatibles avec le nouveau schéma DB.

### Contexte

L'ancien composant `Edition.tsx` (`src/page-components/edition/Edition.tsx`) gère
les tâches, récompenses et catégories. Il est **fonctionnel côté code** mais ses hooks
référencent des tables et structures **supprimées lors des migrations précédentes** :

| Hook                  | Problème                                        |
| --------------------- | ----------------------------------------------- |
| `useTachesEdition.ts` | Référence `user_assets` (table supprimée en S3) |
| `useRecompenses.ts`   | Référence `user_assets` (table supprimée en S3) |
| `useTaches.ts`        | Désactivé (schéma taches à vérifier)            |
| `useTachesDnd.ts`     | Désactivé (schéma taches à vérifier)            |

Ces hooks sont commentés dans `src/hooks/index.ts` (marqués `⛔ LEGACY`).

### Ce qui est visible dans l'UI

La page `/edition` affiche **uniquement** `EditionTimeline` (S4 — timeline + slots).
L'accès aux tâches et récompenses est **temporairement absent** de cette page.

### Action requise (slice dédiée)

1. **Auditer** le nouveau schéma DB pour les tâches (`taches` table — vérifier si elle existe encore ou a été renommée)
2. **Réécrire** `useTachesEdition`, `useRecompenses`, `useTaches`, `useTachesDnd` vers le nouveau schéma
3. **Migrer** la chaîne upload (`modernUploadImage` → `imageUploadService`) vers le nouveau bucket `personal-images/` (voir section user_assets ci-dessus)
4. **Réintégrer** `Edition.tsx` sous `EditionTimeline` dans `app/(protected)/edition/page.tsx`
5. **Vérifier** `pnpm build` + `pnpm check` + `pnpm test`

---

## ⬜ Futures Slices — À remplir au fur et à mesure

| Slice | Fichier         | Problème        | Tag code        |
| ----- | --------------- | --------------- | --------------- |
| S5    | _(à compléter)_ | _(à compléter)_ | `TODO(S5-post)` |

---

## ✅ Checklist Finale (après toutes les slices)

- [ ] **S1-bis** : Hints admin supprimés (UserMenu, Navbar, Layout, pages ×3)
- [ ] **S3-post-1** : `PersonalizationModal` retiré de `Tableau.tsx`, remplacé par composant TSA-friendly
- [ ] **S3-post-2/3** : Tests `useCategories` mis à jour vers nouveau schéma (supprimer `.skip`)
- [ ] **S3-post-4** : Nettoyage code mort `deleteImageIfAny.ts`
- [ ] **Tâches/Récompenses** : Hooks migrés + Edition.tsx réintégré sous EditionTimeline
- [ ] **Build final** : `pnpm build` vert
- [ ] **Tests** : `pnpm test` vert (zéro `.skip` sur tests actifs)

---

**Dernière mise à jour** : 2026-02-19
**Prochaine révision** : Après intégration de la dernière slice
