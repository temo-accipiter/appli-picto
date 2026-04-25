# SCSS FILE REGISTRY — Appli-Picto

**Inventaire complet et détaillé de TOUS les fichiers SCSS/CSS du projet.**

---

## 📂 CORE INFRASTRUCTURE (src/styles/)

### Entry Point

| Fichier       | Rôle                | Imports                          | Modifiable?       |
| ------------- | ------------------- | -------------------------------- | ----------------- |
| **main.scss** | Orchestre main.scss | vendors, abstracts, base, themes | ⚠️ Ordre critique |

### Vendors (Immutable)

| Fichier                      | Rôle                                |
| ---------------------------- | ----------------------------------- |
| **vendors/\_index.scss**     | Forward normalize                   |
| **vendors/\_normalize.scss** | CSS reset cross-browser (immutable) |

### Abstracts — OUTILS (pas de CSS généré sauf maps)

| Fichier                      | Rôle                                 | Type               | Génère CSS? | Phase        |
| ---------------------------- | ------------------------------------ | ------------------ | ----------- | ------------ |
| **\_index.scss**             | Forwards systématique (criticule)    | Tool               | ❌          | Both         |
| **\_primitives.scss**        | Palettes/grille/radius bruts         | Maps               | ❌          | Phase 6      |
| **\_semantics.scss**         | Noms métier → primitives             | Maps + Functions   | ❌          | Phase 6      |
| **\_colors.scss**            | Wrapper couleurs (fallback)          | Functions          | ❌          | Both         |
| **\_spacing.scss**           | Wrapper spacing + CSS vars           | Functions          | ✅ CSS vars | Both         |
| **\_size.scss**              | Dimensions structurelles             | Functions          | ❌          | Both         |
| **\_radius.scss**            | Wrapper radius (fallback)            | Functions          | ❌          | Both         |
| **\_shadows.scss**           | Wrapper shadows (fallback)           | Functions          | ❌          | Both         |
| **\_typography.scss**        | Font-size/weight/line-height         | Functions          | ✅ CSS vars | Legacy       |
| **\_motion.scss**            | Timing/easing                        | Functions          | ✅ CSS vars | Legacy       |
| **\_tokens.scss**            | **SOURCE DE VÉRITÉ** canonique       | Maps               | ❌          | Both         |
| **\_functions.scss**         | Helpers (rem conversion, etc.)       | Functions          | ❌          | Both         |
| **\_mixins.scss**            | Réusable mixins (breakpoints, focus) | Mixins             | ❌          | Both         |
| **\_breakpoints.scss**       | Responsive mobile-first              | Functions + Mixins | ❌          | Both         |
| **\_a11y-tokens.scss**       | Accessibilité WCAG/TSA               | Functions          | ✅ CSS vars | Legacy       |
| **\_borders.scss**           | Border-width                         | Functions          | ❌          | Legacy       |
| **\_forms.scss**             | Form controls (legacy)               | Rules + Functions  | ✅ Styles   | Legacy       |
| **\_container-queries.scss** | Container queries (@supports)        | Mixins             | ❌          | Experimental |

### Base (Styles DOM globaux)

| Fichier                    | Rôle                                              | Génère CSS?   |
| -------------------------- | ------------------------------------------------- | ------------- |
| **\_index.scss**           | Forward systématique (ordre)                      | ❌ Meta       |
| **\_reset.scss**           | CSS reset minimal (box-sizing, margins)           | ✅ Rules      |
| **\_reduced-motion.scss**  | Politiques prefers-reduced-motion                 | ✅ Rules      |
| **\_accessibility.scss**   | Politiques a11y globales                          | ✅ Rules      |
| **\_helpers.scss**         | Utilitaires (.container, .sr-only, .touch-target) | ✅ Classes    |
| **\_animations.scss**      | @keyframes globales (fadeIn, scaleIn)             | ✅ @keyframes |
| **\_typography-base.scss** | html/body/h1-h6/p typographie défaut              | ✅ Rules      |

### Themes (CSS vars overrides)

| Fichier          | Rôle                   | Scope                                     | Génère CSS? |
| ---------------- | ---------------------- | ----------------------------------------- | ----------- |
| **\_index.scss** | Forward light/dark     | -                                         | ❌ Meta     |
| **\_light.scss** | Light theme (défaut)   | :root + @media light + [data-theme=light] | ✅ Vars     |
| **\_dark.scss**  | Dark theme (optionnel) | @media dark + [data-theme=dark]           | ✅ Vars     |

---

## 📄 PAGE COMPONENTS (src/page-components/)

Chaque page a son `.scss` qui suit pattern tokens-first.

| Chemin                                    | Rôle                              | Tokens utilisés                          | Notes           |
| ----------------------------------------- | --------------------------------- | ---------------------------------------- | --------------- |
| **forgot-password/ForgotPassword.scss**   | Page oubli mot de passe           | spacing, radius, text, surface, size     | Form styling    |
| **reset-password/ResetPassword.scss**     | Page reset password               | spacing, radius, text, size              | Form styling    |
| **login/Login.scss**                      | Page connexion                    | spacing, radius, text, surface, semantic | Auth form       |
| **tableau/Tableau.scss**                  | Page tableau (enfant)             | spacing, radius, size, timing            | Grid/layout     |
| **profil/Profil.scss**                    | Page profil utilisateur           | spacing, radius, text, surface           | User profile    |
| **edition/Edition.scss**                  | Page édition (tâches/récompenses) | spacing, radius, size, timing            | DnD layout      |
| **edition-timeline/EditionTimeline.scss** | Page édition timeline             | spacing, radius, size, timing            | Timeline layout |
| **abonnement/Abonnement.scss**            | Page abonnement (pricing)         | spacing, radius, semantic, size          | Pricing cards   |
| **legal/rgpd/PortailRGPD.scss**           | Page RGPD/données                 | spacing, text, surface                   | Legal content   |
| **admin/permissions/Permissions.scss**    | Page admin permissions            | spacing, radius, text                    | Admin table     |
| **admin/logs/Logs.scss**                  | Page admin logs                   | spacing, radius, text                    | Admin list      |
| **admin/metrics/Metrics.scss**            | Page admin metrics                | spacing, radius, text, size              | Admin dashboard |

**Total**: 12 page components avec SCSS

---

## 🎨 COMPONENT LIBRARY (src/components/)

### Layout Components

| Chemin                    | Fichier           | Rôle                         | Phase  | Notes             |
| ------------------------- | ----------------- | ---------------------------- | ------ | ----------------- |
| **layout/navbar/**        | Navbar.scss       | Navigation supérieure        | Legacy | Menu principal    |
| **layout/bottom-nav/**    | BottomNav.scss    | Navigation inférieure mobile | Legacy | Mobile nav        |
| **layout/footer/**        | Footer.scss       | Pied de page                 | Legacy | Footer            |
| **layout/settings-menu/** | SettingsMenu.scss | Menu paramètres              | Legacy | Settings dropdown |

**Total**: 4 layout components avec SCSS

### Shared / Generic Components

#### Modal Système

| Chemin            | Fichier                  | Rôle                      | Phase   | Status    |
| ----------------- | ------------------------ | ------------------------- | ------- | --------- |
| **shared/modal/** | Modal.scss               | **Base modal PHASE 6** ✅ | Phase 6 | ✅ Validé |
|                   | ModalRecompense.scss     | Modal récompenses         | Legacy  | Variation |
|                   | ModalQuota.scss          | Modal quota               | Legacy  | Variation |
|                   | ModalCategory.scss       | Modal catégorie           | Legacy  | Variation |
|                   | CreateBankCardModal.scss | Modal création carte      | Legacy  | Variation |

#### Card Système

| Chemin           | Fichier          | Rôle           | Phase  |
| ---------------- | ---------------- | -------------- | ------ |
| **shared/card/** | BaseCard.scss    | Card générique | Legacy |
|                  | TableauCard.scss | Card tableau   | Legacy |
|                  | EditionCard.scss | Card édition   | Legacy |

#### DnD (Drag & Drop)

| Chemin          | Fichier      | Rôle       | Librairie |
| --------------- | ------------ | ---------- | --------- |
| **shared/dnd/** | DndGrid.scss | Grille DnD | @dnd-kit  |
|                 | DndSlot.scss | Slot DnD   | @dnd-kit  |
|                 | DndCard.scss | Card DnD   | @dnd-kit  |

#### Autres Shared

| Fichier                                         | Rôle                    | Notes             |
| ----------------------------------------------- | ----------------------- | ----------------- |
| forms/ItemForm.scss                             | Form généraire (item)   | Form styling      |
| avatar-profil/AvatarProfil.scss                 | Avatar utilisateur      | Image profile     |
| separator/Separator.scss                        | Séparateur visuel       | Divider           |
| dropdown/Dropdown.scss                          | Dropdown menu           | Select menu       |
| signed-image/SignedImage.scss                   | Image signée (Supabase) | Secured image     |
| demo-signed-image/DemoSignedImage.scss          | Démo image signée       | Demo version      |
| theme-toggle/ThemeToggle.scss                   | Bouton thème            | Light/dark toggle |
| lang-selector/LangSelector.scss                 | Sélecteur langue        | i18n selector     |
| initialization-loader/InitializationLoader.scss | Loader initialisation   | Loading state     |
| global-loader/GlobalLoader.scss                 | Loader global           | App loading       |
| execution-only-banner/ExecutionOnlyBanner.scss  | Banner mode exécution   | Mode indicator    |
| offline-banner/OfflineBanner.scss               | Banner offline          | Connection status |
| long-press-link/LongPressLink.scss              | Link long-press         | Touch interaction |
| error-boundary/ErrorBoundary.scss               | Error boundary UI       | Error fallback    |
| admin-route/AdminRoute.scss                     | Admin route wrapper     | Admin access      |
| account-status-badge/AccountStatusBadge.scss    | Status badge            | Account info      |

**Total**: 25+ shared components

### UI Components (Atomic)

#### Button Variants

| Chemin                       | Fichier           | Rôle                         | Phase   | Status    |
| ---------------------------- | ----------------- | ---------------------------- | ------- | --------- |
| **ui/button/button-delete/** | ButtonDelete.scss | **Delete button PHASE 6** ✅ | Phase 6 | ✅ Validé |
| **ui/button/button-close/**  | ButtonClose.scss  | Close button                 | Legacy  | Variation |

#### Form Controls

| Fichier                                   | Rôle                        | Type            |
| ----------------------------------------- | --------------------------- | --------------- |
| checkbox/Checkbox.scss                    | Checkbox custom             | Checkbox        |
| input-file/InputFile.scss                 | File input custom           | File upload     |
| select/Select.scss                        | Select custom               | Dropdown select |
| select-with-image/SelectWithImage.scss    | Select + image (DEPRECATED) | Variant         |
| password-checklist/PasswordChecklist.scss | Password strength indicator | Feedback        |
| upload-progress/UploadProgress.scss       | Progress bar upload         | Progress        |

#### Other UI

| Fichier                             | Rôle                 |
| ----------------------------------- | -------------------- |
| image-preview/ImagePreview.scss     | Image preview        |
| loader/Loader.scss                  | Spinner loader       |
| floating-pencil/FloatingPencil.scss | Floating edit button |
| toast/Toast.scss                    | Toast notifications  |

**Total**: 12+ UI atomic components

### Features Components (Feature-specific)

#### Tableau (Dashboard)

| Chemin                | Fichier                               | Rôle                |
| --------------------- | ------------------------------------- | ------------------- |
| **features/tableau/** | tokens-grid/TokensGrid.scss           | Grid tokens         |
|                       | slot-card/SlotCard.scss               | Card slot           |
|                       | session-complete/SessionComplete.scss | Session complete UI |

#### Tâches (Tasks)

| Fichier                           | Rôle                    |
| --------------------------------- | ----------------------- |
| taches-dnd/TachesDnd.scss         | Tasks DnD               |
| taches-edition/TachesEdition.scss | Tasks edit (DEPRECATED) |

#### Timeline (Planning)

| Fichier                                | Rôle              |
| -------------------------------------- | ----------------- |
| timeline/card-picker/CardPicker.scss   | Card picker modal |
| timeline/slot-item/SlotItem.scss       | Slot item         |
| timeline/slots-editor/SlotsEditor.scss | Slots editor      |

#### Séquences (Sequences)

| Fichier                                                    | Rôle            |
| ---------------------------------------------------------- | --------------- |
| sequences/sequence-editor/SequenceEditor.scss              | Sequence editor |
| sequences/sequence-mini-timeline/SequenceMiniTimeline.scss | Mini timeline   |

#### Autre features

| Fichier                                                          | Rôle                   |
| ---------------------------------------------------------------- | ---------------------- |
| cards/cards-edition/CardsEdition.scss                            | Cards editor           |
| recompenses/selected-reward-floating/SelectedRewardFloating.scss | Floating reward        |
| time-timer/FloatingTimeTimer.scss                                | Floating timer         |
| child-profile/ChildProfileSelector.scss                          | Child profile selector |
| child-profile/child-profile-manager/ChildProfileManager.scss     | Child profile manager  |
| profil/device-list/DeviceList.scss                               | Device list            |
| profil/DeleteProfileModal.scss                                   | Delete profile modal   |
| settings/DeleteAccountGuard.scss                                 | Delete account guard   |

**Total**: 20+ feature components

---

## 📊 SCSS FILE STATISTICS

```
INFRASTRUCTURE (src/styles/):
  ├── Vendors: 2 files
  ├── Abstracts: 18 files (CRITICAL)
  ├── Base: 7 files
  └── Themes: 3 files
  TOTAL: 30 files

PAGE COMPONENTS (src/page-components/):
  ├── Authentication: 3 (login, forgot, reset)
  ├── User features: 6 (tableau, profil, edition, edition-timeline, abonnement, rgpd)
  ├── Admin: 3 (permissions, logs, metrics)
  TOTAL: 12 files

COMPONENTS LIBRARY (src/components/):
  ├── Layout: 4
  ├── Shared: 25+
  ├── UI (Atomic): 12+
  ├── Features: 20+
  TOTAL: 60+ files

GRAND TOTAL: ~100+ SCSS files (excluant node_modules)
```

---

## 🔗 DEPENDENCY GRAPH

```
main.scss (entry)
│
├─→ vendors/_index.scss
│   └─→ normalize.css
│
├─→ abstracts/_index.scss
│   ├─→ _primitives.scss (PHASE 6)
│   ├─→ _semantics.scss (PHASE 6)
│   ├─→ _tokens.scss (CANONICAL)
│   ├─→ _colors.scss (wrapper)
│   ├─→ _spacing.scss (wrapper + CSS vars)
│   ├─→ _radius.scss (wrapper)
│   ├─→ _size.scss
│   ├─→ _shadows.scss (wrapper)
│   ├─→ _typography.scss
│   ├─→ _motion.scss
│   ├─→ _a11y-tokens.scss
│   ├─→ _borders.scss
│   ├─→ _functions.scss
│   ├─→ _mixins.scss
│   ├─→ _breakpoints.scss
│   ├─→ _forms.scss
│   └─→ _container-queries.scss
│
├─→ abstracts/colors (explicit runtime import)
├─→ abstracts/typography (explicit runtime import)
├─→ abstracts/spacing (explicit runtime import)
├─→ abstracts/motion (explicit runtime import)
├─→ abstracts/radius (explicit runtime import)
├─→ abstracts/shadows (explicit runtime import)
├─→ abstracts/forms (explicit runtime import)
│
├─→ base/_index.scss
│   ├─→ _reset.scss
│   ├─→ _reduced-motion.scss
│   ├─→ _accessibility.scss
│   ├─→ _helpers.scss
│   ├─→ _animations.scss
│   └─→ _typography-base.scss
│
└─→ themes/_index.scss
    ├─→ _light.scss (CSS vars :root)
    └─→ _dark.scss (CSS vars @media + [data-theme])

COMPOSANTS:
  .tsx imports './Component.scss'
  Component.scss imports '@use @styles/abstracts' as *
  ↓ Auto-expose all functions/vars
```

---

## 🚨 CRITICAL FILES (Don't Break)

### Must-Read Before Modifying

| Fichier                    | Reason                     | Action                                |
| -------------------------- | -------------------------- | ------------------------------------- |
| **\_tokens.scss**          | SOURCE DE VÉRITÉ canonique | READ before any token change          |
| **\_primitives.scss**      | PHASE 6 foundation         | READ before PHASE 6 migration         |
| **\_semantics.scss**       | PHASE 6 metadata           | READ before PHASE 6 migration         |
| **\_spacing.scss**         | Fallback logic critical    | **DO NOT modify** (unless fixing bug) |
| **\_colors.scss**          | Fallback logic critical    | **DO NOT modify** (unless fixing bug) |
| **\_radius.scss**          | Fallback logic critical    | **DO NOT modify** (unless fixing bug) |
| **\_shadows.scss**         | Fallback logic critical    | **DO NOT modify** (unless fixing bug) |
| **main.scss**              | Import order CRITICAL      | ⚠️ Order matters!                     |
| **abstracts/\_index.scss** | Forward orchestration      | ⚠️ Order matters!                     |

### Safe to Modify / Extend

| Fichier                    | Safe? | Notes                         |
| -------------------------- | ----- | ----------------------------- |
| **\_tokens.scss**          | ✅    | ADD tokens (never remove)     |
| **themes/\_light.scss**    | ✅    | ADD CSS vars for new tokens   |
| **themes/\_dark.scss**     | ✅    | ADD CSS vars for new tokens   |
| **base/\_helpers.scss**    | ✅    | ADD utility classes           |
| **base/\_animations.scss** | ✅    | ADD @keyframes                |
| Composants `.scss`         | ✅    | Always safe (follow patterns) |

---

## 📈 MIGRATION STATUS

### Phase 6 Completed

- ✅ Modal.scss (all modal features)
- ✅ ButtonDelete.scss (delete button)

### In Migration (Fallback Active)

- ⏳ 90%+ de composants (utilisent fallback legacy gracefully)

### Legacy Only (No Phase 6)

- 🔴 Quelques admin complexes (en attente migration)

### Feature Flag Status

```scss
// src/styles/abstracts/_index.scss
$ENABLE_LEGACY_SUPPORT: true !default;
// ✅ KEEP TRUE during Phase 5→6 migration (prevents build breaks)
```

---

## 🎯 FILE MODIFICATION CHECKLIST

Before modifying any SCSS file:

1. **Read** `src/styles/CLAUDE.md` (user-facing tokens API)
2. **Read** `src/styles/abstracts/_index.scss` (feature flags)
3. **Check** if file is in "Critical Files" table
4. **Verify** with `pnpm build` (not just `pnpm dev`)
5. **Test** focus states, hover states, responsive
6. **Test** light + dark themes
7. **Test** prefers-reduced-motion

---

## 📝 PATHS FOR QUICK REFERENCE

```bash
# Core infrastructure
src/styles/main.scss
src/styles/abstracts/_tokens.scss
src/styles/abstracts/_index.scss

# Wrappers (fallback logic)
src/styles/abstracts/_spacing.scss
src/styles/abstracts/_colors.scss
src/styles/abstracts/_radius.scss

# Add tokens here
src/styles/abstracts/_tokens.scss    # Canonical maps

# Add theme vars here
src/styles/themes/_light.scss
src/styles/themes/_dark.scss

# Add new component SCSS
src/components/{category}/{ComponentName}/{ComponentName}.scss
```

---

**Last Updated**: 2026-04-25
**Total Files Catalogued**: ~100+ SCSS
**Compliance**: WCAG 2.2 AA + TSA
**Phase**: Phase 6 migration (Phase 5 fallback active)
