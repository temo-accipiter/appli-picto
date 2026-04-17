---
paths:
  - 'src/app/**/*.{ts,tsx}'
  - 'middleware.ts'
---

# Règles Next.js App Router — Appli-Picto

## Route Groups

- `(public)/` — Routes publiques (/tableau, /login, /signup)
- `(protected)/` — Routes protégées (/edition, /profil, /admin)

## Server Components (par défaut)

- ✅ Utiliser Server Components par défaut
- ✅ Fetch data directement (pas besoin useEffect)
- ✅ Accès direct aux env variables serveur
- ✅ Async components autorisés

## Client Components ('use client')

⚠️ **SEULEMENT si nécessaire** :

- Interactivité (useState, useEffect, useRef)
- Event handlers (onClick, onChange, onSubmit)
- Contexts (useContext)
- Browser APIs (localStorage, window, document)
- Hooks custom qui utilisent les APIs ci-dessus

## Metadata API

```typescript
// page.tsx ou layout.tsx
export const metadata = {
  title: 'Titre page',
  description: 'Description SEO',
}

// Metadata dynamique
export async function generateMetadata({ params }) {
  return {
    title: `Titre ${params.id}`,
  }
}
```

## Navigation

```typescript
// ✅ CORRECT
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const router = useRouter()
router.push('/edition')

// ❌ INTERDIT
import { useRouter } from 'next/router' // Next.js Pages Router (ancien)
import { BrowserRouter } from 'react-router-dom' // Supprimé du projet
```

## Loading et Error States

```typescript
// loading.tsx (affichage pendant chargement)
export default function Loading() {
  return <Skeleton />
}

// error.tsx (gestion erreurs)
'use client' // DOIT être Client Component
export default function Error({ error, reset }) {
  return <ErrorDisplay error={error} onReset={reset} />
}
```

## Layouts

- ✅ `layout.tsx` partagé entre routes enfants
- ✅ Persiste lors navigation (pas de re-render)
- ✅ Peut être nested (layouts imbriqués)
