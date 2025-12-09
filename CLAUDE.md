# CLAUDE.md

Guide pour **Appli-Picto** - Application Next.js 16 pour enfants autistes et professionnels TSA.

## 🎯 Contexte Projet

Application **mobile-first** utilisant pictogrammes visuels, gestion tâches drag-and-drop, et système récompenses pour accompagner activités quotidiennes enfants TSA.

**Principes Design** :

- 📱 Mobile-first optimisé
- 🎨 Interface apaisante : couleurs pastel, animations douces <0.3s, design épuré
- ♿ Accessible TSA : WCAG 2.2 AA, pas surcharge visuelle, prévisibilité garantie

## 🛠 Stack & Commandes

**Stack** : React 19, Next.js 16 (App Router), Node 20.19.4, **pnpm 9.15.0** (JAMAIS yarn/npm)
**Backend** : 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
**Payment** : Stripe, **Security** : Cloudflare Turnstile, **Testing** : Vitest + Playwright

### Commandes Essentielles

```bash
# Développement
pnpm dev                 # Serveur dev (port 3000, Turbopack)
pnpm build               # Build production
pnpm preview             # Test build production

# 🚨 OBLIGATOIRE avant commit
pnpm check               # lint:fix + format (OBLIGATOIRE)
pnpm test                # Tests unitaires

# Vérifications
pnpm verify:quick        # type-check + lint + build
pnpm verify              # verify:quick + test + build:prod
pnpm verify:ci           # Vérification complète CI

# 🚨 OBLIGATOIRE après modification DB Supabase
pnpm context:update      # Dump schema + génération types TS

# Base de données
pnpm db:types            # Générer types depuis Supabase
pnpm supabase:start      # Démarrer Supabase local

# Tests
pnpm test:e2e            # Tests E2E Playwright
pnpm test:coverage       # Tests avec couverture
```

### Commandes Slash Custom (Claude Code)

- `/verify-quick` - Vérification rapide : lint + format + types + build + tests
- `/verify-full` - Vérification exhaustive avant deploy (inclut E2E + coverage)
- `/commit` - Commit conventionnel + push
- `/supabase-migrate <description>` - Créer/appliquer migration + types
- `/test-component <nom>` - Tests unitaires composant

## 📁 Architecture Clé

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Routes publiques (tableau, login, signup)
│   └── (protected)/       # Routes auth requise (edition, profil, admin)
├── components/            # UI modulaires (.tsx + .scss)
│   ├── shared/           # Réutilisables (Modal, Button, Layout)
│   ├── taches/           # Composants tâches
│   └── recompenses/      # Composants récompenses
├── contexts/             # État global (Auth, Permissions, Toast, Loading)
├── hooks/                # 🚨 CRITIQUE - Hooks custom Supabase
│   ├── useTaches.ts              # CRUD tâches lecture
│   ├── useTachesEdition.ts       # CRUD tâches écriture
│   ├── useTachesDnd.ts           # Drag & drop
│   ├── useRecompenses.ts         # CRUD récompenses
│   ├── useRBAC.ts                # Permissions rôles
│   └── useAccountStatus.ts       # Quotas utilisateur
├── page-components/      # Composants pages principales
├── utils/
│   └── supabaseClient.ts         # 🚨 Instance unique Supabase
└── types/
    └── supabase.ts               # Types générés depuis Supabase
```

**Supabase Edge Functions** (`supabase/functions/`) :

- `create-checkout-session/` - Checkout Stripe
- `stripe-webhook/` - Webhooks Stripe
- `delete-account/` - Suppression compte RGPD

## 🎭 Rôles & Quotas

| Rôle         | Tâches | Récompenses | Catégories |
| ------------ | ------ | ----------- | ---------- |
| **Visiteur** | 3 démo | -           | -          |
| **Free**     | 5/mois | 2/mois      | 2 max      |
| **Abonné**   | 40     | 10          | 50         |
| **Admin**    | ∞      | ∞           | ∞          |

**Feature Gates** : `<FeatureGate role="abonne">...</FeatureGate>` + RLS server-side

## ⚡ Patterns CRITIQUES

### 1. TOUJOURS Utiliser Hooks Custom

```typescript
// ❌ INTERDIT - Query directe
const { data } = await supabase.from('taches').select()

// ✅ CORRECT - Hook custom
import { useTaches } from '@/hooks'
const { taches, loading } = useTaches()
```

### 2. Client Supabase Unique

```typescript
// ✅ TOUJOURS importer depuis
import { supabase } from '@/utils/supabaseClient'
```

### 3. Next.js App Router Patterns

```typescript
// src/app/(protected)/edition/page.tsx
import Edition from '@/page-components/edition/Edition'

export const metadata = {
  title: 'Édition - Appli-Picto',
}

export default function EditionPage() {
  return <Edition />
}
```

### 4. Server vs Client Components

**Ajout `'use client'` UNIQUEMENT si** :

- Hooks React (`useState`, `useEffect`, `useContext`)
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`window`, `localStorage`)

```typescript
'use client' // Requis pour interactivité

import { useState } from 'react'

export default function Interactive() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### 5. Gestion Quotas

```typescript
import { useAccountStatus } from '@/hooks'

const { canCreateTask, quotas } = useAccountStatus()

if (!canCreateTask) {
  return <QuotaExceeded message="Limite Free : 5 tâches" />
}
// OK créer
```

### 6. Upload Images (100KB max)

```typescript
import { compressImageIfNeeded } from '@/utils'

const compressed = await compressImageIfNeeded(file)
await supabase.storage.from('images').upload(path, compressed)
```

## 🚨 Règles Absolues

### JAMAIS Faire

- ❌ Commit sans `pnpm check` + `pnpm test`
- ❌ Modifier DB sans `pnpm context:update`
- ❌ Query Supabase directe dans composants
- ❌ Images > 100KB
- ❌ Utiliser `yarn` ou `npm` (projet pnpm)
- ❌ Importer `react-router-dom` (migré Next.js App Router)
- ❌ Créer fichiers .md documentation sans demande explicite

### TOUJOURS Faire

- ✅ **Répondre en français** (utilisateurs francophones)
- ✅ Utiliser `pnpm` (PAS yarn/npm)
- ✅ Vérifier accessibilité TSA (WCAG 2.2 AA)
- ✅ Hooks custom pour Supabase
- ✅ `'use client'` seulement si interactif
- ✅ Vérifier quotas AVANT création
- ✅ Animations douces max 0.3s ease
- ✅ Imports absolus `@/` (pas relatifs)

## 🔧 TypeScript

**État** : Mode strict **partiellement relaxé** pour migration Next.js

- 329 erreurs non-bloquantes documentées (`.github/issues/ts-remaining-errors.md`)
- Build ✅ réussit, Tests ✅ passent
- Correction progressive prévue (3 sprints, 12-16h)

## 📦 Variables Environnement

```bash
# Client-side (NEXT_PUBLIC_*)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...

# Server-side (Edge Functions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## ✅ Checklists

### Avant Commit

- [ ] `pnpm check` passé
- [ ] `pnpm test` passé
- [ ] Pas query Supabase directe
- [ ] Hooks custom utilisés
- [ ] `'use client'` si nécessaire
- [ ] WCAG 2.2 AA vérifié
- [ ] Animations <0.3s
- [ ] Images <100KB
- [ ] Quotas vérifiés

### Avant Déploiement

- [ ] `pnpm build` réussit
- [ ] `pnpm preview` testé
- [ ] `pnpm test:e2e` passent
- [ ] Variables env prod configurées
- [ ] Edge functions déployées
- [ ] Webhooks Stripe configurés
- [ ] RLS policies vérifiées

### Après Modification DB

- [ ] `pnpm context:update` exécuté
- [ ] `supabase/schema.sql` mis à jour
- [ ] `src/types/supabase.ts` régénéré
- [ ] Hooks custom mis à jour
- [ ] RLS policies créées
- [ ] Migrations testées localement

## 🔍 Résolution Problèmes

**Quota exceeded** → Vérifier `useAccountStatus()` avant action
**Upload échoue** → `compressImageIfNeeded()` avant upload
**User non auth** → Vérifier `authReady` avant `user`
**RLS bloque** → Vérifier policies correspondent au rôle
**Hydration mismatch** → `useEffect` pour code client-only

## 📚 Références Clés

- Auth : `src/contexts/AuthContext.tsx`
- Permissions : `src/hooks/useRBAC.ts`
- Tâches : `src/hooks/useTaches*.ts`
- Quotas : `src/hooks/useAccountStatus.ts`
- Stripe : `supabase/functions/create-checkout-session/`
- Client : `src/utils/supabaseClient.ts`

## 🎨 Spécificités UX TSA

- Animations max 0.3s ease (douceur)
- Pas surcharge visuelle
- Prévisibilité interface
- Couleurs pastel apaisantes
- Navigation simple claire
- Feedback immédiat actions
