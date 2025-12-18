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

# Vérifications (CRITIQUE avant commit/deploy)
pnpm verify:quick        # type-check + lint + build (rapide)
pnpm verify              # type-check + lint + format:check + test + build:prod
pnpm verify:pre-commit   # type-check + lint + test (hook pre-commit)
pnpm verify:ci           # verify + test:coverage (CI/CD)
pnpm verify:all          # verify:ci + test:e2e (vérification exhaustive)
pnpm debug:verify        # Vérification détaillée avec logs de progression

# 🚨 OBLIGATOIRE après modification DB Supabase
pnpm context:update      # Dump schema + génération types TS

# Base de données (CRITIQUE après modifications DB)
pnpm db:dump             # Dump schema local vers supabase/schema.sql
pnpm db:types            # Générer types TypeScript depuis Supabase local
pnpm context:update      # db:dump + db:types (OBLIGATOIRE après modif DB)
pnpm db:link             # Lier projet Supabase distant
pnpm db:dump:remote      # Dump schema distant (production)
pnpm db:types:remote     # Générer types depuis Supabase distant
pnpm context:update:remote # Dump + types depuis distant

# Supabase Local
pnpm supabase:start      # Démarrer Supabase local (Docker)
pnpm supabase:stop       # Arrêter Supabase local
pnpm supabase:status     # Vérifier statut Supabase local
pnpm supabase:reset      # Reset DB locale (DANGER)

# Tests
pnpm test:e2e            # Tests E2E Playwright
pnpm test:e2e:ui         # Tests E2E avec UI interactive
pnpm test:e2e:headed     # Tests E2E avec navigateur visible
pnpm test:e2e:debug      # Tests E2E en mode debug
pnpm test:e2e:report     # Afficher rapport tests E2E
pnpm test:coverage       # Tests avec couverture
pnpm test:ui             # Tests Vitest avec UI interactive

# Maintenance
pnpm audit               # Audit sécurité dépendances
pnpm audit:fix           # Corriger vulnérabilités
pnpm stats               # Statistiques code par fichier/langage
pnpm stats:summary       # Statistiques code résumées
pnpm clean               # Supprimer node_modules, .next, coverage
pnpm clean:all           # clean + suppression pnpm-lock.yaml
```

### Commandes Slash Custom (Claude Code)

#### Vérifications & Tests

- `/verify-quick` - Vérification rapide : type-check + lint + build + test
- `/verify-full` - Vérification exhaustive avant deploy (inclut E2E + coverage)
- `/test-component <nom>` - Tests unitaires composant spécifique

#### Git & Gestion de Code

- `/commit` - Commit conventionnel + push automatique
- `/explore <question>` - Exploration approfondie du codebase

#### Base de Données & Supabase

- `/supabase-migrate <description>` - Créer/appliquer migration + génération types

#### Développement & Debug

- `/debug <description-du-bug>` - Analyse ultra-approfondie pour bugs sérieux avec troubleshooting systématique
- `/deep-code-analysis <question> <zone-cible>` - Analyser code en profondeur pour répondre questions complexes

#### Documentation & Métadonnées

- `/claude-memory <action> <chemin>` - Créer et mettre à jour fichiers CLAUDE.md avec meilleures pratiques
- `/prompt-command <action> <name>` - Créer et optimiser commandes slash custom
- `/prompt-agent <action> <name>` - Créer et optimiser agents spécialisés

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
│   ├── useTachesDnd.ts           # Drag & drop tâches
│   ├── useRecompenses.ts         # CRUD récompenses
│   ├── useCategories.ts          # CRUD catégories
│   ├── useStations.ts            # Gestion stations (lieux/espaces)
│   ├── useParametres.ts          # Paramètres utilisateur
│   ├── useRBAC.ts                # Permissions rôles
│   ├── useAccountStatus.ts       # Quotas utilisateur
│   ├── useSubscriptionStatus.ts  # Statut abonnement Stripe
│   ├── useSimpleRole.ts          # Rôle utilisateur simplifié
│   ├── usePermissionsAPI.ts      # API permissions
│   ├── useAdminPermissions.ts    # Permissions admin
│   ├── useAuth.ts                # Authentification
│   ├── useDemoCards.ts           # Cartes de démo visiteurs
│   ├── useAudioContext.ts        # Contexte audio (sons)
│   ├── useDragAnimation.ts       # Animations drag & drop
│   ├── useReducedMotion.ts       # Détection mouvement réduit (accessibilité)
│   ├── useDebounce.ts            # Debounce inputs
│   ├── useI18n.ts                # Internationalisation
│   └── useFallbackData.ts        # Données de secours
├── page-components/      # Composants pages principales
├── utils/
│   └── supabaseClient.ts         # 🚨 Instance unique Supabase
└── types/
    └── supabase.ts               # Types générés depuis Supabase
```

**Supabase Edge Functions** (`supabase/functions/`) :

- `create-checkout-session/` - Checkout Stripe (création session paiement)
- `stripe-webhook/` - Webhooks Stripe (events abonnements, paiements)
- `delete-account/` - Suppression compte RGPD (anonymisation/suppression données)
- `cleanup-unconfirmed/` - Nettoyage comptes non confirmés (cron job)
- `log-consent/` - Journalisation consentements RGPD
- `monitoring-alerts/` - Alertes monitoring système
- `weekly-report/` - Rapports hebdomadaires usage

## 🎭 Rôles & Quotas

| Rôle         | Tâches | Récompenses | Catégories |
| ------------ | ------ | ----------- | ---------- |
| **Visiteur** | 3 démo | -           | -          |
| **Free**     | 5/mois | 2/mois      | 2 max      |
| **Abonné**   | 40     | 10          | 50         |
| **Admin**    | ∞      | ∞           | ∞          |

**Feature Gates** : `<FeatureGate role="abonne">...</FeatureGate>` + RLS server-side

## 🎨 Refactoring Design System (Phase 5)

**CRITIQUE** : Migration SCSS vers système de tokens centralisés

### État Actuel

- ✅ **Phase 1-4** : Tokens consolidés, composants migrés
- 🔄 **Phase 5** : Finalisation et nettoyage (EN COURS)

### Outils de Refactoring

**Agent dédié** :

```bash
/use scss-refactor  # Activer l'expert design system
```

**Commande refactoring** :

```bash
/refactor-scss <chemin-fichier.scss>  # Refactorer un composant
```

**Hook validation automatique** :

- Hook pre-commit CSS vérifie conformité tokens avant chaque commit
- Installé dans `.git/hooks/pre-commit`
- Bloque commits avec valeurs hardcodées

### Documentation Complète

Pour refactoring CSS, consulter :

- **`refactor-philosophy.md`** - Règles absolues & principes
- **`refactor-contract.md`** - Plan d'exécution étape par étape
- **`scss-architecture.md`** - Architecture technique & tokens

### Règles CRITIQUES SCSS

**Fonctions autorisées** :

- **Couleurs** : `color()`, `surface()`, `text()`, `semantic()`, `role-color()`
- **Spacing** : `spacing()` (margin/padding/gap UNIQUEMENT)
- **Size** : `size()` (width/height/min-height/etc.) ⭐ NOUVEAU
- **Typographie** : `font-size()`, `font-weight()`, `line-height()`
- **Motion** : `timing()`, `easing()`, `@include safe-transition()`
- **Autres** : `radius()`, `shadow()`, `border-width()`
- **Responsive** : `@include respond-to()` (mobile-first)

**Interdictions** :

- ❌ AUCUNE valeur hardcodée (`px`, `rem`, `#hex`, `rgb()`)
- ❌ AUCUN `var(--*)` direct
- ❌ AUCUN `lighten()`, `darken()`, `color.adjust()`

### Validation

```bash
pnpm lint:hardcoded        # Détecter hardcodes
pnpm validate:touch-targets # Valider accessibilité
pnpm build:css             # Compiler SCSS
pnpm verify:css            # Vérification complète
```

## ⚡ Patterns CRITIQUES

### 1. TOUJOURS Utiliser Hooks Custom

**CRITIQUE** : ❌ **JAMAIS** de query Supabase directe dans composants

```typescript
// ❌ INTERDIT - Query directe Supabase
const { data } = await supabase.from('taches').select()

// ✅ CORRECT - Hook custom
import { useTaches } from '@/hooks'
const { taches, loading, error } = useTaches()
```

**Hooks disponibles** :

- **CRUD** : `useTaches`, `useTachesEdition`, `useRecompenses`, `useCategories`, `useStations`, `useParametres`
- **Drag & Drop** : `useTachesDnd`, `useDragAnimation`
- **Auth & Permissions** : `useAuth`, `useRBAC`, `useSimpleRole`, `usePermissionsAPI`, `useAdminPermissions`
- **Quotas & Abonnements** : `useAccountStatus`, `useSubscriptionStatus`
- **UX** : `useAudioContext`, `useReducedMotion`, `useDebounce`, `useI18n`
- **Data** : `useDemoCards`, `useFallbackData`

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

**CRITIQUE** : Toutes les images DOIVENT être compressées avant upload

```typescript
import { compressImageIfNeeded } from '@/utils'

const compressed = await compressImageIfNeeded(file)
const { data, error } = await supabase.storage
  .from('images')
  .upload(path, compressed)
```

### 7. Intégration Stripe

**CRITIQUE** : Toujours utiliser Edge Functions pour opérations Stripe sensibles

```typescript
// ❌ INTERDIT - Appel Stripe direct depuis client
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ✅ CORRECT - Utiliser Edge Function
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ priceId: 'price_xxx' }),
})
const { sessionId } = await response.json()
```

**Commandes Stripe** :

- `pnpm deploy:checkout` - Déployer fonction checkout
- `pnpm deploy:webhook` - Déployer webhook (--no-verify-jwt)
- `pnpm logs:checkout` - Suivre logs checkout en temps réel
- `pnpm logs:webhook` - Suivre logs webhook en temps réel
- `pnpm stripe:listen` - Écouter webhooks localement
- `pnpm stripe:trigger:checkout` - Tester checkout.session.completed
- `pnpm stripe:trigger:subscription` - Tester customer.subscription.created

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

### Situation Actuelle

- **329 erreurs non-bloquantes** documentées (`.github/issues/ts-remaining-errors.md`)
- ✅ **Build réussit** : `pnpm build` passe sans problème
- ✅ **Tests passent** : `pnpm test` fonctionne correctement
- 📅 **Correction progressive** : 3 sprints planifiés (12-16h)

### Règles TypeScript

- ✅ **TOUJOURS** utiliser types générés Supabase (`src/types/supabase.ts`)
- ✅ **TOUJOURS** typer props composants React
- ⚠️ **`any` toléré temporairement** : Migration en cours, éviter si possible
- ✅ **Interfaces préférées** : Pour props et types publics
- ✅ **Type guards** : Pour narrowing types complexes

### Commandes TypeScript

- `pnpm type-check` - Vérifier erreurs TypeScript (mode watch disponible)
- `pnpm type-check:watch` - Mode watch pour vérification continue
- `pnpm db:types` - Régénérer types depuis Supabase (OBLIGATOIRE après modif DB)

### Exemple Types Supabase

```typescript
import type { Database } from '@/types/supabase'

type Tache = Database['public']['Tables']['taches']['Row']
type TacheInsert = Database['public']['Tables']['taches']['Insert']
type TacheUpdate = Database['public']['Tables']['taches']['Update']
```

## 📦 Variables Environnement

**CRITIQUE** : Variables sensibles JAMAIS dans fichiers trackés Git

### Fichiers Configuration

- `.env.local` - Variables locales développement (NON tracké Git)
- `.env.example` - Template variables (tracké Git)
- `supabase/.env.local` - Variables Edge Functions locales (NON tracké)
- `supabase/.env` - Variables Edge Functions production (NON tracké)

### Variables Client-Side (NEXT*PUBLIC*\*)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...
```

**⚠️ ATTENTION** : Préfixe `NEXT_PUBLIC_` = exposé côté client (navigateur)

### Variables Server-Side

```bash
# Stripe (Edge Functions uniquement)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase (pour scripts et migrations)
SUPABASE_PROJECT_REF=xxx
SUPABASE_DB_PASSWORD=xxx
SUPABASE_DB_HOST=xxx
SUPABASE_DB_PORT=5432
SUPABASE_DB_USER=postgres
SUPABASE_DB_NAME=postgres
```

### Validation Variables

- ✅ **TOUJOURS** valider variables au démarrage app
- ❌ **JAMAIS** commit fichiers `.env` (sauf `.env.example`)
- ✅ **TOUJOURS** utiliser `process.env.NEXT_PUBLIC_*` pour client
- ✅ **TOUJOURS** vérifier variables Edge Functions avant deploy

## ✅ Checklists

### 🚨 AVANT COMMIT (OBLIGATOIRE)

**CRITIQUE** : NE JAMAIS commit sans ces vérifications

- [ ] **`pnpm check`** exécuté et passé (lint:fix + format)
- [ ] **`pnpm test`** exécuté et tous tests passent
- [ ] **`pnpm type-check`** passé (0 erreurs bloquantes)
- [ ] **Pas query Supabase directe** : Tous appels DB via hooks custom
- [ ] **Hooks custom utilisés** : Import depuis `@/hooks`
- [ ] **`'use client'`** ajouté UNIQUEMENT si nécessaire (hooks, events, browser APIs)
- [ ] **WCAG 2.2 AA respecté** : Contraste, focus visible, ARIA correct
- [ ] **Animations ≤ 0.3s ease** : Douces et apaisantes (TSA-friendly)
- [ ] **Images compressées** : Max 100KB via `compressImageIfNeeded()`
- [ ] **Quotas vérifiés** : `useAccountStatus()` avant création
- [ ] **Tokens SCSS utilisés** : `color()`, `spacing()`, pas de valeurs hardcodées
- [ ] **Imports absolus** : `@/` uniquement, pas de relatifs `../../`

### 🚀 AVANT DÉPLOIEMENT (PRODUCTION)

**CRITIQUE** : Vérifications exhaustives obligatoires

- [ ] **`pnpm verify:all`** passé (type-check + lint + format + test + coverage + build + E2E)
- [ ] **`pnpm build`** réussit sans erreurs
- [ ] **`pnpm preview`** testé localement (serveur production)
- [ ] **`pnpm test:coverage`** : Couverture maintenue/améliorée
- [ ] **`pnpm test:e2e`** : Tous tests E2E passent
- [ ] **Variables env prod** configurées (Vercel/serveur)
- [ ] **Edge Functions déployées** : `pnpm deploy:checkout` + `pnpm deploy:webhook`
- [ ] **Webhooks Stripe configurés** : URLs production enregistrées
- [ ] **RLS policies vérifiées** : Toutes tables sensibles protégées
- [ ] **Bundle size vérifié** : `pnpm check-bundle` (pas de régression)
- [ ] **Accessibility validée** : `pnpm validate:touch-targets` (cibles tactiles 44×44px min)
- [ ] **Logs Edge Functions** : `pnpm logs:checkout` / `pnpm logs:webhook` pour vérifier

### 🗄️ APRÈS MODIFICATION DB SUPABASE (OBLIGATOIRE)

**CRITIQUE** : Synchronisation immédiate types et schema

- [ ] **`pnpm context:update`** exécuté (db:dump + db:types)
- [ ] **`supabase/schema.sql`** mis à jour et commit
- [ ] **`src/types/supabase.ts`** régénéré et commit
- [ ] **Hooks custom mis à jour** : Types et queries adaptés
- [ ] **RLS policies créées** : Sécurité Row Level Security appliquée
- [ ] **Migrations testées localement** : `pnpm supabase:start` + test
- [ ] **Indexes DB optimisés** : Performance queries vérifiée
- [ ] **Tests unitaires ajustés** : Hooks et composants testés avec nouveaux types
- [ ] **Documentation mise à jour** : Si nouvelles tables/colonnes importantes

### 🔄 APRÈS MODIFICATION SCSS/DESIGN

**CRITIQUE** : Conformité système tokens

- [ ] **Tokens utilisés** : Fonctions `color()`, `spacing()`, `font-size()`, `border-radius()`
- [ ] **Pas de valeurs hardcodées** : Aucun `#hex`, `12px`, `8px` direct
- [ ] **Mixins utilisés** : Pour patterns répétés (focus, hover, etc.)
- [ ] **Variables centralisées** : Import depuis `@/styles/abstracts/_variables`
- [ ] **Animations TSA-compliant** : Max 0.3s ease, douces
- [ ] **Contraste vérifié** : WCAG 2.2 AA minimum (4.5:1 texte, 3:1 UI)
- [ ] **Responsive testé** : Mobile, tablette, desktop
- [ ] **Build CSS validé** : `pnpm build` passe sans warnings SCSS

## 🔍 Résolution Problèmes

**Quota exceeded** → Vérifier `useAccountStatus()` avant action
**Upload échoue** → `compressImageIfNeeded()` avant upload
**User non auth** → Vérifier `authReady` avant `user`
**RLS bloque** → Vérifier policies correspondent au rôle
**Hydration mismatch** → `useEffect` pour code client-only

## 📚 Références Clés

### Fichiers Critiques

- **Auth** : `src/contexts/AuthContext.tsx` - Contexte authentification
- **Permissions** : `src/hooks/useRBAC.ts` - Contrôle accès basé sur rôles
- **Client Supabase** : `src/utils/supabaseClient.ts` - Instance unique (CRITIQUE)
- **Types Supabase** : `src/types/supabase.ts` - Types générés automatiquement

### Hooks Essentiels

- **Tâches** : `src/hooks/useTaches*.ts` - CRUD + DnD tâches
- **Récompenses** : `src/hooks/useRecompenses.ts` - CRUD récompenses
- **Quotas** : `src/hooks/useAccountStatus.ts` - Vérification quotas utilisateur
- **Abonnement** : `src/hooks/useSubscriptionStatus.ts` - Statut Stripe

### Edge Functions Supabase

- **Checkout** : `supabase/functions/create-checkout-session/` - Session paiement Stripe
- **Webhook** : `supabase/functions/stripe-webhook/` - Webhooks Stripe (subscriptions)
- **Delete Account** : `supabase/functions/delete-account/` - Suppression compte RGPD

### Design System

- **Variables** : `src/styles/abstracts/_variables.scss` - Tokens centralisés
- **Mixins** : `src/styles/abstracts/_mixins.scss` - Mixins réutilisables
- **Typographie** : `src/styles/abstracts/_typography.scss` - Styles texte

### Scripts Utiles

- `scripts/check-bundle-size.js` - Vérification taille bundle
- `scripts/check-hardcoded.js` - Détection valeurs hardcodées
- `scripts/check-touch-targets.js` - Validation cibles tactiles (accessibilité)

## 🎨 Spécificités UX TSA

**CRITIQUE** : Design apaisant et prévisible pour enfants autistes

### Principes UX Fondamentaux

- **Animations** : Max 0.3s ease, douces et prévisibles (jamais brusques)
- **Pas surcharge visuelle** : Interface épurée, minimaliste, focus clair
- **Prévisibilité** : Actions et résultats cohérents, pas de surprises
- **Couleurs pastel** : Palette apaisante, contrastes WCAG 2.2 AA minimum
- **Navigation** : Simple, claire, logique, breadcrumbs visibles
- **Feedback** : Immédiat et visible pour toutes actions

### Règles Accessibilité (WCAG 2.2 AA)

- ✅ **Contraste minimum** : 4.5:1 pour texte, 3:1 pour composants UI
- ✅ **Focus visible** : Toujours visible et clair (outline ou border)
- ✅ **Cibles tactiles** : Minimum 44×44px (valider avec `pnpm validate:touch-targets`)
- ✅ **ARIA correct** : Labels, roles, states pour lecteurs d'écran
- ✅ **Navigation clavier** : Tab order logique, pas de trappes
- ✅ **Pas de clignotement** : Aucun élément > 3 Hz (risque épilepsie)
- ✅ **Mouvement réduit** : Respecter `prefers-reduced-motion` (hook `useReducedMotion`)

### Outils Validation Accessibilité

- `pnpm validate:touch-targets` - Vérifier tailles cibles tactiles
- `pnpm test:e2e` - Tests E2E incluent validations accessibilité (axe-core)
- Extension navigateur : axe DevTools pour audits manuels

## 🛠️ Outils Développement & Workflows

### VS Code Extensions Recommandées

- **ESLint** : Lint JavaScript/TypeScript en temps réel
- **Prettier** : Formatage automatique
- **SCSS IntelliSense** : Autocomplétion tokens SCSS
- **GitLens** : Historique Git enrichi
- **Error Lens** : Erreurs inline dans éditeur

### Git Hooks (Husky)

- **pre-commit** : `pnpm verify:pre-commit` (type-check + lint + test)
- **commit-msg** : Validation messages commits conventionnels
- **pre-push** : `pnpm build` (évite push code cassé)

### Scripts Utilitaires

- `scripts/check-bundle-size.js` - Alerte si bundle > limite (performance)
- `scripts/check-hardcoded.js` - Détecte valeurs hardcodées (tokens SCSS)
- `scripts/check-touch-targets.js` - Valide cibles tactiles 44×44px (TSA)

### Debugging

- **Next.js Dev Tools** : Activer dans navigateur (React DevTools)
- **Supabase Logs** : `pnpm logs:checkout`, `pnpm logs:webhook`
- **Network Tab** : Surveiller requêtes API Supabase/Stripe
- **Redux DevTools** : N/A (projet utilise React Context, pas Redux)

### Performance Monitoring

- **Lighthouse** : Audit performance/accessibilité intégré Chrome
- **Web Vitals** : Intégré app (`web-vitals` package)
- **Bundle Analyzer** : `pnpm build:analyze` (visualiser taille modules)

### Commandes Debug Avancées

- `pnpm debug:verify` - Vérification détaillée avec logs progression
- `pnpm test:e2e:debug` - Tests E2E mode debug (step-by-step)
- `pnpm test:ui` - Interface Vitest interactive pour debug tests unitaires
