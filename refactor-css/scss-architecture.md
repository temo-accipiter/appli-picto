# Système SCSS d'Appli-Picto - Architecture Complète

**Date de création** : 17 décembre 2025
**Version** : 2.0
**État du projet** : Phase 5 (Finalisation et nettoyage) en cours

---

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure de src/styles](#structure-de-srcstyles)
3. [Système de Tokens (Source de Vérité)](#système-de-tokens-source-de-vérité)
4. [Catégories du Design System](#catégories-du-design-system)
5. [Fonctions d'Accès](#fonctions-daccès)
6. [Mixins Réutilisables](#mixins-réutilisables)
7. [Exemples d'Utilisation](#exemples-dutilisation)
8. [Migration et État Actuel](#migration-et-état-actuel)

---

## Vue d'ensemble

Appli-Picto utilise un **système de design tokens centralisés** basé sur SCSS. Ce système garantit :

- **Cohérence visuelle** : Toutes les valeurs design proviennent d'une source unique
- **Maintenabilité** : Un changement dans les tokens se propage automatiquement partout
- **Accessibilité TSA** : Design apaisant, couleurs pastel, animations douces ≤ 0.3s
- **WCAG 2.2 AA** : Contrastes, focus visibles, touch targets 44×44px minimum

### Architecture Tokens-First

Le système utilise une architecture en 3 couches :

1. **Tokens** (`_tokens.scss`) - Source de vérité canonique (maps SCSS)
2. **Wrappers** (`_colors.scss`, `_typography.scss`, etc.) - Fonctions d'accès pures
3. **Composants** - Utilisent uniquement les fonctions, jamais les valeurs directes

```scss
// ❌ INTERDIT - Valeurs hardcodées
.button {
  background: #4a90e2;
  padding: 12px 24px;
  border-radius: 8px;
}

// ✅ CORRECT - Utilisation des tokens
.button {
  background: color('base');
  padding: spacing('sm') spacing('lg');
  border-radius: radius('md');
}
```

---

## Structure de src/styles

```
src/styles/
├── abstracts/               # Outils SCSS (tokens, fonctions, mixins)
│   ├── _tokens.scss        # ⭐ SOURCE DE VÉRITÉ UNIQUE (canonical)
│   ├── _a11y-tokens.scss   # Contraintes WCAG/TSA
│   ├── _colors.scss        # Wrapper pur - Fonctions couleurs
│   ├── _typography.scss    # Wrapper pur - Fonctions typographie
│   ├── _spacing.scss       # Wrapper pur - Fonctions espacements
│   ├── _motion.scss        # Wrapper pur - Animations/transitions
│   ├── _radius.scss        # Wrapper pur - Border-radius
│   ├── _shadows.scss       # Wrapper pur - Ombres
│   ├── _borders.scss       # Wrapper pur - Bordures
│   ├── _breakpoints.scss   # Breakpoints responsive mobile-first
│   ├── _mixins.scss        # Mixins réutilisables (DnD, admin, a11y)
│   ├── _functions.scss     # Helpers SCSS (rem(), etc.)
│   ├── _forms.scss         # Styles formulaires
│   ├── _container-queries.scss  # Container queries
│   ├── _variables.scss     # ⚠️ DEPRECATED - Compatibilité temporaire
│   └── _index.scss         # Point d'entrée abstracts
│
├── base/                   # Styles globaux DOM
│   ├── _reset.scss         # Reset CSS
│   ├── _accessibility.scss # Règles a11y globales
│   ├── _reduced-motion.scss # prefers-reduced-motion
│   ├── _animations.scss    # @keyframes globales
│   ├── _helpers.scss       # Classes utilitaires
│   ├── _typography-base.scss # Typographie DOM
│   └── _index.scss
│
├── themes/                 # Thèmes (light/dark)
│   ├── _light.scss
│   ├── _dark.scss
│   ├── _theme-vars.scss    # ⚠️ DEPRECATED
│   └── _index.scss
│
├── vendors/                # Bibliothèques externes
│   ├── _normalize.scss
│   └── _index.scss
│
└── main.scss              # Point d'entrée principal
```

### Ordre d'Import dans main.scss

**CRITIQUE** : L'ordre d'import est essentiel pour éviter les conflits.

```scss
// 1) VENDORS - normalize en premier (vendor immutable)
@use '@styles/vendors/normalize' as *;

// 2) ABSTRACTS - OUTILS SCSS (safe to forward, pas de CSS généré)
@use '@styles/abstracts' as *;

// 3) ABSTRACTS - SYSTÈMES RUNTIME (génèrent CSS vars, UNE FOIS SEULEMENT)
@use '@styles/abstracts/colors' as *;
@use '@styles/abstracts/typography' as *;
@use '@styles/abstracts/spacing' as *;
@use '@styles/abstracts/motion' as *;
@use '@styles/abstracts/radius' as *;
@use '@styles/abstracts/shadows' as *;
@use '@styles/abstracts/forms' as *;

// 4) BASE - Styles globaux DOM (ordre contrôlé)
@use '@styles/base' as *;

// 5) THEMES - Overrides runtime (après base)
@use '@styles/themes/light' as *;
@use '@styles/themes/dark' as *;
```

---

## Système de Tokens (Source de Vérité)

### \_tokens.scss - La Source Canonique

**CRITIQUE** : `_tokens.scss` est la **SEULE source de vérité** pour TOUTES les valeurs design.

#### Tokens Disponibles

##### 1. Text & Surface Color Tokens

**Couleurs de texte** (`$text-color-tokens`) :

```scss
$text-color-tokens: (
  'default': #333333,
  'invert': #ffffff,
  'muted': #666666,
  'light': #999999,
  'dark': #000000,
) !default;
```

**Couleurs de surfaces** (`$surface-color-tokens`) :

```scss
$surface-color-tokens: (
  'bg': #ffffff,
  'surface': #f7f7f7,
  'border': #e1e1e1,
  'soft': #fafafa,
  'hover': #eeeeee,
) !default;
```

---

##### 2. Role-Based Colors (`$role-color-tokens`)

Couleurs par rôle utilisateur (admin, abonné, free, visitor, staff).

```scss
$role-color-tokens: (
  'admin': (
    'base': #667eea,
    // Violet admin (IMMUABLE)
    'light': #8b9ff4,
    'dark': #4c5ac4,
    'gradient-start': #667eea,
    'gradient-end': #764ba2,
  ),
  'abonne': (
    'base': #22c55e,
    // Vert abonné
    'light': #4ade80,
    'dark': #16a34a,
    'gradient-start': #22c55e,
    'gradient-end': #15803d,
  ),
  'free': (
    'base': #f59e0b,
    // Orange free
    'light': #fbbf24,
    'dark': #d97706,
    'gradient-start': #f59e0b,
    'gradient-end': #dc2626,
  ),
  'visitor': (
    'base': #64748b,
    // Gris visiteur
    'light': #94a3b8,
    'dark': #475569,
    'gradient-start': #64748b,
    'gradient-end': #334155,
  ),
  'staff': (
    'base': #06b6d4,
    // Cyan staff
    'light': #22d3ee,
    'dark': #0891b2,
    'gradient-start': #06b6d4,
    'gradient-end': #0369a1,
  ),
) !default;
```

---

##### 3. Color Palettes (`$blue-palette-tokens`, etc.)

Palettes complètes 50-900 (inspirées Tailwind).

```scss
$blue-palette-tokens: (
  50: #eff6ff,
  100: #dbeafe,
  200: #bfdbfe,
  300: #93c5fd,
  400: #60a5fa,
  500: #3b82f6,
  // Bleu standard
  600: #2563eb,
  700: #1d4ed8,
  800: #1e40af,
  900: #1e3a8a,
) !default;
```

Palettes disponibles : `blue`, `red`, `green`, `orange`, `yellow`, `purple`, `slate`, `gray`.

---

##### 4. Semantic Colors (`$semantic-tokens`)

Couleurs sémantiques (success, warning, error, info).

```scss
$semantic-tokens: (
  'success': (
    'base': #4caf50,
    'light': #81c784,
    'dark': #2e7d32,
    'bg': #f1f8e9,
    'border': #c8e6c9,
  ),
  'warning': (
    'base': #ff9800,
    'light': #ffb74d,
    'dark': #f57c00,
    'bg': #fff3e0,
    'border': #ffe0b2,
  ),
  'error': (
    'base': #f44336,
    'light': #e57373,
    'dark': #d32f2f,
    'bg': #ffebee,
    'border': #ffcdd2,
  ),
  'info': (
    'base': #2196f3,
    'light': #64b5f6,
    'dark': #1976d2,
    'bg': #e3f2fd,
    'border': #bbdefb,
  ),
) !default;
```

---

##### 5. Spacing (`$spacing-tokens`)

Échelle d'espacements (padding, margin, gaps).

```scss
$spacing-tokens: (
  // Échelle principale (4px base)
  'xs': 0.25rem,
  // 4px
  'sm': 0.5rem,
  // 8px
  'md': 1rem,
  // 16px
  'lg': 1.5rem,
  // 24px
  'xl': 2rem,
  // 32px
  '2xl': 3rem,
  // 48px
  '3xl': 4rem,
  // 64px
  '4xl': 5rem,

  // 80px
  // Valeurs spécifiques (legacy)
  '1': 0.0625rem,
  // 1px
  '2': 0.125rem,
  // 2px
  '4': 0.25rem,
  // 4px
  '6': 0.375rem,
  // 6px
  '8': 0.5rem,
  // 8px
  '10': 0.625rem,
  // 10px
  '12': 0.75rem,
  // 12px
  '14': 0.875rem,
  // 14px
  '16': 1rem,
  // 16px
  '18': 1.125rem,
  // 18px
  '20': 1.25rem,
  // 20px
  '22': 1.375rem,
  // 22px
  '24': 1.5rem,
  // 24px
  '28': 1.75rem,
  // 28px
  '32': 2rem,
  // 32px
  '36': 2.25rem,
  // 36px
  '40': 2.5rem,
  // 40px
  '44': 2.75rem,
  // 44px - WCAG touch target min
  '48': 3rem,
  // 48px
  '56': 3.5rem,
  // 56px - TSA touch target preferred
  '64': 4rem,
  // 64px
  '80': 5rem,
  // 80px
  '96': 6rem,
  // 96px
  '128': 8rem,
  // 128px
  '160': 10rem,
  // 160px
  '200': 12.5rem,
  // 200px
  '240': 15rem,
  // 240px
  '280': 17.5rem,
  // 280px
  '300': 18.75rem,

  // 300px
  // Tokens sémantiques
  'nav-mobile': 3.5rem,
  // 56px
  'modal-padding': 2rem,
  // 32px
  'touch-target': 2.75rem,
  // 44px WCAG AA
  'grid-gap': 1rem,
  // 16px
  'grid-min-height': 8.75rem // 140px
) !default;
```

---

##### 6. Size Tokens (`$size-tokens`)

Dimensions structurelles (width, height, min/max).

```scss
$size-tokens: (
  // Touch targets (WCAG/TSA)
  'touch-target-min': 44px,
  // WCAG AA minimum
  'touch-target-optimal': 48px,
  // Compromis
  'touch-target-preferred': 56px,
  // TSA préféré
  // Composants UI
  'button-height': 44px,
  'input-height': 44px,
  'nav-height-mobile': 56px,
  'nav-height-desktop': 64px,
  // Conteneurs
  'modal-width': 540px,
  'modal-width-sm': 400px,
  'modal-width-lg': 720px,
  'sidebar-width': 280px,
  'sidebar-width-collapsed': 60px,
  'card-min-height': 200px,
  // Icons
  'icon-xs': 16px,
  'icon-sm': 20px,
  'icon-md': 24px,
  'icon-lg': 32px,
  'icon-xl': 48px
) !default;
```

**⚠️ IMPORTANT** : `size()` est séparé de `spacing()` pour éviter couplage (respiration ≠ dimensions).

---

##### 7. Font Sizes (`$font-size-tokens`)

Tailles de police Tailwind-like.

```scss
$font-size-tokens: (
  'xs': 0.75rem,
  // 12px
  'sm': 0.875rem,
  // 14px
  'base': 1rem,
  // 16px (default)
  'lg': 1.125rem,
  // 18px
  'xl': 1.25rem,
  // 20px
  '2xl': 1.5rem,
  // 24px
  '3xl': 1.875rem,
  // 30px
  '4xl': 2.25rem,
  // 36px
  '5xl': 3rem,
  // 48px
  '6xl': 3.75rem,
  // 60px
  '7xl': 4.5rem, // 72px
) !default;
```

---

##### 8. Transitions (`$transition-tokens`)

Durées + easing functions.

```scss
$transition-tokens: (
  // Durées
  'fast': 150ms,
  'base': 200ms,
  'slow': 300ms,
  'slower': 500ms,

  // Easing
  'ease-in': ease-in,
  'ease-out': ease-out,
  'ease-in-out': ease-in-out,
  'linear': linear,

  // Combined
  'base-ease': 200ms ease,
  'slow-ease': 300ms ease
) !default;
```

---

##### 9. Border Radius (`$radius-scale`)

Border-radius progression.

```scss
$radius-scale: (
  'xs': 2px,
  'sm': 4px,
  'md': 8px,
  // Standard
  'lg': 16px,
  'xl': 20px,
  '2xl': 24px,
  'full': 50%,

  // Circles, pills
  // Aliases sémantiques
  'card': 16px,
  'button': 8px,
  'input': 8px,
  'avatar': 50%,
  'badge': 50%,
  'modal': 16px,
  'tooltip': 4px,
) !default;
```

---

##### 10. Z-Index (`$z-index-tokens`)

Stacking order hiérarchique.

```scss
$z-index-tokens: (
  'hide': -1,
  'base': 0,
  'dropdown': 100,
  'sticky': 200,
  'fixed': 300,
  'modal-backdrop': 900,
  'modal': 1000,
  'popover': 1050,
  'tooltip': 1100,
  'notification': 1200,
  'max': 9999,
) !default;
```

---

##### 11. Opacity (`$opacity-tokens`)

Valeurs d'alpha/transparence.

```scss
$opacity-tokens: (
  'none': 0,
  'xs': 0.05,
  'sm': 0.1,
  'md': 0.15,
  'lg': 0.2,
  'xl': 0.3,
  '2xl': 0.4,
  'half': 0.5,
  'opaque': 1,
) !default;
```

---

##### 12. Border Width (`$border-width-tokens`)

Épaisseurs de bordures.

```scss
$border-width-tokens: (
  'none': 0,
  'hairline': 1px,
  'thin': 1px,
  'base': 2px,
  'thick': 3px,
  'heavy': 4px,
) !default;
```

---

##### 13. Elevation Shadows (`$elevation-shadows`)

Ombres par élévation.

```scss
$elevation-shadows: (
  'xs': (
    0 1px 2px 0 rgba(0, 0, 0, 0.05),
  ),
  'sm': (
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px -1px rgba(0, 0, 0, 0.1),
  ),
  'md': (
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1),
  ),
  'lg': (
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1),
  ),
  'xl': (
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1),
  ),
  '2xl': (
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
  ),
) !default;
```

---

##### 14. Breakpoints (`$breakpoint-tokens`)

Breakpoints responsive mobile-first.

```scss
$breakpoint-tokens: (
  'sm': 576px,
  // Mobile landscape / Petites tablettes
  'md': 768px,
  // Tablettes portrait
  'lg': 1024px,
  // Desktop / Tablettes landscape
  'xl': 1200px,
  // Large desktop
  'xxl': 1536px, // Extra large desktop
) !default;
```

---

## Catégories du Design System

### 1. Couleurs (\_colors.scss)

Wrapper pur contenant **uniquement des fonctions d'accès**.

#### Fonctions Disponibles

```scss
// Couleurs principales
color($key, $type: 'primary')
  // $key: base, light, dark
  // $type: primary, secondary, accent (roles)

// Couleurs sémantiques
semantic($name, $variant: 'base')
  // $name: success, warning, error, info
  // $variant: base, light, dark, bg, border

// Palettes
blue($shade)      // 50-900
red($shade)
green($shade)
orange($shade)
yellow($shade)
purple($shade)
slate($shade)
gray($shade)

// Rôles utilisateurs
role-color($role, $variant: 'base')
  // $role: admin, abonne, free, visitor, staff
  // $variant: base, light, dark, gradient-start, gradient-end

// Texte et surfaces
text($type: 'default')
  // $type: default, invert, light, dark, muted

surface($type)
  // $type: bg, surface, border, soft, hover

// TSA Pastels
tsa-pastel($key)
  // $key: blue-light, green-soft, info-soft, bg-soft, page-soft

// Ombres/overlays
shadow($key)
  // $key: black-light, black-medium, primary-light, etc.

// Marques tierces
brand($key)
  // $key: stripe, stripe-hover
```

#### Exemples d'Utilisation

```scss
.button {
  background: color('base'); // Couleur principale
  color: text('invert'); // Texte inversé (blanc)
  border: 1px solid semantic('success'); // Bordure success
}

.admin-badge {
  background: role-color('admin', 'base'); // Violet admin
  box-shadow: 0 3px 10px #{role-color('admin', 'gradient-end')};
}

.card {
  background: surface('surface'); // Fond carte
  color: text(); // Texte par défaut
  border: 1px solid surface('border'); // Bordure
}
```

---

### 2. Typographie (\_typography.scss)

Système typographique complet.

#### Fonctions

```scss
// Tailles de police
font-size($key)
  // $key: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl

// Poids de police
font-weight($key)
  // $key: light, normal, medium, semibold, bold, black

// Hauteurs de ligne
line-height($key)
  // $key: tight, normal, base, relaxed, loose

// Tokens combinés (size + weight + line-height)
typography-token($key)
  // $key: h1, h2, h3, h4, h5, h6, body, small, caption, label, button
```

#### Font Stacks

```scss
$text-font-stack:
  system-ui,
  -apple-system,
  'Segoe UI',
  Roboto,
  sans-serif;
$heading-font-stack: Georgia, 'Times New Roman', Times, serif;
$lexend-font-stack:
  'Lexend',
  system-ui,
  -apple-system,
  sans-serif; // TSA-friendly
$mono-font-stack: 'Monaco', 'Menlo', 'Courier New', monospace;
```

#### Exemples

```scss
.title {
  font-size: font-size('2xl'); // 1.5rem (24px)
  font-weight: font-weight('bold'); // 700
  line-height: line-height('tight'); // 1.2
  font-family: $lexend-font-stack; // TSA-friendly
}

.body-text {
  font-size: font-size('base'); // 1rem (16px)
  font-weight: font-weight('normal'); // 400
  line-height: line-height('base'); // 1.5
}
```

---

### 3. Spacing (\_spacing.scss)

Système d'espacements cohérent (respiration uniquement).

#### Fonction

```scss
spacing($key)
  // Scale primaire: xs, sm, md, lg, xl, 2xl, 3xl, 4xl
  // Valeurs spécifiques: 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, ...
  // Spécialisés: nav-mobile (56px), modal-padding (32px), grid-gap (16px), etc.
```

#### Usage Autorisé

- `margin`, `padding` (et variantes logiques)
- `gap`, `row-gap`, `column-gap`
- `inset`, `scroll-margin`, `scroll-padding`

#### ❌ Interdit pour Dimensions

- `width`, `height` → Utiliser `size()`
- `min-width`, `max-width`, `min-height`, `max-height` → Utiliser `size()`

#### Exemples

```scss
.card {
  padding: spacing('lg'); // ✅ 1.5rem (24px) - Respiration
  margin-bottom: spacing('xl'); // ✅ 2rem (32px) - Respiration
  gap: spacing('md'); // ✅ 1rem (16px) - Respiration
}

.button {
  padding: spacing('sm') spacing('lg'); // ✅ 0.5rem 1.5rem - Respiration
  min-height: size('touch-target-min'); // ✅ 44px - Dimension
}
```

---

### 4. Size (\_size.scss)

Système de dimensions structurelles (width, height, min/max).

#### Fonction

```scss
size($key)
  // Touch targets: touch-target-min (44px), touch-target-optimal (48px), touch-target-preferred (56px)
  // UI components: button-height, input-height, nav-height-mobile, nav-height-desktop
  // Conteneurs: modal-width, sidebar-width, card-min-height
  // Icons: icon-xs, icon-sm, icon-md, icon-lg, icon-xl
```

#### Usage Autorisé

- `width`, `height`
- `min-width`, `max-width`, `min-height`, `max-height`
- Dimensions de composants (modal, sidebar, touch targets)

#### ❌ Interdit pour Respiration

- `margin`, `padding` → Utiliser `spacing()`
- `gap` → Utiliser `spacing()`

#### Exemples

```scss
.button {
  min-height: size('touch-target-min'); // ✅ 44px WCAG AA
  min-width: size('touch-target-min'); // ✅ 44px
  padding: spacing('sm'); // ✅ Respiration séparée
}

.modal {
  width: 90vw;
  max-width: size('modal-width'); // ✅ 540px
  padding: spacing('lg'); // ✅ Respiration séparée
}

.sidebar {
  width: size('sidebar-width'); // ✅ 280px
  height: 100vh;
  padding: spacing('md'); // ✅ Respiration séparée
}
```

**Pourquoi séparer `spacing()` et `size()` ?**

- **Responsabilités différentes** : Respiration ≠ Dimension
- **Noms sémantiques** : `size('touch-target-min')` > `spacing('44')`
- **Évolutivité** : Facile de changer tailles sans affecter espacements
- **Export facile** : JSON pour mobile native ou Storybook

---

### 5. Motion (\_motion.scss)

Animations et transitions TSA-compliant.

#### Fonctions

```scss
// Durées
timing($key)
  // $key: xs (0.15s), sm (0.2s), base (0.3s), lg (0.5s), xl (0.8s), 2xl (1.2s)

// Easing functions
easing($key)
  // $key: linear, smooth, ease-in, ease-out, ease-in-out, smooth-pop, bounce-easy

// Tokens combinés
motion-token($key)
  // $key: quick-feedback, state-change, standard, reveal, pop, elaborate
```

#### Exemples

```scss
.button {
  @include safe-transition(background, timing('sm'), easing('smooth'));
}

.modal {
  animation: fadeIn timing('base') easing('ease-out'); // 0.3s ease-out
}

// Respecte prefers-reduced-motion automatiquement
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 6. Border Radius (\_radius.scss)

Border-radius cohérents.

#### Fonction

```scss
radius($key)
  // Scale: xs (2px), sm (4px), md (8px), lg (16px), xl (20px), 2xl (24px), full (50%)
  // Aliases: card, button, input, avatar, badge, modal, tooltip
```

#### Exemples

```scss
.button {
  border-radius: radius('md'); // 8px
}

.avatar {
  border-radius: radius('full'); // 50% (circle)
}

.card {
  border-radius: radius('lg'); // 16px
}
```

---

### 7. Breakpoints (\_breakpoints.scss)

Système responsive mobile-first.

#### Map Breakpoints

```scss
$breakpoints: (
  'sm': 576px,
  // Mobile landscape / Petites tablettes
  'md': 768px,
  // Tablettes portrait
  'lg': 1024px,
  // Desktop / Tablettes landscape
  'xl': 1200px,
  // Large desktop
  'xxl': 1536px, // Extra large desktop
);
```

#### Mixin `respond-to()`

**RÈGLE CRITIQUE** : TOUJOURS `min-width` (mobile-first), JAMAIS `max-width`.

```scss
@mixin respond-to($breakpoint); // $breakpoint: sm, md, lg, xl, xxl
// Génère @media (min-width: ...)
```

#### Exemples

```scss
.component {
  // Mobile par défaut (320px-575px)
  font-size: font-size('sm');
  padding: spacing('sm');

  // Tablette+ (768px+)
  @include respond-to(md) {
    font-size: font-size('base');
    padding: spacing('lg');
  }

  // Desktop+ (1024px+)
  @include respond-to(lg) {
    font-size: font-size('lg');
    padding: spacing('xl');
  }
}
```

---

## Fonctions d'Accès

### Fonctions Globales (\_tokens.scss)

```scss
// Opacité
opacity($key) → 0-1

// Z-index
z-index($key) → number

// Espacement
spacing($key) → rem/px

// Hauteur de ligne
line-height($key) → unitless

// Transition
transition($key) → duration/easing
```

### Validation Stricte

Toutes les fonctions incluent une **validation stricte** avec `@error` si clé invalide.

```scss
@function color($key, $type: 'primary') {
  @if not map.has-key($map, $key) {
    @error "Color '#{$key}' not found. Available: #{map.keys($map)}";
  }
  @return map.get($map, $key);
}
```

---

## Mixins Réutilisables

### Accessibilité

```scss
// Focus ring WCAG 2.2 AA
@mixin focus-ring($color: color('base'), $width: 2px, $offset: 2px)
  // Touch target minimum
  @mixin touch-target($size: 'preferred')
  // $size: 'preferred' (56px TSA), 'min' (44px WCAG), 'optimal' (48px)
  // Focus non-invasif (box-shadow)
  @mixin non-invasive-focus($color: color('base'))
  // Cacher visuellement (screen readers only)
  @mixin visually-hidden;
```

### Animations Sécurisées

```scss
// Transition respectant prefers-reduced-motion
@mixin safe-transition(
    $property: all,
    $duration: timing('sm'),
    $easing: easing('smooth')
  )
  // Animation respectant prefers-reduced-motion
  @mixin
  safe-animation(
    $name,
    $duration: timing('base'),
    $timing: easing('ease-in-out')
  );
```

### Layout & Interaction

```scss
// Centre en flex
@mixin flex-center // Applique styles hover/focus/active
  @mixin on-event($self: false) // Style carte/conteneur
  @mixin card-style // Clearfix
  @mixin clearfix;
```

### Drag & Drop Patterns

```scss
// Zone droppable (DndSlot)
@mixin dnd-slot(
    $border-color,
    $bg-color,
    $min-height: spacing('grid-min-height')
  )
  // Grille DnD responsive
  @mixin dnd-grid($min-width: 260px, $gap: spacing('md'));
```

### Patterns Admin

```scss
// Badge rôle utilisateur
@mixin role-badge($role) // $role: admin, abonne, visitor, free, staff
  // Card admin avec header coloré
  @mixin admin-card($header-color: color('base')) // Table admin responsive
  @mixin admin-table // Bouton action admin
  @mixin admin-action-button(
    $color: color('base'),
    $variant: 'solid'
  ); // $variant: solid, outline, ghost
```

---

## Exemples d'Utilisation

### Exemple 1 : Composant Button

```scss
@use '@styles/abstracts' as *;
@use 'sass:color';

.btn {
  // Layout
  display: inline-flex;
  align-items: center;
  justify-content: center;

  // Spacing
  padding: spacing('sm') spacing('lg'); // 0.5rem 1.5rem
  min-height: size('touch-target-min'); // ✅ 44px WCAG AA touch target

  // Typography
  font-family: $lexend-font-stack; // TSA-friendly
  font-size: font-size('base'); // 1rem
  font-weight: font-weight('semibold'); // 600
  line-height: 1.2;

  // Visual
  background: color('base'); // Couleur principale
  color: text('invert'); // Blanc
  border: none;
  border-radius: radius('md'); // 8px
  box-shadow: shadow('sm');

  // Interaction
  cursor: pointer;
  @include safe-transition(background color, timing('sm'), easing('smooth'));
  @include focus-ring;

  &:hover {
    background: color.adjust(color('base'), $lightness: -6%);
  }

  &:disabled {
    opacity: opacity('half'); // 0.5
    pointer-events: none;
  }
}
```

---

### Exemple 2 : Composant Modal

```scss
@use '@styles/abstracts' as *;
@use 'sass:color';

.modal-overlay {
  position: fixed;
  inset: 0;
  background: color.change(gray(900), $alpha: opacity('half'));
  backdrop-filter: blur(spacing('4'));
  z-index: z-index('modal-backdrop'); // 900
  animation: fadeIn timing('base') easing('ease-out');

  // Mobile par défaut
  padding: spacing('sm');

  // Tablette+
  @include respond-to(sm) {
    padding: spacing('md');
  }
}

.modal {
  background: surface('surface');
  border: spacing('2') solid color('base');
  border-radius: radius('lg'); // 16px
  box-shadow: 0 spacing('10') spacing('40')
    #{color.change(gray(900), $alpha: opacity('xl'))};
  z-index: z-index('modal'); // 1000

  // Mobile par défaut
  width: 95vw;
  max-width: calc(100vw - 32px);

  // Tablette+
  @include respond-to(sm) {
    width: 90vw;
    max-width: size('modal-width'); // ✅ 540px
  }
}
```

---

### Exemple 3 : Carte Draggable (DnD)

```scss
@use '@styles/abstracts' as *;

.dnd-grid {
  @include dnd-grid(260px, spacing('md')); // Grille responsive
}

.dnd-slot {
  @include dnd-slot(
    $border-color: color('base'),
    $bg-color: color.change(color('base'), $alpha: opacity('xs')),
    $min-height: spacing('grid-min-height') // 140px
  );
}

.card-draggable {
  background: surface('surface');
  border-radius: radius('md');
  padding: spacing('md');
  box-shadow: shadow('sm');

  @include safe-transition(
    transform box-shadow,
    timing('sm'),
    easing('smooth')
  );
  @include touch-target('optimal'); // 48px

  &:hover {
    transform: translateY(-2px);
    box-shadow: shadow('md');
  }

  &--dragging {
    opacity: opacity('half');
    box-shadow: shadow('lg');
  }
}
```

---

### Exemple 4 : Badge Rôle Admin

```scss
@use '@styles/abstracts' as *;

.role-badge {
  @include role-badge(admin); // Mixin génère tout
}

// Ou version manuelle :
.role-badge--admin {
  background: linear-gradient(
    135deg,
    role-color('admin', 'gradient-end'),
    // #764ba2
    role-color('admin', 'gradient-start') // #667eea
  );
  color: text('invert');
  border-color: role-color('admin', 'base');
  box-shadow: 0 3px 10px #{role-color('admin', 'gradient-end')};

  padding: spacing('xs') spacing('md');
  border-radius: radius('full'); // Pill shape
  font-weight: font-weight('semibold');

  @include safe-transition(
    transform box-shadow,
    timing('sm'),
    easing('smooth')
  );

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px #{role-color('admin', 'gradient-end')};
  }
}
```

---

## Migration et État Actuel

### État du Refactoring (Décembre 2025)

#### Phases Complétées ✅

- **Phase 1** : Consolidation tokens SCSS (variables, mixins, functions)
- **Phase 2** : Migration Button vers tokens (refactor complet)
- **Phase 3** : Migration composants vers fonctions tokens
  - Phase 3.2 : Fichiers simples migrés ✅
  - Phase 3.3 : Composants moyens migrés ✅
  - Phase 3.4 : Composants complexes migrés ✅
- **Phase 4** : Migration page-components vers tokens ✅

#### Phase en Cours 🔄

- **Phase 5** : Finalisation et nettoyage
  - Suppression fichiers deprecated (`_variables.scss`, `_theme-vars.scss`)
  - Validation tokens-first complet
  - Documentation finale

### Fichiers Deprecated (À Supprimer Phase 5)

```scss
// ⚠️ DEPRECATED - Conserver temporairement pour compatibilité
src/styles/abstracts/_variables.scss
src/styles/themes/_theme-vars.scss
```

Ces fichiers contiennent des maps locales dupliquées. Après validation que tous les composants utilisent les fonctions tokens, ils seront supprimés.

### Scripts de Vérification

```bash
# Détection valeurs hardcodées
pnpm lint:hardcoded

# Validation touch targets (accessibilité)
pnpm validate:touch-targets

# Build SCSS (vérifier erreurs)
pnpm build:css

# Vérification complète
pnpm verify:css
```

### Plan de Migration (Phase 5)

1. **Vérifier imports** : Aucun import direct de `_variables.scss` dans composants
2. **Valider build** : `pnpm build:css` passe sans warnings SCSS
3. **Supprimer deprecated** : Retirer `_variables.scss` et `_theme-vars.scss`
4. **Tests E2E** : `pnpm test:e2e` pour vérifier visuels
5. **Commit** : "refactor(styles): suppression fichiers deprecated Phase 5"

---

## Ressources Complémentaires

### Documentation Projet

- **REFACTOR-PHILOSOPHY.md** - Philosophie & règles design system
- **REFACTOR-CONTRACT.md** - Plan d'exécution migration
- **CLAUDE.md** - Guide complet développeur

### Fichiers Clés

- **Source de vérité** : `src/styles/abstracts/_tokens.scss`
- **Point d'entrée** : `src/styles/main.scss`
- **Wrappers** : `src/styles/abstracts/_colors.scss`, `_typography.scss`, etc.
- **Mixins** : `src/styles/abstracts/_mixins.scss`

### Standards Externes

- **WCAG 2.2 AA** : [W3C Accessibility Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- **TSA Design** : Interface apaisante, prévisible, sans surcharge
- **Mobile-First** : Approche responsive progressive enhancement

---

**Dernière mise à jour** : 18 décembre 2025
**Version** : 2.1 (ajout size() + text/surface dans tokens)
**Auteur** : Équipe Appli-Picto

**Changements v2.1** :

- ✅ Ajout fonction `size()` pour dimensions structurelles
- ✅ Séparation claire `spacing()` (respiration) vs `size()` (dimensions)
- ✅ Déplacement `$text-color-tokens` et `$surface-color-tokens` dans `_tokens.scss`
- ✅ Correction exemples pour utiliser `size()` au lieu de `spacing()` pour dimensions
