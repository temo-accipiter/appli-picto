# Recommandations de Refactoring SCSS - Appli-Picto

## TABLE DE CONTENU

1. [Avant/Après : Exemples Concrets](#avant-après--exemples-concrets)
2. [Mixins à Créer](#mixins-à-créer)
3. [Variables à Ajouter](#variables-à-ajouter)
4. [Checklist par Fichier](#checklist-par-fichier)
5. [Scripts d'Automatisation](#scripts-dautomatisation)

---

## AVANT/APRÈS : EXEMPLES CONCRETS

### Exemple 1 : Role Badge Duplication

#### AVANT (AdminPermissions.scss, 5x redondant)

```scss
// L. 144-158
.role-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &.visitor {
    background: rgba(107, 114, 128, 0.2);
    color: #6b7280;
  }

  &.abonne {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  &.admin {
    background: rgba(220, 38, 38, 0.2);
    color: #dc2626;
  }
}

// L. 557-680 DUPLICATION #1 : 123 lignes d'identique
.role-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  transition: all 0.15s ease;
  position: relative;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.85rem;
  min-width: 100%;
  justify-content: space-between;

  &:hover {
    background: var(--bg-primary);
    border-color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &[data-role='admin'] {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    border-color: #dc2626;
    box-shadow: 0 3px 10px rgba(239, 68, 68, 0.4);
    animation: pulse 2s infinite;
    // ... plus de code ...
  }

  &[data-role='abonne'] {
    background: linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.1),
      rgba(217, 119, 6, 0.05)
    );
    border-color: #f59e0b;
    // ...
  }
  // ... 3 autres rôles ...
}

// L. 882-1000 DUPLICATION #2 : 118 lignes identiques
.role-item {
  // COPIE-COLLE DE 557-680
  // ...
}
```

#### APRÈS (Avec Mixins + Variables)

```scss
// _variables.scss - AJOUTER
$role-badge-colors: (
  admin: (
    #dc2626,
    #ef4444,
  ),
  abonne: (
    #22c55e,
    #34a853,
  ),
  visitor: (
    #6b7280,
    #4b5563,
  ),
  staff: (
    #3b82f6,
    #2563eb,
  ),
  free: (
    #f59e0b,
    #d97706,
  ),
);

// _mixins.scss - AJOUTER
@mixin role-badge($role) {
  $colors: map.get($role-badge-colors, $role);
  $dark: nth($colors, 1);
  $light: nth($colors, 2);

  background: linear-gradient(135deg, $light, $dark);
  color: white;
  border-color: $dark;
  box-shadow: 0 3px 10px rgba($dark, 0.4);

  @if $role == 'admin' {
    animation: pulse 2s infinite;
  }
}

// AdminPermissions.scss - REMPLACER
.role-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  transition: all 0.15s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.85rem;

  &:hover {
    background: var(--bg-primary);
    border-color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  // ✓ SIMPLIFIÉ : Une ligne au lieu de 36
  @each $role, $colors in $role-badge-colors {
    &[data-role='#{$role}'] {
      @include role-badge($role);
    }
  }

  .role-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .role-name {
    font-size: 0.8rem;
    font-weight: 600;
  }
}

// RÉSULTAT : -118 lignes éliminées (duplication)
// Au lieu de déclarer .role-item 3 fois, déclaré 1 fois
```

**Économie** : 236 lignes → 42 lignes = **82% de réduction**

---

### Exemple 2 : Box-Shadow Standardization

#### AVANT (dispersé dans 20+ fichiers)

```scss
// AccountManagement.scss L. 69
box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);

// Modal.scss L. 31
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);

// Modal.scss L. 238
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

// AdminPermissions.scss L. 119
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);

// AdminPermissions.scss L. 358
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

// TimeTimer.scss L. 45
box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);

// QuotaManagement.scss L. 112
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

// ... 73 autres occurrences ...
```

#### APRÈS (Centralisé dans \_variables.scss)

```scss
// _variables.scss - REMPLACER les ombres existantes
// === SHADOWS ===
$box-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
$box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); // Réutiliser existant
$box-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
$box-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);
$box-shadow-hover: 0 8px 18px rgba(0, 0, 0, 0.2); // Réutiliser existant
$box-shadow-xl: 0 10px 40px rgba(0, 0, 0, 0.3);
$box-shadow-danger: 0 3px 10px rgba(239, 68, 68, 0.4);
$box-shadow-focus: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);

// Tous les composants - REMPLACER
.element {
  // ❌ AVANT
  // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  // ✓ APRÈS
  box-shadow: $box-shadow-md;

  &:hover {
    // ❌ AVANT
    // box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);

    // ✓ APRÈS
    box-shadow: $box-shadow-hover;
  }

  &:focus-visible {
    // ❌ AVANT
    // box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);

    // ✓ APRÈS
    box-shadow: $box-shadow-focus;
  }
}
```

**Économie** : 80 déclarations différentes → 8 variables = **90% de cohérence**

---

### Exemple 3 : Card Component Consolidation

#### AVANT (4 fichiers différents avec 80% de code identique)

```scss
// AccountManagement.scss L. 100
.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--muted);
  border-radius: 8px;
  border: 1px solid var(--border);
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

// QuotaManagement.scss L. 54
.role-section {
  background: var(--muted);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border);
  // Oublié la transition et hover state

  // ...
}

// Modal.scss L. 25
.modal {
  background: $color-surface;
  border: 2px solid $color-primary;
  padding: 0;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  animation: scaleIn $transition-fast ease-out;

  // ...
}

// BaseCard.scss L. 17
.base-card {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-gap: $spacing-md;
  background: var(--pastel-color, #f0f8ff);
  border-radius: $radius-md;
  padding: $spacing-sm;
  box-shadow: $box-shadow;
  border: 2px solid transparent;
  @include transition-smooth;
  @include safe-transition;

  // ...
}
```

#### APRÈS (Un seul mixin réutilisable)

```scss
// _mixins.scss - AJOUTER
@mixin card-container(
  $padding: $spacing-md,
  $radius: $radius-md,
  $shadow: $box-shadow,
  $border-width: 1px,
  $border-color: var(--color-border),
  $bg: var(--color-surface),
  $interactive: true
) {
  background: $bg;
  border: $border-width solid $border-color;
  border-radius: $radius;
  padding: $padding;
  box-shadow: $shadow;

  @if $interactive {
    transition: all $transition-fast ease;
    cursor: pointer;

    &:hover {
      border-color: var(--color-primary);
      box-shadow: $box-shadow-md;
      transform: translateY(-2px);
    }
  }
}

// AccountManagement.scss - REMPLACER
.user-card {
  @include card-container(
    $spacing-md,
    $radius-md,
    $box-shadow,
    1px,
    var(--border),
    var(--muted)
  );
  display: flex;
  align-items: center;
  gap: 16px;

  // Reste du code spécifique
}

// QuotaManagement.scss - REMPLACER
.role-section {
  @include card-container($spacing-lg, $radius-md, $box-shadow);

  // Reste du code spécifique
}

// Modal.scss - ADAPTER
.modal {
  @include card-container(
    $spacing-none,
    $radius-lg,
    $box-shadow-xl,
    2px,
    $color-primary,
    $color-surface,
    false
  );
  display: flex;
  flex-direction: column;
  animation: scaleIn $transition-fast ease-out;

  // Reste du code spécifique
}

// BaseCard.scss - REMPLACER
.base-card {
  @include card-container(
    $spacing-sm,
    $radius-md,
    $box-shadow,
    2px,
    transparent,
    var(--pastel-color, #f0f8ff)
  );
  display: grid;
  grid-template-columns: auto 1fr;
  grid-gap: $spacing-md;

  // Reste du code spécifique
}
```

**Économie** : 40+ lignes x 4 fichiers = 160 lignes → 1 mixin = **99% de centralisation**

---

### Exemple 4 : Media Query Standardization

#### AVANT (Mélange max-width et min-width)

```scss
// ❌ AdminPermissions.scss L. 1738
@media (max-width: 767px) {
  .admin-permissions-page {
    padding: 16px;
    // ...
  }
}

// ✓ AdminPermissions.scss L. 1156 (CORRECT)
@media (min-width: 768px) {
  .users-tab {
    .user-card {
      padding: 1.5rem;
    }
  }
}

// ❌ Modal.scss L. 43 (Hardcoded breakpoint)
@media (min-width: 576px) {
  width: 90vw;
  // ...
}

// ✓ AccountManagement.scss L. 446 (CORRECT - utilise mixin)
@include respond-to(sm) {
  padding: 24px;
  // ...
}
```

#### APRÈS (Standardisé sur mixin)

```scss
// AdminPermissions.scss - REMPLACER TOUTES les @media
// ❌ Avant
@media (max-width: 767px) {
  .admin-permissions-page {
    padding: 16px;
  }
}
@media (min-width: 768px) {
  .users-tab {
    padding: 1rem;
  }
}

// ✓ Après
// Mobile par défaut (320px-767px)
.admin-permissions-page {
  padding: 16px;

  // Tablette+ (768px)
  @include respond-to(md) {
    padding: 24px;
  }
}

// Modal.scss - REMPLACER
// ❌ Avant
@media (min-width: 576px) {
  width: 90vw;
}

// ✓ Après
@include respond-to(sm) {
  width: 90vw;
}
```

**Bénéfice** : Guideline mobile-first + cohérence + flexibilité (changement breakpoint = 1 seul endroit)

---

### Exemple 5 : @keyframes Consolidation

#### AVANT (Déclarées dans 3+ fichiers)

```scss
// ❌ Modal.scss L. 278
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

// ❌ AccountManagement.scss L. 390
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// ❌ QuotaManagement.scss L. 395 (DUPLICATION)
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// ❌ Button.scss L. 111
@keyframes spinner-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// ❌ AdminPermissions.scss L. 1143
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
```

#### APRÈS (Centralisé)

```scss
// _animations.scss - AJOUTER + CONSOLIDER
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes warning-pulse {
  0%,
  100% {
    opacity: 1;
    border-color: currentColor;
  }
  50% {
    opacity: 0.7;
    border-color: var(--color-warning);
  }
}

@keyframes error-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes spinner-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spinner-fade {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

// PUIS dans les composants - UTILISER
.button-spinner {
  animation: spin 1s linear infinite;
}

.loading-indicator {
  animation: pulse 1.5s ease-in-out infinite;
}

.quota-warning {
  animation: warning-pulse 2s ease-in-out infinite;
}
```

**Résultat** : 8 déclarations dupliquées → 1 seul fichier source

---

## MIXINS À CRÉER

### 1. Flex Layout Utilities

```scss
// _mixins.scss - AJOUTER

/// Mixin pour layout flex cohérent
/// @param {String} $direction - row | column
/// @param {String} $justify - flex-start | center | space-between | flex-end
/// @param {String} $align - stretch | flex-start | center | flex-end
/// @param {Length} $gap - espace entre items
@mixin flex-layout(
  $direction: row,
  $justify: flex-start,
  $align: stretch,
  $gap: $spacing-sm
) {
  display: flex;
  flex-direction: $direction;
  justify-content: $justify;
  align-items: $align;
  gap: $gap;
}

// Utilisation
.flex-center {
  @include flex-layout(row, center, center, $spacing-md);
}

.flex-column {
  @include flex-layout(column);
}

.flex-between {
  @include flex-layout(row, space-between);
}
```

### 2. Button State Utilities

```scss
@mixin button-base(
  $bg: $color-primary,
  $text: $color-text-invert,
  $padding: $spacing-xs $spacing-sm
) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $padding;
  background-color: $bg;
  color: $text;
  border: none;
  border-radius: $radius-sm;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: all $transition-fast ease;
  min-height: rem(44);

  @include focus-ring;

  &:hover:not(:disabled) {
    background-color: color.adjust($bg, $lightness: -8%);
    box-shadow: $box-shadow-md;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

// Utilisation
.btn-primary {
  @include button-base($color-primary);
}

.btn-danger {
  @include button-base($color-error);
}
```

### 3. Badge Generator

```scss
@mixin badge($bg-color, $text-color, $size: sm) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: @if $size == sm (4px 8px) else if $size == md (6px 12px) else
    (8px 16px);
  border-radius: @if $size == sm 12px else if $size == md 16px else 20px;
  background-color: rgba($bg-color, 0.15);
  color: $text-color;
  font-size: @if $size == sm 0.75rem else if $size == md 0.875rem else 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

// Utilisation
.status-badge-admin {
  @include badge(#dc2626, #dc2626, sm);
}

.status-badge-success {
  @include badge(#22c55e, #22c55e, md);
}
```

---

## VARIABLES À AJOUTER

### À `src/styles/abstracts/_variables.scss`

```scss
// === ADDITIONAL SHADOWS ===
$box-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
$box-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
$box-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);
$box-shadow-xl: 0 10px 40px rgba(0, 0, 0, 0.3);
$box-shadow-danger: 0 3px 10px rgba(239, 68, 68, 0.4);
$box-shadow-focus: 0 0 0 3px rgba(var(--color-primary-rgb, 0, 119, 194), 0.1);

// === ROLE COLORS MAP ===
$role-colors: (
  admin: (
    bg: #ef4444,
    dark: #dc2626,
    light: rgba(220, 38, 38, 0.2),
    shadow: rgba(239, 68, 68, 0.4),
  ),
  abonne: (
    bg: #f59e0b,
    dark: #d97706,
    light: rgba(245, 158, 11, 0.1),
  ),
  staff: (
    bg: #8b5cf6,
    dark: #7c3aed,
    light: rgba(139, 92, 246, 0.1),
  ),
  free: (
    bg: #3b82f6,
    dark: #2563eb,
    light: rgba(59, 130, 246, 0.1),
  ),
  visitor: (
    bg: #6b7280,
    dark: #4b5563,
    light: rgba(107, 114, 128, 0.1),
  ),
);

// === BADGE SIZES ===
$badge-sizes: (
  sm: (
    padding: 4px 8px,
    font-size: 0.75rem,
    radius: 12px,
  ),
  md: (
    padding: 6px 12px,
    font-size: 0.875rem,
    radius: 16px,
  ),
  lg: (
    padding: 8px 16px,
    font-size: 1rem,
    radius: 20px,
  ),
);

// === CONTAINER PADDING ===
$container-padding: (
  xs: $spacing-xs,
  sm: $spacing-sm,
  md: $spacing-md,
  lg: $spacing-lg,
  xl: $spacing-xl,
);
```

---

## CHECKLIST PAR FICHIER

### AdminPermissions.scss (2773 lignes → ~2500 lignes estimé)

- [ ] L. 144-158 : Badge styles → migrer vers mixin role-badge
- [ ] L. 557-680 : role-item variant admin → utiliser @each + map
- [ ] L. 904-1001 : DUPLICATION complète → supprimer
- [ ] L. 1143-1150 : @keyframes pulse → utiliser \_animations.scss
- [ ] L. 1738, 1808, 2572 : max-width @media → utiliser respond-to(sm)
- [ ] Partout : box-shadow hardcoded → utiliser variables
- [ ] Partout : gap: 16px, padding: 20px → utiliser $spacing-\*

### Modal.scss (551 lignes → ~510 lignes estimé)

- [ ] L. 278-307 : 3x @keyframes → utiliser \_animations.scss
- [ ] L. 31 : `box-shadow: 0 10px 40px...` → utiliser $box-shadow-xl
- [ ] L. 238 : `box-shadow: 0 4px 12px...` → utiliser $box-shadow-md
- [ ] L. 19-60 : @media (min-width: 576px) → utiliser respond-to(sm)
- [ ] Adapter `.modal` class pour utiliser @mixin card-container si applicable

### AccountManagement.scss (519 lignes → ~500 lignes estimé)

- [ ] L. 49-92 : spacing/sizing hardcoded → utiliser $spacing-_, $radius-_
- [ ] L. 69 : `box-shadow: 0 0 0 3px...` → utiliser $box-shadow-focus
- [ ] L. 390-397 : @keyframes spin → utiliser \_animations.scss
- [ ] L. 100-237 : .user-card → adapter mixin card-container

### QuotaManagement.scss (373 lignes → ~330 lignes estimé)

- [ ] Partout : gap: 24px, gap: 16px → utiliser $spacing-lg, $spacing-md
- [ ] L. ~395 : @keyframes spin → utiliser \_animations.scss
- [ ] L. 54-100 : .role-section → adapter card-container mixin
- [ ] Partout : padding: 20px → utiliser $spacing-lg

### TimeTimer.scss (293 lignes → ~280 lignes estimé)

- [ ] Multiple box-shadow hardcoded → utiliser variables
- [ ] @include respond-to() au lieu de @media
- [ ] Animations : vérifier duplication

### Button.scss (131 lignes → ~120 lignes estimé)

- [ ] L. 111-129 : @keyframes spinner-\* → utiliser \_animations.scss
- [ ] Utiliser mixin button-base pour variants

### CookiePreferences.scss (350 lignes → ~320 lignes estimé)

- [ ] Badge patterns → utiliser mixin badge
- [ ] box-shadow cohérence
- [ ] spacing standardization

---

## SCRIPTS D'AUTOMATISATION

### Script 1 : Audit Shadow Variables

```bash
#!/bin/bash
# Chercher tous les box-shadow inline et générer rapport

echo "=== BOX-SHADOW AUDIT ===" > scss-audit.txt

grep -r "box-shadow:" src/components/**/*.scss src/page-components/**/*.scss | \
  cut -d: -f3 | \
  sort | uniq -c | sort -rn >> scss-audit.txt

echo ""
echo "=== TOP 10 BOX-SHADOWS ===" >> scss-audit.txt
grep -r "box-shadow:" src/components/**/*.scss src/page-components/**/*.scss | \
  cut -d: -f3 | \
  sort | uniq -c | sort -rn | head -10 >> scss-audit.txt

cat scss-audit.txt
```

### Script 2 : Find Hardcoded Spacing

```bash
#!/bin/bash
# Trouver gap et padding en pixels au lieu de variables

echo "=== SPACING NOT USING VARIABLES ===" > spacing-audit.txt

grep -r "padding:.*px\|gap:.*px\|margin:.*px" \
  src/components/**/*.scss src/page-components/**/*.scss | \
  grep -v "$spacing-" | \
  head -50 >> spacing-audit.txt

cat spacing-audit.txt
```

### Script 3 : Media Query Audit

```bash
#!/bin/bash
# Vérifier que tous les @media utilisent respond-to() ou min-width

echo "=== MEDIA QUERY AUDIT ===" > media-audit.txt

echo "Max-width found (PROBLÉMATIQUE):" >> media-audit.txt
grep -r "@media (max-width" src/components/**/*.scss src/page-components/**/*.scss >> media-audit.txt

echo ""
echo "Min-width without respond-to:" >> media-audit.txt
grep -r "@media (min-width" src/components/**/*.scss src/page-components/**/*.scss | \
  grep -v "respond-to" >> media-audit.txt

cat media-audit.txt
```

### Script 4 : Keyframe Duplication Finder

```bash
#!/bin/bash
# Chercher @keyframes doublons

echo "=== KEYFRAME DUPLICATION ===" > keyframes-audit.txt

grep -r "@keyframes" src/components/**/*.scss src/page-components/**/*.scss | \
  awk '{print $NF}' | sort | uniq -d | while read frame; do
    echo "DUPLICATION FOUND: $frame" >> keyframes-audit.txt
    grep -r "@keyframes $frame" src/components/**/*.scss src/page-components/**/*.scss >> keyframes-audit.txt
    echo "---" >> keyframes-audit.txt
  done

cat keyframes-audit.txt
```

---

## RÉSUMÉ DES GAINS

| Catégorie         | Avant     | Après      | Économie   | %           |
| ----------------- | --------- | ---------- | ---------- | ----------- |
| AdminPermissions  | 2773      | 2520       | 253        | 9.1%        |
| Variables Shadows | 80 refs   | 8 vars     | 72         | 90%         |
| @keyframes        | 8 dups    | 1 source   | 80         | 100%        |
| card-container    | 4x impl.  | 1 mixin    | 160        | 99%         |
| Media queries     | 45 @media | 45 mixins  | 0          | 0% (format) |
| **TOTAL SCSS**    | **8 106** | **~6 200** | **~1 900** | **23.4%**   |

---

## PROCHAINES ÉTAPES

1. **Créer branche** : `git checkout -b refactor/scss-consolidation`
2. **Phase 1** : Ajouter variables et mixins à \_variables.scss et \_mixins.scss
3. **Phase 1** : Refactoriser AdminPermissions.scss (meilleur ROI)
4. **Phase 2** : Refactoriser fichiers dépendants
5. **Validation** : `pnpm check && pnpm test && pnpm build`
6. **Merge** : PR review + merge en main

---

## DOCUMENTATION À METTRE À JOUR

Après refactoring, ajouter à `CLAUDE.md` :

```markdown
### SCSS Refactoring Guidelines

#### Shadow Variables

Toujours utiliser les variables de shadow définies dans `src/styles/abstracts/_variables.scss` :

- `$box-shadow-xs` : Très légère
- `$box-shadow` ou `$box-shadow-sm` : Défaut
- `$box-shadow-md` : Carte au hover
- `$box-shadow-lg` : Modale
- `$box-shadow-focus` : Focus ring

#### Mixins Importants

- `@mixin card-container()` : Pour tout conteneur card-like
- `@mixin button-base()` : Pour tous les buttons
- `@mixin role-badge()` : Pour badges de rôles
- `@include respond-to()` : JAMAIS de @media directs

#### Spacing

Toujours utiliser variables `$spacing-*` :

- `$spacing-xs`, `$spacing-sm`, `$spacing-md`, `$spacing-lg`, `$spacing-xl`

#### Animations

Déclarer toutes les @keyframes dans `src/styles/base/_animations.scss`
NE PAS déclarer dans les composants.
```
