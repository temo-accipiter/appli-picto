# COMMON SCSS ERRORS — Appli-Picto

**Erreurs fréquentes et solutions rapides.**

---

## ❌ ERROR 1: Token inexistant — size('44')

### Symptôme

```
Error: Size token '44' not found in $size-tokens
```

### Cause

`size('44')` n'existe **PAS**. Il n'y a que `size('touch-target-min')` qui vaut 44px.

### Solution

```scss
// ❌ WRONG
min-height: size('44');
min-width: size('44');

// ✅ CORRECT
min-height: size('touch-target-min'); // 44px WCAG AA
min-width: size('touch-target-min'); // 44px WCAG AA

// ✅ ALTERNATIVE (TSA preferred)
min-height: size('touch-target-preferred'); // 56px
min-width: size('touch-target-preferred'); // 56px
```

### Why This Happens

Phase 6 tokens prioritized **semantic names** over raw numbers. `touch-target-min` auto-documents its accessibility purpose.

---

## ❌ ERROR 2: Spacing value inexistant — spacing('3'), spacing('5'), spacing('14')

### Symptom

```
Error: Spacing '3' not found in semantics, primitives, nor legacy tokens
```

### Cause

Grille **4px stricte UNIQUEMENT**. Pas de 3px, 5px, 7px, 14px, etc.

### Solution

```scss
// ❌ WRONG (violated grid)
padding: spacing('3'); // ❌ 3px not in grid
padding: spacing('5'); // ❌ 5px not in grid
padding: spacing('7'); // ❌ 7px not in grid
padding: spacing('14'); // ❌ 14px not in grid (legacy)

// ✅ CORRECT (4px grid strict)
padding: spacing('4'); // 4px OK (grille)
padding: spacing('8'); // 8px OK (grille)
padding: spacing('12'); // 12px OK (grille)
padding: spacing('16'); // 16px OK (grille)
padding: spacing('20'); // 20px OK (grille)

// ✅ BETTER (semantic)
padding: spacing('xs'); // 4px
padding: spacing('sm'); // 8px (TRÈS FRÉQUENT)
padding: spacing('md'); // 16px (TRÈS FRÉQUENT)
padding: spacing('lg'); // 24px (TRÈS FRÉQUENT)
```

### Why This Happens

**Audit frequency data** showed 4px-aligned spacing used 95%+ of time. Grille stricte forces consistency.

---

## ❌ ERROR 3: Wrong function — spacing vs size confusion

### Symptom

```
// Styles compile BUT layout breaks
width: spacing('300');  // Returns 18.75rem (18.75px??)
```

### Cause

`spacing()` = **respiration** (padding, margin, gap)
`size()` = **dimensions** (width, height, min/max)

**NEVER mix them.**

### Solution

```scss
// ❌ WRONG (semantics inverted)
width: spacing('300'); // ❌ WRONG FUNCTION
min-height: spacing('44'); // ❌ WRONG FUNCTION
max-width: spacing('540'); // ❌ WRONG FUNCTION

// ✅ CORRECT
width: size('300'); // ✅ Dimensions use size()
min-height: size('touch-target-min'); // ✅ 44px
max-width: size('modal-width-md'); // ✅ 540px

// ✅ SPACING CORRECT USES
padding: spacing('md'); // ✅ Respiration
margin-bottom: spacing('lg'); // ✅ Respiration
gap: spacing('sm'); // ✅ Respiration
```

### Mental Model

```
spacing = How much BREATHING between things (respiration)
size    = How BIG/SMALL the thing is (dimension)

Think of it like:
- Person's PERSONAL SPACE (spacing) ≠ Person's HEIGHT (size)
```

---

## ❌ ERROR 4: Hardcoded colors/sizes

### Symptom

```
// Build succeeds but:
// - Dark theme breaks
// - Accessibility audit fails
// - Refactoring becomes expensive
```

### Cause

Hardcoded values **bypass** design system. Theme switching can't work.

### Solution

```scss
// ❌ WRONG (hardcoded)
color: #1e293b;
background: #ffffff;
border: 1px solid #e2e8f0;
padding: 16px;
width: 540px;
border-radius: 12px;

// ✅ CORRECT (all tokens)
color: text('primary'); // #1e293b light, adjusted dark
background: surface('bg'); // #ffffff light, #0f172a dark
border: 1px solid surface('border'); // #e2e8f0 light, adjusted dark
padding: spacing('md'); // 16px (respiration)
width: size('modal-width-md'); // 540px (dimension)
border-radius: radius('card'); // 12px (semantic)
```

### Why This Happens

`pnpm build` doesn't catch hardcoded values (valid CSS). Only human review catches it.
**Always linter/review for hardcodes.**

---

## ❌ ERROR 5: Wrong import path

### Symptom

```
Error: Can't find module '../abstracts'
Error: Can't find module './tokens'
```

### Cause

Using **relative imports** or missing `@/` alias.

### Solution

```scss
// ❌ WRONG (relative)
@use '../abstracts' as *;
@use '../../styles/abstracts' as *;
@use './tokens' as *;

// ✅ CORRECT (absolute with alias)
@use '@styles/abstracts' as *;
```

### Setup

Alias `@/` is configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@styles/*": ["./src/styles/*"]
    }
  }
}
```

---

## ❌ ERROR 6: surface() token doesn't exist

### Symptom

```
Error: Semantic surface color 'warning-subtle' not found
```

### Cause

Tried to use `surface('warning-subtle')` which doesn't exist.

### Solution

```scss
// ❌ WRONG (non-existent token)
background: surface('warning-subtle'); // ❌ Doesn't exist
background: surface('info-light'); // ❌ Doesn't exist

// ✅ CORRECT (use semantic())
background: semantic('warning', 'light'); // #ffedd5
background: semantic('info', 'light'); // #e0f2fe

// ✅ OR surface() for standard roles
background: surface('bg'); // #ffffff
background: surface('page'); // #f8fafc
background: surface('overlay'); // #f1f5f9
background: surface('soft'); // #f8fafc
background: surface('hover'); // #f8fafc
```

### Available surface() tokens

```scss
surface('bg')       // Card/component bg (#ffffff)
surface('page')     // Page background (#f8fafc)
surface('card')     // Card background (#ffffff)
surface('overlay')  // Overlay semi-transparent (#f1f5f9)
surface('border')   // Border color (#e2e8f0)
surface('divider')  // Separator (#f1f5f9)
surface('hover')    // Hover state bg (#f8fafc)
surface('soft')     // Soft background (#f8fafc)
```

---

## ❌ ERROR 7: Hardcoded focus styles

### Symptom

```scss
&:focus {
  outline: blue; // ❌ Generic browser default
}
```

### Cause

Using browser default focus instead of WCAG AA custom focus.

### Solution

```scss
// ❌ WRONG (browser default)
&:focus {
  outline: blue;
}

// ❌ WRONG (outline but not :focus-visible)
&:focus {
  outline: 2px solid blue;
}

// ✅ CORRECT (WCAG 2.2 AA pattern)
&:focus {
  outline: none; // Remove default outline
}

&:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

// ✅ ALTERNATIVE with box-shadow (if outline doesn't work)
&:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: var(--color-primary);
}
```

### Why This Matters

- **:focus** = Always triggered (keyboard + mouse) — hide default outline
- **:focus-visible** = Keyboard-only (better UX for mouse users)
- **WCAG AA** = 2px outline, 4.5:1 contrast minimum

---

## ❌ ERROR 8: Responsive desktop-first

### Symptom

```scss
// Mobile layout breaks at breakpoint
// Layout thrashes during responsive
```

### Cause

Using `@media (max-width)` desktop-first instead of mobile-first.

### Solution

```scss
// ❌ WRONG (desktop-first)
@media (max-width: 768px) {
  padding: 8px; // Mobile hacks
}

// ✅ CORRECT (mobile-first)
.component {
  padding: spacing('sm'); // Mobile base

  @include respond-to('md') {
    // 768px+ (tablet+)
    padding: spacing('lg');
  }

  @include respond-to('lg') {
    // 1024px+ (desktop+)
    padding: spacing('xl');
  }
}
```

### Breakpoints (mobile-first ONLY)

```scss
@include respond-to('sm')   // min-width: 576px
@include respond-to('md')   // min-width: 768px
@include respond-to('lg')   // min-width: 1024px
@include respond-to('xl')   // min-width: 1200px
@include respond-to('xxl')  // min-width: 1536px

// ❌ NEVER
@media (max-width: 768px) { ... }   // ❌ FORBIDDEN
@media screen and (max-width: ...) { ... }  // ❌ FORBIDDEN
```

---

## ❌ ERROR 9: Transitions without prefers-reduced-motion

### Symptom

```
// Users with prefers-reduced-motion see animations anyway
// (breaks accessibility for vestibular disorders)
```

### Cause

Direct `transition:` property without checking `prefers-reduced-motion`.

### Solution

```scss
// ❌ WRONG (ignores prefers-reduced-motion)
.button {
  transition: all 0.3s ease;
}

// ✅ CORRECT (uses mixin)
.button {
  @include safe-transition(background-color, timing('fast'), easing('smooth'));
}

// ✅ ALTERNATIVE (manual)
.button {
  @media (prefers-reduced-motion: no-preference) {
    transition: background-color timing('fast') easing('smooth');
  }
}
```

### What safe-transition() does

```scss
@mixin safe-transition(
  $properties: all,
  $timing: timing('base'),
  $easing: easing('smooth')
) {
  @media (prefers-reduced-motion: no-preference) {
    transition: $properties $timing $easing;
  }
}
```

**It only applies transition if user allows motion.**

---

## ❌ ERROR 10: Touch targets < 44px

### Symptom

```
// Buttons too small to tap reliably on mobile
// Accessibility audit fails (WCAG AA)
```

### Cause

Components with min-height/width < 44px.

### Solution

```scss
// ❌ WRONG (too small)
.button {
  height: 32px; // ❌ < 44px
  width: auto; // ❌ Could be < 44px
}

// ✅ CORRECT (WCAG AA)
.button {
  @include touch-target('min'); // 44×44px minimum
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

// ✅ ALTERNATIVE (TSA preferred)
.button {
  @include touch-target('preferred'); // 56×56px TSA-optimal
}

// ✅ MANUAL
.button {
  min-height: size('touch-target-min'); // 44px
  min-width: size('touch-target-min'); // 44px
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### WCAG AA Accessibility

- **44×44px** = Minimum (WCAG AA)
- **48×48px** = Optimal (good compromise)
- **56×56px** = TSA Preferred (autism-friendly)

---

## ❌ ERROR 11: Long animation durations (TSA)

### Symptom

```
// Users with TSA find fast animations disorienting
// Code uses durations > 0.3s
```

### Cause

Using `transition: all 1s` or `animation: 2s` (too long for TSA).

### Solution

```scss
// ❌ WRONG (too long for TSA)
transition: all 1s ease; // ❌ 1s is too long
animation: spin 2s linear infinite; // ❌ 2s is way too long

// ✅ CORRECT (TSA-safe max 0.3s)
@include safe-transition(
  background-color,
  timing('fast'),
  // 0.15s
  easing('smooth')
);

// ✅ FOR FEEDBACK
@include safe-transition(
  all,
  timing('base'),
  // 0.2s
  easing('smooth-out')
);

// ✅ MAXIMUM (for reveals/modals)
animation: fadeIn timing('reveal') easing('smooth-out'); // 0.4s max
```

### Timing Scale (TSA-optimized)

```
instant   0.1s  ← Immediate feedback (focus)
fast      0.15s ← Hover, button click
base      0.2s  ← State changes (standard)
slow      0.3s  ← Longer transitions (max TSA)
reveal    0.4s  ← Reveals/modals (exception only)

❌ NEVER > 0.4s (except animations with prefers-reduced-motion)
```

---

## ❌ ERROR 12: Missing @use at component top

### Symptom

```
Error: Undefined variable 'text'
Error: Undefined mixin 'respond-to'
```

### Cause

Forgot `@use '@styles/abstracts' as *;` at component .scss top.

### Solution

```scss
// ❌ WRONG (forgot import)
.button {
  color: text('primary'); // ❌ text is undefined!
}

// ✅ CORRECT
@use '@styles/abstracts' as *;

.button {
  color: text('primary'); // ✅ Works
  padding: spacing('md'); // ✅ Works
  @include respond-to('md') {
    // ✅ Works
    padding: spacing('lg');
  }
}
```

### CRITICAL: Always first line

```scss
// ✅ ONLY import at very top
@use '@styles/abstracts' as *;

// Then component SCSS
.component { ... }
```

---

## ✅ QUICK CHECKLIST

Before committing SCSS:

- [ ] `pnpm build` succeeds (not just `pnpm dev`)?
- [ ] No hardcoded px/rem/hex/rgb values?
- [ ] All tokens exist in `_tokens.scss`?
- [ ] spacing() for padding/margin/gap ONLY?
- [ ] size() for width/height/min/max?
- [ ] text()/surface()/semantic() for colors?
- [ ] Focus visible (:focus-visible) implemented?
- [ ] Touch targets ≥ 44px?
- [ ] Animations ≤ 0.3s?
- [ ] Mobile-first responsive (@include respond-to)?
- [ ] prefers-reduced-motion respected?
- [ ] `@use '@styles/abstracts' as *;` at top?

---

**Last Updated**: 2026-04-25
**Most Common Errors Covered**: 12
**Prevention Strategy**: Token-first + checklist
