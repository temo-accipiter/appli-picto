# SCSS PATTERNS OBSERVÉS — Appli-Picto

**Patterns établis et conventions trouvées dans la codebase** — Utiliser comme référence pour maintenir cohérence.

---

## PATTERN 1: Import + Use Token Wrapper

**Observé dans**: TOUS les fichiers .scss (100+ fichiers)

```scss
// TOP du fichier — TOUJOURS
@use '@styles/abstracts' as *;

// ✅ Cela expose AUTOMATIQUEMENT ces fonctions:
spacing()          // margin, padding, gap
radius()           // border-radius
text()             // color (texte)
surface()          // background (surfaces)
semantic()         // feedback colors (success/error/warning/info)
size()             // width, height, min-width, max-width
font-size()        // font-size
font-weight()      // font-weight
timing()           // animation duration
easing()           // animation easing
a11y()             // accessibility values
@include respond-to()           // @media min-width responsive
@include safe-transition()      // transitions with prefers-reduced-motion
@include touch-target()         // 44x44px min accessibility
@include focus-ring()           // WCAG focus-visible
```

---

## PATTERN 2: Component Structure (BEM-Light)

**Observé dans**: Modal.scss, ButtonDelete.scss, Card.scss, etc.

```scss
// Component root — class principal
.component-name {
  // Base styles
  display: flex;
  padding: spacing('md');
  background: surface('bg');
  border-radius: radius('card');

  // Sub-elements avec __
  &__header {
    padding: spacing('lg');
    border-bottom: 1px solid surface('border');
  }

  &__body {
    padding: spacing('md');
  }

  &__footer {
    padding: spacing('lg');
  }

  // Modifiers avec --
  &--primary {
    background: semantic('admin', 'light');
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // States
  &:hover {
    background: surface('hover');
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ❌ NEVER
.component-name .header { ... }     // Pas de sélecteur parent
.component-name-header { ... }      // Pas de tiret pour sous-partie
.component_name { ... }             // Underscore interdit
```

---

## PATTERN 3: Mobile-First Responsive

**Observé dans**: Modal.scss, Layout composants, page-components

```scss
// Base mobile (320px-575px) — DÉFAUT
.card {
  width: 100%;
  padding: spacing('sm');          // 8px mobile
  display: flex;
  flex-direction: column;

  // Petite tablette (576px+)
  @include respond-to('sm') {
    padding: spacing('md');        // 16px tablette
    flex-direction: row;           // change layout if needed
  }

  // Tablette portrait (768px+)
  @include respond-to('md') {
    max-width: size('modal-width-md');  // 540px
    padding: spacing('lg');        // 24px
  }

  // Desktop (1024px+)
  @include respond-to('lg') {
    max-width: size('container-lg');    // 1024px
    padding: spacing('xl');        // 32px
  }
}

// ❌ NEVER
@media (max-width: 768px) { ... }   // ❌ Desktop-first FORBIDDEN
@media (max-width: 575px) { ... }   // ❌ Desktop-first FORBIDDEN
```

---

## PATTERN 4: Focus Visible (WCAG AA)

**Observé dans**: ButtonDelete.scss, Modal.scss, form controls

```scss
// Pattern standard WCAG 2.2 AA
.interactive-element {
  // Remove default focus
  &:focus {
    outline: none;
  }

  // Custom focus-visible pour clavier users
  &:focus-visible {
    outline: 2px solid var(--color-primary);    // Bleu principal
    outline-offset: 2px;
    // Optionnel: ajouter box-shadow pour plus de contraste
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  // Variante 2: Border-basée (si outline impossible)
  &.focus-border {
    &:focus-visible {
      border: 2px solid var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary);
    }
  }
}

// ❌ WRONG
&:focus {
  outline: blue;                   // ❌ Default outline visible
}

&:focus-visible {
  outline: 1px solid blue;         // ❌ 1px trop fin
}
```

---

## PATTERN 5: Safe Transitions (prefers-reduced-motion)

**Observé dans**: ButtonDelete.scss, Modal.scss, tous les hovers

```scss
// Pattern avec @include safe-transition
.button {
  // NO transitions by default
  // Transitions appliquées SEULEMENT via mixin

  @include safe-transition(
    background-color transform,    // properties
    timing('fast'),                // duration (0.15s)
    easing('smooth')               // easing (ease)
  );

  &:hover {
    background-color: semantic('admin', 'light');
    transform: scale(1.05);        // Très léger scale
  }
}

// Alternative: si @include ne suffit pas
.card {
  // NO base transition
  @media (prefers-reduced-motion: no-preference) {
    transition: box-shadow timing('base') easing('smooth');
  }

  &:hover {
    box-shadow: shadow('medium');
  }
}

// ❌ NEVER
transition: all 0.5s ease;  // ❌ Pas de transition globale!
transition: all 1s;         // ❌ Trop long!
```

---

## PATTERN 6: Touch Target Accessibility

**Observé dans**: ButtonDelete.scss, form controls, interactive elements

```scss
// Pattern 1: Mixin @include touch-target()
.button {
  @include touch-target('min');   // 44×44px WCAG AA
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

// Pattern 2: Manual calculation
.icon-button {
  min-height: size('touch-target-min');   // 44px
  min-width: size('touch-target-min');    // 44px
  display: flex;
  align-items: center;
  justify-content: center;
}

// Pattern 3: TSA Preferred (56px)
.large-button {
  @include touch-target('preferred');     // 56×56px TSA
}

// Vérification : touch targets doivent TOUJOURS être ≥ 44px
// ✅ 44px = WCAG AA minimum
// ✅ 56px = TSA preferred (meilleur pour accessibilité)
// ❌ < 44px = accessibility violation
```

---

## PATTERN 7: Color + Background Patterns

**Observé dans**: Cards, buttons, alerts, badges

```scss
// Pattern 1: Text + background semantic
.alert-success {
  color: semantic('success', 'dark');      // #047857 texte sombre
  background: semantic('success', 'light'); // #d1fae5 fond pâle
  border: 1px solid semantic('success', 'border'); // #6ee7b7 bordure
}

// Pattern 2: Text with role color
.badge-admin {
  color: semantic('admin', 'dark');        // #4c5ac4
  background: semantic('admin', 'light');  // #e0e7ff
}

// Pattern 3: Mixed text/surface
.card {
  color: text('primary');                  // #1e293b
  background: surface('bg');               // #ffffff
  border: 1px solid surface('border');     // #e2e8f0
}

// Pattern 4: Hover states
.interactive {
  color: text('primary');
  background: surface('bg');

  &:hover {
    background: surface('hover');  // #f8fafc pâle
  }

  &:active {
    background: semantic('admin', 'light');  // Plus foncé
  }
}

// ❌ WRONG
background: #ffffff;                  // ❌ Hardcoded!
color: #1e293b;                       // ❌ Hardcoded!
border: 1px solid rgb(226, 232, 240); // ❌ Hardcoded!
```

---

## PATTERN 8: Spacing Hierarchies

**Observé dans**: Cards, modals, pages, containers

```scss
// HIERARCHY: page > section > card > component

// PAGE LEVEL
.page {
  padding: spacing('page-padding');  // 32px
  gap: spacing('section-gap');       // 48px
}

// SECTION / CONTAINER
.section {
  padding: spacing('container-padding');  // 24px
  gap: spacing('grid-gap');               // 16px
}

// CARD / COMPONENT
.card {
  padding: spacing('card-padding');  // 24px
  gap: spacing('card-gap');          // 16px
}

// BUTTON / INPUT
.button {
  padding: spacing('button-padding-y') spacing('button-padding-x');  // 8px 24px
}

// INTERNAL TYPOGRAPHY
.card__title {
  margin-bottom: spacing('text-gap-normal');  // 8px
}

// ❌ WRONG
padding: 16px;                      // ❌ Hardcoded!
gap: 20px;                          // ❌ Grille 4px violée!
margin: 10px 0;                     // ❌ Pas dans tokens!
```

---

## PATTERN 9: Animation Entrance (fadeIn, scaleIn)

**Observé dans**: Modal.scss, overlays, reveals

```scss
// @keyframes globales dans _animations.scss
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// Usage dans componant
.modal-overlay {
  animation: fadeIn timing('fast') easing('ease-out');  // 0.15s
}

.modal {
  animation: scaleIn timing('fast') easing('ease-out');  // 0.15s
}

// ⚠️ Jamais animations longues
// ✅ Max 0.3s pour feedback immédiat
// ✅ Max 0.4s pour reveals (exception)
// ❌ Jamais > 0.5s
```

---

## PATTERN 10: Form Controls Styling

**Observé dans**: Input, Select, Checkbox, etc.

```scss
// Base input
.input {
  width: 100%;
  height: size('input-height');      // 44px
  padding: spacing('input-padding');  // 8px
  border: 1px solid surface('border');
  border-radius: radius('input');     // 6px
  background: surface('bg');
  color: text('primary');
  font-size: font-size('base');

  @include safe-transition(
    border-color background-color box-shadow,
    timing('fast'),
    easing('smooth')
  );

  // Focus state WCAG AA
  &:focus {
    outline: none;
  }

  &:focus-visible {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  // Error state
  &.error {
    border-color: semantic('error', 'base');
    background: semantic('error', 'light');

    &:focus-visible {
      border-color: semantic('error', 'dark');
    }
  }

  // Disabled state
  &:disabled {
    background: surface('soft');
    color: text('muted');
    cursor: not-allowed;
    opacity: 0.6;
  }
}

// ❌ WRONG
border: 1px solid #ddd;                    // ❌ Hardcoded!
padding: 8px;                              // ❌ Hardcoded!
height: 44px;                              // ❌ Hardcoded!
box-shadow: 0 0 0 3px rgba(59, 130, 246);  // ❌ Hardcoded!
```

---

## PATTERN 11: Grid / Layout Composition

**Observé dans**: Cards grid, tables, listings

```scss
// Grid container
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(size('card-max-width'), 1fr));
  gap: spacing('grid-gap');  // 16px

  // Responsive
  @include respond-to('md') {
    gap: spacing('section-gap');  // 48px tablette+
  }
}

// Flex column stack
.stack {
  display: flex;
  flex-direction: column;
  gap: spacing('md');  // 16px
}

// Flex row
.row {
  display: flex;
  gap: spacing('sm');  // 8px
  align-items: center;
}

// ❌ WRONG
gap: 16px;      // ❌ Hardcoded!
gap: 24px;      // ❌ Pas sémantique!
```

---

## PATTERN 12: Modal/Overlay Pattern

**Observé dans**: Modal.scss (PHASE 6 validé)

```scss
// Overlay — backdrop semi-transparent
.modal-overlay {
  position: fixed;
  inset: 0;  // top: 0, right: 0, bottom: 0, left: 0
  background-color: surface('overlay');
  backdrop-filter: blur(size('4'));  // 4px blur
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: z-index('modal-backdrop');  // 900
  animation: fadeIn timing('fast') easing('ease-out');
  padding: spacing('sm');

  @include respond-to('sm') {
    padding: spacing('md');
  }
}

// Modal — conteneur
.modal {
  background: surface('surface');
  border-radius: radius('card');  // 12px mobile
  box-shadow: shadow('modal');
  display: flex;
  flex-direction: column;
  animation: scaleIn timing('fast') easing('ease-out');

  width: 95vw;
  max-width: 100vw;
  max-height: calc(100vh - #{size('32')});

  @include respond-to('sm') {
    max-width: size('modal-width-md');  // 540px tablette
    border-radius: radius('modal');     // 20px tablette
  }
}

// ✅ Core principles:
// - Overlay ALWAYS behind modal (z-index stacking)
// - Responsive: narrow mobile, larger tablet+
// - Animations: fade overlay, scale modal
// - Colors: semantic, never hardcoded
```

---

## PATTERN 13: Typography Hierarchy

**Observé dans**: Page components, cards, sections

```scss
// Headings
h1 {
  font-size: font-size('5xl');      // 48px
  font-weight: font-weight('bold');
  line-height: line-height('tight');
  color: text('dark');              // #0f172a
}

h2 {
  font-size: font-size('4xl');      // 36px
  font-weight: font-weight('bold');
  color: text('dark');
}

h3 {
  font-size: font-size('2xl');      // 24px (TRÈS FRÉQUENT)
  font-weight: font-weight('bold');
}

h4 {
  font-size: font-size('xl');       // 20px
  font-weight: font-weight('semibold');
}

// Body text
.body {
  font-size: font-size('base');     // 16px
  color: text('primary');
  line-height: line-height('normal');
}

.body-small {
  font-size: font-size('sm');       // 14px (TRÈS FRÉQUENT)
  color: text('secondary');
}

.caption {
  font-size: font-size('xs');       // 12px
  color: text('tertiary');
}

// Label
.label {
  font-size: font-size('sm');       // 14px
  font-weight: font-weight('medium');
  color: text('secondary');
}

// ❌ WRONG
font-size: 16px;                    // ❌ Hardcoded!
font-size: 14px;                    // ❌ Hardcoded!
font-weight: 700;                   // ❌ Use font-weight() function!
```

---

## PATTERN 14: Icon Sizing Patterns

**Observé dans**: Tous les composants avec icônes (TRÈS FRÉQUENT 23x)

```scss
// Button icon (PATTERN COURANT)
.button {
  &__icon {
    width: size('icon-sm');    // 16px ← TRÈS FRÉQUENT
    height: size('icon-sm');
    flex-shrink: 0;            // Empêche compression
    pointer-events: none;      // Évite events doubles
  }
}

// Avatar icon
.avatar {
  width: size('avatar-md');    // 40px
  height: size('avatar-md');
  border-radius: radius('avatar');  // 50%
}

// Large icon (card, section header)
.card__icon {
  width: size('icon-md');      // 24px
  height: size('icon-md');
}

// Small decorative icon
.badge__icon {
  width: size('icon-xs');      // 12px
  height: size('icon-xs');
}

// ❌ WRONG
width: 20px;                   // ❌ Hardcoded! Use size()
height: 16px;                  // ❌ Hardcoded!
width: size('16');             // ❌ Legacy. Use size('icon-sm')
```

---

## PATTERN 15: Error / Success / Warning States

**Observé dans**: Form controls, alerts, badges

```scss
// SUCCESS
.success-state {
  color: semantic('success', 'dark');      // #047857
  background: semantic('success', 'light'); // #d1fae5
  border: 1px solid semantic('success', 'border'); // #6ee7b7
}

// ERROR
.error-state {
  color: semantic('error', 'dark');        // #b91c1c
  background: semantic('error', 'light');  // #fee2e2 (TSA-friendly pâle)
  border: 1px solid semantic('error', 'border'); // #fca5a5
}

// WARNING
.warning-state {
  color: semantic('warning', 'dark');      // #c2410c
  background: semantic('warning', 'light'); // #ffedd5
  border: 1px solid semantic('warning', 'border'); // #fdba74
}

// INFO
.info-state {
  color: semantic('info', 'dark');         // #0369a1
  background: semantic('info', 'light');   // #e0f2fe
  border: 1px solid semantic('info', 'border'); // #7dd3fc
}

// ✅ Always use semantic() for feedback states
// ✅ Light background + dark text + border
// ✅ Contraste optimal pour WCAG AA (7.0+)
```

---

## PATTERN 16: Z-Index Management

**Observé dans**: Modal.scss, fixed elements, dropdowns

```scss
// Z-index stacking order (strict)
// Utiliser z-index() function depuis tokens

.dropdown {
  z-index: z-index('dropdown');      // 100
}

.sticky-header {
  z-index: z-index('sticky');        // 200
}

.fixed-element {
  z-index: z-index('fixed');         // 300
}

.offcanvas {
  z-index: z-index('offcanvas');     // 400
}

.modal-backdrop {
  z-index: z-index('modal-backdrop'); // 900
}

.modal {
  z-index: z-index('modal');         // 1000
}

.popover {
  z-index: z-index('popover');       // 1050
}

.tooltip {
  z-index: z-index('tooltip');       // 1100
}

.notification {
  z-index: z-index('notification');  // 1200
}

// ❌ WRONG
z-index: 999;         // ❌ Hardcoded!
z-index: 1000000;     // ❌ Arbitrary magic number!
```

---

**Last Updated**: 2026-04-25
**Patterns Source**: Analyzed from 100+ SCSS files
**Compliance**: WCAG 2.2 AA + TSA-optimized
