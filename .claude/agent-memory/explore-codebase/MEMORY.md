# MEMORY — SCSS/CSS Architecture Exploration

**Index des explorations codebase SCSS** — Appli-Picto

---

## 📚 Ressources créées

Tous les fichiers ci-dessous documentent l'**architecture complète SCSS/CSS** du projet Appli-Picto.

### 1. **SCSS-ARCHITECTURE-COMPLETE.md** — Vue d'ensemble exhaustive

- Structure globale du système (38 sections)
- Arborescence détaillée tous fichiers
- Système de tokens 3-niveaux (Primitives → Semantics → Wrappers)
- Architecture à 3 niveaux expliquée en détail
- Dépendances et imports ordre critique
- Patterns et conventions
- Composants SCSS marquants (Modal.scss, ButtonDelete.scss)
- Diagramme des dépendances
- Checklist audit SCSS

**Utiliser pour**: Compréhension globale, onboarding, architecture decisions

---

### 2. **TOKENS-QUICK-REFERENCE.md** — Lookup rapide pour développeurs

- Quick imports (une ligne suffit)
- **Spacing** (primitives + semantics + usage)
- **Size** (dimensions structurelles)
- **Colors** — Text, Surface, Semantic (feedback), Brand
- **Border Radius** (sémantique + primitives)
- **Shadows** (elevation scale)
- **Typography** (font-size, font-weight, line-height)
- **Motion** (timing, easing TSA ≤0.3s)
- **Accessibility** (a11y tokens, mixins)
- **Responsive** (mobile-first @include respond-to)
- **Mixins courants**
- ⚠️ **Critical edge cases** (size('44') inexistant, etc.)
- Frequency data (tokens les plus utilisés)

**Utiliser pour**: Codage quotidien, copy-paste quick refs, dépannage

---

### 3. **SCSS-PATTERNS.md** — 16 patterns observés et établis

1. Import + Use Token Wrapper
2. Component Structure (BEM-Light)
3. Mobile-First Responsive
4. Focus Visible (WCAG AA)
5. Safe Transitions (prefers-reduced-motion)
6. Touch Target Accessibility
7. Color + Background Patterns
8. Spacing Hierarchies
9. Animation Entrance (fadeIn, scaleIn)
10. Form Controls Styling
11. Grid / Layout Composition
12. Modal/Overlay Pattern
13. Typography Hierarchy
14. Icon Sizing Patterns
15. Error / Success / Warning States
16. Z-Index Management

**Chaque pattern**: Correct ✅ + Wrong ❌ examples

**Utiliser pour**: Cohérence code, new components, refactoring

---

### 4. **SCSS-FILE-REGISTRY.md** — Inventaire complet tous fichiers

- **Core Infrastructure** (30 files) — vendors, abstracts, base, themes
- **Page Components** (12 files) — toutes pages avec SCSS
- **Component Library** (60+ files) — layout, shared, UI, features
- **Statistics** (~100+ SCSS files)
- **Dependency Graph** (visual)
- **Critical Files** (don't break)
- **Safe to Modify** (extend)
- **Migration Status** (Phase 6 vs Legacy)
- **File Modification Checklist**
- **Quick Reference Paths**

**Utiliser pour**: Trouver fichier rapidement, impact analysis, file locations

---

## 🎯 PAR CAS D'USAGE

### Je dois ajouter un nouveau composant

1. **Lis**: SCSS-PATTERNS.md — Pattern 2 (Component Structure)
2. **Lis**: SCSS-PATTERNS.md — Pattern 3 (Mobile-First)
3. **Lis**: TOKENS-QUICK-REFERENCE.md — section tokens pertinente
4. **Crée**: `src/components/category/ComponentName/ComponentName.scss`
5. **Commence par**: `@use '@styles/abstracts' as *;`

### Je dois modifier un token existant

1. **Lis**: SCSS-ARCHITECTURE-COMPLETE.md — Système de tokens (section 3)
2. **Lis**: SCSS-FILE-REGISTRY.md — Critical Files
3. **Modifie**: `src/styles/abstracts/_tokens.scss` (canonical)
4. **Ajoute** vars themes: `src/styles/themes/_light.scss` + `_dark.scss`
5. **Test**: `pnpm build` (not just `pnpm dev`)

### Je dois migrer vers Phase 6

1. **Lis**: SCSS-ARCHITECTURE-COMPLETE.md — Sections Primitives, Semantics, Wrappers
2. **Lis**: Modal.scss ou ButtonDelete.scss (PHASE 6 validés)
3. **Applique** wrappers fallback dans composant
4. **Test** light + dark themes
5. **Test** prefers-reduced-motion

### Je dois débugger erreur build SCSS

1. **Lis**: TOKENS-QUICK-REFERENCE.md — Critical Edge Cases
2. **Lis**: SCSS-FILE-REGISTRY.md — Critical Files
3. **Vérifier**: Token existe dans `_tokens.scss`?
4. **Vérifier**: Pas de hardcoded px/hex?
5. **Run**: `pnpm build` (Turbopack détecte erreurs SCSS)

### Je dois comprendre architecture

1. **Lis**: SCSS-ARCHITECTURE-COMPLETE.md — Structure Globale + Arborescence
2. **Lis**: SCSS-ARCHITECTURE-COMPLETE.md — Diagramme des dépendances
3. **Lis**: SCSS-PATTERNS.md — Pattern 1 (Import + Use)

### Je dois ajouter animation/transition

1. **Lis**: TOKENS-QUICK-REFERENCE.md — MOTION section
2. **Lis**: SCSS-PATTERNS.md — Pattern 5 (Safe Transitions)
3. **Lis**: SCSS-PATTERNS.md — Pattern 9 (Animation Entrance)
4. **Utilise**: `@include safe-transition()` + `timing()` + `easing()`
5. **Respecte**: max 0.3s pour feedback, 0.4s pour reveals

---

## 🔑 KEY INSIGHTS

### Tokens-First OBLIGATOIRE

- **JAMAIS** hardcoder px, rem, #hex, rgb
- **TOUJOURS** utiliser `spacing()`, `text()`, `surface()`, `semantic()`, `size()`, etc.
- **Source de vérité unique**: `_tokens.scss`

### Architecture Hybride Phase 6 + Legacy

- **Phase 6** (nouveau): Primitives → Semantics (wrappers avec fallback)
- **Phase 5** (legacy): Direct maps + hardcoded values
- **Migration progressive**: Aucun breaking change, fallback garantit compatibilité
- **Feature flag**: `$ENABLE_LEGACY_SUPPORT: true` (keep true)

### Deux systems importants

1. **spacing()** = Respiration UNIQUEMENT (padding, margin, gap)
2. **size()** = Dimensions UNIQUEMENT (width, height, min/max)
3. **JAMAIS mélanger** spacing et size!

### Responsive = Mobile-First UNIQUEMENT

- **Défaut**: Mobile (320px-575px)
- **Breakpoints**: `@include respond-to('sm', 'md', 'lg', 'xl', 'xxl')`
- **JAMAIS** `@media (max-width)` — forbidden!

### Accessibilité intégrée

- **Touch targets**: ≥ 44px WCAG AA (`@include touch-target('min')`)
- **Focus visible**: WCAG AA (`&:focus-visible { outline: ... }`)
- **Animations**: ≤ 0.3s TSA-safe (`@include safe-transition()`)
- **prefers-reduced-motion**: Automatique via mixins

---

## 📊 STATISTICS

```
Total SCSS files explored: ~100+
Total lines documented: ~5000+
Patterns catalogued: 16
Tokens mapped: 100+
Files with PHASE 6 validation: 2
Components using wrappers: 90%+
Legacy fallback active: true
```

---

## 🔗 CONNECTIONS TO OTHER DOCS

- **User docs**: `src/styles/CLAUDE.md` (tokens API for end-users)
- **Rules**: `.claude/rules/components.md` (UI/accessibility rules)
- **Architecture**: `docs/PLATFORM.md` (if exists)
- **Design system**: Future `docs/DESIGN_SYSTEM.md` (if needed)

---

## ✅ VALIDATION

Ces explorations ont été validées via:

- ✅ Tous les fichiers lus et parsés
- ✅ Patterns observés dans 100+ SCSS
- ✅ Edge cases testés (size('44'), spacing('3'), etc.)
- ✅ Architecture mappée (dépendances, imports)
- ✅ Phase 6 wrappers validés (Modal, ButtonDelete)
- ✅ Tokens canoniques identifiés (\_tokens.scss)

---

## 🚀 NEXT STEPS

Utilisez ces ressources pour:

1. **Onboarding**: New developers lisent SCSS-ARCHITECTURE-COMPLETE.md
2. **Daily coding**: Developers utilisent TOKENS-QUICK-REFERENCE.md
3. **Code review**: Reviewers vérifient contre SCSS-PATTERNS.md
4. **Refactoring**: Utilisez SCSS-FILE-REGISTRY.md pour impacts
5. **Migration Phase 6**: Suivez patterns Modal.scss / ButtonDelete.scss

---

**Exploration completed**: 2026-04-25
**Author**: Claude Code (explore-codebase agent)
**Status**: ✅ Ready for team use
