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
pnpm verify:quick        # type-check + lint + build (rapide)
pnpm verify:all          # verify:ci + test:e2e (exhaustif avant deploy)

# 🚨 OBLIGATOIRE après modification DB Supabase
pnpm context:update      # Dump schema + génération types TS

# Base de données
pnpm db:dump             # Dump schema local vers supabase/schema.sql
pnpm db:types            # Générer types TypeScript depuis Supabase
pnpm supabase:start      # Démarrer Supabase local (Docker)

# Tests
pnpm test:e2e            # Tests E2E Playwright
pnpm test:coverage       # Tests avec couverture
```

### Commandes Slash Custom (Claude Code)

- `/verify-quick` - Vérification rapide : type-check + lint + build + test
- `/verify-full` - Vérification exhaustive avant deploy
- `/commit` - Commit conventionnel + push automatique
- `/supabase-migrate <description>` - Créer/appliquer migration + génération types
- `/debug <description-du-bug>` - Analyse ultra-approfondie bugs

## 📁 Architecture Clé

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Routes publiques (tableau, login, signup)
│   └── (protected)/       # Routes auth requise (edition, profil, admin)
├── components/            # UI modulaires (.tsx + .scss)
│   ├── features/         # Domaines métier (taches, time-timer, admin, consent)
│   ├── layout/           # Structure app (navbar, footer, user-menu)
│   ├── shared/           # Réutilisables métier (Modal, FeatureGate, SignedImage)
│   └── ui/               # Primitives UI pures (Button, Input, Loader)
├── contexts/             # État global (Auth, Permissions, Toast, Loading)
├── hooks/                # 🚨 CRITIQUE - Hooks custom Supabase
│   ├── useTaches*.ts     # CRUD tâches (lecture, édition, DnD)
│   ├── useRecompenses.ts # CRUD récompenses
│   ├── useAccountStatus.ts # Quotas utilisateur
│   ├── useAuth.ts        # Authentification
│   ├── useCheckout.ts    # Stripe checkout session
│   └── [20+ autres hooks]
├── utils/
│   └── supabaseClient.ts # 🚨 Instance unique Supabase
└── types/
    └── supabase.ts       # Types générés depuis Supabase
```

**Supabase Edge Functions** (`supabase/functions/`) :
- `create-checkout-session/` - Checkout Stripe
- `stripe-webhook/` - Webhooks Stripe
- `delete-account/` - Suppression compte RGPD

## 📂 Structure Composants

**CRITIQUE** : Organisation stricte en 4 catégories

### 1. features/ - Domaines Métier
Composants liés à fonctionnalités métier complètes (taches, time-timer, admin, consent, subscription, legal).

**Règles** :
- ✅ Contiennent logique métier spécifique
- ✅ Peuvent importer depuis `shared/` et `ui/`
- ❌ NE DOIVENT PAS être importés entre eux

### 2. layout/ - Structure App
Composants structurels (navbar, footer, user-menu, settings-menu).

**Règles** :
- ✅ Utilisés dans layouts Next.js
- ✅ Gèrent navigation et structure globale

### 3. shared/ - Composants Réutilisables
Composants avec logique métier légère (modal, card, dnd, forms, feature-gate, quota-indicator).

**Règles** :
- ✅ Réutilisables dans plusieurs features
- ❌ NE DOIVENT PAS importer depuis `features/` ou `layout/`

### 4. ui/ - Primitives UI Pures
Composants sans logique métier (button, input, select, loader, toast).

**Règles** :
- ✅ ZÉRO logique métier
- ❌ NE DOIVENT PAS importer hooks Supabase ou contextes

**Pattern OBLIGATOIRE** : Chaque composant = dossier avec `.tsx` + `.scss`

```
composant-exemple/
├── ComposantExemple.tsx    # Composant React
├── ComposantExemple.scss   # Styles SCSS (tokens uniquement)
└── index.ts                # Barrel export (optionnel)
```

**Barrel Exports** : Utiliser `src/components/index.ts` pour imports groupés

```typescript
// ✅ CORRECT - Import depuis barrel
import { Modal, Button, TachesDnd } from '@/components'
```

## 🏷️ Conventions Nommage

**Fichiers** :
- Composants : PascalCase (`TacheCard.tsx`)
- Hooks : camelCase + préfixe `use` (`useTaches.ts`)
- Styles : Même nom que composant (`TacheCard.scss`)
- Tests : `[nom-fichier].test.ts`

**Code** :
- Composants : PascalCase, nom descriptif
- Props interfaces : Suffixe `Props` (`TacheCardProps`)
- Hooks : Préfixe `use`, camelCase
- Variables : camelCase (`userId`)
- Constantes : SCREAMING_SNAKE_CASE (`MAX_IMAGE_SIZE`)

**SCSS** : BEM-lite
```scss
.tache-card {
  &__title { }      // Element
  &--completed { }  // Modifier
}
```

## 🎭 Rôles & Quotas

| Rôle         | Tâches | Récompenses | Catégories |
| ------------ | ------ | ----------- | ---------- |
| **Visiteur** | 3 démo | -           | -          |
| **Free**     | 5/mois | 2/mois      | 2 max      |
| **Abonné**   | 40     | 10          | 50         |
| **Admin**    | ∞      | ∞           | ∞          |

**Feature Gates** : `<FeatureGate role="abonne">...</FeatureGate>` + RLS server-side

## 🎨 Design System Tokens-First

**CRITIQUE** : Migration SCSS complète vers tokens centralisés (Phase 6 - FINALISÉ ✅)

### Règles SCSS

**Fonctions autorisées** :
- **Couleurs** : `color()`, `surface()`, `text()`, `semantic()`, `role-color()`
- **Spacing** : `spacing()` (margin/padding/gap UNIQUEMENT)
- **Size** : `size()` (width/height/min-height)
- **Typographie** : `font-size()`, `font-weight()`, `line-height()`
- **Motion** : `timing()`, `easing()`, `@include safe-transition()`
- **Autres** : `radius()`, `shadow()`, `border-width()`
- **Responsive** : `@include respond-to()` (mobile-first)

**Interdictions** :
- ❌ AUCUNE valeur hardcodée (`px`, `rem`, `#hex`, `rgb()`)
- ❌ AUCUN `var(--*)` direct
- ❌ AUCUN `lighten()`, `darken()`, `color.adjust()`

**Validation** :
```bash
pnpm lint:hardcoded        # Détecter hardcodes
pnpm build:css             # Compiler SCSS
```

## ⚡ Patterns CRITIQUES

### 1. TOUJOURS Utiliser Hooks Custom

**CRITIQUE** : ❌ **JAMAIS** de query Supabase directe dans composants

```typescript
// ❌ INTERDIT
const { data } = await supabase.from('taches').select()

// ✅ CORRECT
import { useTaches } from '@/hooks'
const { taches, loading, error } = useTaches()
```

**Hooks disponibles** :
- **CRUD** : `useTaches`, `useTachesEdition`, `useRecompenses`, `useCategories`
- **Auth & Permissions** : `useAuth`, `useRBAC`, `useSimpleRole`, `useAdminPermissions`
- **Quotas** : `useAccountStatus`, `useSubscriptionStatus`
- **Business Logic** : `useCheckout`, `useMetrics`, `useTimerPreferences`

### 2. Client Supabase Unique

```typescript
// ✅ TOUJOURS importer depuis
import { supabase } from '@/utils/supabaseClient'
```

### 3. Next.js App Router

**Structure Routes** :
```
app/
├── (public)/           # Route group public (pas d'auth)
│   ├── tableau/
│   ├── login/
│   └── signup/
└── (protected)/        # Route group protégé (auth requise)
    ├── edition/
    ├── profil/
    └── admin/
```

**Navigation** :
```typescript
// ✅ CORRECT
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/profil')

// ❌ INTERDIT
import { useNavigate } from 'react-router-dom'
```

**Metadata SEO** :
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Édition - Appli-Picto',
  description: 'Gestion tâches et récompenses',
}
```

### 4. Server vs Client Components

**Ajouter `'use client'` UNIQUEMENT si** :
- Hooks React (`useState`, `useEffect`)
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
```

### 6. Upload Images (100KB max)

```typescript
import { compressImageIfNeeded } from '@/utils'

const compressed = await compressImageIfNeeded(file)
const { data, error } = await supabase.storage
  .from('images')
  .upload(path, compressed)
```

### 7. Intégration Stripe

**CRITIQUE** : TOUJOURS utiliser hook `useCheckout`

```typescript
// ✅ CORRECT
import { useCheckout } from '@/hooks'

function SubscribeButton() {
  const { handleCheckout } = useCheckout()
  return <button onClick={() => handleCheckout()}>S'abonner</button>
}
```

### 8. Contextes Disponibles

**AuthContext** : `useAuth()` - Authentification
```typescript
const { user, authReady, signOut } = useAuth()
```

**PermissionsContext** : `usePermissions()` - Contrôle accès
```typescript
const { canEdit, role } = usePermissions()
```

**ToastContext** : `useToast()` - Notifications
```typescript
const { showToast } = useToast()
showToast('Succès !', 'success')
```

**LoadingContext** : `useLoading()` - États chargement
```typescript
const { loading, setLoading } = useLoading()
```

### 9. Imports Absolus (OBLIGATOIRE)

```typescript
// ✅ CORRECT - Alias @/
import { useTaches } from '@/hooks'
import { Modal, Button } from '@/components'

// ❌ INTERDIT - Relatifs
import { useTaches } from '../../hooks/useTaches'
```

### 10. Error Handling

```typescript
const handleCreate = async () => {
  setLoading(true)
  try {
    const { data, error } = await supabase.from('taches').insert([newTache])
    if (error) throw error
    showToast('Créée !', 'success')
  } catch (error) {
    console.error('Erreur:', error)
    showToast('Erreur création', 'error')
  } finally {
    setLoading(false) // TOUJOURS reset
  }
}
```

## 🚨 Règles Absolues

### JAMAIS Faire

- ❌ Commit sans `pnpm check` + `pnpm test`
- ❌ Modifier DB sans `pnpm context:update`
- ❌ Query Supabase directe dans composants
- ❌ Images > 100KB
- ❌ Utiliser `yarn` ou `npm` (projet pnpm)
- ❌ Importer `react-router-dom` (migré Next.js)
- ❌ Merge branche sans confirmation explicite

### TOUJOURS Faire

- ✅ **Répondre en français** (utilisateurs francophones)
- ✅ Utiliser `pnpm` (PAS yarn/npm)
- ✅ Vérifier accessibilité TSA (WCAG 2.2 AA)
- ✅ Hooks custom pour Supabase
- ✅ `'use client'` seulement si interactif
- ✅ Vérifier quotas AVANT création
- ✅ Animations douces max 0.3s ease
- ✅ Imports absolus `@/`
- ✅ Vérifier tokens SCSS avant créer nouveaux

## 🔧 TypeScript

**État** : Mode strict **partiellement relaxé** pour migration Next.js

- **329 erreurs non-bloquantes** documentées
- ✅ **Build réussit** : `pnpm build` passe
- ✅ **Tests passent** : `pnpm test` fonctionne
- ✅ **TOUJOURS** typer props composants
- ✅ **Types Supabase** générés : `src/types/supabase.ts`

```typescript
import type { Database } from '@/types/supabase'

type Tache = Database['public']['Tables']['taches']['Row']
type TacheInsert = Database['public']['Tables']['taches']['Insert']
```

## 📱 PWA

**Configuration** : `@ducanh2912/next-pwa` dans `next.config.mjs`

**Manifest** : `public/manifest.json`
- `start_url: "/tableau"`
- `display: "standalone"`
- Icônes 192×192 et 512×512 obligatoires

**Service Worker** : Généré auto au build (`public/sw.js`)

## 📦 Variables Environnement

**Client-Side** (`NEXT_PUBLIC_*` exposé navigateur) :
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Server-Side** (Edge Functions uniquement) :
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## ✅ Checklists

### 🚨 AVANT COMMIT (OBLIGATOIRE)

- [ ] `pnpm check` exécuté et passé
- [ ] `pnpm test` tous tests passent
- [ ] Pas query Supabase directe (hooks custom uniquement)
- [ ] `'use client'` UNIQUEMENT si nécessaire
- [ ] WCAG 2.2 AA respecté
- [ ] Animations ≤ 0.3s ease
- [ ] Images compressées (max 100KB)
- [ ] Quotas vérifiés (`useAccountStatus()`)
- [ ] Tokens SCSS (pas hardcodes)
- [ ] Imports absolus `@/`

### 🚀 AVANT DÉPLOIEMENT

- [ ] `pnpm verify:all` passé
- [ ] `pnpm build` réussit
- [ ] `pnpm preview` testé
- [ ] Edge Functions déployées
- [ ] Webhooks Stripe configurés
- [ ] RLS policies vérifiées
- [ ] Accessibility validée

### 🗄️ APRÈS MODIFICATION DB

- [ ] `pnpm context:update` exécuté
- [ ] `supabase/schema.sql` commit
- [ ] `src/types/supabase.ts` commit
- [ ] Hooks custom mis à jour
- [ ] RLS policies créées
- [ ] Tests ajustés

## 🔍 Résolution Problèmes

- **Quota exceeded** → `useAccountStatus()` avant action
- **Upload échoue** → `compressImageIfNeeded()` avant upload
- **User non auth** → Vérifier `authReady` avant `user`
- **RLS bloque** → Vérifier policies correspondent au rôle
- **Hydration mismatch** → `useEffect` pour code client-only

## 📚 Références Clés

**Fichiers Critiques** :
- `src/contexts/AuthContext.tsx` - Authentification
- `src/hooks/useRBAC.ts` - Permissions
- `src/utils/supabaseClient.ts` - Client Supabase unique
- `src/types/supabase.ts` - Types générés

**Hooks Essentiels** :
- `src/hooks/useTaches*.ts` - CRUD + DnD tâches
- `src/hooks/useAccountStatus.ts` - Quotas
- `src/hooks/useCheckout.ts` - Stripe checkout
- `src/hooks/useMetrics.ts` - Métriques admin

**Edge Functions** :
- `supabase/functions/create-checkout-session/`
- `supabase/functions/stripe-webhook/`
- `supabase/functions/delete-account/`

**Design System** :
- `src/styles/abstracts/_variables.scss` - Tokens
- `src/styles/abstracts/_mixins.scss` - Mixins

## 🎨 Spécificités UX TSA

**CRITIQUE** : Design apaisant pour enfants autistes

**Principes** :
- **Animations** : Max 0.3s ease, douces et prévisibles
- **Pas surcharge visuelle** : Interface épurée, minimaliste
- **Prévisibilité** : Actions cohérentes, pas de surprises
- **Couleurs pastel** : Palette apaisante, WCAG 2.2 AA minimum
- **Navigation** : Simple, claire, logique

**Accessibilité (WCAG 2.2 AA)** :
- ✅ Contraste minimum : 4.5:1 texte, 3:1 UI
- ✅ Focus visible toujours
- ✅ Cibles tactiles : 44×44px minimum
- ✅ ARIA correct pour lecteurs d'écran
- ✅ Navigation clavier complète
- ✅ Respecter `prefers-reduced-motion`

**Validation** :
```bash
pnpm validate:touch-targets # Vérifier cibles tactiles
pnpm test:e2e               # Tests incluent axe-core
```
