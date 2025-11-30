# Phase 2: Modal Responsive Implementation Guide

## File: `/src/components/shared/modal/Modal.scss`

### Current Code (Lines 1-35)

```scss
@use '@styles/abstracts' as *;

// === OVERLAY ===
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(gray(900), 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-overlay;
  animation: fadeIn $transition-fast ease-out;
}

// === MODAL CONTENEUR ===
.modal {
  background: $color-surface;
  border: 2px solid $color-primary;
  border-radius: $radius-lg;
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  animation: scaleIn $transition-fast ease-out;

  &:focus-visible {
    outline: none;
  }
}
```

---

## Recommendation 1: Responsive Base Modal

### Add Media Queries for Different Screen Sizes

```scss
@use '@styles/abstracts' as *;

// === OVERLAY ===
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(gray(900), 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-overlay;
  animation: fadeIn $transition-fast ease-out;
  overflow-y: auto; // Allow scroll if modal too tall
  padding: $spacing-md; // Add padding for small screens

  @media (max-width: 575px) {
    padding: $spacing-sm; // Even smaller padding on tiny screens
  }
}

// === MODAL CONTENEUR ===
.modal {
  background: $color-surface;
  border: 2px solid $color-primary;
  border-radius: $radius-lg;
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  animation: scaleIn $transition-fast ease-out;

  // Mobile optimization (320px - 575px)
  @media (max-width: 575px) {
    width: 95vw;
    max-width: calc(100vw - 32px); // 16px padding on each side
    max-height: calc(100vh - 32px); // 16px padding top & bottom
    border-radius: $radius-md; // Slightly smaller corners
  }

  // Small tablets (576px - 767px)
  @media (min-width: 576px) and (max-width: 767px) {
    width: 90vw;
    max-width: 540px;
    max-height: calc(100vh - 64px);
  }

  // Tablets & desktop (768px+)
  @media (min-width: 768px) {
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
  }

  // Large desktop (1200px+)
  @media (min-width: 1200px) {
    max-width: 600px;
  }

  &:focus-visible {
    outline: none;
  }
}
```

---

## Recommendation 2: Responsive Header & Content

### Add Padding Adaptation for All Section

```scss
// === HEADER ===
.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg $spacing-md;
  border-bottom: 1px solid gray(200);
  flex-shrink: 0;

  // Mobile optimization
  @media (max-width: 575px) {
    padding: $spacing-md $spacing-sm; // Reduced padding
    gap: $spacing-sm;
  }

  @media (min-width: 768px) {
    padding: $spacing-lg $spacing-md; // Standard padding
  }
}

// === TITLE ===
.modal__title {
  margin: 0;
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-primary;
  flex: 1;

  // Mobile: smaller title
  @media (max-width: 575px) {
    font-size: $font-size-lg; // 20px instead of 24px
  }
}

// === CONTENU ===
.modal__content {
  flex: 1;
  padding: $spacing-lg $spacing-md;
  overflow-y: auto;
  min-height: 100px;

  // Mobile optimization
  @media (max-width: 575px) {
    padding: $spacing-md $spacing-sm; // Reduced padding
    min-height: 80px; // Slightly smaller min
  }

  // Scrollbar personnalisée
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: gray(100);
  }

  &::-webkit-scrollbar-thumb {
    background: gray(400);
    border-radius: 4px;

    &:hover {
      background: gray(500);
    }
  }
}

// === MESSAGE CENTRÉ ===
.modal__message {
  text-align: center;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  margin: 0;
  color: $color-text;
  line-height: $line-height-base;

  // Mobile: smaller font
  @media (max-width: 575px) {
    font-size: $font-size-base; // 16px instead of 20px
  }

  p {
    margin: 0;
  }
}

// === FOOTER ===
.modal__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: $spacing-sm;
  border-top: 1px solid gray(200);
  padding: $spacing-md;
  flex-shrink: 0;
  flex-wrap: wrap;

  // Mobile: stack buttons vertically or use smaller gap
  @media (max-width: 575px) {
    padding: $spacing-sm;
    gap: $spacing-xs;
    flex-direction: column; // Stack vertically

    .btn {
      width: 100%; // Full width buttons on mobile
    }
  }

  // Desktop: buttons inline
  @media (min-width: 576px) {
    flex-direction: row;

    .btn {
      width: auto;
    }
  }

  .btn {
    transition:
      transform $transition-fast ease-out,
      box-shadow $transition-fast ease-out;
    min-height: 44px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }

    // Mobile: smaller padding
    @media (max-width: 575px) {
      font-size: $font-size-sm; // Smaller text on mobile
      padding: $spacing-sm $spacing-md;
    }

    // Bouton Annuler à gauche
    &:first-child {
      @media (min-width: 576px) {
        margin-right: auto;
      }

      @media (max-width: 575px) {
        // On mobile stacked, no margin-right needed
        order: 2; // Put cancel at bottom
      }
    }

    // Confirm button (primary action)
    &:last-child {
      @media (max-width: 575px) {
        order: 1; // Put confirm at top
      }
    }
  }
}
```

---

## Recommendation 3: Fullscreen Variant (Phase 2.1)

### Create Optional Fullscreen Modal for Mobile

```scss
// === FULLSCREEN VARIANT ===
.modal--fullscreen {
  @media (max-width: 575px) {
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    max-width: 100%;
    border-radius: 0; // Remove rounded corners
    margin: 0;
    position: fixed;
    inset: 0;

    .modal__header {
      padding: $spacing-md;
    }

    .modal__content {
      padding: $spacing-md;
    }

    .modal__footer {
      padding: $spacing-md;
    }
  }

  // Desktop: normal modal
  @media (min-width: 576px) {
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    border-radius: $radius-lg;
  }
}
```

---

## Recommendation 4: Drawer/Slide-Up Variant (Phase 2.2)

### Bottom Sheet Modal for Mobile

```scss
// === DRAWER VARIANT (Bottom sheet) ===
.modal-overlay--drawer {
  align-items: flex-end;

  @media (min-width: 768px) {
    align-items: center;
  }
}

.modal--drawer {
  // Mobile: bottom sheet
  @media (max-width: 767px) {
    width: 100%;
    max-width: 100%;
    max-height: 70vh;
    border-radius: $radius-lg $radius-lg 0 0; // Rounded top only
    margin: 0;
    animation: slideUpIn $transition-base ease-out;

    // Handle bar at top (optional)
    &::before {
      content: '';
      display: block;
      width: 40px;
      height: 4px;
      background-color: gray(300);
      border-radius: 2px;
      margin: $spacing-sm auto;
    }
  }

  // Desktop: normal centered modal
  @media (min-width: 768px) {
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    border-radius: $radius-lg;
    animation: scaleIn $transition-fast ease-out;

    &::before {
      display: none;
    }
  }
}

@keyframes slideUpIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal--drawer {
    @media (max-width: 767px) {
      animation: none;
    }
  }
}
```

---

## Recommendation 5: Safe Area Support (Phase 2.3)

### Support iPhone Notch & Safe Areas

```scss
// === SAFE AREA SUPPORT ===
.modal {
  // Standard padding
  padding: 0;

  // On devices with notches, add safe area padding
  @supports (padding: max(0px)) {
    @media (max-width: 767px) {
      // Add padding for safe areas
      margin-left: max(0, env(safe-area-inset-left) - $spacing-md);
      margin-right: max(0, env(safe-area-inset-right) - $spacing-md);
    }
  }
}

.modal__header {
  padding: $spacing-lg $spacing-md;

  @supports (padding: max(0px)) {
    @media (max-width: 767px) {
      padding-left: max(
        $spacing-md,
        calc(env(safe-area-inset-left) + $spacing-sm)
      );
      padding-right: max(
        $spacing-md,
        calc(env(safe-area-inset-right) + $spacing-sm)
      );
    }
  }
}

.modal__content {
  padding: $spacing-lg $spacing-md;

  @supports (padding: max(0px)) {
    @media (max-width: 767px) {
      padding-left: max(
        $spacing-md,
        calc(env(safe-area-inset-left) + $spacing-sm)
      );
      padding-right: max(
        $spacing-md,
        calc(env(safe-area-inset-right) + $spacing-sm)
      );
    }
  }
}

.modal__footer {
  padding: $spacing-md;

  @supports (padding: max(0px)) {
    @media (max-width: 767px) {
      padding-left: max(
        $spacing-md,
        calc(env(safe-area-inset-left) + $spacing-sm)
      );
      padding-right: max(
        $spacing-md,
        calc(env(safe-area-inset-right) + $spacing-sm)
      );
      padding-bottom: max($spacing-md, env(safe-area-inset-bottom));
    }
  }
}
```

---

## Recommendation 6: Portrait/Landscape Support

### Handle Small Viewport Heights (iPhone Landscape)

```scss
// Landscape mode support (max-height: 600px)
@media (max-height: 600px) {
  .modal {
    max-height: calc(100vh - 20px);
  }

  .modal__header {
    padding: $spacing-sm $spacing-md; // Reduce vertical padding
  }

  .modal__content {
    min-height: 50px; // Smaller minimum
  }

  .modal__footer {
    padding: $spacing-sm; // Reduce padding
    gap: $spacing-xs;

    .btn {
      padding: $spacing-xs $spacing-sm; // Smaller buttons
      font-size: $font-size-sm;
      min-height: 40px; // Slightly smaller but still accessible
    }
  }
}
```

---

## Testing Checklist for Phase 2

### Device Sizes to Test:

- [ ] iPhone SE (375px × 667px) - smallest
- [ ] iPhone 14 (390px × 844px) - standard
- [ ] iPhone 14 Plus (430px × 932px) - large
- [ ] iPhone 14 Pro (393px × 852px) - with notch
- [ ] iPad (768px × 1024px) - tablet
- [ ] iPad Pro (1024px × 1366px) - large tablet
- [ ] Desktop (1920px × 1080px) - desktop
- [ ] Desktop landscape (1080px × 1920px) - vertical monitor

### Landscape Mode:

- [ ] iPhone landscape (portrait height ~375px)
- [ ] iPad landscape (height ~768px)

### Safe Areas:

- [ ] iPhone with notch (test padding offset)
- [ ] iPhone with Dynamic Island
- [ ] iPad with home indicator

### Accessibility:

- [ ] Test with `prefers-reduced-motion: reduce`
- [ ] Test with dark mode (`prefers-color-scheme: dark`)
- [ ] Test with 200% zoom (browser)
- [ ] Test keyboard navigation (Tab through buttons)
- [ ] Test screen reader (VoiceOver, TalkBack)

### Content Overflow:

- [ ] Very long title (multiple lines)
- [ ] Long content with scroll
- [ ] Long button labels (3+ words)
- [ ] Many buttons in footer (5+)

---

## Implementation Order

### Phase 2.0 - Base Responsive (PRIORITY)

1. Add media queries to `.modal` for 3 breakpoints
2. Reduce padding on `.modal__header`, `.modal__content`, `.modal__footer` for mobile
3. Adapt button layout in footer (stack vertically on mobile)
4. Test on actual devices

### Phase 2.1 - Fullscreen Variant

1. Add `.modal--fullscreen` class
2. Create fullscreen tests
3. Document usage in component props

### Phase 2.2 - Drawer Variant

1. Add `.modal--drawer` class
2. Add overlay positional variant
3. Add slide-up animation

### Phase 2.3 - Safe Areas

1. Add safe-area-inset support
2. Test on iOS devices with notches
3. Test on Android with system gestures

### Phase 2.4 - Polish

1. Fine-tune animations
2. Add portrait/landscape media queries
3. Final accessibility audit

---

## TypeScript Component Updates

### Current Modal.tsx Props

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  actions?: ModalAction[]
  className?: string
}
```

### Suggested Phase 2 Props

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  actions?: ModalAction[]
  className?: string
  // Phase 2 additions:
  variant?: 'default' | 'fullscreen' | 'drawer' // Choose layout
  size?: 'sm' | 'md' | 'lg' // Override max-width
  stackButtonsOnMobile?: boolean // Default true
  dismissOnBackdrop?: boolean // Default true
}
```

---

## References in Codebase

### Similar Responsive Implementations:

- `SettingsMenu.scss` - Menu positioning variants
- `UserMenu.scss` - Dropdown height variants
- `BottomNav.scss` - Safe-area usage
- `Navbar.scss` - Flex direction switching
- `SignupPromptModal.scss` - Existing responsive modal

### Utility Functions Available:

- `@mixin respond-to(sm|md|lg|xl)` - Media queries
- `@mixin safe-transition()` - Motion accessibility
- `@mixin interactive-target()` - WCAG 2.2 AA
- `rem()` function - Pixel to rem conversion

---

## Notes on Current Modal.tsx Behavior

The Modal component already has:

- ✅ Focus management (focus on last button by default)
- ✅ Focus trap (Tab cycling)
- ✅ Escape key handling
- ✅ Body scroll locking
- ✅ Keyboard navigation (Enter on button)
- ✅ Accessible dialog role + ARIA

**These behaviors work on all screen sizes** - no changes needed for accessibility!

Only CSS needs updates for responsive layout.

---

## Dark Mode Already Working

Modal.scss lines 188-213 already have dark mode support via:

- CSS variables (--color-text, --color-bg, --color-surface)
- `@media (prefers-color-scheme: dark)` query
- CSS custom properties override system preference

**No changes needed** - just ensure new responsive rules also use variables.
