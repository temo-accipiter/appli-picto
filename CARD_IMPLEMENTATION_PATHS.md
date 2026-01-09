# Card Components - File Paths & Implementation Reference

**Date**: 2026-01-09
**Purpose**: Absolute file paths and exact locations for all fixes
**Scope**: Complete reference for developers implementing changes

---

## ABSOLUTE FILE PATHS

### Component Files

```
BaseCard
├─ TypeScript: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/base-card/BaseCard.tsx
├─ Styles: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/base-card/BaseCard.scss
└─ Size: 162 lines TS + 159 lines SCSS

EditionCard
├─ TypeScript: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/edition-card/EditionCard.tsx
├─ Styles: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/edition-card/EditionCard.scss
└─ Size: 42 lines TS + 14 lines SCSS

TableauCard
├─ TypeScript: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/tableau-card/TableauCard.tsx
├─ Styles: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/tableau-card/TableauCard.scss
└─ Size: 130 lines TS + 114 lines SCSS
```

### Export Files

```
Primary Exports
├─ src/components/index.ts
│  ├─ Line 53: export BaseCard
│  ├─ Line 54: export EditionCard
│  └─ Line 55: export TableauCard
│
└─ src/components/shared/index.ts
   ├─ Line 33: export BaseCard
   ├─ Line 34: export EditionCard
   └─ Line 35: export TableauCard
```

### Hook Dependencies

```
Hooks Used
├─ useI18n: /Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useI18n.ts
├─ useReducedMotion: /Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useReducedMotion.ts
├─ useDragAnimation: /Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useDragAnimation.ts
├─ useAudioContext: /Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useAudioContext.ts
└─ useDraggable: @dnd-kit/core (external package)
```

### Component Dependencies

```
UI Components Used
├─ InputWithValidation: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/input-with-validation/InputWithValidation.tsx
├─ Select: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/ui/select/Select.tsx
├─ Checkbox: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/ui/checkbox/Checkbox.tsx
├─ ImagePreview: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/ui/image-preview/ImagePreview.tsx
├─ ButtonDelete: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/ui/button/button-delete/ButtonDelete.tsx
├─ SignedImage: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/signed-image/SignedImage.tsx
└─ DemoSignedImage: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/demo-signed-image/DemoSignedImage.tsx
```

### Usage in Application

```
TachesEdition
├─ Path: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/features/taches/taches-edition/TachesEdition.tsx
├─ Usage: EditionCard imported + rendered in loop
└─ Lines: 6, 130-160 (EditionCard usage)

RecompensesEdition
├─ Path: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/features/recompenses/recompenses-edition/RecompensesEdition.tsx
├─ Usage: EditionCard imported + rendered in loop
└─ Lines: 5, 140-170 (EditionCard usage)

TachesDnd
├─ Path: /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/features/taches/taches-dnd/TachesDnd.tsx
├─ Usage: TableauCard imported + rendered in DroppableSlot
└─ Lines: 9, 134-160 (TableauCard usage)
```

---

## PHASE 1: CRITICAL FIXES (Line-by-Line Changes)

### Fix #1: Focus Ring Visible

**File**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/base-card/BaseCard.scss`

**Location**: Lines 152-155

**Current Code**:

```scss
&:focus-within {
  box-shadow: shadow('elevation-md');
  outline: none;
}
```

**Replace With**:

```scss
&:focus-within {
  box-shadow:
    shadow('elevation-md'),
    0 0 0 2px semantic('focus');
  outline: 2px solid transparent;
}

// Also add modern CSS (optional, better support):
&:focus-visible {
  outline: 2px solid semantic('focus');
  outline-offset: 2px;
  box-shadow: shadow('elevation-md');
}
```

**Testing**:

```bash
# Manual test: Tab through cards, focus ring should be visible
# Automated test path: tests/components/shared/card/BaseCard.test.tsx
```

---

### Fix #2: Verify TableauCard Animation Duration

**File**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useDragAnimation.ts`

**Action**: Open and verify:

1. `transitionDuration` value (should be ≤ 0.3s for TSA)
2. `prefers-reduced-motion` support check

**If Missing**:

```typescript
// Add at top
import { useReducedMotion } from '@/hooks'

// Inside hook function:
const prefersReducedMotion = useReducedMotion()

// Return:
return {
  transitionDuration: prefersReducedMotion ? '0s' : '0.2s', // ← TSA conformant
  // ...
}
```

---

### Fix #3: Extract Inline Styles

**File**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/tableau-card/TableauCard.tsx`

**Location**: Lines 67-81

**Add Constants (at top of file, after imports)**:

```typescript
// DnD Style Constants
const DND_Z_INDEX = 1000
const DND_OPACITY = 0.92
const DND_SHADOW =
  '0 20px 40px rgba(0, 0, 0, 0.3), 0 10px 15px rgba(0, 0, 0, 0.2)'
const DND_TRANSITION_DURATION = '0.2s'
```

**Replace inline style object (lines 67-81)**:

```typescript
// BEFORE: Hardcoded values
const style = {
  zIndex: isDragging ? 1000 : 'auto',
  opacity: isDragging ? 0.92 : 1,
  boxShadow: isDragging ? '0 20px 40px rgba(0, 0, 0, 0.3)...' : undefined,
}

// AFTER: Using constants
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

---

### Fix #4: Improve Grayscale Communication

**File**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/tableau-card/TableauCard.scss`

**Location**: Lines 47-55 (the `.done` selector)

**Current Code**:

```scss
&.done {
  opacity: opacity('half');
  filter: grayscale(100%);

  span {
    text-decoration: line-through;
  }
}
```

**Replace With**:

```scss
&.done {
  opacity: opacity('half');
  filter: grayscale(100%) brightness(0.9);
  border: border-width('base') solid semantic('info'); // ← Color signal

  span {
    text-decoration: line-through; // ← Text signal
    color: semantic('info'); // ← Color signal
  }
}
```

---

## PHASE 2: REFACTORING (Multi-File Changes)

### Refactor #1: Remove EditionCard Wrapper

**Files to Modify**:

#### Step 1: Update src/components/features/taches/taches-edition/TachesEdition.tsx

**Location**: Line 6 (import)

```typescript
// BEFORE
import { EditionCard, ... } from '@/components'

// AFTER
import { BaseCard, ... } from '@/components'
```

**Location**: ~Line 130-160 (EditionCard usage)

```typescript
// BEFORE
<EditionCard
  {...cardProps}
  {...otherProps}
/>

// AFTER
<BaseCard
  editable
  {...cardProps}
  className="card-edition"
  {...otherProps}
/>
```

#### Step 2: Update src/components/features/recompenses/recompenses-edition/RecompensesEdition.tsx

**Same changes as TachesEdition** (find EditionCard, replace with BaseCard editable)

#### Step 3: Update export files

**File**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/index.ts`

**Location**: Line 54

```typescript
// REMOVE THIS LINE
export { default as EditionCard } from './shared/card/edition-card/EditionCard'
```

**File**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/index.ts`

**Location**: Line 34

```typescript
// REMOVE THIS LINE
export { default as EditionCard } from './card/edition-card/EditionCard'
```

#### Step 4: Delete EditionCard files

```bash
rm -rf /Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/edition-card/
```

---

### Refactor #2: Make Validation Rules Configurable

**File**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/base-card/BaseCard.tsx`

**Step 1**: Update interface (after line 43)

```typescript
// Add to BaseCardProps interface:
validationRules?: ValidationRule[]  // ← NEW
```

**Step 2**: Update function signature (line 45)

```typescript
// Add to destructuring:
validationRules,
```

**Step 3**: Update validation logic (lines 68-71)

```typescript
// BEFORE
const validationRules = useMemo(
  () => [makeValidateNotEmpty(t), makeNoEdgeSpaces(t), makeNoDoubleSpaces(t)],
  [t]
)

// AFTER
const defaultRules = useMemo(
  () => [makeValidateNotEmpty(t), makeNoEdgeSpaces(t), makeNoDoubleSpaces(t)],
  [t]
)

const effectiveRules = validationRules ?? defaultRules
```

**Step 4**: Update InputWithValidation call (line 128)

```typescript
// BEFORE
rules = { validationRules }

// AFTER
rules = { effectiveRules }
```

---

## PHASE 3: OPTIMIZATION (New Files)

### New File: useDndCard Hook

**Path**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useDndCard.ts`

**Create this file with content from Refactoring Guide P3.1**

Then update exports:
**File**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/index.ts`

Add:

```typescript
export { useDndCard } from './useDndCard'
```

---

### New File: DnD Design Tokens

**Path**: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/styles/abstracts/_dnd-tokens.scss`

**Create this file with content from Refactoring Guide P3.2**

Then import in TableauCard.scss:

```scss
@use '@styles/abstracts/dnd-tokens' as dnd;
```

---

## TESTING LOCATIONS

### Unit Tests

**BaseCard Tests**:

- Location: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/base-card/__tests__/BaseCard.test.tsx`
- Or: `/Users/accipiter_tell/projets/new_sup/appli-picto/tests/components/shared/card/BaseCard.test.tsx`

**TableauCard Tests**:

- Location: `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/card/tableau-card/__tests__/TableauCard.test.tsx`
- Or: `/Users/accipiter_tell/projets/new_sup/appli-picto/tests/components/shared/card/TableauCard.test.tsx`

**Run All Tests**:

```bash
cd /Users/accipiter_tell/projets/new_sup/appli-picto
pnpm test
pnpm test:coverage
```

---

## VALIDATION CHECKLIST

### Phase 1 Validation

```bash
# 1. Focus Ring Fix
cd /Users/accipiter_tell/projets/new_sup/appli-picto

# Linting
pnpm lint:fix

# Type checking
pnpm type-check

# Build test
pnpm build

# Unit tests
pnpm test

# Manual test: Tab through cards in dev server
pnpm dev
# Open http://localhost:3000
# Tab through cards → focus ring should be visible

# 2. Verify Animations
# Check useDragAnimation.ts file content
# Verify transitionDuration < 0.3s
# Verify prefers-reduced-motion support

# 3. All fixes
pnpm verify:quick
```

### Phase 2 Validation

```bash
# After EditionCard removal
pnpm build
pnpm test
pnpm type-check

# Verify imports
grep -r "EditionCard" src/ # Should return 0 results

# Check references in tests
grep -r "EditionCard" tests/
grep -r "EditionCard" cypress/
```

### Phase 3 Validation

```bash
# After hook extraction
pnpm build
pnpm test
pnpm type-check

# Verify new hook
ls -la src/hooks/useDndCard.ts # Should exist
grep -r "useDndCard" src/ # Should have imports
```

---

## GIT COMMIT MESSAGES

### Phase 1 Commits

```bash
# Commit 1: Fix A11y issues
git commit -m "fix(card): add visible focus ring for keyboard navigation

- Add focus-within outline to BaseCard (WCAG 2.4.7 compliance)
- Add focus-visible CSS for modern browser support
- Ensure keyboard users see focus indicator
- All cards now have visible focus state"

# Commit 2: Extract inline styles
git commit -m "refactor(tableau-card): extract hardcoded style values to constants

- Extract DND_Z_INDEX, DND_OPACITY, DND_SHADOW to constants
- Replace hardcoded values in style object
- Improve maintainability and consistency
- No behavior change"

# Commit 3: Improve grayscale communication
git commit -m "fix(tableau-card): improve 'done' state communication

- Add border color signal to grayscale filter
- Add color to text-decoration for clarity
- Multiple signals ensure accessibility for color-blind users
- Improves WCAG 2.4 compliance"
```

### Phase 2 Commits

```bash
# Commit 1: Remove EditionCard
git commit -m "refactor: remove EditionCard wrapper component

- Replace EditionCard with BaseCard editable=true
- Remove unnecessary wrapper indirection
- Simplify component hierarchy
- Update TachesEdition and RecompensesEdition imports"

# Commit 2: Make validation configurable
git commit -m "feat(base-card): make validation rules configurable

- Add validationRules prop to BaseCard
- Default to existing validation rules
- Allow custom validation per instance
- Improves extensibility"
```

### Phase 3 Commits

```bash
# Commit 1: Extract DnD hook
git commit -m "feat: extract useDndCard hook for reusability

- Extract drag-drop logic from TableauCard
- Create reusable useDndCard hook
- Improve testability and separation of concerns
- Enable reuse in other DnD components"

# Commit 2: Add DnD tokens
git commit -m "refactor(tableau-card): centralize DnD styles with tokens

- Create _dnd-tokens.scss with design tokens
- Replace inline hardcoded values with tokens
- Use semantic tokens for colors and shadows
- Improve maintainability and consistency"
```

---

## TROUBLESHOOTING REFERENCE

### If TypeScript errors occur after changes

```bash
# Regenerate types
pnpm db:types
pnpm type-check
```

### If imports are broken

```bash
# Check if exports are correct
grep "export.*BaseCard\|EditionCard\|TableauCard" src/components/index.ts

# Verify hook exports
grep "export.*useDndCard" src/hooks/index.ts
```

### If tests fail

```bash
# Run specific test file
pnpm test -- BaseCard.test.tsx

# Run with coverage
pnpm test:coverage

# Debug mode
pnpm test -- --debug
```

### If SCSS compiles fail

```bash
# Check SCSS syntax
npx sass src/components/shared/card/base-card/BaseCard.scss

# Lint SCSS
pnpm lint:scss

# Build CSS only
pnpm build:css
```

---

## REFERENCE FILES FOR COPY-PASTE

### Token names for SCSS

From `/Users/accipiter_tell/projets/new_sup/appli-picto/src/styles/abstracts/_variables.scss`:

```scss
// Colors
semantic('success')    // Green for checked
semantic('info')       // Blue for info
semantic('focus')      // Focus color

// Spacing
spacing('xs')          // 4px
spacing('sm')          // 8px
spacing('md')          // 16px

// Sizing
size('touch-target-min')      // 44px
size('touch-target-optimal')  // 56px

// Effects
radius('md')           // 12px
shadow('elevation-sm') // Small shadow
shadow('elevation-md') // Medium shadow
shadow('elevation-lg') // Large shadow

// Opacity
opacity('half')        // 50%
opacity('lg')          // 70%
opacity('md')          // 60%

// Timing & Easing
timing('fast')         // 0.15s
timing('base')         // 0.2s
easing('ease-out')     // ease-out curve
easing('bounce')       // bounce curve
```

---

**End of Implementation Paths Reference** | 2026-01-09

All absolute paths and exact locations for implementation are documented above.
Use Ctrl+F to search for specific file paths or components.
