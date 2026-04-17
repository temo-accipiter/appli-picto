---
paths:
  - "src/components/**/*.{ts,tsx,scss}"
  - "src/page-components/**/*.{ts,tsx,scss}"
---

# Règles Composants UI — Appli-Picto

## Structure obligatoire

- ✅ Toujours créer `.tsx` + `.scss` ensemble (même nom)
- ✅ Import SCSS : `import './NomComposant.scss'`
- ✅ Import tokens : `@use '@styles/abstracts' as *;`

## Server vs Client Components

- ✅ Server Components par défaut (pas de directive)
- ✅ `'use client'` SEULEMENT si :
  - Hooks React (useState, useEffect, etc.)
  - Event handlers (onClick, onChange, etc.)
  - Contexts (useContext)
  - Browser APIs

## Accessibilité TSA (WCAG 2.2 AA)

- ✅ Cibles tactiles ≥ 44×44px (`@include touch-target()`)
- ✅ Focus visible (`@include focus-ring()`)
- ✅ Animations douces (`@include safe-transition()`)
- ✅ Respect `prefers-reduced-motion`

## Imports et styles

- Imports absolus : toujours `@/` — jamais de chemins relatifs
- SCSS : toujours tokens — jamais valeurs hardcodées
  → Skill `sass-tokens-discipline` | Tokens : `src/styles/CLAUDE.md`
