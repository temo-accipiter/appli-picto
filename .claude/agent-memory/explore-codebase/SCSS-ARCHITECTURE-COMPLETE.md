# ARCHITECTURE SCSS/CSS COMPLÈTE — Appli-Picto

**Date d'exploration** : 2026-04-25
**Version design system** : Phase 6 (Migration progressive de tokens)
**Approche** : Tokens-First + Fallback legacy pour compatibilité

---

## 📋 TABLE DES MATIÈRES

1. [Structure globale](#structure-globale)
2. [Arborescence détaillée](#arborescence-détaillée)
3. [Système de tokens](#système-de-tokens)
4. [Dépendances et imports](#dépendances-et-imports)
5. [Patterns et conventions](#patterns-et-conventions)
6. [Composants SCSS](#composants-scss)
7. [Diagramme des dépendances](#diagramme-des-dépendances)

---

## STRUCTURE GLOBALE

### Points d'entrée principaux

```
src/styles/main.scss  ← Point d'entrée Next.js (compilé par Turbopack)
```

**Ordre d'import critique (IMMUABLE)**:

1. **Vendors** — normalize.css (immutable)
2. **Abstracts** (OUTILS) — maps, fonctions, mixins, breakpoints
3. **Abstracts RUNTIME** — couleurs, typo, spacing, motion, radius, shadows, forms (génèrent CSS vars)
4. **Base** — reset, politiques globales, styles fondamentaux
5. **Themes** — surcharges light/dark (CSS vars)

### Règle tokens-first OBLIGATOIRE

- **JAMAIS** de valeurs hardcodées (px, rem, #hex, rgb)
- **TOUJOURS** utiliser fonctions tokens ou CSS vars
- **Imports absolus** : `@use '@styles/abstracts' as *;` dans tous les fichiers

---

## ARBORESCENCE DÉTAILLÉE

### 🌳 src/styles/

```
src/styles/
├── main.scss                               # Point d'entrée — orchestration
│
├── vendors/                                # Normalisation externe (immutable)
│   ├── _index.scss                         # Forward @forward './normalize'
│   └── _normalize.scss                     # Normalize.css (reset cross-browser)
│
├── abstracts/                              # OUTILS SCSS (pas de CSS générée sauf *-tokens)
│   ├── _index.scss                         # ORCHESTRA (forwards phase 6 + legacy)
│   ├── _primitives.scss                    # ⭐ PHASE 6 — Palettes/Grille/Radius bruts
│   ├── _semantics.scss                     # ⭐ PHASE 6 — Noms métier → Primitives
│   ├── _colors.scss                        # Wrapper couleurs (fallback Phase 6→Legacy)
│   ├── _spacing.scss                       # ⭐ Wrapper + CSS vars (fallback semantics→legacy)
│   ├── _radius.scss                        # ⭐ Wrapper (fallback semantics→legacy)
│   ├── _size.scss                          # Dimensions structurelles (width/height/min-max)
│   ├── _shadows.scss                       # ⭐ Wrapper (fallback semantics→legacy)
│   ├── _typography.scss                    # Font-size/weight/line-height (legacy)
│   ├── _motion.scss                        # Timing/easing (legacy) + accessibility
│   ├── _tokens.scss                        # SOURCE DE VÉRITÉ — Toutes maps canoniques
│   ├── _functions.scss                     # Helpers utilitaires (rem conversion, etc.)
│   ├── _mixins.scss                        # Réusable mixins (breakpoints, focus, etc.)
│   ├── _breakpoints.scss                   # Responsive design (mobile-first @include respond-to)
│   ├── _a11y-tokens.scss                   # Accessibilité WCAG/TSA (fallback legacy)
│   ├── _borders.scss                       # Border-width (legacy)
│   ├── _forms.scss                         # Form controls styling (legacy)
│   ├── _container-queries.scss             # @supports container queries
│
├── base/                                   # Styles globaux DOM
│   ├── _index.scss                         # Forward (ordre critique)
│   ├── _reset.scss                         # CSS reset minimal (box-sizing, margins, etc.)
│   ├── _reduced-motion.scss                # Respect prefers-reduced-motion
│   ├── _accessibility.scss                 # Politiques a11y globales
│   ├── _helpers.scss                       # Utilitaires (.container, .sr-only, .touch-target)
│   ├── _animations.scss                    # @keyframes globales (fadeIn, scaleIn, etc.)
│   ├── _typography-base.scss               # html/body/h1-h6/p typographie défaut
│
├── themes/                                 # Surcharges CSS vars
│   ├── _index.scss                         # Forward light/dark
│   ├── _light.scss                         # Theme clair (défaut) — CSS vars light
│   └── _dark.scss                          # Theme sombre — CSS vars dark
```

### 📂 src/page-components/ (SCSS liés aux pages)

Chaque page contient un `.scss` qui utilise tokens:

```
src/page-components/
├── forgot-password/        ForgotPassword.scss
├── reset-password/         ResetPassword.scss
├── login/                  Login.scss
├── tableau/                Tableau.scss
├── profil/                 Profil.scss
├── edition/                Edition.scss
├── edition-timeline/       EditionTimeline.scss
├── abonnement/             Abonnement.scss
├── legal/rgpd/             PortailRGPD.scss
└── admin/
    ├── permissions/        Permissions.scss
    ├── logs/               Logs.scss
    └── metrics/            Metrics.scss
```

### 🎨 src/components/ (SCSS composants)

Organisés par catégorie:

```
src/components/
├── layout/
│   ├── navbar/             Navbar.scss
│   ├── bottom-nav/         BottomNav.scss
│   ├── footer/             Footer.scss
│   └── settings-menu/      SettingsMenu.scss
│
├── shared/
│   ├── modal/
│   │   ├── Modal.scss      # Modal base PHASE 6 validé
│   │   ├── ModalRecompense.scss
│   │   ├── ModalQuota.scss
│   │   ├── ModalCategory.scss
│   │   ├── CreateBankCardModal.scss
│   │   └── ...
│   ├── card/
│   │   ├── BaseCard.scss
│   │   ├── TableauCard.scss
│   │   └── EditionCard.scss
│   ├── dnd/
│   │   ├── DndGrid.scss
│   │   ├── DndSlot.scss
│   │   └── DndCard.scss
│   ├── forms/
│   │   └── ItemForm.scss
│   ├── avatar-profil/      AvatarProfil.scss
│   ├── separator/          Separator.scss
│   ├── dropdown/           Dropdown.scss
│   ├── signed-image/       SignedImage.scss
│   ├── demo-signed-image/  DemoSignedImage.scss
│   ├── theme-toggle/       ThemeToggle.scss
│   ├── lang-selector/      LangSelector.scss
│   ├── initialization-loader/  InitializationLoader.scss
│   ├── global-loader/      GlobalLoader.scss
│   ├── execution-only-banner/  ExecutionOnlyBanner.scss
│   ├── offline-banner/     OfflineBanner.scss
│   ├── long-press-link/    LongPressLink.scss
│   ├── error-boundary/     ErrorBoundary.scss
│   ├── admin-route/        AdminRoute.scss
│   ├── account-status-badge/  AccountStatusBadge.scss
│
├── ui/
│   ├── button/
│   │   ├── button-delete/  ButtonDelete.scss  # PHASE 6 validé
│   │   └── button-close/   ButtonClose.scss
│   ├── floating-pencil/    FloatingPencil.scss
│   ├── checkbox/           Checkbox.scss
│   ├── input-file/         InputFile.scss
│   ├── image-preview/      ImagePreview.scss
│   ├── select/             Select.scss
│   ├── select-with-image/  SelectWithImage.scss (DEPRECATED)
│   ├── password-checklist/ PasswordChecklist.scss
│   ├── upload-progress/    UploadProgress.scss
│   ├── toast/              Toast.scss
│   ├── loader/             Loader.scss
│
├── features/
│   ├── tableau/
│   │   ├── tokens-grid/    TokensGrid.scss
│   │   ├── slot-card/      SlotCard.scss
│   │   └── session-complete/  SessionComplete.scss
│   ├── taches/
│   │   ├── taches-dnd/     TachesDnd.scss
│   │   └── taches-edition/ TachesEdition.scss (DEPRECATED)
│   ├── timeline/
│   │   ├── card-picker/    CardPicker.scss
│   │   ├── slot-item/      SlotItem.scss
│   │   ├── slots-editor/   SlotsEditor.scss
│   │   └── slot-timeline/  SlotTimeline.scss (DEPRECATED)
│   ├── sequences/
│   │   ├── sequence-editor/  SequenceEditor.scss
│   │   ├── sequence-mini-timeline/  SequenceMiniTimeline.scss
│   │   └── sequences-edition/  SequencesEdition.scss (DEPRECATED)
│   ├── cards/
│   │   └── cards-edition/  CardsEdition.scss
│   ├── recompenses/
│   │   └── selected-reward-floating/  SelectedRewardFloating.scss
│   ├── time-timer/
│   │   └── FloatingTimeTimer.scss
│   ├── child-profile/
│   │   ├── ChildProfileSelector.scss
│   │   └── child-profile-manager/  ChildProfileManager.scss
│   ├── profil/
│   │   ├── device-list/    DeviceList.scss
│   │   └── DeleteProfileModal.scss
│   └── settings/
│       └── DeleteAccountGuard.scss
```

**Total SCSS trouvés**: ~100+ fichiers (.scss) source

---

## SYSTÈME DE TOKENS

### 🏗️ Architecture à 3 niveaux

#### Niveau 1: PRIMITIVES (`_primitives.scss`)

**Valeurs brutes harmonisées** — Pas de CSS générée, fondation pour semantics.

```scss
// Palettes de couleurs brutes (neutral, brand, success, warning, error, info)
$palettes-primitives: (
  'neutral': ( 0: #ffffff, 50: #f8fafc, ... 900: #0f172a ),
  'brand': ( 50: #eef2ff, ..., 500: #667eea, ... ),
  'success': ( ... ), 'warning': ( ... ), 'error': ( ... ), 'info': ( ... )
)

// Grille 4px STRICTE
$spacing-primitives: (
  'none': 0, 'xs': 0.25rem (4px), 'sm': 0.5rem (8px), 'md': 1rem (16px),
  '4': 0.25rem, '6': 0.375rem, '8': 0.5rem, '12': 0.75rem, '16': 1rem,
  '20': 1.25rem, '24': 1.5rem, '32': 2rem, '44': 2.75rem, '56': 3.5rem, ...
)

// Dimensions structurelles
$size-primitives: (
  'touch-min': 2.75rem (44px), 'touch-optimal': 3rem (48px), 'touch-preferred': 3.5rem (56px),
  'icon-sm': 1rem (16px), 'icon-md': 1.5rem (24px), 'button-height': 2.75rem (44px),
  'avatar-md': 2.5rem (40px), 'modal-width-md': 33.75rem (540px), ...
)

// Radius adoucis TSA (6px/12px vs 4px/8px legacy)
$radius-primitives: (
  'none': 0, 'xs': 0.25rem (4px), 'sm': 0.375rem (6px), 'md': 0.75rem (12px),
  'lg': 1.25rem (20px), 'xl': 1.5rem (24px), 'full': 50%, ...
)

// Typo scale
$font-size-primitives: (
  'xs': 0.75rem (12px), 'sm': 0.875rem (14px), 'base': 1rem (16px),
  'lg': 1.125rem (18px), 'xl': 1.25rem (20px), '2xl': 1.5rem (24px), ...
)

// Motion (TSA-compliant ≤ 0.3s)
$motion-primitives: (
  'timing': ( 'instant': 0.1s, 'fast': 0.15s, 'base': 0.2s, 'slow': 0.3s ),
  'easing': ( 'linear', 'smooth', 'smooth-out', 'smooth-in' )
)

// Ombres subtiles
$shadow-primitives: (
  'none': none, 'xs': 0 1px 2px rgba(..., 0.05), 'sm': 0 2px 4px rgba(..., 0.08), ...
)
```

**Fonction helper**: `palette($palette, $shade)` → accès aux couleurs primaires

#### Niveau 2: SEMANTICS (`_semantics.scss`)

**Noms métier** — Dérive UNIQUEMENT des primitives, pas de hardcodes.

```scss
// Couleurs par intention
$color-semantic-text: (
  'primary': palette('neutral', 800),      // #1e293b - texte principal
  'secondary': palette('neutral', 600),    // #475569 - secondaire
  'tertiary': palette('neutral', 400),     // #94a3b8 - hints
  'invert': palette('neutral', 0),         // #ffffff - sur fond sombre
  ...
)

$color-semantic-surface: (
  'page': palette('neutral', 50),          // #f8fafc - page bg
  'bg': palette('neutral', 0),             // #ffffff - card/composant bg
  'overlay': palette('neutral', 100),      // #f1f5f9 - overlay léger
  'border': palette('neutral', 200),       // #e2e8f0 - bordures
  ...
)

$color-semantic-feedback: (
  'success-base': palette('success', 500),
  'success-light': palette('success', 100),
  'warning-base': palette('warning', 500),
  'error-base': palette('error', 500),
  'info-base': palette('info', 500),
  ...
)

$color-semantic-roles: (
  'admin-base': palette('brand', 500),     // #667eea - violet admin
  'abonne-base': palette('success', 500),
  'free-base': palette('neutral', 500),
  'visitor-base': palette('warning', 600),
  ...
)

// Espacements par contexte
$spacing-semantic: (
  'page-padding': 2rem (32px),
  'card-padding': 1.5rem (24px),
  'button-padding-x': 1.5rem (24px),
  'modal-padding': 2rem (32px),
  ...
)

// Dimensions métier
$size-semantic: (
  'touch-min': 2.75rem (44px),
  'button-height': 2.75rem (44px),
  'avatar-md': 2.5rem (40px),
  'modal-width-md': 33.75rem (540px),
  ...
)

// Radius par contexte
$radius-semantic: (
  'small': 0.375rem (6px),      // boutons, inputs
  'medium': 0.75rem (12px),     // cards standard
  'large': 1.25rem (20px),      // modals doux
  'card': 0.75rem (12px),
  'button': 0.375rem (6px),
  'modal': 1.25rem (20px),
  ...
)

// Ombres par contexte
$shadow-semantic: (
  'subtle': 0 1px 2px rgba(..., 0.05),
  'small': 0 2px 4px rgba(..., 0.08),
  'medium': 0 4px 8px rgba(..., 0.1),
  'card': 0 2px 4px rgba(..., 0.08),
  'modal': 0 20px 40px rgba(..., 0.2),
  ...
)

// Fonctions d'accès public
@function semantic-text($key) { ... }
@function semantic-surface($key) { ... }
@function semantic-feedback($key) { ... }
@function semantic-role($key) { ... }
...
```

#### Niveau 3: WRAPPERS (`_colors.scss`, `_spacing.scss`, `_radius.scss`, etc.)

**API publique avec fallback intelligent**:

```scss
// _spacing.scss — Fallback multi-couches
@function spacing($key) {
  // 1. Cherche dans $spacing-semantic (Phase 6 ✅)
  @if map.has-key(sem.$spacing-semantic, $key) { ... }
  // 2. Fallback : $spacing-primitives (Phase 6)
  @else if map.has-key(prim.$spacing-primitives, $key) { ... }
  // 3. Fallback : $spacing-tokens legacy (Phase 5) si flag
  @else if $ENABLE_LEGACY_SUPPORT and map.has-key($spacing-tokens, $key) { ... }
  @else { @error "Spacing '#{$key}' not found" }
}

// _colors.scss — Wrappers sémantiques
@function text($key) {
  // Fallback Phase 6 → Legacy
  @if map.has-key(sem.$color-semantic-text, $key) { ... }
  @else if $ENABLE_LEGACY_SUPPORT ... { ... }
}

@function surface($key) { ... }  // Fond, card, overlay, divider, hover, soft
@function semantic($name, $variant: 'base') { ... }  // success, error, warning, info

// _radius.scss — Border radius avec fallback
@function radius($key) {
  // Fallback Semantics → Primitives → Legacy
  @if map.has-key(sem.$radius-semantic, $key) { ... }
  @else if map.has-key(prim.$radius-primitives, $key) { ... }
  @else if $ENABLE_LEGACY_SUPPORT ... { ... }
}

// _shadows.scss — Ombres avec fallback
@function shadow($key) {
  // Fallback Semantics → Primitives → Legacy (avec fallback 'elevation-' prefix)
  @if map.has-key(sem.$shadow-semantic, $key) { ... }
  @else if map.has-key(prim.$shadow-primitives, $key) { ... }
}

// _size.scss — Dimensions pures (pas de fallback Phase 6 encore)
@function size($key) {
  @if map.has-key($size-tokens, $key) { ... }
  @else { @error "Size '#{$key}' not found" }
}

// _typography.scss — Typo pures legacy
@function font-size($key) { ... }
@function font-weight($key) { ... }
@function line-height($key) { ... }

// _motion.scss — Motion legacy
@function timing($key) { ... }
@function easing($key) { ... }

// _a11y-tokens.scss — Accessibilité
@function a11y($key) { ... }
```

### 🎛️ CSS Custom Properties (runtime)

Générées dans `_spacing.scss`, `_light.scss`, etc. pour accès JavaScript:

```css
:root {
  /* Spacing (generated from spacing()) */
  --spacing-none: 0;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  ...

  /* Colors (light theme) */
  --color-text: #1e293b;
  --color-bg: #ffffff;
  --color-surface: #f1f5f9;
  --color-primary: #2563eb;
  --color-success: #22c55e;
  ...
}

@media (prefers-color-scheme: dark) {
  :root { /* Dark overrides */ }
}

[data-theme='dark'] {
  /* Explicit dark theme override */
}
```

### 🚩 Feature Flags

Dans `_index.scss`:

```scss
$ENABLE_LEGACY_SUPPORT: true !default; // Phase 5 fallback (garder true)
```

---

## DÉPENDANCES ET IMPORTS

### 🔗 Ordre d'import CRITIQUE en main.scss

```scss
// 1. VENDORS — immutable, en premier
@use './vendors/normalize' as *;

// 2. ABSTRACTS — OUTILS (maps, fonctions, mixins)
@use './abstracts' as *; // Forward depuis _index.scss

// 3. ABSTRACTS — RUNTIME (génèrent CSS vars et selectors globaux)
@use './abstracts/colors' as *;
@use './abstracts/typography' as *;
@use './abstracts/spacing' as *;
@use './abstracts/motion' as *;
@use './abstracts/radius' as *;
@use './abstracts/shadows' as *;
@use './abstracts/forms' as *;

// 4. BASE — styles DOM globaux
@use './base' as *;

// 5. THEMES — overrides CSS vars
@use './themes/light' as *;
@use './themes/dark' as *;
```

### 📦 Ce que forward `_index.scss` (abstracts)

```scss
// ⭐ PHASE 6 en priorité
@forward './primitives'; // Palettes, grille, radius bruts
@forward './semantics'; // Noms métier
@forward './spacing' show spacing, spacing-value; // Wrapper + CSS vars
@forward './size'; // Dimensions

// Legacy + accessibilité
@forward './tokens' hide spacing, spacing-value; // Canonical maps
@forward './colors' show color, semantic, gray, blue, red, ...;
@forward './radius' show radius, radius-value;
@forward './a11y-tokens' show a11y;
@forward './borders';
@forward './functions';
@forward './breakpoints';
@forward './container-queries';
@forward './mixins';

// Palettes couleurs (legacy)
@forward './colors' show..., tsa-pastel, shadow, shadow-color, ...;
```

### 🗂️ Imports dans composants

**Tous les composants `.scss` importent**:

```scss
@use '@styles/abstracts' as *; // Alias @/ = src/ (tsconfig.json)
```

Cela donne accès à TOUS les tokens et fonctions:

- `spacing('md')` ✅
- `radius('card')` ✅
- `text('primary')` ✅
- `surface('bg')` ✅
- `semantic('success', 'light')` ✅
- `size('modal-width-md')` ✅
- `font-size('lg')` ✅
- `timing('fast')` ✅
- `a11y('touch-target')` ✅
- `@include respond-to('md')` ✅
- `@include safe-transition()` ✅
- `@include touch-target()` ✅
- `@include focus-ring()` ✅

### 🚫 Imports INTERDITS

```scss
// ❌ JAMAIS ceci
@use '../abstracts' as *;  // Relatif
@use 'colors' as *;         // Sans @use '@styles/'
import styles from './Component.module.scss';  // CSS Modules
```

---

## PATTERNS ET CONVENTIONS

### ✅ PATTERNS ÉTABLIS

#### 1. Respect prefers-reduced-motion

```scss
// Dans _motion.scss, toutes transitions utilisent ce mixin
@mixin safe-transition(
  $properties: all,
  $timing: timing('base'),
  $easing: easing('smooth')
) {
  @media (prefers-reduced-motion: no-preference) {
    transition: $properties $timing $easing;
  }
}

// Usage
@include safe-transition(
  background-color transform,
  timing('fast'),
  easing('smooth')
);
```

#### 2. Focus visible WCAG AA

```scss
// Pattern obligatoire pour tous les boutons/inputs
&:focus {
  outline: none; // Retire outline par défaut
}

&:focus-visible {
  outline: 2px solid var(--color-primary); // Bleu visible
  outline-offset: 2px;
}
```

#### 3. Touch targets accessibilité WCAG/TSA

```scss
// Mixin dans _mixins.scss
@mixin touch-target($size: 'optimal') {
  min-height: a11y('#{$size}-touch-target');
  min-width: a11y('#{$size}-touch-target');
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

// Usage
@include touch-target('min'); // 44px WCAG AA
@include touch-target('preferred'); // 56px TSA
```

#### 4. Responsive mobile-first UNIQUEMENT

```scss
// ✅ CORRECT : Mobile par défaut, puis breakpoints min-width
.card {
  padding: spacing('md');  // Mobile: 16px

  @include respond-to('md') {
    padding: spacing('lg');  // Tablette+: 24px
  }
}

// ❌ INCORRECT : Never use max-width
@media (max-width: 768px) { ... }  // FORBIDDEN!
```

#### 5. BEM-lite naming avec tirets

```scss
// ✅ CORRECT
.button {
  &__icon { ... }
  &--primary { ... }
  &--disabled { ... }
  &:hover { ... }
}

// Classe JS (jamais style)
.js-modal { ... }  // Pour JavaScript hooks

// ❌ INCORRECT
.button_icon { ... }      // Underscore
.button.primary { ... }   // Class multiplier
```

#### 6. Transitions douces TSA (max 0.3s)

```scss
// ✅ CORRECT : transitions courtes pour feedback immédiat
transition: color timing('base') easing('smooth'); // 0.2s
transform: scale(1.1); // Léger scaledown on hover
outline: 2px solid...; // Focus direct (pas de transition)

// ❌ INCORRECT
transition: all 1s ease; // Trop long
animation: 0.5s bounce; // Trop d'énergie
transform: rotate(360deg); // Vertigineux
```

#### 7. Couleurs UNIQUEMENT via tokens

```scss
// ✅ CORRECT
.button {
  color: text('primary'); // Semantic
  background: surface('bg'); // Semantic
  border-color: surface('border'); // Semantic

  &:hover {
    background: semantic('error', 'light'); // Semantic feedback
  }
}

// ❌ INCORRECT
color: #1e293b; // Hardcoded!
background: #ffffff; // Hardcoded!
border: 1px solid #ddd; // Hardcoded!
```

#### 8. Spacing pour espacement SEUL

```scss
// ✅ CORRECT : spacing() = padding, margin, gap
padding: spacing('md'); // 16px respiration
margin-bottom: spacing('lg'); // 24px respiration
gap: spacing('sm'); // 8px respiration

// ✅ CORRECT : size() = dimensions
width: size('modal-width-md'); // 540px structure
height: size('button-height'); // 44px structure

// ❌ INCORRECT
width: spacing('300'); // NON! Utiliser size()
padding: spacing('16'); // NON! Utiliser spacing('md')
```

#### 9. Couleurs de bordures et dividers

```scss
// ✅ CORRECT
border: 1px solid surface('border'); // Bordure standard
border-top: 1px solid surface('divider'); // Séparateur

// Alternative feedback
border-color: semantic('success', 'base'); // Vert
border-color: semantic('error', 'dark'); // Rouge

// ❌ INCORRECT
border: 1px solid #e2e8f0; // Hardcoded!
border: 1px solid gray(300); // Sans wrapper
```

#### 10. BEM-light composants Modal/Card/Button

```scss
// Modal.scss pattern
.modal-overlay { ... }     // Backdrop extérieur
.modal { ... }             // Conteneur modal
  &__header { ... }        // Sous-parties
  &__body { ... }
  &__footer { ... }
  &__close-btn { ... }
  &--full-width { ... }    // Variante

// Jamais
.modal .header { ... }       // Pas de sélecteur parent
.modal-header { ... }        // Pas de tiret pour sous-partie
```

#### 11. Icons toujours via size('icon-\*')

```scss
// ✅ CORRECT
.button__icon {
  width: size('icon-sm'); // 16px
  height: size('icon-sm');
}

.avatar {
  width: size('avatar-md'); // 40px
  height: size('avatar-md');
}

// ❌ INCORRECT
width: 24px; // Hardcoded!
width: spacing('24'); // Confusion spacing/size
```

---

## COMPOSANTS SCSS

### 📋 Composants marquants PHASE 6 VALIDÉS

#### Modal.scss

```scss
// Localisation: src/components/shared/modal/Modal.scss
// ✅ VALIDÉ PHASE 6 COMPLET

// Overlay
.modal-overlay {
  background-color: surface('overlay'); // Phase 6 ✅
  backdrop-filter: blur(size('4'));
  padding: spacing('sm'); // Phase 6 ✅

  @include respond-to(sm) {
    padding: spacing('md'); // Phase 6 ✅
  }
}

// Modal conteneur
.modal {
  background: surface('surface'); // Phase 6 ✅
  border: border-width('base') solid color('base');
  box-shadow: modal-shadow('default');
  border-radius: radius('card'); // Phase 6 ✅ (12px TSA-friendly)
  animation: scaleIn timing('fast') easing('ease-out'); // Phase 6 ✅

  max-width: size('modal-width-md'); // Legacy support
  padding: spacing('lg'); // Phase 6 ✅ (24px)
}

// Header
.modal__header {
  padding: spacing('lg'); // Phase 6 ✅
  border-bottom: 1px solid surface('border'); // Phase 6 ✅
}
```

#### ButtonDelete.scss

```scss
// Localisation: src/components/ui/button/button-delete/ButtonDelete.scss
// ✅ VALIDÉ PHASE 6 COMPLET

.button-delete {
  padding: spacing('button-padding-y'); // Phase 6 ✅ (8px sémantique)
  border-radius: radius('button'); // Phase 6 ✅ (6px TSA)
  background: transparent;
  color: text(); // Phase 6 ✅ (primary)

  @include touch-target('min'); // Phase 6 ✅ (44px WCAG)
  @include safe-transition(
    background-color transform,
    timing('fast'),
    easing('smooth')
  ); // Phase 6 ✅

  &:hover,
  &:focus {
    background-color: semantic('error', 'bg'); // Phase 6 ✅ (rouge pastel)
  }

  &__icon {
    width: size('icon-sm'); // Legacy support
    height: size('icon-sm');
  }
}
```

### 📊 Statut de migration par composant

**PHASE 6 COMPLET (migrations finis)**:

- ✅ Modal.scss
- ✅ ButtonDelete.scss
- ✅ (Autres avec annotations `// ✅ PHASE 6 VALIDÉ`)

**EN MIGRATION (avec fallback legacy)**:

- ⏳ Plupart des composants (utilisent wrappers fallback)

**LEGACY ESPACE (peu de réaménagement)**:

- 🔴 Certains composants admin complexes

---

## DIAGRAMME DES DÉPENDANCES

```
┌─────────────────────────────────────────────────────────┐
│ main.scss                                               │
│ (Point d'entrée Next.js)                               │
└──────────┬──────────────────────────────────────────────┘
           │
           ├─→ vendors/_index.scss
           │   └─→ _normalize.scss (CSS reset)
           │
           ├─→ abstracts/_index.scss ⭐ ORCHESTRE
           │   ├─→ _primitives.scss (PHASE 6 - palettes brutes)
           │   ├─→ _semantics.scss (PHASE 6 - noms métier)
           │   ├─→ _spacing.scss (Wrapper + CSS vars)
           │   ├─→ _size.scss (Dimensions)
           │   ├─→ _tokens.scss (SOURCE DE VÉRITÉ canonique)
           │   ├─→ _colors.scss (Wrapper couleurs)
           │   ├─→ _radius.scss (Wrapper radius)
           │   ├─→ _a11y-tokens.scss (Accessibilité)
           │   ├─→ _borders.scss
           │   ├─→ _functions.scss
           │   ├─→ _breakpoints.scss
           │   ├─→ _mixins.scss
           │   └─→ _container-queries.scss
           │
           ├─→ abstracts/{colors,typography,spacing,motion,radius,shadows,forms}
           │   (Génèrent CSS vars et selectors globaux)
           │
           ├─→ base/_index.scss
           │   ├─→ _reset.scss (box-sizing, margins, media reset)
           │   ├─→ _reduced-motion.scss (prefers-reduced-motion)
           │   ├─→ _accessibility.scss (politiques a11y)
           │   ├─→ _helpers.scss (.container, .sr-only, .touch-target)
           │   ├─→ _animations.scss (@keyframes globales)
           │   └─→ _typography-base.scss (html/body/h/p défaut)
           │
           └─→ themes/_index.scss
               ├─→ _light.scss (CSS vars light - défaut)
               └─→ _dark.scss (CSS vars dark)

┌──────────────────────────────────────────────────────────┐
│ Composants (.scss)                                        │
│ ├─→ @use '@styles/abstracts' as *;  (Accès à tous tokens│
│ └─→ Import depuis ./Component.scss (Next.js)            │
└──────────────────────────────────────────────────────────┘

FLUXE DONNÉES TOKENS :
  _tokens.scss (canonical)
    ↓
  _primitives.scss (derive palettes)
    ↓
  _semantics.scss (derive noms métier)
    ↓
  _colors.scss, _spacing.scss, etc. (wrappers avec fallback)
    ↓
  Composants (utiliser fonctions wrappers)
```

---

## FICHIERS CRITIQUES À RETENIR

| Fichier                    | Rôle                       | Modification?                         |
| -------------------------- | -------------------------- | ------------------------------------- |
| **main.scss**              | Orchestration ordre import | ⚠️ Attentif (ordre critique)          |
| **\_tokens.scss**          | SOURCE DE VÉRITÉ canonique | ✅ Ajouter mappings (pas supprimer)   |
| **\_primitives.scss**      | Palettes/grille PHASE 6    | ✅ Ajouter si PHASE 6 migration       |
| **\_semantics.scss**       | Noms métier PHASE 6        | ✅ Ajouter si PHASE 6 migration       |
| **\_spacing.scss**         | Wrapper spacing + CSS vars | 🔴 Ne pas modifier (logique critique) |
| **\_colors.scss**          | Wrapper couleurs           | 🔴 Ne pas modifier (logique fallback) |
| **\_radius.scss**          | Wrapper radius             | 🔴 Ne pas modifier                    |
| **abstracts/\_index.scss** | Forward systématique       | ⚠️ Ordre des forwards crucial         |
| **base/\_reset.scss**      | CSS reset minimal          | 🔴 Conservatif (fondation)            |
| **themes/\_light.scss**    | Light theme CSS vars       | ✅ Peut ajouter vars (Phase 6 colors) |
| **themes/\_dark.scss**     | Dark theme CSS vars        | ✅ Peut ajouter vars                  |

---

## 🎯 RÈGLES DE MODIFICATION

### AJOUTER un token

**1. D'abord dans `_tokens.scss`** (canonical):

```scss
// Dans $spacing-tokens
$spacing-tokens: (
  // Ajouter au bon endroit alphabétique/logique
  'new-token-name': 2.5rem,
  ...
);
```

**2. Puis dans `_primitives.scss` (si PHASE 6)**:

```scss
$spacing-primitives: (
  'new-token-name': 2.5rem,
  // Même valeur
  ...,
);
```

**3. Puis dans `_semantics.scss` (si sémantique)**:

```scss
$spacing-semantic: (
  'my-semantic-spacing': map.get(p.$spacing-primitives, 'new-token-name'),
  ...,
);
```

**4. Utiliser dans composants**:

```scss
@use '@styles/abstracts' as *;
.component {
  padding: spacing('my-semantic-spacing'); // Fallback → primitives → legacy
}
```

### MODIFIER une valeur token

1. **Modifier UNIQUEMENT dans `_tokens.scss`**
2. Autres fichiers (primitives, semantics) référencent via `map.get()`
3. **Jamais** hardcoder dans composants

### CRÉER nouveau composant SCSS

```scss
// 1. Import toujours en haut
@use '@styles/abstracts' as *;

// 2. Utiliser tokens UNIQUEMENT
.new-component {
  // Spacing
  padding: spacing('md');

  // Dimensions
  min-height: size('touch-target-min');

  // Couleurs
  color: text('primary');
  background: surface('bg');

  // Border radius
  border-radius: radius('sm');

  // Animations
  @include safe-transition(background-color, timing('fast'), easing('smooth'));

  // Focus
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  // Responsive mobile-first
  @include respond-to('md') {
    padding: spacing('lg');  // Overrides mobile padding
  }
}

// 3. Exporter via TypeScript .tsx
export { default } from './NewComponent'
```

---

## 📚 RESSOURCES

### Fichiers de documentation interne

- `src/styles/CLAUDE.md` — Tokens API (user-facing)
- `src/styles/abstracts/_index.scss` — Feature flags et architecture
- `src/styles/abstracts/_primitives.scss` — Primitives détaillées (commentées)
- `src/styles/abstracts/_semantics.scss` — Semantics détaillées (commentées)

### Librairies externes

- **Sass** (SCSS) — Built-in avec Next.js 16 Turbopack
- **PostCSS** — Auto (vendor prefixes, etc.)
- **Normalize.css** — vendored dans `vendors/_normalize.scss`

### Commandes pertinentes

```bash
# Vérifier build SCSS (détecte erreurs tokens)
pnpm build

# Build styles uniquement (pour debug)
pnpm build:css  # Sass standalone (ne détecte pas toutes erreurs)

# Dev with HMR
pnpm dev

# Lint fix
pnpm lint:fix
```

---

## 🔍 CHECKLIST AUDIT SCSS

Avant d'ajouter/modifier du SCSS:

- [ ] Tous les tokens utilisés existent dans `_tokens.scss`?
- [ ] Aucune valeur hardcodée (px, #hex, rgb)?
- [ ] `@use '@styles/abstracts' as *;` en haut?
- [ ] Imports absolus via `@/` (jamais relatifs `../`)?
- [ ] Responsive design mobile-first (`@include respond-to()`)?
- [ ] Focus visible WCAG AA (`&:focus-visible`)?
- [ ] Touch targets ≥ 44px (`@include touch-target()`)?
- [ ] Animations ≤ 0.3s (`@include safe-transition()`)?
- [ ] Noms CSS BEM-light (tirets, pas underscores)?
- [ ] Prefers-reduced-motion respecté?
- [ ] Test avec `pnpm build` (pas seulement `pnpm dev`)?

---

**Dernier audit** : 2026-04-25
**Versioning** : Phase 6 en migration, Phase 5 fallback actif
**Compliance** : WCAG 2.2 AA + TSA-optimized
