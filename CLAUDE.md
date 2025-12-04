# CLAUDE.md

Ce fichier guide Claude Code lors du travail sur **Appli-Picto**, une application Next.js 16 pour enfants autistes.

## Vue d'ensemble du projet

**Appli-Picto** est une application web motivationnelle pour enfants autistes (TSA). Elle utilise des pictogrammes visuels, un système de gestion de tâches par drag-and-drop, et un système de récompenses pour aider les enfants à accomplir leurs activités quotidiennes. L'interface met l'accent sur un design apaisant avec des couleurs pastel, des animations douces, et une conformité WCAG 2.2 AA.

## Stack technique

- **Frontend** : React 19, **Next.js 16** (App Router, Turbopack)
- **Runtime** : Node.js 20.19.4 (géré par Volta)
- **Package Manager** : **pnpm 9.15.0** (JAMAIS yarn, JAMAIS npm)
- **Routing** : Next.js App Router avec route groups `(public)` et `(protected)`
- **Styling** : SCSS avec méthodologie BEM-lite, animations custom
- **Backend** : 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Payment** : Stripe (Checkout, subscriptions, webhooks)
- **Security** : Cloudflare Turnstile (CAPTCHA), conformité RGPD/CNIL
- **Testing** : Vitest avec jsdom, Playwright pour E2E
- **PWA** : Configuré avec @ducanh2912/next-pwa
- **TypeScript** : Mode strict avec paramètres relaxés pour migration Next.js (329 erreurs non-bloquantes)

## Commandes de développement

**CRITIQUE** : Ce projet utilise **pnpm** (PAS yarn, PAS npm). Toutes les commandes utilisent `pnpm`.

### Développement core

```bash
pnpm dev              # Démarrer serveur dev Next.js (port 3000, Turbopack)
pnpm dev:fast         # Dev avec précompilation routes
pnpm build            # Build production (Next.js)
pnpm build:prod       # Build avec mode production
pnpm build:analyze    # Build avec analyse bundle
pnpm start            # Démarrer serveur production
pnpm preview          # Prévisualiser build production (alias de start)
```

### Qualité de code (OBLIGATOIRE avant commit)

```bash
pnpm check            # lint:fix + format (OBLIGATOIRE avant commit)
pnpm lint             # Exécuter ESLint
pnpm lint:fix         # Exécuter ESLint avec auto-fix
pnpm format           # Formater avec Prettier
pnpm format:check     # Vérifier formatage Prettier
pnpm type-check       # Vérifier erreurs TypeScript (329 non-bloquantes)
pnpm type-check:watch # Vérifier TypeScript en mode watch
```

### Tests

```bash
pnpm test             # Exécuter tests unitaires Vitest
pnpm test:ui          # Exécuter Vitest avec UI
pnpm test:coverage    # Exécuter tests avec couverture
pnpm test:e2e         # Exécuter tests E2E Playwright
pnpm test:e2e:ui      # Exécuter Playwright avec UI
pnpm test:e2e:headed  # Exécuter Playwright en mode headed
pnpm test:e2e:debug   # Déboguer tests Playwright
pnpm test:e2e:report  # Afficher rapport Playwright
```

### Commandes de vérification

```bash
pnpm verify              # Vérification complète : type-check + lint + format:check + test + build:prod
pnpm verify:quick        # Vérification rapide : type-check + lint + build
pnpm verify:pre-commit   # Vérification pré-commit : type-check + lint + test
pnpm verify:ci           # Vérification CI : type-check + lint + format:check + test:coverage + build:prod
pnpm verify:all          # Vérification complète + E2E : verify:ci + test:e2e
pnpm check-bundle        # Vérifier taille du bundle
pnpm debug:verify        # Vérification avec logs détaillés
```

### Base de données & Types (CRITIQUE après modification DB)

```bash
pnpm context:update      # db:dump + db:types (OBLIGATOIRE après modif Supabase)
pnpm db:dump             # Dumper schéma Supabase vers supabase/schema.sql
pnpm db:types            # Générer types TypeScript depuis Supabase
pnpm db:link             # Lier projet Supabase local au projet distant
pnpm db:dump:remote      # Dumper schéma depuis Supabase distant
pnpm db:types:remote     # Générer types depuis Supabase distant
pnpm context:update:remote # Mise à jour complète depuis distant
```

### Supabase

```bash
pnpm supabase:start   # Démarrer Supabase local
pnpm supabase:stop    # Arrêter Supabase local
pnpm supabase:status  # Afficher statut Supabase
pnpm supabase:reset   # Réinitialiser base de données locale
pnpm supabase:serve   # Servir edge functions localement
```

### Supabase Edge Functions

```bash
pnpm deploy:checkout  # Déployer fonction create-checkout-session
pnpm deploy:webhook   # Déployer fonction stripe-webhook
pnpm logs:checkout    # Suivre logs fonction checkout
pnpm logs:webhook     # Suivre logs fonction webhook
```

### Stripe (développement local)

```bash
pnpm stripe:listen              # Écouter webhooks Stripe (forward vers local)
pnpm stripe:trigger:checkout    # Tester événement checkout.session.completed
pnpm stripe:trigger:subscription # Tester événement customer.subscription.created
```

### MCP Supabase (Intégré à Claude Code)

**CRITIQUE** : Ce projet utilise MCP Supabase **directement intégré dans Claude Code**.

**Outils disponibles** :

- `mcp__supabase__search_docs` - Rechercher dans documentation Supabase officielle
- `mcp__supabase__list_tables` - Lister tables de la base de données
- `mcp__supabase__list_extensions` - Lister extensions PostgreSQL
- `mcp__supabase__list_migrations` - Lister migrations appliquées
- `mcp__supabase__apply_migration` - Appliquer nouvelle migration DDL
- `mcp__supabase__execute_sql` - Exécuter SQL brut (DML/DQL)

**IMPORTANT** : Utiliser `apply_migration` pour opérations DDL (CREATE, ALTER, DROP) et `execute_sql` pour opérations DML (INSERT, UPDATE, DELETE) et DQL (SELECT).

**JAMAIS** : Créer de serveur MCP bridge séparé - tout est intégré nativement.

### Autres commandes

```bash
pnpm audit            # Auditer dépendances
pnpm audit:fix        # Corriger vulnérabilités automatiquement
pnpm stats            # Statistiques code par fichier et langage
pnpm stats:summary    # Résumé statistiques code
pnpm clean            # Nettoyer node_modules, .next, coverage
pnpm clean:all        # Nettoyer tout + pnpm-lock.yaml
```

## Workflows CRITIQUES

### AVANT tout commit (OBLIGATOIRE)

```bash
pnpm check    # DOIT exécuter lint:fix + format (OBLIGATOIRE)
pnpm test     # DOIT passer tous les tests (OBLIGATOIRE)
```

**Si échec** : Corriger erreurs avant commit. JAMAIS commit sans ces vérifications.

### AVANT déploiement (OBLIGATOIRE)

```bash
pnpm build          # DOIT réussir
pnpm preview        # DOIT tester build production
pnpm test:coverage  # DOIT maintenir couverture
```

### APRÈS modification schéma Supabase (OBLIGATOIRE)

```bash
pnpm context:update # DOIT mettre à jour schema.sql + types TypeScript
```

**Génère** :

- `supabase/schema.sql` : Schéma PostgreSQL
- `src/types/supabase.ts` : Types TypeScript

### Commandes slash custom (Claude Code)

- `/verify-quick` - Vérification rapide complète : lint + format + types + build + tests
- `/verify-full` - Vérification exhaustive : verify-quick + E2E + coverage (avant deploy)
- `/commit` - Commit rapide avec message conventionnel et push
- `/supabase-migrate <description>` - Créer et appliquer migration Supabase avec génération types
- `/claude-memory <action> <chemin>` - Créer/mettre à jour fichiers CLAUDE.md
- `/explore <question>` - Exploration approfondie du codebase
- `/debug <description>` - Analyse ultra-approfondie pour bugs sérieux
- `/test-component <nom>` - Exécuter tests unitaires pour composant spécifique

## JAMAIS faire

- ❌ Commit sans exécuter `pnpm check` (lint + format)
- ❌ Commit sans que `pnpm test` passe
- ❌ Déployer sans tester `pnpm preview`
- ❌ Modifier base de données sans exécuter `pnpm context:update`
- ❌ Uploader images > 100KB (compression auto enforced)
- ❌ Créer fichiers markdown documentation (\*.md) sans demande explicite utilisateur
- ❌ Générer README ou fichiers d'analyse de manière proactive
- ❌ Utiliser commandes `yarn` ou `vite` (projet migré vers pnpm + Next.js)
- ❌ Créer nouvelles dépendances `react-router-dom` (migré vers Next.js App Router)
- ❌ Query Supabase directe dans composants (TOUJOURS utiliser hooks custom)
- ❌ Importer `useNavigate` de `react-router-dom` (utiliser `useRouter` de `next/navigation`)

## TOUJOURS faire

- ✅ **Répondre en français** - Projet 100% francophone pour utilisateurs français
- ✅ **Utiliser pnpm** - JAMAIS yarn, JAMAIS npm
- ✅ **Vérifier accessibilité TSA** - WCAG 2.2 AA obligatoire
- ✅ **Utiliser hooks custom Supabase** - JAMAIS query directe
- ✅ **Ajouter `'use client'`** - SEULEMENT si composant interactif
- ✅ **Vérifier quotas** - AVANT toute création (Free: 5 tâches, Abonné: 40)
- ✅ **Tester avec `pnpm check`** - AVANT tout commit
- ✅ **Animations douces** - Max 0.3s ease pour UX TSA-friendly

## Configuration TypeScript

**État actuel** : Mode strict TypeScript **partiellement relaxé** pour migration Next.js

### Paramètres actifs (tsconfig.json)

```json
{
  "noImplicitAny": false, // Autorise types any implicites
  "noImplicitReturns": false, // Autorise return statements manquants
  "noUnusedLocals": false, // Autorise variables locales inutilisées
  "noUnusedParameters": false, // Autorise paramètres inutilisés
  "strictNullChecks": true, // MAINTENU
  "exactOptionalPropertyTypes": true // MAINTENU
}
```

### Statut erreurs TypeScript

- **Total erreurs** : 329 (non-bloquantes)
- **Build** : ✅ Réussit malgré erreurs
- **Tests** : ✅ Tous passent
- **Documentation** : Voir `.github/issues/ts-remaining-errors.md`

**IMPORTANT** : Ces relaxations sont **temporaires** pour migration Next.js. Erreurs documentées et seront corrigées progressivement en 3 sprints (12-16h estimé).

## Historique migrations

### React Router → Next.js App Router (Terminé Nov 2024)

- ✅ **Routing** : Migré de React Router v7 vers Next.js 16 App Router
- ✅ **Système build** : Migré de Vite vers Next.js avec Turbopack
- ✅ **Performance** : Temps build **31s** avec Turbopack (-79% vs Vite)
- ✅ **Route groups** : Implémenté patterns `(public)` et `(protected)`
- ✅ **Server Components** : 108 composants correctement marqués `'use client'`
- ✅ **Optimisation images** : Migré vers `next/image` pour composant SignedImage
- ✅ **PWA** : Configuré avec @ducanh2912/next-pwa
- ✅ **Metadata API** : Optimisation SEO pour toutes les pages
- ✅ **Variables environnement** : Migré `VITE_*` → `NEXT_PUBLIC_*`

**CRITIQUE** : Tout le routing utilise maintenant patterns Next.js App Router, PAS `react-router-dom`

### Yarn → pnpm (Terminé Nov 2024)

- ✅ **Package manager** : pnpm@9.15.0
- ✅ **Performance** : Temps build réduit de 2m30s à ~20s (-87%)
- ✅ **node_modules** : Réduit de 400 MB à 250 MB (-37%)
- ✅ **Installation** : Réduit de 45s à 8.5s (-81%)

**CRITIQUE** : Toutes les commandes utilisent maintenant `pnpm`, PAS `yarn`

## Architecture

### Structure frontend

```
src/
├── app/                  # Next.js App Router
│   ├── (public)/        # Routes publiques (tableau, login, signup, legal)
│   └── (protected)/     # Routes protégées (edition, profil, abonnement, admin)
├── components/          # Composants UI modulaires (chaque avec .tsx + .scss)
│   ├── admin/          # Composants spécifiques admin
│   ├── consent/        # UI consentement cookies
│   ├── shared/         # Composants réutilisables (Modal, Layout, Button, etc.)
│   ├── taches/         # Composants liés aux tâches
│   ├── recompenses/    # Composants liés aux récompenses
│   └── ui/             # Primitives UI base (Button, Input, etc.)
├── contexts/           # Gestion état global
│   ├── AuthContext.tsx           # État authentification
│   ├── PermissionsContext.tsx    # Permissions basées sur rôles
│   ├── ToastContext.tsx          # Notifications toast
│   ├── LoadingContext.tsx        # État chargement global
│   └── DisplayContext.tsx        # Préférences affichage
├── hooks/              # Hooks React custom (intégration Supabase)
│   ├── useTaches.ts              # CRUD tâches
│   ├── useTachesEdition.ts       # Édition tâches
│   ├── useTachesDnd.ts           # Drag & drop tâches
│   ├── useRecompenses.ts         # CRUD récompenses
│   ├── useCategories.ts          # CRUD catégories
│   ├── useParametres.ts          # Paramètres utilisateur
│   ├── useAuth.ts                # Utilitaires auth
│   ├── useRBAC.ts                # Contrôle accès basé rôles
│   ├── useSubscriptionStatus.ts  # Statut abonnement
│   ├── useAccountStatus.ts       # Statut compte
│   ├── useStations.ts            # Stations métro (thème)
│   ├── useDemoCards.ts           # Cartes démo visiteurs
│   └── index.ts                  # Exports publics hooks
├── page-components/    # Composants pages principales
│   ├── tableau/        # Tableau enfant (drag & drop tâches)
│   ├── edition/        # Éditeur adulte (tâches/récompenses)
│   ├── profil/         # Gestion profil utilisateur
│   ├── abonnement/     # Gestion abonnement
│   └── admin/          # Dashboard admin
├── utils/              # Utilitaires
│   ├── supabaseClient.ts         # Instance unique client Supabase
│   ├── compressImage.ts          # Compression images 100KB max
│   └── index.ts                  # Exports utilitaires
├── styles/             # SCSS global
│   ├── main.scss                 # Point d'entrée
│   ├── animations.scss           # Animations custom
│   └── variables.scss            # Variables SCSS (palette pastel)
└── types/              # Types TypeScript
    └── supabase.ts               # Types générés depuis Supabase
```

### Structure backend

**Supabase Edge Functions** (`supabase/functions/`) :

- `create-checkout-session/` - Création session checkout Stripe
- `stripe-webhook/` - Handler webhook Stripe (cycle vie abonnement)
- `delete-account/` - Suppression compte utilisateur (RGPD)
- `log-consent/` - Logging consentement cookies
- `cleanup-unconfirmed/` - Suppression comptes non-confirmés

**Templates email** (`supabase/email-templates/`) :

- `confirm-signup.html` - Email bilingue confirmation compte
- `reset-password.html` - Email bilingue réinitialisation mot de passe
- `invite-user.html` - Email bilingue invitation utilisateurs (optionnel)
- `README.md` - Guide configuration Dashboard Supabase
- `SUBJECTS.md` - Sujets email recommandés

### Tables Supabase

**Tables principales** :

- `taches` - Tâches utilisateurs (label, fait, aujourdhui, imagePath, position, category_id)
- `recompenses` - Récompenses (label, imagePath, selected)
- `parametres` - Paramètres globaux (toggle confettis)
- `categories` - Catégories tâches
- `stations` - Noms stations métro par ligne (feature thème)
- `abonnements` - Données abonnement Stripe (customer_id, subscription_id, status)
- `user_roles` - Assignations rôles utilisateurs
- `user_permissions` - Permissions granulaires

**Storage** : Bucket `images` (privé) pour pictogrammes uploadés par utilisateurs

## Rôles utilisateurs & Quotas

### Système de rôles

- **Visiteur** (visitor) : Mode démo avec 3 tâches prédéfinies, pas de compte
- **Free** : Quotas limités (5 tâches/mois, 2 récompenses/mois, 2 catégories max)
- **Abonné** (subscriber) : Quotas complets (40 tâches, 10 récompenses, 50 catégories)
- **Admin** : Accès complet, pas d'abonnement requis
- **Staff** : Rôle futur pour support

### Feature gates

Utiliser `<FeatureGate role="abonne">...</FeatureGate>` pour restreindre features UI. Enforcement côté serveur via policies RLS.

## Patterns Next.js

### Routing avec App Router

**Routes définies par structure dossiers** dans `src/app/` :

```typescript
// src/app/(protected)/edition/page.tsx
import Edition from '@/page-components/edition/Edition'

export const metadata = {
  title: 'Édition - Appli-Picto',
  description: 'Créez et modifiez vos tâches et récompenses',
}

export default function EditionPage() {
  return <Edition />
}
```

### Route groups

- `(public)/` - Routes accessibles sans authentification (tableau, login, signup, legal)
- `(protected)/` - Routes nécessitant authentification (edition, profil, abonnement, admin)

### Server vs Client Components

**Par défaut** : Server Components (pas de `'use client'`)

**Requis `'use client'`** si utilisation de :

- Hooks React (`useState`, `useEffect`, `useContext`, etc.)
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`window`, `document`, `localStorage`)
- Librairies client-side (Supabase client-side auth)

**Pattern** :

```typescript
'use client' // Requis pour interactivité

import { useState } from 'react'

export default function InteractiveComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Optimisation images

Utiliser `next/image` pour optimisation automatique (WebP/AVIF, lazy loading) :

```typescript
import Image from 'next/image'

<Image
  src={signedUrl}
  alt="Description"
  width={200}
  height={200}
  loading="lazy"
  quality={85}
/>
```

### Variables d'environnement

**Client-side** : `NEXT_PUBLIC_*` (exposé au navigateur)
**Server-side** : Tout autre nom (server-only)

```typescript
// ✅ Accessible client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// ❌ Undefined client-side, OK server-side
const secretKey = process.env.SECRET_KEY
```

## Patterns CRITIQUES

### Client Supabase

**JAMAIS créer multiples instances Supabase**. TOUJOURS importer depuis :

```typescript
import { supabase } from '@/utils/supabaseClient'
```

### Accès données basé hooks

**CRITIQUE** : TOUTES interactions Supabase DOIVENT passer par hooks custom dans `src/hooks/`.
**JAMAIS écrire queries Supabase brutes dans composants** :

```typescript
// ❌ INTERDIT - Query directe dans composant
const { data } = await supabase.from('taches').select()

// ✅ CORRECT - Utiliser hook
import { useTaches } from '@/hooks'
const { taches, loading } = useTaches()
```

**Hooks disponibles** (voir `src/hooks/index.ts`) :

**Données** :

- `useTaches()` - CRUD tâches (lecture seule)
- `useTachesEdition()` - Édition tâches (create, update, delete)
- `useTachesDnd()` - Drag & drop tâches (réorganisation)
- `useRecompenses()` - CRUD récompenses
- `useCategories()` - CRUD catégories
- `useParametres()` - Paramètres utilisateur
- `useStations()` - Stations métro (thème)
- `useDemoCards()` - Cartes démo visiteurs

**Authentification & Permissions** :

- `useAuth()` - Utilitaires authentification
- `useRBAC()` - Contrôle accès basé rôles (Role-Based Access Control)
- `useSubscriptionStatus()` - Statut abonnement Stripe
- `useAccountStatus()` - Statut compte utilisateur
- `usePermissionsAPI()` - API permissions granulaires
- `useSimpleRole()` - Récupération rôle simple
- `useAdminPermissions()` - Permissions admin spécifiques

**Utilitaires** :

- `useDebounce()` - Debounce valeurs
- `useFallbackData()` - Données fallback pendant chargement
- `useDragAnimation()` - Animations drag & drop
- `useReducedMotion()` - Détection préférence mouvement réduit
- `useAudioContext()` - Contexte audio Web Audio API
- `useI18n()` - Internationalisation

**Depuis contextes** (via `@/contexts`) :

- `useLoading()` - État chargement global
- `useToast()` - Notifications toast
- `usePermissions()` - Permissions utilisateur

### Flow upload image

1. Utilisateur upload → compressé à 100KB max (`compressImageIfNeeded`)
2. Stocké dans bucket privé `images`
3. Accès via signed URLs (validité 1-24h)
4. Vérification magic bytes + suppression métadonnées pour sécurité

### Gestion état

- **Authentification** : `AuthContext` fournit `user`, `authReady`, `error`
- **Permissions** : `PermissionsContext` fournit vérifications rôles
- **Toasts** : `ToastContext` pour notifications utilisateur
- **Display** : `DisplayContext` pour préférences UI

### Structure composants

Chaque composant a typiquement :

```
ComponentName/
├── ComponentName.tsx
└── ComponentName.scss
```

SCSS utilise naming BEM-lite et palette couleurs pastel.

## Fichiers clés de référence

- **Authentification** : `src/contexts/AuthContext.tsx`
- **Permissions** : `src/contexts/PermissionsContext.tsx`, `src/hooks/useRBAC.ts`
- **Gestion tâches** : `src/hooks/useTaches.ts`, `src/hooks/useTachesEdition.ts`, `src/hooks/useTachesDnd.ts`
- **Logique quotas** : `src/hooks/useAccountStatus.ts`
- **Intégration Stripe** : `supabase/functions/create-checkout-session/`, `supabase/functions/stripe-webhook/`
- **Client Supabase** : `src/utils/supabaseClient.ts`

## Conformité RGPD/CNIL

- Pas de cookies tiers sans consentement explicite
- Consentement cookies géré via `CookieBanner` et edge function `log-consent`
- Données utilisateurs privées par défaut (enforced par RLS)
- Suppression compte via edge function `delete-account`
- Documents légaux dans `src/assets/legal/` (format markdown)

## Notes testing

- Framework testing : Vitest avec environnement jsdom
- Fichier setup : `src/test/setup.js`
- Couverture actuellement limitée - focus sur hooks et composants critiques
- Exécuter tests avec `pnpm test` ou `pnpm test:ui`

## Drag & Drop

Utilise librairie `@dnd-kit` (PAS `react-beautiful-dnd`). Implémentation dans `src/components/taches/taches-dnd/TachesDnd.tsx`.

## Alias chemins

```typescript
'@' → src/
'@styles' → src/styles/
```

Utiliser TOUJOURS imports absolus avec alias `@/` :

```typescript
// ✅ CORRECT
import { Modal } from '@/components/shared/Modal'
import { useTaches } from '@/hooks'

// ❌ ÉVITER
import { Modal } from '../../components/shared/Modal'
```

## Intégration Stripe

- **Checkout** : Edge function `createCheckoutSession` crée sessions Stripe
- **Webhooks** : `stripe-webhook` gère événements `customer.subscription.*`
- **Portal** : Utilisateurs gèrent abonnements via Stripe Customer Portal
- **Mode test** : Utilise clés test Stripe depuis variables environnement

## Conventions importantes

1. **TOUJOURS répondre en français** - Projet francophone pour utilisateurs français
2. **Accessibilité d'abord** - Maintenir conformité WCAG 2.2 AA
3. **UX douce** - Animations doivent être douces et non-intrusives pour utilisateurs TSA
4. **Sécurité par défaut** - Toutes données privées, enforcer RLS sur toutes tables
5. **Architecture basée hooks** - Jamais contourner hooks custom pour accès Supabase
6. **Modularité composants** - Chaque composant doit être autonome avec ses styles

## Variables d'environnement

**Variables clés** (dans `.env`) :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://xxx.supabase.co/functions/v1

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...

# Analytics & Monitoring
NEXT_PUBLIC_GA4_ID=G-...
NEXT_PUBLIC_SENTRY_DSN=https://...@...ingest.sentry.io/...
NEXT_PUBLIC_APP_VERSION=1.0.0

# Application
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Variables edge functions** (dans `supabase/.env`) :

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Résolution problèmes courants

### Problème : "Quota exceeded"

**Solution** : Toujours vérifier quotas AVANT autoriser actions :

```typescript
import { useAccountStatus } from '@/hooks'

const { canCreateTask, quotas } = useAccountStatus()

if (!canCreateTask) {
  return <QuotaExceeded message="Limite Free : 5 tâches" />
}

// OK pour créer
```

### Problème : "Upload image échoue"

**Solution** : S'assurer compression s'exécute en premier :

```typescript
import { compressImageIfNeeded } from '@/utils'

const compressed = await compressImageIfNeeded(file)
await supabase.storage.from('images').upload(path, compressed)
```

### Problème : "Utilisateur non authentifié"

**Solution** : Toujours vérifier `authReady` avant accéder `user` :

```typescript
import { useAuth } from '@/hooks'

const { user, authReady } = useAuth()

if (!authReady) return <Loader />
if (!user) return <LoginPrompt />

// OK pour utiliser user
```

### Problème : "RLS bloque query"

**Solution** : Vérifier permissions utilisateur et policies RLS correspondent au rôle. Consulter logs Supabase pour violations policy.

### Problème : "Hydration mismatch Next.js"

**Solution** : S'assurer rendu serveur et client identique. Utiliser `useEffect` pour code client-only :

```typescript
'use client'

import { useEffect, useState } from 'react'

export default function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Code client-only ici
  return <div>{window.innerWidth}</div>
}
```

## Vérifications spécifiques Appli-Picto

**TOUJOURS vérifier avant toute modification** :

- ✅ **Impact accessibilité TSA** - Design calme, prévisible, pas de surcharge visuelle
- ✅ **Respect quotas** - Free: 5 tâches/2 récompenses, Abonné: 40/10
- ✅ **Conformité RGPD/CNIL** - Si traitement données personnelles
- ✅ **Utilisation hooks custom** - JAMAIS query Supabase directe
- ✅ **Tests accessibilité WCAG 2.2 AA** - Contraste, focus clavier, navigation
- ✅ **`'use client'`** - Seulement si composant interactif (Next.js)
- ✅ **Animations douces** - Max 0.3s ease, prévisibles pour UX TSA
- ✅ **Supabase RLS** - Policies activées sur toutes tables privées
- ✅ **Compression images** - 100KB max enforced
- ✅ **Hydration Next.js** - Éviter mismatches SSR/client

## Checklist avant commit

- [ ] `pnpm check` exécuté et passé (lint + format)
- [ ] `pnpm test` exécuté et tous tests passent
- [ ] Pas de query Supabase directe dans composants
- [ ] Hooks custom utilisés pour toutes interactions DB
- [ ] `'use client'` ajouté SEULEMENT si interactivité
- [ ] Accessibilité WCAG 2.2 AA vérifiée
- [ ] Animations douces (max 0.3s ease)
- [ ] Images compressées 100KB max
- [ ] Quotas vérifiés avant création
- [ ] RGPD respecté si données personnelles

## Checklist avant déploiement

- [ ] `pnpm build` réussit
- [ ] `pnpm preview` testé en production
- [ ] `pnpm test:coverage` maintient couverture
- [ ] `pnpm test:e2e` passent
- [ ] Variables environnement production configurées
- [ ] Edge functions Supabase déployées
- [ ] Webhooks Stripe configurés
- [ ] RLS policies Supabase vérifiées
- [ ] Tests accessibilité complets effectués

## Checklist après modification DB

- [ ] `pnpm context:update` exécuté
- [ ] `supabase/schema.sql` mis à jour
- [ ] `src/types/supabase.ts` régénéré
- [ ] Hooks custom mis à jour si nouvelles tables
- [ ] RLS policies créées pour nouvelles tables
- [ ] Migrations testées localement
- [ ] Tests mis à jour si schéma modifié
