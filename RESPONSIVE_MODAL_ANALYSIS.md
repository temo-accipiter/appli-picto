# Analyse Responsive: Modals, Breakpoints & Patterns

## 1. BREAKPOINTS ACTUELS (Mobile-First)

**Définis dans**: `/src/styles/abstracts/_variables.scss` (lignes 84-88)

```scss
$breakpoint-sm: 576px;   // Petits appareils (tablets portrait)
$breakpoint-md: 768px;   // Appareils moyens (tablets landscape, small desktop)
$breakpoint-lg: 992px;   // Grands appareils (desktop)
$breakpoint-xl: 1200px;  // Très grands appareils (large desktop)
```

**Mixin responsive disponible** (`_mixins.scss` lignes 17-37):
```scss
@include respond-to(sm)  // @media (min-width: 576px)
@include respond-to(md)  // @media (min-width: 768px)
@include respond-to(lg)  // @media (min-width: 992px)
@include respond-to(xl)  // @media (min-width: 1200px)
```

**Approche**: Mobile-first (base = mobile, enhancement = desktop avec @include respond-to)

---

## 2. MODAL.SCSS - ÉTAT ACTUEL DES MEDIA QUERIES

**Fichier**: `/src/components/shared/modal/Modal.scss`

### Sizing Actuel:
```scss
.modal {
  max-width: 500px;
  width: 90%;              // 90% sur TOUS les appareils
  max-height: 90vh;        // 90% de la viewport height
  overflow: hidden;        // Le contenu scroll dans .modal__content
}
```

### Problèmes détectés:

1. **AUCUN media query pour modal**
   - La modal a la même taille sur mobile (320px) et desktop (1920px)
   - 500px max-width est trop large pour petit mobile (iPhone SE = 375px)
   - 90vh peut être trop hauteur sur petit viewport

2. **Comportement actuel**:
   - Mobile (320px): Modal = min(90% de 320 = 288px, 500px) = 288px ✓
   - Mobile (375px): Modal = min(337.5px, 500px) = 337.5px ✓
   - iPad (768px): Modal = min(691.2px, 500px) = 500px ⚠️ OK mais pas optimisé
   - Desktop (1920px): Modal = min(1728px, 500px) = 500px ✓

3. **Autres modals variants** qui ont media queries:
   - `SignupPromptModal.scss`: Utilise `@include respond-to(sm)` avec padding adapté
   - Montre que le pattern existe déjà dans le projet ✓

### Animations de modal:
```scss
@media (prefers-reduced-motion: reduce) {
  // Animations disabled pour accessibilité TSA
}
```

---

## 3. PATTERNS RESPONSIVE UTILISÉS DANS LE PROJET

### A. Pattern Menu/Dropdown (SettingsMenu.scss)

```scss
.settings-menu__dialog {
  width: min(300px, 90vw);        // Min entre 300px et 90% viewport

  // Desktop
  @media (min-width: 768px) {
    max-height: calc(100vh - 100px);
    animation: slideInDown 0.18s ease-out;
    margin: 64px 14px 0 0;         // Top positioning
  }

  // Mobile: bas-droite pour thumb-friendly
  @media (max-width: 767px) {
    margin: 0 14px 14px 0;         // Bottom positioning
    max-height: 70vh;
    animation: slideInUp 0.18s ease-out;
  }
}
```

**Pattern clé**:
- Desktop: Top positioning + slideInDown
- Mobile: Bottom positioning + slideInUp
- Safe-area support pour notches iPhone

### B. Pattern Bottom Nav (BottomNav.scss)

```scss
.bottom-nav {
  display: none;  // Desktop: hidden

  @media (max-width: 767px) {
    display: flex;
    position: fixed;
    top: 0;
    right: 0;
    padding-top: max($spacing-md, env(safe-area-inset-top));
    padding-right: max($spacing-md, env(safe-area-inset-right));
  }
}

.bottom-nav--tableau {
  @media (max-width: 767px) {
    top: auto;
    bottom: 0;  // Mobile: bottom-right
    padding-bottom: max($spacing-md, env(safe-area-inset-bottom));
  }

  @media (min-width: 768px) {
    display: flex;
    top: 0;     // Desktop: top-right
    right: 0;
  }
}
```

**Pattern clé**:
- Safe-area insets pour notches/home indicator
- Contextual positioning (top vs bottom)
- `env(safe-area-inset-*)` pour devices iOS

### C. Pattern Navbar (Navbar.scss)

```scss
.navbar {
  /* Mobile: column */
  flex-direction: column;
  align-items: flex-start;
  gap: $spacing-xs;
  height: auto;
  padding: $spacing-sm $spacing-md;

  @include respond-to(sm) {  // 576px+
    flex-direction: row;      /* Desktop: row */
    justify-content: space-between;
    height: rem(64);
    padding: 0 $spacing-lg;
  }
}

.navbar-left {
  width: 100%;  /* Mobile: full width */
  justify-content: center;
  flex-wrap: wrap;

  @include respond-to(sm) {
    width: auto;  /* Desktop: auto */
    justify-content: flex-start;
    flex-wrap: nowrap;
  }
}
```

**Pattern clé**:
- Flex direction switching (column ↔ row)
- Width adaptation (100% ↔ auto)
- Gap/spacing scale

### D. Pattern User Menu (UserMenu.scss)

```scss
.user-menu-dialog {
  width: min(92vw, 320px);

  // Desktop: top-right
  @media (min-width: 768px) {
    margin: 64px 14px 0 0;
    max-height: calc(100vh - 100px);
    animation: slideInDown 0.18s ease-out;
  }

  // Mobile: bottom-right
  @media (max-width: 767px) {
    margin: 0 14px 14px 0;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideInUp 0.18s ease-out;
  }

  // Sur pages edit/profile (needs higher position)
  &.user-menu-dialog--elevated {
    @media (max-width: 767px) {
      max-height: 70vh;  // Moins de hauteur
    }
  }
}
```

**Pattern clé**:
- Positional variants avec états (`.--elevated`)
- Dynamic max-height sur mobile vs desktop
- Different animations directions

### E. Pattern SignupPrompt Modal (SignupPromptModal.scss)

```scss
.signup-prompt-modal {
  width: 95vw;
  margin: 20px;
  max-width: 500px;

  @include respond-to(sm) {  // 576px+
    width: 90vw;
    max-width: 500px;
    margin: auto;  /* Auto center on desktop */
  }
}

/* Padding adaptation */
.modal-header {
  padding: 20px 20px 16px;  /* Mobile */

  @include respond-to(sm) {
    padding: 24px 24px 16px;  /* Desktop */
  }
}
```

---

## 4. COMPOSANTS RESPONSIFS (Patterns à appliquer aux modals)

### Button (min-height: 44px WCAG)
```scss
.btn {
  min-height: rem(44);  // WCAG 2.2 AA interactive target
  padding: $spacing-xs $spacing-sm;
  // Pas de media query - sizing fixe (bonne pratique pour accessibilité)
}
```

### Input Field
```scss
.input-field__input {
  min-height: rem(44);  // WCAG 2.2 AA
  max-width: 11.5rem;
  padding: rem(8);
  font-size: rem(16);  // Important: 16px min pour éviter zoom iPhone
}
```

### SelectWithImage (Dropdown)
```scss
.select-with-image__trigger {
  min-height: rem(44);
  width: 100%;  // Full width sur mobile
  padding: rem(8) $spacing-sm;
}

.select-with-image__content {
  width: var(--radix-select-trigger-width);  // Match trigger width
  max-height: var(--radix-select-content-available-height);  // Auto height
  // Radix UI handle responsive positioning!
}
```

### Interactive Target Size
```scss
// WCAG 2.2 AA: minimum 44px x 44px
@mixin interactive-target {
  min-height: rem(44);
  min-width: rem(44);
}
```

---

## 5. VARIABLES SPACING & SIZING

**Spacing scale** (défini dans `_variables.scss`):
```scss
$spacing-xxs: 0.25rem;   // 4px
$spacing-xs: 0.5rem;     // 8px
$spacing-sm: 0.75rem;    // 12px
$spacing-md: 1rem;       // 16px (base)
$spacing-lg: 1.5rem;     // 24px
$spacing-xl: 2rem;       // 32px
```

**Font sizes**:
```scss
$font-size-sm: 0.875rem;  // 14px
$font-size-base: 1rem;    // 16px (minimum pour inputs = évite zoom iPhone)
$font-size-lg: 1.25rem;   // 20px
$font-size-xl: 1.5rem;    // 24px
```

**Helper function `rem()`** (définit dans `_functions.scss`):
```scss
@function rem($px) {
  @return math.div($px, 16) * 1rem;
}
// Usage: rem(44) → 2.75rem → 44px (if base 16px)
```

---

## 6. DARK MODE & ANIMATIONS

### Dark Mode (CSS Variables + @media query)
```scss
// Light mode (default)
:root {
  --color-text: #333333;
  --color-bg: #ffffff;
  --color-surface: #f7f7f7;
}

// Dark mode via prefers-color-scheme
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #f0f0f0;
    --color-bg: #1a1a2e;
    --color-surface: #252538;
  }
}

// Dark mode via data attribute
[data-theme='dark'] {
  --color-text: #f0f0f0;
  --color-bg: #1a1a2e;
}
```

### Motion Accessibility (prefers-reduced-motion)
```scss
@media (prefers-reduced-motion: reduce) {
  // Toutes les animations → duration 0.001ms
  // + animation-iteration-count: 1
  // + transition-duration: 0.001ms
}

// Mixin safe pour animations
@mixin safe-transition($property: all, $duration: $transition-fast) {
  transition: $property $duration ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```

---

## 7. Z-INDEX STACK

```scss
$z-overlay: 1000;      // Modal overlay
$z-modal: 1100;        // Modal content
$z-tooltip: 1200;      // Tooltips (highest)
```

---

## 8. ÉTAT ACTUEL MODAL VS. PROBLÈMES

### Current Modal.scss Limits:

| Aspect | Actuel | Problème |
|--------|--------|---------|
| **Mobile sizing** | 90% width, 500px max | OK pour >320px, mais peut être amélioré |
| **Mobile height** | 90vh | Peut être trop sur petits écrans |
| **Padding** | $spacing-lg $spacing-md (24px 16px) | Peut causer overflow sur très petit mobile |
| **Title font size** | $font-size-xl (24px) | Peut sembler grand sur 320px mobile |
| **Content padding** | $spacing-lg $spacing-md | Peut réduire contenu visible |
| **Media queries** | NONE | Aucune adaptation par breakpoint |
| **Safe-area** | NOT USED | Pas de support pour notches iPhone |
| **Fullscreen mode** | NONE | Pas d'option fullscreen mobile |
| **Drawer/Slide-up** | NONE | Pas de variant slide-up pour mobile |

---

## 9. PATTERNS RECOMMANDÉS POUR PHASE 2 (Basés sur codebase actuel)

### A. Responsive Modal Variants

**Option 1: Media Query Approach (Similar to SettingsMenu)**
```scss
.modal {
  width: 90%;
  max-width: 500px;

  // Mobile (320px - 767px)
  @media (max-width: 767px) {
    width: 95vw;
    max-width: calc(100% - 32px);  // 16px padding each side
    max-height: calc(100vh - 40px);  // 20px top/bottom buffer

    .modal__title {
      font-size: $font-size-lg;  // Reduce from 24px to 20px
    }
  }

  // Tablet (768px - 992px)
  @media (min-width: 768px) and (max-width: 991px) {
    width: 90%;
    max-width: 600px;
  }

  // Desktop (992px+)
  @media (min-width: 992px) {
    width: 90%;
    max-width: 700px;
  }
}
```

### B. Fullscreen Variant (Mobile)

```scss
.modal--fullscreen {
  @media (max-width: 767px) {
    width: 100%;
    height: 100vh;
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;  // Remove corners on fullscreen

    .modal__header {
      padding: $spacing-md;  // Reduce padding
    }

    .modal__content {
      flex: 1;
      min-height: 0;  // Important for flex overflow
    }
  }
}
```

### C. Slide-up/Drawer Variant (Mobile)

```scss
.modal-overlay--drawer {
  align-items: flex-end;  // Bottom positioning

  @media (min-width: 768px) {
    align-items: center;  // Center on desktop
  }
}

.modal--drawer {
  width: 100%;
  max-width: 100%;
  max-height: 70vh;
  border-radius: $radius-lg $radius-lg 0 0;  // Rounded top only

  @media (min-width: 768px) {
    width: 90%;
    max-width: 500px;
    border-radius: $radius-lg;  // All corners rounded
    max-height: 90vh;
  }
}
```

### D. Safe Area Support

```scss
.modal--safe-area {
  @media (max-width: 767px) {
    width: calc(100% - 2 * max($spacing-md, env(safe-area-inset-left, $spacing-md)));
    padding-left: max($spacing-md, env(safe-area-inset-left, $spacing-md));
    padding-right: max($spacing-md, env(safe-area-inset-right, $spacing-md));
  }
}
```

### E. Portrait/Landscape Support

```scss
// iOS-specific landscape detection
@media (max-height: 500px) {
  .modal {
    max-height: calc(100vh - 20px);  // Tighter constraints

    .modal__header {
      padding: $spacing-sm $spacing-md;  // Reduce vertical padding
    }
  }
}
```

---

## 10. ACCESSIBLE SIZING GUIDELINES (WCAG 2.2 AA)

### Used Throughout Project:
- **Interactive targets**: minimum 44px × 44px (buttons, inputs, toggles)
- **Focus ring**: 2px solid with 2px offset
- **Font sizes**: minimum 16px in inputs (prevents iPhone zoom)
- **Contrast ratios**: 4.5:1 for text, 3:1 for UI components

### Modal-Specific:
- Header title should remain readable (16px minimum on mobile)
- Button footer targets: ensure 44px minimum height
- Content padding: minimum 12px (avoid edge clipping on notch devices)
- Scrollable content: 8px scrollbar width

---

## 11. ANIMATION CONTROLS

### Existing Animations Used:
```scss
$transition-fast: 0.2s;    // Quick interactions
$transition-base: 0.3s;    // Default animations
$transition-slow: 0.5s;    // Slow emphasis animations
```

### Modal Animations:
```scss
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### Reduced Motion Handling:
```scss
@media (prefers-reduced-motion: reduce) {
  .modal-overlay {
    animation: none;
    opacity: 1;
  }

  .modal {
    animation: none;
    transform: scale(1);
    opacity: 1;
  }
}
```

---

## 12. SAFE-AREA & NOTCH SUPPORT

**Pattern used in BottomNav**:
```scss
padding-top: max($spacing-md, env(safe-area-inset-top));
padding-right: max($spacing-md, env(safe-area-inset-right));
padding-bottom: max($spacing-md, env(safe-area-inset-bottom));
padding-left: max($spacing-md, env(safe-area-inset-left));
```

**Why important for modals**:
- iPhone notch (top)
- iPhone home indicator (bottom)
- Android system gestures (sides)
- Landscape mode safe areas

---

## 13. KEY MIXIN REFERENCE

### `respond-to()` - Mobile-first
```scss
@include respond-to(sm) { }   // 576px+
@include respond-to(md) { }   // 768px+
@include respond-to(lg) { }   // 992px+
@include respond-to(xl) { }   // 1200px+
```

### `safe-transition()` - Motion accessibility
```scss
@include safe-transition($property, $duration) {
  // Auto-adds prefers-reduced-motion: reduce
}
```

### `interactive-target()` - WCAG compliance
```scss
@include interactive-target { }  // min 44×44px
```

### `focus-ring()` - Accessible focus
```scss
@include focus-ring($color, $width, $offset) {
  // WCAG 2.4.7 compliant outline
}
```

---

## 14. NEXT STEPS FOR PHASE 2

1. **Add media queries to Modal.scss** following SettingsMenu pattern
2. **Create modal variants**:
   - `.modal--compact` (mobile-optimized)
   - `.modal--drawer` (slide-up variant)
   - `.modal--fullscreen` (full viewport)
3. **Implement safe-area support** for notch devices
4. **Test with**:
   - iPhone SE (375px × 667px)
   - iPhone Pro Max (430px × 932px)
   - iPad (768px × 1024px)
   - iPad Pro (1024px × 1366px)
   - Landscape modes

---

## 15. EXISTING MODAL VARIANTS IN CODEBASE

All modals inherit from base Modal component:

| Modal | Location | Usage |
|-------|----------|-------|
| Modal | `components/shared/modal/Modal.tsx` | Base component |
| ModalAjout | `components/shared/modal/modal-ajout/` | Task creation |
| ModalCategory | `components/shared/modal/modal-category/` | Category management |
| ModalConfirm | `components/shared/modal/modal-confirm/` | Confirmations |
| ModalQuota | `components/shared/modal/modal-quota/` | Quota alerts |
| ModalRecompense | `components/shared/modal/modal-recompense/` | Reward display |
| PersonalizationModal | `components/shared/modal/modal-personalization/` | Settings |
| SignupPromptModal | `components/shared/modal/modal-signup-prompt/` | Premium signup |
| DeleteAccountModal | `components/features/settings/` | Account deletion |

---

## Summary Table: Responsive Patterns

| Component | Mobile | Tablet | Desktop | Pattern |
|-----------|--------|--------|---------|---------|
| Modal | 90% width | 90% width | 90% width + max-500px | Fixed |
| SettingsMenu | Bottom-right + slideInUp | Top-right | Top-right + slideInDown | Positioned |
| BottomNav | Fixed bottom | Hidden | Hidden | Display toggle |
| UserMenu | 80vh max-height | 80vh | calc(100vh-100px) | Height variant |
| Navbar | Column wrap | Row + responsive gap | Row | Flex direction |
| SignupPrompt | 95vw 20px margin | 90vw centered | 90vw + max-500px | Width variant |

