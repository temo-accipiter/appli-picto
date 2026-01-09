# Guide de Refactoring - Composants Card

**Date** : 2026-01-09
**Audience** : Équipe développement
**Urgence** : Critique (A11y) > Important > Nice-to-have

---

## PHASE 1 : FIXES CRITIQUES (1-2 jours)

### Fix #1 : Focus Ring Visible ⭐ URGENT

**Problème** : BaseCard supprime outline sans remplacement → A11y clavier broken

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/base-card/BaseCard.scss`

**Lignes actuelles** (152-155):

```scss
&:focus-within {
  box-shadow: shadow('elevation-md');
  outline: none; // ❌ REMOVES outline without replacement
}
```

**Correction** :

```scss
// ✅ FIXED
&:focus-within {
  box-shadow:
    shadow('elevation-md'),
    0 0 0 2px semantic('focus');
  outline: 2px solid transparent; /* Fallback outline */
}

// Alternative: Modern CSS (better browser support)
&:focus-visible {
  outline: 2px solid semantic('focus');
  outline-offset: 2px;
  box-shadow: shadow('elevation-md');
}
```

**Validation** :

```bash
# Test keyboard navigation (Tab key)
# Visual focus ring should appear on cards
# Works in dark/light mode
# Respects system focus indicator preferences
```

**Impact** : 🟢 WCAG 2.4.7 Focus Visible - FIXED

---

### Fix #2 : Verify TableauCard Animation Duration

**Problème** : `useDragAnimation()` hook duration unknown → peut être trop rapide/lente

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useDragAnimation.ts`

**Action** :

1. Lire le fichier
2. Vérifier que `transitionDuration` < 0.3s (TSA conformité)
3. Vérifier support `prefers-reduced-motion`

**Code à vérifier** :

```typescript
// Dans useDragAnimation.ts
const transitionDuration = ??? // Should be in ms, e.g., '0.2s' or '200ms'

// If missing prefers-reduced-motion:
export function useDragAnimation(isDragging, isBeingSwapped) {
  const prefersReducedMotion = useReducedMotion()

  // ✅ Devrait retourner duration selon préférence
  return {
    transitionDuration: prefersReducedMotion ? '0s' : '0.2s',
    // ...
  }
}
```

**Si non-conforme** :

- Ajouter `useReducedMotion()` check
- Limiter duration à 0.2s max
- Tester avec `prefers-reduced-motion: reduce`

---

### Fix #3 : Extract Inline Styles (TableauCard)

**Problème** : Hardcoded values dans style inline TableauCard

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/tableau-card/TableauCard.tsx`

**Lignes** : 67-81

**Avant** :

```typescript
const style = {
  zIndex: isDragging ? 1000 : 'auto', // ❌ Hardcoded
  opacity: isDragging ? 0.92 : 1, // ❌ Hardcoded
  boxShadow: isDragging
    ? '0 20px 40px rgba(0, 0, 0, 0.3), 0 10px 15px rgba(0, 0, 0, 0.2)'
    : undefined, // ❌ Hardcoded
}
```

**Après** :

```typescript
// Ajouter au top du fichier
const DND_Z_INDEX = 1000
const DND_OPACITY = 0.92
const DND_SHADOW =
  '0 20px 40px rgba(0, 0, 0, 0.3), 0 10px 15px rgba(0, 0, 0, 0.2)'
const DND_TRANSITION_DURATION = '0.2s'

// ...

const style = {
  transform: buildTransform(transform),
  transition: `transform ${DND_TRANSITION_DURATION} cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow ${DND_TRANSITION_DURATION} ease-out, opacity 150ms ease`,
  touchAction: 'manipulation' as const,
  pointerEvents:
    isDraggingGlobal && !isDragging ? ('none' as const) : ('auto' as const),
  zIndex: isDragging ? DND_Z_INDEX : 'auto',
  opacity: isDragging ? DND_OPACITY : 1,
  cursor: isDragging ? 'grabbing' : 'grab',
  boxShadow: isDragging ? DND_SHADOW : undefined,
  willChange: isDragging ? 'transform' : undefined,
}
```

**Alternative (meilleur)** : Utiliser className + SCSS

```typescript
// TableauCard.tsx
<div
  className={`tableau-card ${isDragging ? 'dragging' : ''} ${done ? 'done' : ''}`}
  style={{
    transform: buildTransform(transform),
    touchAction: 'manipulation',
    pointerEvents: isDraggingGlobal && !isDragging ? 'none' : 'auto',
  }}
>
  {/* ... */}
</div>

// TableauCard.scss
.tableau-card {
  &.dragging {
    z-index: z-index('modal');       // ✅ From tokens
    opacity: opacity('lg');           // ✅ From tokens
    box-shadow: shadow('elevation-lg'); // ✅ From tokens
    cursor: grabbing;
  }
}
```

**Validation** :

```bash
# Verify values consistent with design tokens
# Test in light/dark mode
# Verify animation still smooth
```

---

### Fix #4 : Grayscale State Communication

**Problème** : TableauCard.scss ligne 50 : `filter: grayscale(100%)` sans fallback couleur

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/tableau-card/TableauCard.scss`

**Avant** :

```scss
&.done {
  opacity: opacity('half');
  filter: grayscale(100%); // ❌ Color-only communication

  span {
    text-decoration: line-through; // ✅ Good
  }
}
```

**Après** :

```scss
&.done {
  opacity: opacity('half');
  filter: grayscale(100%) brightness(0.9); // ✅ Plus distinc
  border-color: semantic('info'); // ✅ Color + other signals

  span {
    text-decoration: line-through; // ✅ Good
  }
}
```

**Alternative (plus accessible)** :

```scss
&.done {
  opacity: opacity('half');
  border: 2px solid semantic('info'); // ✅ Visual signal

  img,
  .tableau-card__image {
    filter: grayscale(100%) brightness(0.9);
  }

  span {
    text-decoration: line-through; // ✅ Text signal
    color: semantic('info'); // ✅ Color signal
  }
}
```

**Validation** :

```bash
# Test with color-blind mode (Chrome DevTools)
# Multiple signals present: color + filter + text-decoration + border
```

---

## PHASE 2 : REFACTORING SRP (3-5 jours)

### Refactor #1 : Focus Ring Visible + Keyboard Navigation

**Objectif** : Améliorer focus management complet

**Changes** :

1. **BaseCard.tsx** : Ajouter aria-controls si actions associées

```typescript
// Ligne 106-123 : Actions section
<div className="base-card__actions" role="group" aria-label={t('card.actions')}>
  {onDelete && (
    <ButtonDelete
      onClick={disabled ? () => {} : onDelete}
      aria-label={t('card.delete')}
    />
  )}

  {onToggleCheck && (
    <Checkbox
      id={`base-checkbox-${labelId}`}
      checked={checked}
      onChange={e => !disabled && onToggleCheck?.(e.target.checked)}
      aria-label={completed ? t('card.completed') : t('card.active')}
      size="md"
    />
  )}
</div>
```

2. **BaseCard.scss** : Ajouter focus ring robuste

```scss
.base-card {
  // Existing styles...

  // Keyboard focus (Tab key)
  &:focus-within {
    box-shadow:
      shadow('elevation-md'),
      inset 0 0 0 2px semantic('focus');
    outline: 2px solid transparent;
  }

  // Explicit focus-visible (modern browsers)
  &:focus-visible {
    outline: 2px solid semantic('focus');
    outline-offset: 2px;
  }

  // Button focus states
  button:focus-visible,
  [role='checkbox']:focus-visible {
    outline: 2px solid semantic('focus');
    outline-offset: 2px;
  }
}
```

---

### Refactor #2 : Supprimer EditionCard (Wrapper Inutile)

**Problème** : EditionCard ne fait que wrapper BaseCard avec `editable=true`

**Status** : 42 lignes inutiles + 14 lignes SCSS vide

**Approche 1 : Supprimer completement**

```bash
# Étape 1 : Remplacer tous usages
# Find & Replace dans TachesEdition.tsx et RecompensesEdition.tsx

# Avant
import { EditionCard } from '@/components'
<EditionCard {...props} />

# Après
import { BaseCard } from '@/components'
<BaseCard editable {...props} className="card-edition" />

# Étape 2 : Mettre à jour export
# src/components/index.ts - Supprimer EditionCard export
# src/components/shared/index.ts - Supprimer EditionCard export

# Étape 3 : Supprimer fichiers
rm -rf src/components/shared/card/edition-card/
```

**Approche 2 : Gardez EditionCard comme alias (if still useful for typing)**

```typescript
// EditionCard.tsx - Simplified
import BaseCard from './base-card/BaseCard'

// Type alias for documentation
export type EditionCardProps = React.ComponentProps<typeof BaseCard> & {
  // Force editable=true (documentation only)
}

export default function EditionCard(props: EditionCardProps) {
  return <BaseCard editable {...props} className="card-edition" />
}
```

**Migration Steps** :

1. Add `className="card-edition"` to BaseCard usages
2. Remove EditionCard from imports
3. Delete EditionCard files

**Code Changes** :

```typescript
// TachesEdition.tsx (find & replace)
// BEFORE
import { EditionCard } from '@/components'
// ...
<EditionCard {...cardProps} />

// AFTER
import { BaseCard } from '@/components'
// ...
<BaseCard editable {...cardProps} className="card-edition" />
```

---

### Refactor #3 : Extraire Validation Rules (Flexible)

**Problème** : Validation hardcodée dans BaseCard, non-extensible

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/base-card/BaseCard.tsx`

**Avant (Lignes 68-71)** :

```typescript
const validationRules = useMemo(
  () => [makeValidateNotEmpty(t), makeNoEdgeSpaces(t), makeNoDoubleSpaces(t)],
  [t]
)
```

**Après** :

```typescript
interface BaseCardProps {
  // ... existing props ...
  validationRules?: ValidationRule[] // ← NEW: configurable
}

const BaseCard = memo(function BaseCard({
  // ... existing props ...
  validationRules,
  // ...
}: BaseCardProps) {
  // ...

  // Défaut + custom
  const defaultRules = useMemo(
    () => [makeValidateNotEmpty(t), makeNoEdgeSpaces(t), makeNoDoubleSpaces(t)],
    [t]
  )

  const effectiveRules = validationRules ?? defaultRules

  // ...

  <InputWithValidation
    // ...
    rules={effectiveRules}  // ← Use effective rules
    // ...
  />
})
```

**Usage** :

```typescript
// Default validation (existing behavior)
<BaseCard {...props} />

// Custom validation
<BaseCard
  {...props}
  validationRules={[
    makeValidateNotEmpty(t),
    makeMaxLength(t, 50),
    makeMinLength(t, 3),
  ]}
/>
```

---

### Refactor #4 : Split BaseCard into Compound Components

**Objectif** : Réduire 43 props → 3-4 sous-composants clairs

**Nouvelle Architecture** :

```typescript
// src/components/shared/card/card-base/ (new directory)

// 1. CardBase (container)
// 2. CardImage (image section)
// 3. CardContent (label + metadata)
// 4. CardActions (delete + checkbox)

// Usage:
<CardBase size="md" disabled={disabled}>
  <CardImage url={image} component={imageComponent} />
  <CardContent>
    <CardLabel
      value={label}
      editable={editable}
      onChange={onLabelChange}
      onBlur={onBlur}
      validationRules={rules}
    />
    <CardCategory
      value={categorie}
      options={categorieOptions}
      onChange={onCategorieChange}
    />
  </CardContent>
  <CardActions>
    {onDelete && <CardAction.Delete onClick={onDelete} />}
    {onToggleCheck && <CardAction.Checkbox ... />}
  </CardActions>
</CardBase>
```

**Phase** : Long term - Incrementally refactor (1-2 sprints)

---

## PHASE 3 : OPTIMISATION (2-3 jours)

### Optimization #1 : Extract TableauCard DnD Logic

**Objectif** : Séparer DnD logic de composant visuel

**Nouveau Hook** : `useDndCard.ts`

```typescript
// src/hooks/useDndCard.ts
import { useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useDragAnimation, useAudioContext } from '@/hooks'

interface UseDndCardOptions {
  done?: boolean
  playSound?: boolean
}

export function useDndCard(
  tacheId: string | number,
  isDraggingGlobal: boolean,
  isBeingSwapped: boolean,
  toggleDone: (id: string | number, newDone: boolean) => void,
  options?: UseDndCardOptions
) {
  const { done = false, playSound = true } = options || {}

  // DnD from @dnd-kit
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: tacheId.toString(),
    })

  // Animation
  const { transitionDuration, buildTransform } = useDragAnimation(
    isDragging,
    isBeingSwapped
  )

  // Audio
  const { playBeep } = useAudioContext()

  // Handler
  const handleCheck = useCallback(() => {
    if (!done && playSound) {
      playBeep(440) // La = 440 Hz
    }
    toggleDone(tacheId, !done)
  }, [done, playSound, playBeep, tacheId, toggleDone])

  return {
    // DnD
    attributes,
    listeners,
    setNodeRef,
    isDragging,

    // Animation
    transform: buildTransform(transform),
    transitionDuration,

    // Handler
    handleCheck,
  }
}
```

**Usage Simplifié** :

```typescript
// Before: Mixed concerns
function TableauCard({ tache, done, toggleDone, ... }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({...})
  const { transitionDuration, buildTransform } = useDragAnimation(...)
  const { playBeep } = useAudioContext()
  const handleCheck = useCallback(() => { ... }, [...])

  const style = {
    transform: buildTransform(transform),
    // ... 10+ lines of style ...
  }

  return (
    <div {...attributes} {...listeners} style={style}>
      {/* ... */}
    </div>
  )
}

// After: Clean separation
function TableauCard({ tache, done, toggleDone, isDraggingGlobal, isBeingSwapped, playSound }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    transform,
    transitionDuration,
    handleCheck,
  } = useDndCard(
    tache.id,
    isDraggingGlobal,
    isBeingSwapped,
    toggleDone,
    { done, playSound }
  )

  const style = {
    transform,
    transition: `transform ${transitionDuration} cubic-bezier(0.34, 1.56, 0.64, 1)...`,
    // ... shorter, cleaner ...
  }

  return (
    <div
      ref={setNodeRef}
      className={`tableau-card ${done ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
      style={style}
      {...attributes}
      {...listeners}
    >
      {/* ... */}
    </div>
  )
}
```

**Benefits** :

- Hook testable independently ✅
- Logic reusable in other DnD components ✅
- TableauCard focused on rendering ✅

---

### Optimization #2 : Design System Tokens for DnD

**New File** : `src/styles/abstracts/_dnd-tokens.scss`

```scss
// ============================================
// DnD DESIGN TOKENS
// ============================================

// Z-index for dragging
$dnd-z-index-dragging: z-index('modal');
$dnd-z-index-dragging-over: z-index('modal') + 10;

// Opacity for dragging states
$dnd-opacity-dragging: opacity('lg');
$dnd-opacity-over: 0.5;

// Shadows
$dnd-shadow-dragging: shadow('elevation-lg');
$dnd-shadow-over: inset 0 0 0 2px semantic('info');

// Animations
$dnd-transition-duration: timing('base');
$dnd-transition-easing: easing('bounce');

// Cursors (CSS native)
$dnd-cursor-grab: grab;
$dnd-cursor-grabbing: grabbing;

// Motion preferences (for prefers-reduced-motion)
@mixin dnd-safe-animation() {
  @media (prefers-reduced-motion: no-preference) {
    transition:
      transform #{$dnd-transition-duration} #{$dnd-transition-easing},
      box-shadow #{$dnd-transition-duration} ease-out;
  }
}
```

**Usage in TableauCard.scss** :

```scss
@use '@styles/abstracts/dnd-tokens' as dnd;
@use '@styles/abstracts' as *;

.tableau-card {
  &.dragging {
    z-index: dnd.$dnd-z-index-dragging;
    opacity: dnd.$dnd-opacity-dragging;
    box-shadow: dnd.$dnd-shadow-dragging;
    cursor: dnd.$dnd-cursor-grabbing;

    @include dnd.dnd-safe-animation();
  }

  &.over {
    box-shadow: dnd.$dnd-shadow-over;
  }
}
```

---

### Optimization #3 : Test Coverage Improvement

**Current** : Need to verify test coverage

**Add tests for** :

```typescript
// tests/components/shared/card/BaseCard.test.tsx

describe('BaseCard', () => {
  describe('Props Combinations', () => {
    it('renders correctly with editable=true', () => {
      // ...
    })

    it('renders correctly with editable=false', () => {
      // ...
    })

    it('disables interactions when disabled=true', () => {
      // ...
    })

    it('respects prefers-reduced-motion', () => {
      // Animation should be disabled
    })

    it('applies custom validation rules', () => {
      // ...
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      // ...
    })

    it('shows focus ring on keyboard navigation', () => {
      // Need to verify after fix #1
    })

    it('supports dark mode', () => {
      // ...
    })
  })
})

// tests/components/shared/card/TableauCard.test.tsx

describe('TableauCard', () => {
  describe('DnD Integration', () => {
    it('calls toggleDone on checkbox change', () => {
      // ...
    })

    it('plays beep sound on done transition', () => {
      // ...
    })

    it('respects playSound prop', () => {
      // ...
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels including done state', () => {
      // ...
    })

    it('handles grayscale color communication', () => {
      // ...
    })
  })
})
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes (DO FIRST)

- [ ] Fix focus ring outline (BaseCard.scss)
  - [ ] Test with Tab key navigation
  - [ ] Test in light/dark mode
  - [ ] Test in high contrast mode

- [ ] Verify TableauCard animation duration
  - [ ] Check useDragAnimation.ts file
  - [ ] Ensure < 0.3s (TSA conformité)
  - [ ] Verify prefers-reduced-motion support

- [ ] Extract inline styles (TableauCard.tsx)
  - [ ] Create constants for hardcoded values
  - [ ] Or move to TableauCard.scss with tokens
  - [ ] Test animation smoothness

- [ ] Improve grayscale state communication
  - [ ] Add additional visual signals
  - [ ] Test with color-blind simulator
  - [ ] Ensure multiple communication channels

- [ ] Run tests

  ```bash
  pnpm test
  pnpm test:coverage
  ```

- [ ] Type check
  ```bash
  pnpm type-check
  ```

### Phase 2: Refactoring (1-2 weeks)

- [ ] Remove/simplify EditionCard
  - [ ] Find all usages
  - [ ] Replace with BaseCard + className
  - [ ] Delete EditionCard files
  - [ ] Update exports

- [ ] Make validation rules configurable
  - [ ] Add `validationRules` prop to BaseCard
  - [ ] Default to existing rules
  - [ ] Test with custom rules

- [ ] Plan compound component split
  - [ ] Design new API
  - [ ] Create design doc
  - [ ] Plan migration path
  - [ ] Get team review

### Phase 3: Optimization (Later)

- [ ] Extract useDndCard hook
  - [ ] Create new hook file
  - [ ] Test independently
  - [ ] Update TableauCard

- [ ] Add DnD design tokens
  - [ ] Create \_dnd-tokens.scss
  - [ ] Update TableauCard.scss
  - [ ] Remove hardcoded values

- [ ] Improve test coverage
  - [ ] Add unit tests for prop combinations
  - [ ] Add accessibility tests
  - [ ] Add DnD integration tests

---

## GIT WORKFLOW

```bash
# Phase 1: Critical fixes
git checkout -b fix/card-accessibility
# Make changes
pnpm check && pnpm test
git add .
git commit -m "fix(card): improve focus ring and inline styles"
git push

# Phase 2: Refactoring
git checkout -b refactor/edition-card
# Remove EditionCard, etc.
pnpm check && pnpm test
git commit -m "refactor: remove EditionCard wrapper, improve validation config"

# Phase 3: Optimization
git checkout -b feat/dnd-hook
# Extract DnD logic
git commit -m "feat: extract useDndCard hook for reusability"
```

---

## SUCCESS CRITERIA

### Phase 1 (Critical)

- ✅ Focus ring visible on Tab key navigation
- ✅ All animations respect prefers-reduced-motion
- ✅ Inline styles extracted from TableauCard
- ✅ Grayscale state + other communication signals
- ✅ `pnpm verify:quick` passes
- ✅ WCAG 2.2 AA compliant for focus

### Phase 2 (Important)

- ✅ EditionCard removed or simplified
- ✅ Validation rules configurable
- ✅ Code duplicates reduced
- ✅ Props count more reasonable (< 25 for BaseCard)
- ✅ Test suite extends to cover new configurations

### Phase 3 (Nice-to-have)

- ✅ useDndCard hook extracted and tested
- ✅ DnD tokens centralized
- ✅ Code complexity reduced (CC < 10)
- ✅ Reusability increased (hook usable in other DnD components)

---

## ESTIMATED EFFORT

| Phase             | Task                | Effort   | Risk       |
| ----------------- | ------------------- | -------- | ---------- |
| 1                 | Focus ring fix      | 1h       | Low        |
| 1                 | Animation verify    | 30m      | Low        |
| 1                 | Inline styles       | 1h       | Low        |
| 1                 | Grayscale improve   | 1h       | Low        |
| 1                 | Testing             | 1h       | Low        |
| **Phase 1 Total** |                     | **4.5h** | **Low**    |
| 2                 | Remove EditionCard  | 2h       | Medium     |
| 2                 | Validation config   | 2h       | Medium     |
| 2                 | Testing + migration | 3h       | Medium     |
| **Phase 2 Total** |                     | **7h**   | **Medium** |
| 3                 | Extract useDndCard  | 3h       | Medium     |
| 3                 | DnD tokens          | 2h       | Low        |
| 3                 | Testing             | 2h       | Low        |
| **Phase 3 Total** |                     | **7h**   | **Medium** |

**Total Effort** : ~18.5 hours (2-3 days equivalent for 1 dev)

---

**End of Refactoring Guide** | 2026-01-09
