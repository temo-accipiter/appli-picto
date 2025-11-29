# Responsive Patterns Reference - Copy from These Components

This document lists existing responsive patterns in the codebase that should be reused for Phase 2 modal improvements.

---

## 1. SettingsMenu Pattern (Best for Modal Positioning)

**File**: `/src/components/layout/settings-menu/SettingsMenu.scss`

**What it does**: Changes position and animation based on screen size (mobile vs desktop)

### Pattern to Copy:
```scss
.settings-menu__dialog {
  width: min(300px, 90vw);        // Smart width: smaller of 300px or 90% viewport

  // Desktop: top-right positioning
  @media (min-width: 768px) {
    max-height: calc(100vh - 100px);
    animation: slideInDown 0.18s ease-out;  // Slide down from top
    margin: 64px 14px 0 0;         // Position below navbar
  }

  // Mobile: bottom-right positioning (thumb-friendly)
  @media (max-width: 767px) {
    margin: 0 14px 14px 0;         // Bottom-right corner
    max-height: 70vh;              // Reduced height for mobile
    animation: slideInUp 0.18s ease-out;  // Slide up from bottom
  }
}
```

### Why good for modals:
- Different positioning per device
- Different max-heights per device
- Context-aware animations
- Uses `min()` CSS function for smart sizing

---

## 2. BottomNav Pattern (Safe-Area Support)

**File**: `/src/components/layout/bottom-nav/BottomNav.scss`

**What it does**: Respects iPhone notch, home indicator, and Android safe areas

### Pattern to Copy:
```scss
.bottom-nav {
  display: none;  // Hidden by default

  @media (max-width: #{$breakpoint-md - 1px}) {  // Mobile only
    display: flex;
    position: fixed;
    top: 0;
    right: 0;
    z-index: $z-modal;
    padding: $spacing-md;

    // SMART: Use max() to respect notches/safe-areas
    padding-top: max($spacing-md, env(safe-area-inset-top));
    padding-right: max($spacing-md, env(safe-area-inset-right));
  }
}

.bottom-nav--tableau {
  @media (max-width: #{$breakpoint-md - 1px}) {
    top: auto;
    bottom: 0;  // Mobile: switch to bottom

    // SMART: Account for home indicator
    padding-bottom: max($spacing-md, env(safe-area-inset-bottom));
  }

  @media (min-width: $breakpoint-md) {
    display: flex;
    top: 0;     // Desktop: back to top
    right: 0;
  }
}
```

### Why good for modals:
- Shows how to use `env(safe-area-inset-*)`
- Shows positional switching (top ↔ bottom)
- Shows content shifting based on device features

---

## 3. UserMenu Pattern (Height & Animation Variants)

**File**: `/src/components/layout/user-menu/UserMenu.scss`

**What it does**: Changes max-height, positioning, and animation per screen size

### Pattern to Copy:
```scss
.user-menu-dialog {
  width: min(92vw, 320px);  // Smart width

  // Desktop: top-right, normal max-height
  @media (min-width: 768px) {
    margin: 64px 14px 0 0;
    max-height: calc(100vh - 100px);  // Leave room for navbar
    overflow-y: auto;
    animation: slideInDown 0.18s ease-out;  // Top animation
  }

  // Mobile: bottom-right, limited max-height
  @media (max-width: 767px) {
    margin: 0 14px 14px 0;
    max-height: 80vh;  // Reduced height
    overflow-y: auto;
    animation: slideInUp 0.18s ease-out;  // Bottom animation
  }

  // Variant for pages with bottom nav (needs higher position)
  &.user-menu-dialog--elevated {
    @media (max-width: 767px) {
      max-height: 70vh;  // Even more reduced
    }
  }
}

// Animations reusable
@keyframes slideInDown {
  from { transform: translateY(-6px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideInUp {
  from { transform: translateY(6px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

### Why good for modals:
- Shows height variant patterns (80vh vs 70vh)
- Shows positional class variants (`.--elevated`)
- Shows height `calc()` expressions
- Shows how to reuse animations

---

## 4. Navbar Pattern (Flex Direction Switching)

**File**: `/src/components/layout/navbar/Navbar.scss`

**What it does**: Switches from vertical (mobile) to horizontal (desktop) layout

### Pattern to Copy:
```scss
.navbar {
  /* Mobile-first: BASE = vertical layout */
  flex-direction: column;
  align-items: flex-start;
  gap: $spacing-xs;
  height: auto;
  padding: $spacing-sm $spacing-md;

  /* Desktop: ENHANCEMENT = horizontal layout */
  @include respond-to(sm) {
    flex-direction: row;           // Switch to row
    justify-content: space-between; // Different alignment
    align-items: center;
    height: rem(64);               // Fixed height
    padding: 0 $spacing-lg;        // Different padding
    gap: 0;                        // Remove gap
  }
}

.navbar-left {
  /* Mobile: Base state */
  width: 100%;
  flex-wrap: wrap;
  justify-content: center;
  gap: $spacing-md;

  /* Desktop: Enhancement */
  @include respond-to(sm) {
    width: auto;              // Not full width
    flex-wrap: nowrap;        // Don't wrap
    justify-content: flex-start;  // Different alignment
    gap: $spacing-lg;         // Larger gap
  }
}

.navbar-actions {
  /* Mobile: Full width, centered */
  width: 100%;
  justify-content: center;
  gap: $spacing-sm;

  /* Desktop: Auto width, right-aligned */
  @include respond-to(sm) {
    width: auto;
    justify-content: flex-end;
    gap: $spacing-md;
  }
}
```

### Why good for modals:
- Shows complete flex layout switching
- Shows how to structure mobile-first code
- Shows gap/spacing changes per breakpoint
- Uses mixin `@include respond-to(sm)` pattern

---

## 5. SignupPrompt Modal Pattern (Existing Modal!)

**File**: `/src/components/shared/modal/modal-signup-prompt/SignupPromptModal.scss`

**What it does**: Already has responsive design - shows what modals CAN do

### Pattern to Copy:
```scss
.signup-prompt-modal {
  background: var(--background);
  border-radius: 16px;
  padding: 0;
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border);
}

// [Mobile-first] Base = mobile (320px)
.signup-prompt-modal {
  width: 95vw;
  margin: 20px;

  .modal-header {
    padding: 20px 20px 16px;  // Mobile padding

    .modal-title {
      font-size: 1.3rem;  // Smaller title on mobile
    }
  }

  .modal-message,
  .features-list,
  .modal-actions {
    padding-left: 20px;
    padding-right: 20px;
  }

  // Desktop (576px+)
  @include respond-to(sm) {
    width: 90vw;
    max-width: 500px;
    margin: auto;  // Center instead of offset

    .modal-header {
      padding: 24px 24px 16px;  // Larger padding

      .modal-title {
        font-size: 1.5rem;  // Larger title
      }
    }

    .modal-message,
    .features-list,
    .modal-actions {
      padding-left: 24px;  // Wider padding
      padding-right: 24px;
    }
  }
}

// Dark mode support
@media (prefers-color-scheme: dark) {
  .signup-prompt-modal {
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);  // Darker shadow
  }
}
```

### Why good for modals:
- **ACTUAL MODAL IN PROJECT** - proven pattern
- Shows padding scaling (20px → 24px)
- Shows font-size scaling per breakpoint
- Shows margin/centering changes
- Already working in production

---

## 6. SelectWithImage Pattern (Dropdown Content Sizing)

**File**: `/src/components/ui/select-with-image/SelectWithImage.scss`

**What it does**: Uses CSS custom properties for auto-height

### Pattern to Copy:
```scss
.select-with-image__trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-xs;
  width: 100%;
  min-height: rem(44);  // WCAG 2.2 AA
  padding: rem(8) $spacing-sm;
  background-color: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: $radius-md;
  cursor: pointer;
  color: var(--color-text);
  font-size: rem(16);  // Important: 16px min for no zoom on iOS
  user-select: none;
  transition: border $transition-fast ease,
              background-color $transition-fast ease,
              box-shadow $transition-fast ease;

  &:hover:not([data-disabled]) {
    background-color: var(--color-hover-bg, rgba(0, 0, 0, 0.02));
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus, #0077c2);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;  // Respect motion preferences
  }
}

// Smart content sizing using Radix UI
.select-with-image__content {
  z-index: 1000;
  width: var(--radix-select-trigger-width);  // Match trigger width
  max-height: var(--radix-select-content-available-height);  // Auto!
  overflow: hidden;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: $radius-md;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &[data-state='open'] {
    animation: slideDownAndFade 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &[data-state='closed'] {
    animation: slideUpAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
}
```

### Why good for modals:
- Shows CSS custom property usage for layout
- Shows how to keep 16px font-size (prevents iOS zoom)
- Shows animation state handling
- Shows motion accessibility pattern

---

## 7. Input & Button Pattern (WCAG Compliance)

**File**: `/src/components/ui/button/Button.scss` & `/src/components/ui/input/Input.scss`

**What it does**: Ensures WCAG 2.2 AA compliance

### Pattern to Copy:
```scss
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-family: $lexend-font-stack;
  font-weight: $font-weight-semibold;
  font-size: $font-size-base;
  line-height: 1.2;
  min-height: rem(44);  // WCAG 2.2 AA: 44px minimum target size
  cursor: pointer;
  border: none;
  box-shadow: $box-shadow;
  transition:
    background $transition-fast ease,
    color $transition-fast ease;

  @include focus-ring;  // Accessible focus state
}

.input-field__input {
  padding: rem(8);
  font-size: rem(16);  // CRITICAL: 16px min prevents iOS zoom
  border: 2px solid var(--color-border);
  border-radius: $radius-md;
  box-sizing: border-box;
  background-color: var(--color-bg);
  color: var(--color-text);
  max-width: 11.5rem;
  min-height: rem(44);  // WCAG 2.2 AA
  transition:
    border $transition-fast ease,
    outline $transition-fast ease;

  @include focus-ring;
}

// Toggle button
.input-field__toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  min-width: 44px;  // WCAG target
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.6;
  padding: 0;
  border-radius: $radius-sm;
  transition:
    opacity $transition-fast ease,
    background-color $transition-fast ease;

  &:hover {
    opacity: 1;
    background-color: var(--color-hover-bg, rgba(0, 0, 0, 0.05));
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus, #0077c2);
    outline-offset: 2px;
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```

### Why good for modals:
- Shows WCAG 2.2 AA compliance patterns
- Shows 16px font-size minimum for inputs
- Shows min 44×44px interactive targets
- Shows how to use focus-ring mixin

---

## 8. Layout Pattern (Mobile-First Article)

**File**: `/src/components/shared/layout/Layout.scss`

**What it does**: Shows main content layout with responsive padding

### Pattern to Copy:
```scss
.layout {
  display: flex;
  background-color: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
  margin-top: 2rem;
  transition:
    background-color $transition-base ease,
    color $transition-base ease;
}

.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  background-color: var(--color-bg);
  color: var(--color-text);

  main {
    flex: 1;
    /* [Mobile-first] Base = mobile (320px+) */
    padding: $spacing-md;  // 16px padding

    /* Desktop (576px+) */
    @include respond-to(sm) {
      margin-left: 0;
      padding: $spacing-xl;  // 32px padding for more breathing room
    }
  }
}
```

### Why good for modals:
- Shows padding scaling strategy
- Shows flex layout with responsive padding
- Shows comment style for mobile-first approach

---

## Mixin Usage Examples

### Available Mixins (from `_mixins.scss`):

#### 1. `respond-to()` - Mobile-first media queries
```scss
@include respond-to(sm) { }   // @media (min-width: 576px)
@include respond-to(md) { }   // @media (min-width: 768px)
@include respond-to(lg) { }   // @media (min-width: 992px)
@include respond-to(xl) { }   // @media (min-width: 1200px)
```

#### 2. `safe-transition()` - Respects prefers-reduced-motion
```scss
@include safe-transition($property: all, $duration: $transition-fast) {
  // Automatically adds prefers-reduced-motion: reduce handling
}
```

#### 3. `focus-ring()` - WCAG accessible focus
```scss
@include focus-ring($color: $color-accent, $width: 2px, $offset: 2px) {
  // Creates accessible focus outline
}
```

#### 4. `interactive-target()` - WCAG 2.2 AA sizes
```scss
@include interactive-target {
  // Sets min-height: 44px, min-width: 44px
}
```

#### 5. `on-event()` - Applies to hover/active/focus
```scss
@include on-event($self: false) {
  // Applies to &:hover, &:active, &:focus, &:focus-within
}
```

#### 6. `flex-center()` - Flexbox centering
```scss
@include flex-center {
  // display: flex, justify-content: center, align-items: center
}
```

---

## CSS Custom Properties Available

**For modals to use** (from `:root` in `_variables.scss`):

```scss
// Colors
--color-primary: #0077c2
--color-secondary: #ef5350
--color-accent: #ffb400
--color-text: #333333
--color-text-invert: #ffffff
--color-bg: #ffffff
--color-surface: #f7f7f7
--color-border: #e1e1e1
--color-bg-soft: #f7f7f7
--color-bg-hover: #e1e1e1

// Focus
--focus-ring-color: #ffb400
--focus-ring-width: 2px
--focus-ring-offset: 2px

// Scrollbar
--c-scroll-thumb: #bbb
```

All support **dark mode** via `@media (prefers-color-scheme: dark)` or `[data-theme='dark']`

---

## Quick Copy Checklist

For Phase 2 Modal Implementation:

- [ ] Copy `min()` function pattern from SettingsMenu for smart width sizing
- [ ] Copy `max()` + `env(safe-area-inset-*)` from BottomNav for notch support
- [ ] Copy height variant pattern from UserMenu (70vh vs 80vh)
- [ ] Copy animation switching pattern from UserMenu (slideInDown vs slideInUp)
- [ ] Copy flex direction switching from Navbar (column → row)
- [ ] Copy responsive padding pattern from SignupPrompt modal
- [ ] Copy WCAG compliance from Button/Input (44px, 16px font-size)
- [ ] Copy CSS variables usage from all components
- [ ] Copy transition safety from SelectWithImage
- [ ] Copy prefers-reduced-motion handling from multiple components

---

## Summary Table: Quick Reference

| Pattern | File | Use For | Key Trick |
|---------|------|---------|-----------|
| **Positioning** | SettingsMenu | Modal position (top vs bottom) | Different animations per screen |
| **Safe Areas** | BottomNav | iPhone notch support | `max()` + `env()` CSS |
| **Height Variants** | UserMenu | Modal max-height adaptation | Reduce for mobile, expand for desktop |
| **Layout Switching** | Navbar | Content structure | Flex direction change (column ↔ row) |
| **Existing Modal** | SignupPrompt | Real working example | Padding scaling 20px → 24px |
| **Smart Sizing** | SelectWithImage | Dropdown sizing | CSS custom properties from component |
| **WCAG Compliance** | Button/Input | Interactive target sizes | min-height/width: 44px |
| **Motion A11y** | Any transition | Respect motion preferences | `@media (prefers-reduced-motion: reduce)` |
| **Dark Mode** | All components | Theme support | CSS variables + media query |
| **Spacing** | All components | Padding/margin | Use `$spacing-*` variables |

