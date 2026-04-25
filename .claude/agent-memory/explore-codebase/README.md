# SCSS/CSS Architecture Exploration — Complete

**Cartographie exhaustive de l'architecture SCSS/CSS du projet Appli-Picto.**

Date : 2026-04-25 | Version : Phase 6 migration (Phase 5 fallback)

---

## 📁 Ce qui a été exploré

✅ **~100+ fichiers SCSS** dans `src/styles/` + `src/components/` + `src/page-components/`
✅ **System de tokens 3-niveaux** (Primitives → Semantics → Wrappers)
✅ **Architecture hybrid Phase 6/Legacy** avec fallback intelligent
✅ **16 patterns SCSS** observés et documentés
✅ **12 erreurs courantes** avec solutions
✅ **Token API complète** (functions, mixins, variables)

---

## 📚 Fichiers de documentation créés

### 1. **SCSS-ARCHITECTURE-COMPLETE.md** (38 sections)

**Vue d'ensemble exhaustive** — Architecture, structure, tokens, dépendances, patterns.

**Utilisé pour**:
- Onboarding developers
- Understanding global architecture
- Making architecture decisions
- Phase 6 migration planning

**Taille**: ~5000 lignes | **Sections critiques**:
- Structure globale
- Arborescence détaillée tous fichiers
- Système de tokens 3-niveaux (expliqué en profondeur)
- Dépendances et imports (ordre CRITIQUE)
- Patterns établis (10+)
- Diagramme dépendances

---

### 2. **TOKENS-QUICK-REFERENCE.md** (40+ tokens mappés)

**Lookup rapide pour développeurs** — Copy-paste friendly, structuré par type.

**Utilisé pour**:
- Daily coding
- Token lookup rapide
- API reference
- Edge cases

**Contenu**:
- Quick imports (une ligne)
- Spacing (primitives + semantics)
- Size (dimensions structurelles)
- Colors (text, surface, semantic, brand)
- Border radius (sémantique + primitives)
- Shadows, Typography, Motion, A11y, Responsive
- Mixins courants
- Critical edge cases (size('44'), spacing('3'), etc.)
- Frequency data

---

### 3. **SCSS-PATTERNS.md** (16 patterns + 100+ examples)

**Patterns observés dans codebase** — Best practices par pattern.

**Utilisé pour**:
- Code review (vérifier conformité)
- New components (template)
- Refactoring (following patterns)
- Consistency

**Patterns**:
1. Import + Use Token Wrapper
2. Component Structure (BEM-Light)
3. Mobile-First Responsive
4. Focus Visible (WCAG AA)
5. Safe Transitions (prefers-reduced-motion)
6. Touch Target Accessibility
7. Color + Background Patterns
8. Spacing Hierarchies
9. Animation Entrance
10. Form Controls Styling
11. Grid / Layout Composition
12. Modal/Overlay Pattern
13. Typography Hierarchy
14. Icon Sizing Patterns
15. Error / Success / Warning States
16. Z-Index Management

**Each pattern**: ✅ Correct example + ❌ Wrong example

---

### 4. **SCSS-FILE-REGISTRY.md** (Inventaire complet)

**Fichiers SCSS catalogués** — Localisation, rôle, statut.

**Utilisé pour**:
- Finding files quickly
- Impact analysis
- Understanding dependencies
- Migration status

**Sections**:
- Core Infrastructure (30 files)
- Page Components (12 files)
- Component Library (60+ files)
- Statistics (~100+ SCSS)
- Dependency graph
- Critical files (don't break)
- Safe to modify
- Migration status (Phase 6 vs Legacy)

---

### 5. **SCSS-COMMON-ERRORS.md** (12 errors + solutions)

**Erreurs fréquentes et solutions rapides** — Diagnostic + fix.

**Utilisé pour**:
- Debugging build errors
- Prevention via checklist
- Learning what NOT to do
- Quick reference troubleshooting

**Errors**:
1. Token inexistant (size('44'))
2. Spacing value inexistant (spacing('3'), spacing('14'))
3. Wrong function (spacing vs size confusion)
4. Hardcoded colors/sizes
5. Wrong import path
6. surface() token doesn't exist
7. Hardcoded focus styles
8. Responsive desktop-first (❌ forbidden)
9. Transitions without prefers-reduced-motion
10. Touch targets < 44px (WCAG)
11. Long animation durations (TSA > 0.3s)
12. Missing @use at component top

**Each error**: Symptom + Cause + Solution + Why

---

### 6. **TOKENS-VISUAL-TREE.md** (ASCII diagrams)

**Diagrammes visuels de hiérarchie tokens** — 3-level flow, visual references.

**Utilisé pour**:
- Visual understanding
- Explaining to non-technical
- Flow diagrams
- Architecture overview

**Diagrams**:
- 3-level architecture tree
- Component → Token flow
- Colors hierarchy
- Spacing hierarchy
- Semantic vs Primitive
- Theme switching
- Responsive breakpoints
- Accessibility tokens
- Color palette overview
- Dependency resolution

---

### 7. **MEMORY.md** (Index méta)

**Index documentaire** — Table matières, cas d'usage, insights clés.

**Utilisé pour**:
- Quick navigation
- Finding right doc
- Understanding connections
- Meta-reference

---

## 🎯 PAR CAS D'USAGE

### Je suis nouveau dev

1. Lis: **SCSS-ARCHITECTURE-COMPLETE.md** (vue globale)
2. Lis: **TOKENS-QUICK-REFERENCE.md** (API)
3. Lis: **SCSS-PATTERNS.md** (16 patterns)
4. Bookmarked: **SCSS-COMMON-ERRORS.md** (prevention)

**Temps estimé**: 1-2 heures d'onboarding

---

### Je dois créer nouveau composant

1. Lis: **SCSS-PATTERNS.md** — Pattern 2 (Component structure)
2. Lis: **SCSS-PATTERNS.md** — Pattern 3 (Mobile-first)
3. Référence: **TOKENS-QUICK-REFERENCE.md** — tokens pertinents
4. Crée fichier: `src/components/{cat}/{Name}/{Name}.scss`
5. Check: **SCSS-COMMON-ERRORS.md** — Checklist avant commit

**Temps estimé**: 30 min - 1h

---

### Je dois débugger erreur SCSS

1. Lis: **SCSS-COMMON-ERRORS.md** — Match symptôme
2. Applique: Solution proposée
3. Utilise: Checklist prévention
4. Test: `pnpm build` (Turbopack)

**Temps estimé**: 5-15 min

---

### Je dois migrer vers Phase 6

1. Lis: **SCSS-ARCHITECTURE-COMPLETE.md** — Tokens 3-levels
2. Étude: Modal.scss ou ButtonDelete.scss (PHASE 6 ✅)
3. Applique: Wrapper fallback dans composant
4. Teste: Light + dark themes + prefers-reduced-motion
5. Référence: **TOKENS-QUICK-REFERENCE.md** — semantic tokens

**Temps estimé**: 1-2 heures par composant

---

### Je dois améliorer accessibilité

1. Lis: **SCSS-PATTERNS.md** — Pattern 4 (Focus visible)
2. Lis: **SCSS-PATTERNS.md** — Pattern 5 (Safe transitions)
3. Lis: **SCSS-PATTERNS.md** — Pattern 6 (Touch targets)
4. Check: **SCSS-COMMON-ERRORS.md** — Errors 7, 9, 10, 11

**Temps estimé**: 1-2 heures par composant

---

## 🔑 KEY INSIGHTS

### 1. Tokens-First OBLIGATOIRE

Aucune hardcoded value (px, #hex, rgb). TOUS les styles via fonctions tokens.

```scss
// ❌ WRONG
padding: 16px;
color: #1e293b;
background: #ffffff;

// ✅ CORRECT
padding: spacing('md');
color: text('primary');
background: surface('bg');
```

---

### 2. Deux systèmes importants

```
spacing() = Respiration UNIQUEMENT (padding, margin, gap)
size()    = Dimensions UNIQUEMENT (width, height, min/max)
```

**JAMAIS mélanger** spacing et size!

---

### 3. Architecture Hybrid Phase 6/Legacy

- **Phase 6** = Primitives → Semantics (wrappers avec fallback)
- **Legacy** = Direct maps (fallback si Phase 6 absent)
- **Migration progressive** = Aucun breaking change
- **Feature flag** = `$ENABLE_LEGACY_SUPPORT: true` (keep true)

---

### 4. Responsive = Mobile-First UNIQUEMENT

```scss
// ✅ CORRECT
.component {
  padding: spacing('sm');  // Mobile base

  @include respond-to('md') {
    padding: spacing('lg');  // Tablet+
  }
}

// ❌ FORBIDDEN
@media (max-width: 768px) { ... }  // Desktop-first = bad
```

---

### 5. Accessibilité intégrée

- **Touch targets** ≥ 44px WCAG AA (@include touch-target('min'))
- **Focus visible** WCAG AA (&:focus-visible with outline)
- **Animations** ≤ 0.3s TSA-safe (@include safe-transition())
- **prefers-reduced-motion** Automatique via mixins

---

## 📊 STATISTICS

```
Total SCSS files explored:     ~100+
Total lines documented:         ~5000
Pages created:                   7
Patterns catalogued:             16
Errors covered:                  12
Token functions mapped:          40+
Components analyzed:             60+
Page components analyzed:        12
Feature flags:                   1
Phase 6 validated:              2
```

---

## ✅ VALIDATION CHECKLIST

✅ Tous les fichiers SCSS explorés et catalogués
✅ Système de tokens 3-niveaux documenté
✅ 16 patterns observés dans codebase
✅ 12 erreurs courantes avec solutions
✅ Edge cases testés (size('44'), spacing('3'), etc.)
✅ Architecture mappée (dépendances, imports)
✅ Phase 6 wrappers validés (Modal, ButtonDelete)
✅ Tokens canoniques identifiés (_tokens.scss)
✅ Accessibility patterns documentés (WCAG AA + TSA)
✅ Responsive patterns mobile-first (no desktop-first)

---

## 🚀 HOW TO USE THIS EXPLORATION

### For Developers

1. **Bookmark** TOKENS-QUICK-REFERENCE.md for daily coding
2. **Read** SCSS-PATTERNS.md before creating new component
3. **Reference** SCSS-COMMON-ERRORS.md for debugging

### For Code Reviewers

1. **Use** SCSS-PATTERNS.md checklist during review
2. **Flag** code against patterns 1-16
3. **Prevent** errors from SCSS-COMMON-ERRORS.md

### For Architects

1. **Read** SCSS-ARCHITECTURE-COMPLETE.md for decisions
2. **Use** TOKENS-VISUAL-TREE.md to explain to team
3. **Plan** Phase 6 migration using SCSS-FILE-REGISTRY.md

### For Documentation

1. **Promote** key insights to `docs/DESIGN_SYSTEM.md`
2. **Use** diagrams from TOKENS-VISUAL-TREE.md
3. **Reference** SCSS-ARCHITECTURE-COMPLETE.md in style guide

---

## 📖 OFFICIAL DOCS

These explorations are **agent-memory** (ephemeral learning notes).

**Source of truth remains**:
- `src/styles/CLAUDE.md` — User-facing tokens API
- `.claude/rules/components.md` — UI/accessibility rules
- This exploration — Technical deep-dive

---

## 🔗 FILE LOCATIONS

All exploration files are in:

```
/Users/accipiter_tell/projets/new_sup/appli-picto/
  .claude/agent-memory/explore-codebase/
    ├── README.md (this file)
    ├── MEMORY.md (index)
    ├── SCSS-ARCHITECTURE-COMPLETE.md (vue globale)
    ├── TOKENS-QUICK-REFERENCE.md (lookup rapide)
    ├── SCSS-PATTERNS.md (16 patterns)
    ├── SCSS-FILE-REGISTRY.md (inventaire)
    ├── SCSS-COMMON-ERRORS.md (12 erreurs)
    └── TOKENS-VISUAL-TREE.md (diagrammes)
```

---

## 🎓 NEXT STEPS

1. **Share** this exploration with team
2. **Onboard** new developers using SCSS-ARCHITECTURE-COMPLETE.md
3. **Establish** code review checklist from SCSS-PATTERNS.md
4. **Plan** Phase 6 migration (use Modal.scss as template)
5. **Monitor** build errors using SCSS-COMMON-ERRORS.md

---

**Exploration Status**: ✅ COMPLETE
**Date**: 2026-04-25
**Compliance**: WCAG 2.2 AA + TSA-optimized
**Phase**: Phase 6 migration (Phase 5 fallback active)

---

## Questions?

Refer to appropriate document:
- **"How do I...?"** → SCSS-PATTERNS.md
- **"What token for...?"** → TOKENS-QUICK-REFERENCE.md
- **"Error says..."** → SCSS-COMMON-ERRORS.md
- **"Where is file X?"** → SCSS-FILE-REGISTRY.md
- **"How does system work?"** → SCSS-ARCHITECTURE-COMPLETE.md
- **"Show me flow diagram"** → TOKENS-VISUAL-TREE.md
- **"What doc to read?"** → MEMORY.md (index)
