# SCSS Audit Summary - Quick Reference

## Key Findings at a Glance

| Metric               | Value                  |
| -------------------- | ---------------------- |
| **Total SCSS Lines** | 8,106                  |
| **Reducible to**     | ~6,200 (23% reduction) |
| **Effort**           | 14-22 hours            |
| **ROI**              | Very High              |

---

## Top 5 Redondancies

### 1. AdminPermissions.scss - Role Badge Duplication

- **Type** : Code duplication
- **Impact** : 236 lines identical code (3x)
- **Solution** : Extract `@mixin role-badge()` with `@each` loop
- **Savings** : 194 lines (-82%)

### 2. Box-Shadow Inconsistency

- **Type** : Hard-coded values (80 occurrences)
- **Impact** : Scattered across 20+ files
- **Solution** : Add 8 shadow variables to `_variables.scss`
- **Savings** : 72 references standardized

### 3. Card Component Pattern

- **Type** : Repeated structure (4+ files)
- **Impact** : 80% code duplication in card-like components
- **Solution** : Create `@mixin card-container()` with variants
- **Savings** : 160 lines consolidatable

### 4. Animation Declarations (@keyframes)

- **Type** : 8+ duplicates across components
- **Impact** : Same animations defined in 2-3 places
- **Solution** : Centralize in `_animations.scss`
- **Savings** : 80 lines

### 5. Media Queries

- **Type** : 45+ manual @media queries instead of mixin
- **Impact** : Some use max-width (violates mobile-first)
- **Solution** : Standardize on `@include respond-to()`
- **Savings** : Format consistency + maintainability

---

## Files to Refactor (Priority Order)

### CRITICAL - Highest ROI

```
AdminPermissions.scss
  ├─ 2,773 total lines
  ├─ 261 reducible lines (9.4%)
  ├─ Priority issues:
  │  ├─ L. 144-158 : Badge duplication
  │  ├─ L. 557-680 : role-item variant (123 lines)
  │  ├─ L. 904-1001: DUPLICATION of 557-680 (118 lines) ⚠️
  │  ├─ L. 1143-1150: @keyframes pulse
  │  └─ L. 1738-1808: max-width @media queries (wrong)
  └─ Estimated effort: 6-8 hours
```

### HIGH - Good ROI

```
QuotaManagement.scss    [373 lines, ~48 reducible]
AccountManagement.scss  [519 lines, ~29 reducible]
Modal.scss              [551 lines, ~36 reducible]
CookiePreferences.scss  [350 lines, ~40 reducible]
TimeTimer.scss          [293 lines, ~25 reducible]
```

### MEDIUM - Maintenance Value

```
Navbar.scss
MetricsDashboard.scss
Abonnement.scss
Button.scss
Other small files
```

---

## Quick Code Replacements

### Pattern 1: Box-Shadow

```scss
// ❌ Before (scattered)
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

// ✓ After (variable)
box-shadow: $box-shadow-md;
```

### Pattern 2: Spacing

```scss
// ❌ Before (hardcoded)
gap: 16px;
padding: 20px;

// ✓ After (variables)
gap: $spacing-md;
padding: $spacing-lg;
```

### Pattern 3: Media Queries

```scss
// ❌ Before (direct)
@media (min-width: 768px) { ... }

// ✓ After (mixin)
@include respond-to(md) { ... }
```

### Pattern 4: @keyframes

```scss
// ❌ Before (in component)
@keyframes spin { ... }

// ✓ After (in _animations.scss)
// Then use in component:
animation: spin 1s linear infinite;
```

### Pattern 5: Card Styles

```scss
// ❌ Before (repeated)
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: $box-shadow;
  padding: 16px;
  transition: all 0.15s ease;
  &:hover { ... }
}

// ✓ After (mixin)
.card {
  @include card-container($spacing-md);
  // Custom styles only
}
```

---

## Files Needing Media Query Fixes

❌ **Using max-width (wrong)**

- `AdminPermissions.scss` L. 1738, 1808, 2572

✓ **Already using respond-to() (correct)**

- `AccountManagement.scss` L. 446
- `BaseCard.scss` L. 95, 107

📋 **Needs conversion to respond-to()**

- `Modal.scss` (8 occurrences)
- `TimeTimer.scss` (4 occurrences)
- `QuotaManagement.scss` (3 occurrences)
- Others (15+ more)

---

## Variables to Add

### To `src/styles/abstracts/_variables.scss`

```scss
// === SHADOWS ===
$box-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
$box-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
$box-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2);
$box-shadow-xl: 0 10px 40px rgba(0, 0, 0, 0.3);
$box-shadow-danger: 0 3px 10px rgba(239, 68, 68, 0.4);
$box-shadow-focus: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);

// === ROLE COLORS ===
$role-colors: (
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
  ), // ... etc
);
```

---

## Mixins to Add

### To `src/styles/abstracts/_mixins.scss`

```scss
// 1. Card Container
@mixin card-container($padding: $spacing-md /* ... */) {
}

// 2. Button Base States
@mixin button-base($bg-color /* ... */) {
}

// 3. Flex Layout
@mixin flex-layout($direction: row /* ... */) {
}

// 4. Role Badge
@mixin role-badge($role) {
}

// 5. Badge Generator
@mixin badge($bg-color, $text-color /* ... */) {
}
```

---

## Implementation Checklist

### Phase 1 (8-12 hours) - CRITICAL

- [ ] Add shadow variables to `_variables.scss`
- [ ] Add role-colors map to `_variables.scss`
- [ ] Create `@mixin card-container()` in `_mixins.scss`
- [ ] Create `@mixin role-badge()` in `_mixins.scss`
- [ ] Refactor `AdminPermissions.scss` (1-2h)
- [ ] Consolidate `@keyframes` in `_animations.scss`
- [ ] Test: `pnpm check && pnpm test`

### Phase 2 (4-6 hours) - HIGH PRIORITY

- [ ] Fix media queries: AdminPermissions → respond-to()
- [ ] Refactor Modal.scss box-shadow
- [ ] Refactor QuotaManagement.scss spacing
- [ ] Refactor AccountManagement.scss spacing
- [ ] Add `@mixin button-base()`, `@mixin flex-layout()`
- [ ] Test all affected components

### Phase 3 (2-4 hours) - POLISH

- [ ] Remaining component refactoring
- [ ] Create SCSS style guide in CLAUDE.md
- [ ] Run full test suite
- [ ] Performance/bundle size check

---

## Commands to Run

### Audit Commands

```bash
# Find hardcoded shadows
grep -r "box-shadow:" src/components/**/*.scss | wc -l

# Find hardcoded spacing
grep -r "padding:.*px\|gap:.*px" src/components/**/*.scss | head -20

# Find media queries
grep -r "@media" src/components/**/*.scss | wc -l

# Find @keyframes
grep -r "@keyframes" src/components/**/*.scss
```

### After Refactoring

```bash
pnpm lint:fix       # Auto-fix SCSS
pnpm format         # Format code
pnpm type-check     # TypeScript check
pnpm test           # Run tests
pnpm build          # Build project
pnpm check-bundle   # Check bundle size
```

---

## Risk Assessment

### Low Risk Changes

- Adding variables (no visual impact)
- Adding mixins (no usage impact)
- Using existing mixins like `respond-to()`

### Medium Risk Changes

- Replacing box-shadow values (must test shadows visually)
- Converting @media queries (test responsive layout)
- Moving @keyframes (test animations)

### Testing Required

- [ ] AdminPermissions page layout
- [ ] Modal animations
- [ ] Button hover/focus states
- [ ] Quota indicator styling
- [ ] Responsive behavior (mobile/tablet/desktop)
- [ ] Dark mode (if applicable)

---

## Expected Outcomes

### Before

- 8,106 SCSS lines
- 80 files
- Inconsistent naming
- Scattered variables
- Duplicated patterns

### After

- ~6,200 SCSS lines (-23%)
- 85+ files (8 new: variables/mixins expansion)
- Consistent naming via Sass maps
- Centralized variables/mixins
- Eliminated duplication

### Benefits

✓ Easier maintenance
✓ Faster CSS updates
✓ Lighter bundle
✓ Better performance
✓ Consistent UX

---

## Key Documents

1. **SCSS_REFACTOR_ANALYSIS.md** (Detailed analysis with examples)
2. **SCSS_REFACTOR_RECOMMENDATIONS.md** (Before/after code samples)
3. **SCSS_AUDIT_SUMMARY.md** (This file - quick reference)

---

## Contact/Questions

Refer to:

- CLAUDE.md (project guidelines)
- \_mixins.scss (existing patterns)
- \_variables.scss (available variables)
- Button.scss (best practice example)

---

**Last Updated**: 2025-12-03
**Analysis Scope**: 80 SCSS files, 8,106 lines
**Confidence Level**: High (detailed code review)
