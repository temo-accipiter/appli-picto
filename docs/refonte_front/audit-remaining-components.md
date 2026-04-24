# Audit — Composants SCSS restants à migrer v1.1

**Date** : 2026-04-24
**Scope** : `src/components/**/*.scss` — hors composants déjà migrés
**Déjà migrés** : `Button.scss`, `Input.scss`, `Select.scss`, `InputFile.scss`
**Méthode** : grep sur patterns de dette (radius primitifs, shadow, focus legacy, spacing numériques)

---

## Légende

| Symbole | Signification                                                                  |
| ------- | ------------------------------------------------------------------------------ |
| ❌      | Dette significative — radius primitifs **et/ou** shadow **et/ou** focus legacy |
| ⚠️      | Dette mineure — 1 à 3 radius primitifs uniquement                              |
| ✅      | Conforme v1.1                                                                  |
| 🔒 T1-B | Shadows à traiter **après** résolution du conflit `shadow()` (T1-B)            |

**Dettes traquées :**

- `radius('sm')`, `radius('md')`, `radius('lg')`, `radius('xl')` — clés primitives interdites (v1.1 §D.5)
- `box-shadow` ou `shadow('elevation-*')` sur états normaux/hover d'atomiques (v1.1 §F.3)
- `@include focus-ring`, `@include non-invasive-focus`, `border-width('focus') solid color('base')` — focus non conforme (v1.1 §F.5)
- `spacing('1')` à `spacing('20')` utilisés pour padding composant sans alias sémantique (v1.1 §E.7)

---

## Cluster 1 — Atomes UI de base

> Composants atomiques réutilisables. Priorité haute : chaque bug se propage partout.

| Fichier                                        | Radius             | Shadow                                    | Focus                     | Spacing       | Statut |
| ---------------------------------------------- | ------------------ | ----------------------------------------- | ------------------------- | ------------- | ------ |
| `ui/checkbox/Checkbox.scss`                    | `'sm'`             | —                                         | `@include focus-ring`     | —             | ❌     |
| `ui/toggle/Toggle.scss`                        | —                  | `var(--shadow-sm)` CSS var directe        | —                         | —             | ❌     |
| `ui/toast/Toast.scss`                          | `'md'`             | `shadow('elevation-lg')` flottant 🔒 T1-B | —                         | `'12'` `'20'` | ❌     |
| `ui/password-checklist/PasswordChecklist.scss` | `'md'` × 2, `'lg'` | —                                         | `@include focus-ring` × 2 | —             | ❌     |
| `ui/upload-progress/UploadProgress.scss`       | `'md'`, `'sm'` × 2 | —                                         | —                         | —             | ⚠️     |
| `ui/image-preview/ImagePreview.scss`           | `'md'`             | —                                         | —                         | —             | ⚠️     |
| `ui/button/button-delete/ButtonDelete.scss`    | `'sm'`             | —                                         | `@include focus-ring`     | `'6'`         | ❌     |
| `ui/button/button-close/ButtonClose.scss`      | —                  | —                                         | `@include focus-ring`     | —             | ❌     |
| `ui/floating-pencil/FloatingPencil.scss`       | —                  | `shadow('elevation-md')` flottant 🔒 T1-B | `@include focus-ring`     | —             | ❌     |

---

## Cluster 2 — Navigation & Layout Shell

> Structure de l'application. Impact visuel global — tablette et desktop particulièrement exposés.

| Fichier                                  | Radius             | Shadow                                                 | Focus | Statut |
| ---------------------------------------- | ------------------ | ------------------------------------------------------ | ----- | ------ |
| `layout/navbar/Navbar.scss`              | `'md'` × 4, `'sm'` | `shadow('elevation-sm')`, `shadow('elevation-md')` × 2 | —     | ❌     |
| `layout/user-menu/UserMenu.scss`         | `'lg'`, `'md'`     | `shadow('elevation-sm')`, `shadow('elevation-lg')`     | —     | ❌     |
| `layout/settings-menu/SettingsMenu.scss` | `'md'` × 2, `'lg'` | `shadow('elevation-sm')`                               | —     | ❌     |
| `layout/bottom-nav/BottomNav.scss`       | `'sm'`             | `shadow('elevation-sm')`                               | —     | ⚠️     |

---

## Cluster 3 — Modales & Overlays Flottants

> ⚠️ Les shadows de ce cluster nécessitent T1-B résolu avant migration complète.
> Radius peut être migré indépendamment de T1-B.

| Fichier                                                                     | Radius                     | Shadow                                                 | Focus | Statut |
| --------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------ | ----- | ------ |
| `shared/modal/Modal.scss`                                                   | `'md'`, `'lg'` × 4, `'sm'` | `shadow('elevation-modal')` + `'elevation-md'` 🔒 T1-B | —     | ❌     |
| `shared/modal/modal-personalization/PersonalizationModal.scss`              | `'lg'`, `'md'` × 3         | `shadow('elevation-sm')`                               | —     | ❌     |
| `shared/dropdown/Dropdown.scss`                                             | `'md'`                     | `shadow('elevation-md')` flottant 🔒 T1-B              | —     | ❌     |
| `features/consent/CookieBanner.scss`                                        | `'sm'`, `'md'`             | `shadow('elevation-lg')` flottant 🔒 T1-B              | —     | ❌     |
| `features/recompenses/selected-reward-floating/SelectedRewardFloating.scss` | `'md'`                     | `shadow('elevation-sm')` × 2, `'elevation-md'`         | —     | ❌     |
| `features/time-timer/FloatingTimeTimer.scss`                                | `'md'`                     | `shadow('elevation-md')` flottant 🔒 T1-B              | —     | ❌     |
| `shared/modal/create-bank-card-modal/CreateBankCardModal.scss`              | `'md'` × 3, `'sm'`         | —                                                      | —     | ⚠️     |
| `shared/modal/modal-quota/ModalQuota.scss`                                  | `'md'`                     | —                                                      | —     | ⚠️     |
| `shared/modal/modal-category/ModalCategory.scss`                            | `'sm'`                     | —                                                      | —     | ⚠️     |

---

## Cluster 4 — Cards & Conteneurs de données

> Composants de mise en page des contenus. Radius et shadows sont les dettes principales.

| Fichier                                          | Radius                             | Shadow                                         | Focus                                       | Statut |
| ------------------------------------------------ | ---------------------------------- | ---------------------------------------------- | ------------------------------------------- | ------ |
| `features/cards/cards-edition/CardsEdition.scss` | `'lg'` × 2, `'md'` × 5, `'sm'` × 2 | `shadow('elevation-lg')`, `'xs'`, `'sm'` × 2   | —                                           | ❌     |
| `features/taches/taches-dnd/TachesDnd.scss`      | `'md'` × 2, `'sm'`                 | `shadow('elevation-sm')`, `'md'`, `'lg'`       | —                                           | ❌     |
| `features/tableau/slot-card/SlotCard.scss`       | `'lg'`, `'md'` × 3, `'sm'`         | —                                              | —                                           | ❌     |
| `shared/card/base-card/BaseCard.scss`            | `'md'`                             | `shadow('elevation-sm')`, `'elevation-md'` × 2 | —                                           | ❌     |
| `shared/card/tableau-card/TableauCard.scss`      | `'md'`                             | `shadow('elevation-sm')`                       | —                                           | ❌     |
| `shared/dnd/DndCard/DndCard.scss`                | —                                  | —                                              | `border-width('focus') solid color('base')` | ❌     |
| `shared/forms/ItemForm.scss`                     | `'md'`, `'sm'` × 2                 | —                                              | —                                           | ⚠️     |

---

## Cluster 5 — Identité & Profil Utilisateur

> Contexte adulte. Beaucoup de composants avec shadows décoratifs sur états interactifs.

| Fichier                                                                 | Radius                                 | Shadow                                   | Focus                                     | Spacing         | Statut |
| ----------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------- | ----------------------------------------- | --------------- | ------ |
| `features/child-profile/ChildProfileSelector.scss`                      | `'lg'` × 2, `'xl'`, `'md'` × 2, `'sm'` | `shadow('elevation-sm')` × 2, `'md'` × 2 | `@include focus-ring` × 4                 | `'1'`–`'3'` × 7 | ❌     |
| `shared/avatar-profil/AvatarProfil.scss`                                | `'sm'`                                 | `shadow('elevation-md')`, `'lg'` × 4     | `@include focus-ring(color('base'), ...)` | —               | ❌     |
| `features/profil/device-list/DeviceList.scss`                           | `'sm'`, `'md'` × 3                     | —                                        | `@include focus-ring` × 2                 | `'2'`–`'3'` × 6 | ❌     |
| `features/child-profile/child-profile-manager/ChildProfileManager.scss` | `'md'`, `'sm'`                         | `shadow('elevation-raised')`             | —                                         | `'1'`–`'3'` × 3 | ❌     |
| `features/settings/DeleteAccountGuard.scss`                             | `'lg'`, `'md'`                         | `shadow('elevation-xs')`                 | —                                         | —               | ❌     |
| `shared/account-status-badge/AccountStatusBadge.scss`                   | `'xl'`                                 | `shadow('elevation-sm')`                 | —                                         | —               | ❌     |
| `features/profil/DeleteProfileModal.scss`                               | `'md'`                                 | —                                        | —                                         | —               | ⚠️     |

---

## Cluster 6 — Tableau enfant & Gamification

> ⚠️ Contexte TSA critique. Modifier avec la plus grande attention. Lire §A de direction-visuelle v1.1 avant chaque touche.

| Fichier                                                    | Radius                         | Shadow                                               | Focus                             | Statut |
| ---------------------------------------------------------- | ------------------------------ | ---------------------------------------------------- | --------------------------------- | ------ |
| `features/time-timer/TimeTimer.scss`                       | `'lg'`, `'md'` × 7, `'sm'` × 2 | `shadow('elevation-lg')`, `'xs'`, `'sm'`, `'md'` × 2 | `@include non-invasive-focus` × 5 | ❌     |
| `features/tableau/session-complete/SessionComplete.scss`   | `'lg'` × 2, `'md'` × 2         | `shadow('elevation-sm')` × 2                         | —                                 | ❌     |
| `features/taches/train-progress-bar/TrainProgressBar.scss` | `'md'`                         | `shadow('elevation-sm')`                             | —                                 | ⚠️     |
| `features/tableau/tokens-grid/TokensGrid.scss`             | `'full'` ✅ alias autorisé     | —                                                    | —                                 | ✅     |

---

## Cluster 7 — Séquences & Timeline Planification

> Composants du système de planification. Radius seulement, pas de shadow critique.

| Fichier                                                               | Radius             | Shadow                   | Focus | Statut |
| --------------------------------------------------------------------- | ------------------ | ------------------------ | ----- | ------ |
| `features/timeline/slot-item/SlotItem.scss`                           | `'md'`, `'sm'` × 4 | —                        | —     | ❌     |
| `features/timeline/slots-editor/SlotsEditor.scss`                     | `'sm'` × 2, `'md'` | `shadow('elevation-sm')` | —     | ❌     |
| `features/sequences/sequence-editor/SequenceEditor.scss`              | `'md'`, `'sm'` × 3 | —                        | —     | ⚠️     |
| `features/sequences/sequence-mini-timeline/SequenceMiniTimeline.scss` | `'md'`, `'sm'` × 2 | —                        | —     | ⚠️     |
| `features/timeline/card-picker/CardPicker.scss`                       | `'sm'`             | —                        | —     | ⚠️     |

---

## Cluster 8 — Utilitaires Système & Feedback

> Composants transversaux (erreurs, banners, images, recherche). Souvent oubliés, rarement testés.

| Fichier                                                 | Radius                     | Shadow                                     | Focus                                       | Statut |
| ------------------------------------------------------- | -------------------------- | ------------------------------------------ | ------------------------------------------- | ------ |
| `shared/error-boundary/ErrorBoundary.scss`              | `'lg'`, `'md'` × 2, `'sm'` | `shadow('elevation-lg')`, `'elevation-md'` | `border-width('focus') solid color('base')` | ❌     |
| `shared/signed-image/SignedImage.scss`                  | `'md'` × 4, `'sm'`         | —                                          | —                                           | ❌     |
| `shared/demo-signed-image/DemoSignedImage.scss`         | `'md'` × 5, `'sm'` × 2     | —                                          | —                                           | ❌     |
| `shared/search-input/SearchInput.scss`                  | `'md'`                     | `shadow('elevation-sm')`                   | —                                           | ❌     |
| `shared/theme-toggle/ThemeToggle.scss`                  | —                          | —                                          | `border-width('focus') solid color('base')` | ❌     |
| `shared/admin-route/AdminRoute.scss`                    | `'md'`                     | —                                          | `@include focus-ring`                       | ❌     |
| `shared/execution-only-banner/ExecutionOnlyBanner.scss` | `'md'`                     | —                                          | `@include focus-ring`                       | ⚠️     |
| `shared/offline-banner/OfflineBanner.scss`              | `'md'`                     | —                                          | —                                           | ⚠️     |
| `shared/long-press-link/LongPressLink.scss`             | `'sm'` × 3                 | —                                          | —                                           | ⚠️     |
| `shared/lang-selector/LangSelector.scss`                | `'sm'`                     | —                                          | —                                           | ⚠️     |

---

## Cluster 9 — Légal & Consentement

> Peu de composants, peu visités par les enfants. Priorité basse.

| Fichier                                            | Radius                     | Shadow | Focus | Statut |
| -------------------------------------------------- | -------------------------- | ------ | ----- | ------ |
| `features/consent/CookiePreferences.scss`          | `'lg'` × 3, `'xl'`, `'sm'` | —      | —     | ❌     |
| `features/legal/legal-markdown/LegalMarkdown.scss` | `'sm'` × 2                 | —      | —     | ⚠️     |

---

## Composants conformes ✅ (aucune dette détectée)

| Fichier                                                  | Notes                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `shared/dnd/DndGrid/DndGrid.scss`                        | ✅                                                              |
| `shared/dnd/DndSlot/DndSlot.scss`                        | ✅                                                              |
| `shared/separator/Separator.scss`                        | ✅ (`radius('xs')` = 4px borderline, acceptable pour separator) |
| `shared/modal/modal-recompense/ModalRecompense.scss`     | ✅                                                              |
| `shared/initialization-loader/InitializationLoader.scss` | ✅                                                              |
| `shared/global-loader/GlobalLoader.scss`                 | ✅                                                              |
| `ui/loader/Loader.scss`                                  | ✅                                                              |
| `shared/avatar-profil/AvatarProfil.scss`                 | Déjà listé Cluster 5 ❌                                         |
| `features/tableau/tokens-grid/TokensGrid.scss`           | ✅ (`radius('full')` = alias autorisé)                          |

---

## Récapitulatif par cluster

| Cluster                          | Fichiers ❌ | Fichiers ⚠️ | Priorité recommandée             |
| -------------------------------- | ----------- | ----------- | -------------------------------- |
| Cluster 1 — Atomes UI            | 7           | 2           | 🔴 Haute (impact global)         |
| Cluster 2 — Navigation           | 3           | 1           | 🔴 Haute (visibilité permanente) |
| Cluster 3 — Modales & Flottants  | 6           | 3           | 🟠 Après T1-B pour les shadows   |
| Cluster 4 — Cards & Conteneurs   | 5           | 1           | 🔴 Haute (composants core)       |
| Cluster 5 — Identité & Profil    | 6           | 1           | 🟠 Moyenne                       |
| Cluster 6 — Tableau enfant       | 2           | 1           | 🔴 Haute (contexte TSA critique) |
| Cluster 7 — Séquences & Timeline | 2           | 3           | 🟡 Basse (radius uniquement)     |
| Cluster 8 — Utilitaires Système  | 5           | 5           | 🟠 Moyenne                       |
| Cluster 9 — Légal & Consentement | 1           | 1           | 🟡 Basse                         |
| **TOTAL**                        | **37**      | **18**      |                                  |

---

_Généré le 2026-04-24 à partir du scan `src/components/**/*.scss`. Référence : `direction-visuelle-v1.1.md`._
