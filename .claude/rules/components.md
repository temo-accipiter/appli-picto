---
paths:
  - 'src/components/**/*.tsx'
  - 'src/components/**/*.scss'
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

## Imports absolus obligatoires

```typescript
// ✅ CORRECT
import { useBankCards } from '@/hooks'
import Modal from '@/components/shared/modal/Modal'

// ❌ INTERDIT
import { useBankCards } from '../../hooks'
import Modal from '../shared/modal/Modal'
```

## SCSS Tokens-First

**JAMAIS de valeurs hardcodées — TOUJOURS utiliser tokens design system**

```scss
// ✅ CORRECT
.component {
  padding: spacing('md');
  color: text('primary');
  border-radius: radius('md');
}

// ❌ INTERDIT
.component {
  padding: 16px;
  color: #333333;
  border-radius: 8px;
}
```

→ Voir skill `sass-tokens-discipline` pour règles détaillées
