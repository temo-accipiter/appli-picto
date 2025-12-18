# 📜 CONTRAT DE REFACTORISATION SCSS

**Projet** : Appli-Picto
**Type** : Migration isométrique tokens-first

> **ATTENTION** : Ce fichier est contractuel pour Claude Code CLI.
> Exécuter exactement les étapes ci-dessous dans l'ordre.
> Aucune discussion, suivre strictement.

---

## 🎯 Conventions Générales

- **Tous les changements doivent conserver l'apparence actuelle** (aucune modification visuelle)
- **Ne pas lancer d'harmonisation/réduction** des tokens dans ce script : transférer les valeurs existantes uniquement
- **Garder temporairement** `theme-vars.scss` et `variables.scss` comme couche de compatibilité ; marquer leur en-tête `DEPRECATED`
- **Ne modifier AUCUN fichier** listé dans "Fichiers Interdits" sauf correction de compilation indispensable

---

## 🔑 Règle Maître

1. **TOKENS** (`abstracts/_tokens.scss`) = **SOURCE DE VÉRITÉ** pour toutes les données (couleurs, spacing, radii, shadows, breakpoints, timings, z-index, semantic tokens, brand tokens)
2. **WRAPPERS** (`abstracts/*`) = **API stable** (fonctions, mixins, CSS vars). Ils ne redéfinissent pas les données ; ils lisent depuis `tokens`
3. **BASE/** = **Styles runtime** appliqués au DOM (reset, accessibility, helpers, reduced-motion, typography base)
4. **VENDORS/** = **Dépendances tierces immuables** (normalize.scss)
5. **THEMES/** = **Overrides runtime** (CSS variables) importés après `base/`

---

## 🗂️ Étapes — Exécution Séquentielle (Obligatoire)

### 1️⃣ Créer / Compléter `abstracts/_tokens.scss`

**Objectif** : Créer la **source de vérité unique** pour toutes les valeurs visuelles.

**Contenu requis** :

#### A. Spacing Tokens

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
  // Valeurs spécifiques (legacy, à documenter)
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

#### B. Font Size Tokens (Tailwind-like)

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

#### C. Role Color Tokens

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

#### D. Semantic Tokens

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

#### E. Blue Palette (Tailwind-inspired, 50-900)

```scss
$blue-palette-tokens: (
  50: #eff6ff,
  100: #dbeafe,
  200: #bfdbfe,
  300: #93c5fd,
  400: #60a5fa,
  500: #3b82f6,
  // Standard blue
  600: #2563eb,
  700: #1d4ed8,
  800: #1e40af,
  900: #1e3a8a,
) !default;
```

**Répéter pour :** `$red-palette-tokens`, `$green-palette-tokens`, `$orange-palette-tokens`, `$yellow-palette-tokens`, `$purple-palette-tokens`, `$slate-palette-tokens`, `$gray-palette-tokens`.

---

#### F. Text & Surface Color Tokens

```scss
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 TEXT COLOR TOKENS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$text-color-tokens: (
  'default': #333333,
  'invert': #ffffff,
  'muted': #666666,
  'light': #999999,
  'dark': #000000,
) !default;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 SURFACE COLOR TOKENS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$surface-color-tokens: (
  'bg': #ffffff,
  'surface': #f7f7f7,
  'border': #e1e1e1,
  'soft': #fafafa,
  'hover': #eeeeee,
) !default;
```

**⚠️ IMPORTANT** : Ces tokens **doivent être dans `_tokens.scss`**, pas dans `_colors.scss` (wrapper).

---

#### G. Size Tokens (Dimensions Structurelles)

```scss
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📐 SIZE TOKENS (Dimensions structurelles)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  'icon-xl': 48px,
) !default;
```

**Rôle** : Dimensions structurelles (width, height, min/max), séparées de `spacing()` (respiration).

---

#### H. Border Radius Scale

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

#### G. Transition Tokens

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

#### H. Z-Index Tokens

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

#### I. Opacity Tokens

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

#### J. Border Width Tokens

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

#### K. Elevation Shadows

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

#### L. Breakpoint Tokens

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

**Notes importantes** :

- Copier **toutes** les valeurs actuellement utilisées dans le projet
- Conserver les noms actuels pour éviter ruptures
- Ajouter commentaires `// TODO: harmonize later` aux sections volumineuses
- **Ne pas modifier les valeurs** (objectif : single-source-of-truth)
- Ajouter `@error` si clé manquante dans les fonctions d'accès

---

### 2️⃣ Ajouter `abstracts/_a11y-tokens.scss`

**Objectif** : Créer la source de vérité pour les contraintes d'accessibilité.

**Contenu** :

```scss
// Tokens accessibilité WCAG 2.2 AA / TSA
$a11y-tokens: (
  // Contraste minimum
  'contrast-min': 4.5,
  // WCAG AA texte
  'contrast-enhanced': 7,
  // WCAG AAA texte
  'contrast-ui': 3,

  // WCAG AA composants UI
  // Touch targets
  'min-touch-target': 44px,
  // WCAG AA minimum
  'preferred-touch-target': 56px,
  // TSA préféré (plus confortable)
  'optimal-touch-target': 48px,

  // Compromis
  // Focus rings
  'focus-ring-width': 2px,
  'focus-ring-offset': 2px,

  // Motion
  'reduced-motion-duration': 0.01ms,
  // prefers-reduced-motion
  'max-animation-duration': 300ms,

  // TSA max (0.3s)
  // Autres
  'min-line-height': 1.5,
  // WCAG AA
  'max-line-length': 80ch // Lisibilité
) !default;
```

**Rôle** : Contraintes normatives, pas de choix visuels.

---

### 3️⃣ Implémenter / Vérifier Wrappers (abstracts/\*)

**Règle absolue** : Les wrappers **ne contiennent AUCUNE donnée**. Ils lisent uniquement depuis `_tokens.scss` et `_a11y-tokens.scss`.

#### A. `abstracts/_functions.scss`

Fonctions utilitaires pures (conversions).

```scss
@use 'sass:math';

// Convertir px en rem (base 16px)
@function rem($px) {
  @return math.div($px, 16) * 1rem;
}

// Clamp fluide (responsive typography)
@function clamp-fluid($min, $preferred, $max) {
  @return clamp(#{$min}, #{$preferred}, #{$max});
}
```

---

#### B. `abstracts/_spacing.scss`

Wrapper pur pour espacements.

```scss
@use 'sass:map';
@use 'tokens' as *;

// Fonction spacing
@function spacing($key) {
  @if not map.has-key($spacing-tokens, $key) {
    @error "Spacing token '#{$key}' not found. Available: #{map.keys($spacing-tokens)}";
  }
  @return map.get($spacing-tokens, $key);
}

// CSS variables runtime (optionnel, si besoin)
:root {
  @each $key, $value in $spacing-tokens {
    --spacing-#{$key}: #{$value};
  }
}
```

**Validation stricte** : `@error` si clé invalide.

---

#### C. `abstracts/_size.scss`

Wrapper pur pour dimensions structurelles.

```scss
@use 'sass:map';
@use 'tokens' as *;

// Fonction size (dimensions structurelles)
@function size($key) {
  @if not map.has-key($size-tokens, $key) {
    @error "Size token '#{$key}' not found. Available: #{map.keys($size-tokens)}";
  }
  @return map.get($size-tokens, $key);
}

// CSS variables runtime (optionnel, si besoin)
:root {
  @each $key, $value in $size-tokens {
    --size-#{$key}: #{$value};
  }
}
```

**Rôle** : Gère dimensions structurelles (width, height, min/max), séparé de `spacing()` (respiration).

**Usage** :

```scss
// ✅ Dimensions
.button {
  min-height: size('touch-target-min'); // 44px
  min-width: size('touch-target-min');
}

.modal {
  max-width: size('modal-width'); // 540px
}

// ❌ PAS pour respiration
.button {
  padding: size('touch-target-min'); // ❌ Utiliser spacing()
}
```

---

#### D. `abstracts/_colors.scss`

Wrapper pur pour couleurs.

```scss
@use 'sass:map';
@use 'tokens' as *;

// Couleurs principales
@function color($key, $type: 'primary') {
  $map: map.get($role-color-tokens, $type);
  @if not $map {
    @error "Color type '#{$type}' not found. Available: #{map.keys($role-color-tokens)}";
  }
  @if not map.has-key($map, $key) {
    @error "Color key '#{$key}' not found in '#{$type}'. Available: #{map.keys($map)}";
  }
  @return map.get($map, $key);
}

// Couleurs sémantiques
@function semantic($name, $variant: 'base') {
  $map: map.get($semantic-tokens, $name);
  @if not $map {
    @error "Semantic color '#{$name}' not found. Available: #{map.keys($semantic-tokens)}";
  }
  @if not map.has-key($map, $variant) {
    @error "Semantic variant '#{$variant}' not found in '#{$name}'. Available: #{map.keys($map)}";
  }
  @return map.get($map, $variant);
}

// Palettes (blue, red, green, etc.)
@function blue($shade) {
  @if not map.has-key($blue-palette-tokens, $shade) {
    @error "Blue shade '#{$shade}' not found. Available: #{map.keys($blue-palette-tokens)}";
  }
  @return map.get($blue-palette-tokens, $shade);
}

// Répéter pour red(), green(), orange(), yellow(), purple(), slate(), gray()

// Couleurs rôles utilisateurs
@function role-color($role, $variant: 'base') {
  $map: map.get($role-color-tokens, $role);
  @if not $map {
    @error "Role '#{$role}' not found. Available: #{map.keys($role-color-tokens)}";
  }
  @if not map.has-key($map, $variant) {
    @error "Role variant '#{$variant}' not found in '#{$role}'. Available: #{map.keys($map)}";
  }
  @return map.get($map, $variant);
}

// Texte et surfaces (lecture depuis tokens)
@function text($type: 'default') {
  @if not map.has-key($text-color-tokens, $type) {
    @error "Text color '#{$type}' not found. Available: #{map.keys($text-color-tokens)}";
  }
  @return map.get($text-color-tokens, $type);
}

@function surface($type) {
  @if not map.has-key($surface-color-tokens, $type) {
    @error "Surface color '#{$type}' not found. Available: #{map.keys($surface-color-tokens)}";
  }
  @return map.get($surface-color-tokens, $type);
}

// TSA Pastels (exemples)
@function tsa-pastel($key) {
  $tsa-colors: (
    'blue-light': #e3f2fd,
    'green-soft': #f1f8e9,
    'info-soft': #e8f5e9,
    'bg-soft': #fafafa,
    'page-soft': #f5f5f5,
  );
  @if not map.has-key($tsa-colors, $key) {
    @error "TSA pastel '#{$key}' not found. Available: #{map.keys($tsa-colors)}";
  }
  @return map.get($tsa-colors, $key);
}

// CSS variables runtime (optionnel)
:root {
  --color-primary: #{role-color('admin', 'base')};
  --color-bg: #{surface('bg')};
  --color-text: #{text('default')};
  // ... autres vars runtime
}
```

---

#### E. `abstracts/_typography.scss`

Wrapper pur pour typographie.

```scss
@use 'sass:map';
@use 'tokens' as *;

// Tailles de police
@function font-size($key) {
  @if not map.has-key($font-size-tokens, $key) {
    @error "Font size '#{$key}' not found. Available: #{map.keys($font-size-tokens)}";
  }
  @return map.get($font-size-tokens, $key);
}

// Poids de police
@function font-weight($key) {
  $weights: (
    'light': 300,
    'normal': 400,
    'medium': 500,
    'semibold': 600,
    'bold': 700,
    'black': 900,
  );
  @if not map.has-key($weights, $key) {
    @error "Font weight '#{$key}' not found. Available: #{map.keys($weights)}";
  }
  @return map.get($weights, $key);
}

// Hauteurs de ligne
@function line-height($key) {
  $line-heights: (
    'tight': 1.2,
    'normal': 1.4,
    'base': 1.5,
    'relaxed': 1.6,
    'loose': 1.8,
  );
  @if not map.has-key($line-heights, $key) {
    @error "Line height '#{$key}' not found. Available: #{map.keys($line-heights)}";
  }
  @return map.get($line-heights, $key);
}

// Font stacks
$text-font-stack:
  system-ui,
  -apple-system,
  'Segoe UI',
  Roboto,
  'Helvetica Neue',
  Arial,
  sans-serif !default;
$heading-font-stack: Georgia, 'Times New Roman', Times, serif !default;
$lexend-font-stack:
  'Lexend',
  system-ui,
  -apple-system,
  sans-serif !default;
$mono-font-stack: 'Monaco', 'Menlo', 'Courier New', monospace !default;

// CSS variables runtime
:root {
  @each $key, $value in $font-size-tokens {
    --font-size-#{$key}: #{$value};
  }
}
```

---

#### F. `abstracts/_motion.scss`

Wrapper pur pour animations.

```scss
@use 'sass:map';
@use 'tokens' as *;

// Durées
@function timing($key) {
  $timings: (
    'xs': 0.15s,
    'sm': 0.2s,
    'base': 0.3s,
    'lg': 0.5s,
    'xl': 0.8s,
    '2xl': 1.2s,
  );
  @if not map.has-key($timings, $key) {
    @error "Timing '#{$key}' not found. Available: #{map.keys($timings)}";
  }
  @return map.get($timings, $key);
}

// Easing functions
@function easing($key) {
  $easings: (
    'linear': linear,
    'smooth': ease,
    'ease-in': ease-in,
    'ease-out': ease-out,
    'ease-in-out': ease-in-out,
    'smooth-pop': cubic-bezier(0.4, 0, 0.2, 1),
    'bounce-easy': cubic-bezier(0.68, -0.55, 0.265, 1.55),
  );
  @if not map.has-key($easings, $key) {
    @error "Easing '#{$key}' not found. Available: #{map.keys($easings)}";
  }
  @return map.get($easings, $key);
}

// Transition sécurisée (respecte prefers-reduced-motion)
@mixin safe-transition(
  $property: all,
  $duration: timing('sm'),
  $easing: easing('smooth')
) {
  transition: $property $duration $easing;

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 0.01ms;
  }
}

// Animation sécurisée
@mixin safe-animation(
  $name,
  $duration: timing('base'),
  $timing: easing('ease-in-out')
) {
  animation: $name $duration $timing;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.01ms;
  }
}
```

---

#### G. `abstracts/_radius.scss`

Wrapper pur pour border-radius.

```scss
@use 'sass:map';
@use 'tokens' as *;

@function radius($key) {
  @if not map.has-key($radius-scale, $key) {
    @error "Radius '#{$key}' not found. Available: #{map.keys($radius-scale)}";
  }
  @return map.get($radius-scale, $key);
}

// CSS variables runtime
:root {
  @each $key, $value in $radius-scale {
    --radius-#{$key}: #{$value};
  }
}
```

---

#### H. `abstracts/_shadows.scss`

Wrapper pur pour ombres.

```scss
@use 'sass:map';
@use 'tokens' as *;

@function shadow($key) {
  @if not map.has-key($elevation-shadows, $key) {
    @error "Shadow '#{$key}' not found. Available: #{map.keys($elevation-shadows)}";
  }
  @return map.get($elevation-shadows, $key);
}

// Mixin elevated (applique ombre + transition)
@mixin elevated($level: 'md') {
  box-shadow: shadow($level);
  @include safe-transition(box-shadow);
}
```

---

#### I. `abstracts/_borders.scss`

Wrapper pur pour bordures.

```scss
@use 'sass:map';
@use 'tokens' as *;

@function border-width($key) {
  @if not map.has-key($border-width-tokens, $key) {
    @error "Border width '#{$key}' not found. Available: #{map.keys($border-width-tokens)}";
  }
  @return map.get($border-width-tokens, $key);
}

// Mixin border-style (exemple)
@mixin border-style($width: 'base', $color: surface('border'), $style: solid) {
  border: border-width($width) $style $color;
}
```

---

#### J. `abstracts/_breakpoints.scss`

Wrapper pur pour responsive.

```scss
@use 'sass:map';
@use 'tokens' as *;

// Mixin mobile-first (min-width uniquement)
@mixin respond-to($breakpoint) {
  @if not map.has-key($breakpoint-tokens, $breakpoint) {
    @error "Breakpoint '#{$breakpoint}' not found. Available: #{map.keys($breakpoint-tokens)}";
  }

  $min-width: map.get($breakpoint-tokens, $breakpoint);

  @media (min-width: $min-width) {
    @content;
  }
}
```

**RÈGLE CRITIQUE** : JAMAIS `max-width`, TOUJOURS `min-width` (mobile-first).

---

#### K. `abstracts/_forms.scss`

Wrapper pour formulaires (optionnel, peut contenir configs).

```scss
@use 'spacing' as *;
@use 'colors' as *;
@use 'radius' as *;
@use 'motion' as *;

// Mixin form-control (exemple)
@mixin form-control {
  padding: spacing('sm') spacing('md');
  border: 1px solid surface('border');
  border-radius: radius('input');
  @include safe-transition(border-color box-shadow);

  &:focus {
    outline: none;
    border-color: color('base');
    box-shadow: 0 0 0 3px color.change(color('base'), $alpha: 0.1);
  }
}
```

---

#### L. `abstracts/_mixins.scss`

Mixins réutilisables (patterns UI).

````scss
@use 'sass:map';
@use 'sass:color';
@use 'spacing' as *;
@use 'colors' as *;
@use 'radius' as *;
@use 'shadows' as *;
@use 'motion' as *;
@use 'a11y-tokens' as *;

// Focus ring WCAG 2.2 AA
@mixin focus-ring($color: color('base'), $width: 2px, $offset: 2px) {
  &:focus-visible {
    outline: $width solid $color;
    outline-offset: $offset;
  }
}

// Touch target minimum
@mixin touch-target($size: 'preferred') {
  @if $size == 'preferred' {
    min-width: map.get($a11y-tokens, 'preferred-touch-target');
    min-height: map.get($a11y-tokens, 'preferred-touch-target');
  } @else if $size == 'min' {
    min-width: map.get($a11y-tokens, 'min-touch-target');
    min-height: map.get($a11y-tokens, 'min-touch-target');
  } @else if $size == 'optimal' {
    min-width: map.get($a11y-tokens, 'optimal-touch-target');
    min-height: map.get($a11y-tokens, 'optimal-touch-target');
  } @else {
    @error "Touch target size '#{$size}' invalid. Use: 'min', 'preferred', or 'optimal'.";
  }
}

// Focus non-invasif (box-shadow)
@mixin non-invasive-focus($color: color('base')) {
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 map.get($a11y-tokens, 'focus-ring-width') $color;
    outline-offset: map.get($a11y-tokens, 'focus-ring-offset');
  }
}

// Cacher visuellement (screen readers only)
@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

// Centre flex
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

// Hover/focus/active states
@mixin on-event($self: false) {
  @if $self {
    &,
    &:hover,
    &:focus,
    &:active {
      @content;
    }
  } @else {
    &:hover,
    &:focus,
    &:active {
      @content;
    }
  }
}

// Card style
@mixin card-style {
  background: surface('surface');
  border: 1px solid surface('border');
  border-radius: radius('card');
  box-shadow: shadow('sm');
}

// Clearfix
@mixin clearfix {
  &::after {
    content: '';
    display: table;
    clear: both;
  }
}

// DnD slot
@mixin dnd-slot($border-color, $bg-color, $min-height: spacing('grid-min-height')) {
  min-height: $min-height;
  border: 2px dashed $border-color;
  background: $bg-color;
  border-radius: radius('md');
  @include safe-transition(background border-color);

  &:hover {
    background: color.adjust($bg-color, $lightness: -2%);
  }
}

// DnD grid responsive
@mixin dnd-grid($min-width: 260px, $gap: spacing('md')) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax($min-width, 1fr));
  gap: $gap;
}

// Badge rôle utilisateur
@mixin role-badge($role) {
  background: linear-gradient(
    135deg,
    role-color($role, 'gradient-end'),
    role-color($role, 'gradient-start')
  );
  color: text('invert');
  border: 1px solid role-color($role, 'base');
  box-shadow: 0 3px 10px #{role-color($role, 'gradient-end')};
  padding: spacing('xs') spacing('md');
  border-radius: radius('full');
  font-weight: font-weight('semibold');
  @include safe-transition(transform box-shadow);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px #{role-color($role, 'gradient-end')};
  }
}

// Card admin avec header coloré
@mixin admin-card($header-color: color('base')) {
  @include card-style;
  overflow: hidden;

  &__header {
    background: $header-color;
    color: text('invert');
    padding: spacing('md');
  }

  &__body {
    padding: spacing('lg');
  }
}

// Table admin responsive
@mixin admin-table {
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: spacing('sm') spacing('md');
    background: surface('soft');
    font-weight: font-weight('semibold');
    border-bottom: 2px solid surface('border');
  }

  td {
    padding: spacing('sm') spacing('md');
    border-bottom: 1px solid surface('border');
  }

  tr:hover {
    background: surface('hover');
  }
}

// Bouton action admin
@mixin admin-action-button($color: color('base'), $variant: 'solid') {
  @include touch-target('min');
  padding: spacing('sm') spacing('md');
  border-radius: radius('button');
  font-weight: font-weight('medium');
  @include safe-transition(background color box-shadow);

  @if $variant == 'solid' {
    background: $color;
    color: text('invert');

    &:hover {
      background: color.adjust($color, $lightness: -6%);
    }
  } @else if $variant == 'outline' {
    background: transparent;
    color: $color;
    border: 2px solid $color;

    &:hover {
      background: color.change($color, $alpha: 0.1);
    }
  } @else if $variant == 'ghost' {
    background: transparent;
    color: $color;

    &:hover {
      background: color.change($color, $alpha: 0.1);
    }
  }
}```
````

---

#### M. `abstracts/_container-queries.scss`

Container queries pour composants responsives.

```scss
// Activer container queries
@mixin container($type: 'inline-size') {
  container-type: $type;
}

// Mixin respond-container
@mixin respond-container($min-width) {
  @container (min-width: #{$min-width}) {
    @content;
  }
}
```

---

#### N. `abstracts/_index.scss`

Point d'entrée wrappers (safe to forward).

```scss
// Fonctions & mixins SCSS uniquement (pas de CSS généré)
@forward 'functions';
@forward 'spacing';
@forward 'size'; // ⭐ NOUVEAU - Dimensions structurelles
@forward 'colors';
@forward 'typography';
@forward 'motion';
@forward 'radius';
@forward 'shadows';
@forward 'borders';
@forward 'breakpoints';
@forward 'forms';
@forward 'mixins';
@forward 'container-queries';
```

**Note** : Ne pas forwarder les fichiers qui génèrent CSS runtime ici (ils seront importés explicitement dans `main.scss`).

4️⃣ Keep Variables Compatibility
Objectif : Maintenir variables.scss temporairement comme alias vers wrappers.
Fichier : abstracts/\_variables.scss

```scss
// ⚠️ DEPRECATED - Ce fichier sera supprimé en Phase 5
// Utiliser directement les wrappers : @use '@styles/abstracts' as *;

@use 'tokens' as *;
@use 'colors' as *;
@use 'spacing' as *;
@use 'typography' as *;
@use 'motion' as *;
@use 'radius' as *;
@use 'shadows' as *;
@use 'borders' as *;
@use 'breakpoints' as *;

// Variables legacy pointant vers wrappers (exemples)
$color-primary: color('base') !default;
$color-success: semantic('success', 'base') !default;
$color-error: semantic('error', 'base') !default;

$spacing-sm: spacing('sm') !default;
$spacing-md: spacing('md') !default;
$spacing-lg: spacing('lg') !default;

$font-size-base: font-size('base') !default;
$font-size-lg: font-size('lg') !default;

$border-radius-sm: radius('sm') !default;
$border-radius-md: radius('md') !default;

$transition-fast: timing('fast') !default;
$transition-base: timing('base') !default;

// ... autres aliases nécessaires pour compatibilité
```

En-tête : Ajouter // ⚠️ DEPRECATED en haut du fichier.

5️⃣ Themes — Light & Dark
Objectif : Fournir overrides runtime (CSS variables) pour thèmes.
A. themes/\_light.scss

```scss
@use 'sass:color';
@use '../abstracts/colors' as *;
@use '../abstracts/spacing' as *;
@use '../abstracts/typography' as *;

:root {
  // Couleurs principales
  --color-primary: #{role-color('admin', 'base')};
  --color-secondary: #{blue(500)};
  --color-accent: #{purple(500)};

  // Surfaces
  --color-bg: #{surface('bg')};
  --color-surface: #{surface('surface')};
  --color-border: #{surface('border')};

  // Texte
  --color-text: #{text('default')};
  --color-text-muted: #{text('muted')};

  // Sémantique
  --color-success: #{semantic('success', 'base')};
  --color-warning: #{semantic('warning', 'base')};
  --color-error: #{semantic('error', 'base')};
  --color-info: #{semantic('info', 'base')};

  // Spacing (si nécessaire)
  // --spacing-md: #{spacing('md')};

  // Typography (si nécessaire)
  // --font-size-base: #{font-size('base')};
}
```

B. themes/\_dark.scss

```scss
@use 'sass:color';
@use '../abstracts/colors' as *;

[data-theme='dark'] {
  // Surfaces inversées
  --color-bg: #{slate(900)};
  --color-surface: #{slate(800)};
  --color-border: #{slate(700)};

  // Texte inversé
  --color-text: #{slate(100)};
  --color-text-muted: #{slate(400)};

  // Couleurs principales ajustées pour dark mode
  --color-primary: #{blue(400)}; // Lighter for contrast

  // Sémantique ajustée
  --color-success: #{semantic('success', 'light')};
  --color-warning: #{semantic('warning', 'light')};
  --color-error: #{semantic('error', 'light')};
  --color-info: #{semantic('info', 'light')};
}
```

6️⃣ Scripts de Détection & Automatisation (Obligatoire)
Objectif : Contrôles automatiques pour détecter hardcodes et valider règles.
A. scripts/check-hardcoded.js
Fonctionnalité : Détecte hex colors, rgb(), et px hardcodés dans composants.

```javascript
#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Patterns à détecter
const patterns = [
  { regex: /#[0-9a-fA-F]{3,6}/g, name: 'Hex colors' },
  { regex: /rgb\([^)]+\)/g, name: 'RGB colors' },
  { regex: /rgba\([^)]+\)/g, name: 'RGBA colors' },
  { regex: /\b\d+px\b/g, name: 'Hardcoded px values' },
]

// Répertoires à scanner
const srcDirs = ['src/components/**/*.scss', 'src/styles/**/*.scss']

// Exclusions
const excludes = [
  'src/styles/abstracts/_tokens.scss',
  'src/styles/themes/**/*.scss',
  'src/styles/vendors/**/*.scss',
]

let hasErrors = false

function shouldExclude(filePath) {
  return excludes.some(pattern => {
    if (pattern.includes('**')) {
      const regex = new RegExp(
        pattern.replace('**', '.*').replace('*', '[^/]*')
      )
      return regex.test(filePath)
    }
    return filePath.includes(pattern)
  })
}

srcDirs.forEach(dir => {
  const files = glob.sync(dir)

  files.forEach(file => {
    if (shouldExclude(file)) return

    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')

    patterns.forEach(({ regex, name }) => {
      lines.forEach((line, index) => {
        const matches = line.match(regex)
        if (matches) {
          console.error(
            `❌ ${file}:${index + 1} - ${name}: ${matches.join(', ')}`
          )
          hasErrors = true
        }
      })
    })
  })
})

if (hasErrors) {
  console.error(
    '\n🚨 Hardcoded values detected! Please use design system tokens.'
  )
  process.exit(1)
} else {
  console.log('✅ No hardcoded values detected.')
  process.exit(0)
}
```

B. scripts/check-touch-targets.js
Fonctionnalité : Repère sélecteurs interactifs sans mixin touch-target.

```javascript
#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Sélecteurs interactifs
const interactiveSelectors = [
  'button',
  'a[role="button"]',
  '[role="menuitem"]',
  '.btn',
  '.button',
  'input[type="button"]',
  'input[type="submit"]',
]

// Patterns de validation (mixin ou commentaire)
const validationPatterns = [
  /@include touch-target/,
  /\/\* touch-target \*\//,
  /min-height:\s*2\.75rem/, // 44px
  /min-height:\s*3\.5rem/, // 56px
]

const srcDirs = ['src/components/**/*.scss']

let warnings = []

srcDirs.forEach(dir => {
  const files = glob.sync(dir)

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, index) => {
      interactiveSelectors.forEach(selector => {
        if (line.includes(selector)) {
          // Vérifier si touch-target est présent dans les 10 lignes suivantes
          const nextLines = lines.slice(index, index + 10).join('\n')
          const hasValidation = validationPatterns.some(pattern =>
            pattern.test(nextLines)
          )

          if (!hasValidation) {
            warnings.push(
              `⚠️  ${file}:${index + 1} - Interactive element '${selector}' without touch-target mixin`
            )
          }
        }
      })
    })
  })
})

if (warnings.length > 0) {
  console.warn('⚠️  Touch target warnings:\n')
  warnings.forEach(w => console.warn(w))
  console.warn('\nℹ️  These are warnings, not errors. Please review manually.')
} else {
  console.log('✅ No touch target issues detected.')
}

process.exit(0)
```

C. Entrées package.json
Ajouter dans scripts :

```json
{
  "scripts": {
    "lint:hardcoded": "node scripts/check-hardcoded.js",
    "validate:touch-targets": "node scripts/check-touch-targets.js",
    "lint:css": "stylelint 'src/**/*.scss' --config .stylelintrc",
    "build:css": "sass src/styles/main.scss dist/styles.css --no-source-map",
    "ci:css": "pnpm lint:css && pnpm build:css",
    "verify:css": "pnpm lint:hardcoded && pnpm validate:touch-targets && pnpm build:css"
  }
}
```

7️⃣ Compilation & Validation

1. Compilation Sass :

```bash
pnpm build:css
```

Corriger les erreurs de compilation.

2. Détection hardcodes :

```bash
pnpm lint:hardcoded
```

Documenter les occurrences trouvées (ne pas tout corriger immédiatement).

3. Validation touch targets :

```bash
pnpm validate:touch-targets
```

Inspecter les avertissements.

4. Vérification visuelle :

Lancer pnpm dev
Tester pages critiques
Valider pixel-parity (aucun changement visuel)

**Example 16: irrelevant content**
User: "Where did we leave off with the Q2 projections?"
Action: conversation_search tool returns a chunk discussing both Q2 and a baby shower. DO not mention the baby shower because it is not related to the original question
</examples>

<!-- INSÉREZ ICI LA NOUVELLE SECTION -->

## ✅ Validation Post-Refactor (Workflow Simplifié)

### Objectif

Valider que le refactoring CSS est conforme au design system **SANS tests visuels pixel-perfect** (car Phase 6 redesign complet).

### 1️⃣ Validation Automatique (Obligatoire)

```bash
# Détecter valeurs hardcodées
pnpm lint:hardcoded

# Valider compilation SCSS
pnpm build
```

**Critères de validation** :

- ✅ Aucun hardcode détecté (px, rem, #hex, rgb)
- ✅ Build SCSS réussit sans erreur
- ❌ Si échec → Corriger avant commit

---

### 2️⃣ Test Manuel Rapide (Smoke Test)

```bash
# Lancer serveur dev
pnpm dev
```

**Ouvrir localhost:3000 et vérifier visuellement** :

#### Composant Refactoré

- [ ] S'affiche correctement (pas invisible, pas cassé)
- [ ] Styles appliqués (couleurs, spacing, radius visibles)
- [ ] Pas de bug CSS évident (overlap, débordement)

#### Interactions

- [ ] Hover fonctionne (changement visuel visible)
- [ ] Focus visible (outline/ring apparent)
- [ ] Click/interactions fonctionnent

#### Responsive (optionnel mais recommandé)

- [ ] Mobile (375px) : Composant s'affiche
- [ ] Desktop (1920px) : Composant s'affiche

**Tolérance** :

- ⚠️ Petites différences visuelles acceptables (≤ 2-3px)
- ⚠️ Légères variations de couleur acceptables
- ❌ Bugs critiques NON acceptables (invisible, cassé, non-cliquable)

**Pourquoi tolérance ?**
Phase 6 redesign complet rendra obsolète la perfection pixel-perfect.

---

### 3️⃣ Commit (Hook Valide Automatiquement)

```bash
# Ajouter fichier refactoré
git add src/components/<composant>/<fichier>.scss

# Commit (hook pre-commit s'exécute automatiquement)
git commit -m "refactor(css): migrate <composant> to tokens"
```

**Hook pre-commit valide** :

- ✅ Aucun hardcode (bloque si détecté)
- ✅ Compilation SCSS réussit (bloque si erreur)
- ✅ Touch targets validés (warning uniquement)

**Si commit bloqué** :

- Corriger erreurs indiquées par le hook
- Re-tenter commit

---

### 4️⃣ Checklist Validation Complète

**Avant commit, vérifier** :

#### Conformité Tokens ✅

- [ ] Aucune valeur hardcodée (px, rem, #hex, rgb)
- [ ] Aucun var(--\*) direct
- [ ] Aucune manipulation couleur (lighten, darken, color.adjust)
- [ ] Import unique : `@use '@styles/abstracts' as *;`
- [ ] Wrappers utilisés : color(), spacing(), size(), font-size(), etc.

#### Qualité Code ✅

- [ ] BEM propre (≤ 3 niveaux nesting)
- [ ] Mobile-first respecté (@include respond-to(), jamais max-width)
- [ ] Animations TSA-compliant (≤ timing('base') = 0.3s)
- [ ] Accessibilité (focus-ring, touch-target si interactif)

#### Fonctionnel ✅

- [ ] Build SCSS réussit
- [ ] Composant s'affiche correctement (smoke test visuel)
- [ ] Interactions fonctionnent (hover, focus, click)
- [ ] Aucun bug CSS critique

---

### 5️⃣ Si Problème Détecté

#### Erreur Compilation SCSS

```bash
# Voir erreur détaillée
pnpm build

# Erreurs courantes :
# - Typo dans token : spacing('mdd') → spacing('md')
# - Fonction inexistante : sizes() → size()
# - Import manquant : Ajouter @use '@styles/abstracts' as *;
```

#### Bug Visuel Critique

```bash
# Revenir au code avant refactor
git diff src/components/<composant>/<fichier>.scss

# Identifier différence problématique
# Corriger mapping token incorrect
```

#### Hardcode Détecté

```bash
# Voir hardcodes détectés
pnpm lint:hardcoded

# Remplacer par tokens appropriés
# Ex: 12px → spacing('sm')
# Ex: #4a90e2 → color('base')
```

---

### 6️⃣ Critères Acceptation Commit

#### ✅ OK pour commit si :

- Aucun hardcode détecté (lint:hardcoded passe)
- Build SCSS réussit (pnpm build passe)
- Composant s'affiche sans bug majeur (smoke test OK)
- Interactions fonctionnent (hover, focus, click OK)

#### ❌ Bloquer commit si :

- Hardcodes présents (hook bloque automatiquement)
- Erreur compilation SCSS (hook bloque automatiquement)
- Bug CSS critique : élément invisible, cassé, non-cliquable
- Touch target < 44px sans justification (warning, pas bloquant)

---

### 7️⃣ Exemples Validation

#### Exemple 1 : Button.scss (Validation Réussie)

```bash
# 1. Refactorer
/refactor-scss src/components/Button/Button.scss

# 2. Appliquer changements (copier code refactoré)

# 3. Valider automatiquement
$ pnpm lint:hardcoded
✅ Aucune valeur hardcodée détectée

$ pnpm build
✅ Build réussi

# 4. Smoke test
$ pnpm dev
# Ouvrir localhost:3000
# ✅ Button s'affiche correctement
# ✅ Hover fonctionne (changement couleur visible)
# ✅ Focus visible (ring bleu)
# ✅ Click fonctionne

# 5. Commit
$ git add src/components/Button/Button.scss
$ git commit -m "refactor(css): migrate Button to tokens"
✅ Commit autorisé (hook passe)
```

---

#### Exemple 2 : Card.scss (Erreur Détectée)

```bash
# 1. Refactorer
/refactor-scss src/components/Card/Card.scss

# 2. Appliquer changements

# 3. Valider automatiquement
$ pnpm lint:hardcoded
❌ Valeur hardcodée détectée : src/components/Card/Card.scss:15 - "padding: 12px"

# 4. Corriger
# Remplacer : padding: 12px;
# Par :       padding: spacing('sm');

# 5. Re-valider
$ pnpm lint:hardcoded
✅ Aucune valeur hardcodée détectée

$ pnpm build
✅ Build réussi

# 6. Commit
$ git commit -m "refactor(css): migrate Card to tokens"
✅ Commit autorisé
```

---

#### Exemple 3 : Modal.scss (Bug Visuel Détecté)

```bash
# 1-3. Refactor + validation automatique OK

# 4. Smoke test
$ pnpm dev
# Ouvrir localhost:3000
# ❌ Modal invisible ! (bug critique)

# 5. Debug
$ git diff src/components/Modal/Modal.scss

# Identifier problème :
# - Avant : z-index: 1000;
# - Après : z-index: z-index('modal'); // ✅ Correct
# - Mais... oublié import abstracts !

# 6. Corriger
# Ajouter en haut du fichier :
@use '@styles/abstracts' as *;

# 7. Re-tester
$ pnpm dev
# ✅ Modal s'affiche maintenant

# 8. Commit
$ git commit -m "refactor(css): migrate Modal to tokens"
✅ Commit autorisé
```

---

### 8️⃣ Pourquoi Pas de Tests Visuels Pixel-Perfect ?

**Raison 1 : Phase 6 Redesign Complet**

- Phase 6 modifiera TOUTES les valeurs (couleurs, tailles, spacing)
- Tests pixel-perfect Phase 5 deviendraient obsolètes
- Focus Phase 5 = conformité tokens, pas perfection visuelle

**Raison 2 : Gain de Temps**

- Setup Playwright : ~2-3h
- Maintenance screenshots : ~1h si changements
- Smoke test manuel : 2-3 min par composant

**Raison 3 : Validation Suffisante**

- Hook pre-commit bloque hardcodes automatiquement
- Build échoue si SCSS invalide
- Smoke test manuel détecte bugs critiques

**Tolérance Acceptable :**

- Différences ≤ 2-3px : OK (arrondi navigateur, anti-aliasing)
- Légères variations couleur : OK (rendering différent)
- Bug critique (invisible, cassé) : ❌ NON acceptable

---

## ⚠️ Notes Importantes

### Différence avec Tests Visuels Automatisés

**Tests Visuels Playwright** (NON utilisés ici) :

- ✅ Détection automatique changements pixel-perfect
- ❌ Setup/maintenance complexe
- ❌ Faux positifs fréquents
- ❌ Obsolète après Phase 6

**Smoke Test Manuel** (utilisé ici) :

- ✅ Rapide (2-3 min)
- ✅ Détecte bugs critiques
- ✅ Pas de maintenance
- ✅ Focus sur fonctionnel > pixels

### Si Besoin Tests Visuels Futurs

Si en Phase 6 vous voulez des tests visuels automatisés :

```bash
# Setup Playwright visual regression
pnpm test:visual:update  # Capturer baseline Phase 6
pnpm test:visual         # Valider changements Phase 6
```

Mais pour Phase 5 (isométrique) : **Smoke test manuel suffit.**

---

## 🚫 Fichiers Interdits à Modifier

Sauf correction de build indispensable :

<!-- ... reste du fichier ... -->

8️⃣ Commit & Merge

1. Commit all changes :

```bash
git add .
   git commit -m "refactor(styles): implement tokens-first design system

   - Add _tokens.scss as single source of truth
   - Add _a11y-tokens.scss for WCAG/TSA constraints
   - Implement wrappers (colors, spacing, typography, motion, etc.)
   - Add validation scripts (check-hardcoded, check-touch-targets)
   - Keep variables.scss as DEPRECATED compatibility layer
   - No visual changes (isometric migration)"
```

2. Ne pas merger : Attendre review et validation visuelle complète.

🚫 Fichiers Interdits à Modifier
Sauf correction de build indispensable :

vendors/\_normalize.scss (dépendance immuable)
base/\_reset.scss (reset minimal)
base/\_helpers.scss (utilitaires globaux)
base/\_reduced-motion.scss (policy)
main.scss (orchestrateur — ne change pas l'ordre d'import)
abstracts/\_index.scss, base/\_index.scss, themes/\_index.scss, vendors/\_index.scss (forwards)

Pourquoi ?
Ces fichiers servent d'ossature. Auditer pour vérifier absence de hardcodes, mais éviter modifications fonctionnelles.

📋 Livrables Attendus

✅ abstracts/\_tokens.scss (contenu complet, source de vérité)
✅ abstracts/\_a11y-tokens.scss (contraintes accessibilité)
✅ Wrappers SCSS conformes et commentés (colors, spacing, typography, motion, radius, shadows, borders, breakpoints, forms, mixins, container-queries)
✅ scripts/check-hardcoded.js (détection hardcodes)
✅ scripts/check-touch-targets.js (validation touch targets)
✅ package.json scripts mis à jour
✅ Aucun changement visuel constaté après compilation
✅ variables.scss marqué DEPRECATED (compatibilité temporaire)

📝 Notes Techniques

Documentation : Toutes les fonctions/mixins doivent avoir commentaire en-tête (usage + exemples)
Validation stricte : Les wrappers doivent lancer @error en cas de clé manquante
Pas de @import : Utiliser @use et @forward uniquement
Propriétés logiques : Préférer margin-inline, padding-block pour i18n
prefers-reduced-motion : Respecter dans tous les mixins motion
Tokens combinés : Possibilité d'ajouter tokens sémantiques (typography-token('h1'), motion-token('quick-feedback'))

🎯 Exemples d'Usage
À inclure comme commentaires dans les wrappers :

```scss
// Spacing
padding: spacing('md');         // → map.get($spacing-tokens, 'md') → 1rem

// Colors
background: color('base');      // → map.get($role-color-tokens, 'primary', 'base')
background: surface('bg');      // → map.get($surface-colors, 'bg')

// Radius
border-radius: radius('card');  // → map.get($radius-scale, 'card') → 16px

// Motion
@include safe-transition(all, timing('base')); // → transition: all 0.3s ease

// Breakpoints
@include respond-to('tablet') { ... } // → @media (min-width: 834px)

// Accessibility
@include focus-ring;            // → Focus ring WCAG 2.2 AA
@include touch-target('min');   // → min-width: 44px, min-height: 44px
```
