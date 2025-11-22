# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Appli-Picto** is a motivational dashboard web application designed for autistic children (TSA). It uses visual pictograms, drag-and-drop task management, and reward systems to help children complete daily activities. The interface emphasizes calming design with pastel colors, gentle animations, and WCAG 2.2 AA accessibility compliance.

## Tech Stack

- **Frontend**: React 19, **Next.js 16** (App Router, Turbopack), **pnpm 9.15.0** (migrated from Yarn PnP)
- **Routing**: Next.js App Router with route groups `(public)` and `(protected)`
- **Styling**: SCSS with BEM-lite methodology, custom animations
- **Backend**: 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Payment**: Stripe (Checkout, subscriptions, webhooks)
- **Security**: Cloudflare Turnstile (CAPTCHA), RGPD/CNIL compliant
- **Testing**: Vitest with jsdom, Playwright for E2E
- **PWA**: Configured with @ducanh2912/next-pwa
- **Node version**: 20.19.4 (managed by Volta)
- **TypeScript**: Strict mode with relaxed settings for Next.js migration (329 non-blocking errors)

## Development Commands

**CRITICAL**: This project uses **pnpm** (NOT yarn). All commands use `pnpm`.

### Core Development

```bash
pnpm dev              # Start Next.js dev server (port 3000, Turbopack)
pnpm build            # Build for production (Next.js)
pnpm build:prod       # Build with production mode
pnpm build:analyze    # Build with bundle analysis
pnpm start            # Start production server
pnpm preview          # Preview production build (alias for start)
```

### Code Quality

```bash
pnpm lint             # Run ESLint
pnpm lint:fix         # Run ESLint with auto-fix
pnpm format           # Format with Prettier
pnpm check            # Run lint:fix + format (REQUIRED before commit)
pnpm type-check       # Check TypeScript errors (329 non-blocking)
```

### Testing

```bash
pnpm test             # Run Vitest unit tests
pnpm test:ui          # Run Vitest with UI
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run Playwright E2E tests
pnpm test:e2e:ui      # Run Playwright with UI
```

### Verification Commands

```bash
pnpm verify           # Full check: type-check + lint + format + test + build
pnpm verify:quick     # Quick check: type-check + lint + build
pnpm verify:ci        # CI check: full verification with coverage
pnpm check-bundle     # Verify bundle size
```

### Database & Types

```bash
pnpm db:dump          # Dump Supabase schema to supabase/schema.sql
pnpm db:types         # Generate TypeScript types from Supabase
pnpm context:update   # Run db:dump + db:types (CRITICAL after schema changes)
```

### Supabase Functions

```bash
pnpm supabase:serve   # Serve edge functions locally
pnpm deploy:checkout  # Deploy create-checkout-session function
pnpm deploy:webhook   # Deploy stripe-webhook function
pnpm logs:checkout    # Follow checkout function logs
pnpm logs:webhook     # Follow webhook function logs
```

### MCP Supabase (Intégré à Claude Code)

**CRITICAL**: Ce projet utilise MCP Supabase **directement intégré dans Claude Code**.

**Outils disponibles**:

- `mcp__supabase__search_docs` - Rechercher dans la documentation Supabase officielle
- `mcp__supabase__list_tables` - Lister les tables de la base de données
- `mcp__supabase__list_extensions` - Lister les extensions PostgreSQL
- `mcp__supabase__list_migrations` - Lister les migrations appliquées
- `mcp__supabase__apply_migration` - Appliquer une nouvelle migration DDL
- `mcp__supabase__execute_sql` - Exécuter du SQL brut (DML/DQL)

**IMPORTANT**: Utiliser `apply_migration` pour les opérations DDL (CREATE, ALTER, DROP) et `execute_sql` pour les opérations DML (INSERT, UPDATE, DELETE) et DQL (SELECT).

**NEVER**: Créer de serveur MCP bridge séparé - tout est intégré nativement.

### CRITICAL Workflows

**BEFORE any commit**:

```bash
pnpm check    # MUST run lint:fix + format
pnpm test     # MUST pass all tests
```

**BEFORE deploying**:

```bash
pnpm build # MUST succeed
pnpm preview # MUST test production build
pnpm test:coverage # MUST maintain coverage
```

**AFTER modifying Supabase schema**:

```bash
pnpm context:update # MUST update schema.sql + types
```

**NEVER**:

- Commit without running `pnpm check`
- Deploy without testing `pnpm preview`
- Modify database without updating types (`pnpm context:update`)
- Upload images > 100KB (auto-compression enforced)
- Create markdown documentation files (\*.md) without explicit user request
- Generate README or analysis files proactively
- Use `yarn` or `vite` commands (project migrated to pnpm + Next.js)
- Create new `react-router-dom` dependencies (migrated to Next.js App Router)

## TypeScript Configuration

**Current State**: TypeScript strict mode **partially relaxed** for Next.js migration

### Active Settings (tsconfig.json)

```json
{
  "noImplicitAny": false, // Allows implicit any types
  "noImplicitReturns": false, // Allows missing return statements
  "noUnusedLocals": false, // Allows unused local variables
  "noUnusedParameters": false, // Allows unused parameters
  "strictNullChecks": true, // MAINTAINED
  "exactOptionalPropertyTypes": true // MAINTAINED
}
```

### TypeScript Errors Status

- **Total errors**: 329 (non-blocking)
- **Build**: ✅ Succeeds despite errors
- **Tests**: ✅ All pass
- **Documentation**: See `.github/issues/ts-remaining-errors.md`

**IMPORTANT**: These relaxations are **temporary** for Next.js migration. Errors are documented and will be fixed progressively in 3 sprints (12-16h estimated).

## Migration History

### React Router → Next.js App Router (Completed Nov 2024)

- ✅ **Routing**: Migrated from React Router v7 to Next.js 16 App Router
- ✅ **Build system**: Migrated from Vite to Next.js with Turbopack
- ✅ **Performance**: Build time **31s** with Turbopack (-79% vs Vite)
- ✅ **Route groups**: Implemented `(public)` and `(protected)` patterns
- ✅ **Server Components**: 108 components correctly marked with `'use client'`
- ✅ **Image optimization**: Migrated to `next/image` for SignedImage component
- ✅ **PWA**: Configured with @ducanh2912/next-pwa
- ✅ **Metadata API**: SEO optimization for all pages
- ✅ **Environment variables**: Migrated `VITE_*` → `NEXT_PUBLIC_*`

**CRITICAL**: All routing now uses Next.js App Router patterns, not `react-router-dom`

### Yarn → pnpm (Completed Nov 2024)

- ✅ **Package manager**: pnpm@9.15.0
- ✅ **Performance**: Build time reduced from 2m30s to ~20s (-87%)
- ✅ **node_modules**: Reduced from 400 MB to 250 MB (-37%)
- ✅ **Installation**: Reduced from 45s to 8.5s (-81%)

**CRITICAL**: All commands now use `pnpm`, not `yarn`

## Architecture

### Frontend Structure

```
src/
â”œâ”€â”€ components/       # Modular UI components (each with .jsx + .scss)
â”‚   â”œâ”€â”€ admin/        # Admin-specific components
â”‚   â”œâ”€â”€ consent/      # Cookie consent UI
â”‚   â”œâ”€â”€ shared/       # Reusable components (Modal, Layout, etc.)
â”‚   â”œâ”€â”€ taches/       # Task-related components
â”‚   â”œâ”€â”€ recompenses/  # Reward-related components
â”‚   â””â”€â”€ ui/           # Base UI primitives (Button, Input, etc.)
â”œâ”€â”€ contexts/         # Global state management
â”‚   â”œâ”€â”€ AuthContext.jsx           # Authentication state
â”‚   â”œâ”€â”€ PermissionsContext.jsx    # Role-based permissions
â”‚   â”œâ”€â”€ ToastContext.jsx          # Toast notifications
â”‚   â””â”€â”€ DisplayContext.jsx        # Display preferences
â”œâ”€â”€ hooks/            # Custom React hooks (Supabase integration)
â”‚   â”œâ”€â”€ useTaches.js              # Tasks CRUD
â”‚   â”œâ”€â”€ useRecompenses.js         # Rewards CRUD
â”‚   â”œâ”€â”€ useQuotas.js              # Quota management
â”‚   â”œâ”€â”€ useAuth.js                # Auth utilities
â”‚   â””â”€â”€ useEntitlements.js        # Feature access control
â”œâ”€â”€ pages/            # Route pages
â”‚   â”œâ”€â”€ tableau/      # Child-facing task board (drag & drop)
â”‚   â”œâ”€â”€ edition/      # Adult-facing task/reward editor
â”‚   â”œâ”€â”€ profil/       # User profile management
â”‚   â”œâ”€â”€ abonnement/   # Subscription management
â”‚   â””â”€â”€ admin/        # Admin dashboard
â”œâ”€â”€ utils/            # Utilities
â”‚   â””â”€â”€ supabaseClient.js         # Single Supabase client instance
â”œâ”€â”€ styles/           # Global SCSS
â”‚   â”œâ”€â”€ main.scss                 # Entry point
â”‚   â””â”€â”€ animations.scss           # Custom animations
â””â”€â”€ main.jsx          # Application entry point
```

### Backend Structure

- **Supabase Edge Functions** (`supabase/functions/`):
  - `create-checkout-session/` - Stripe checkout session creation
  - `stripe-webhook/` - Stripe webhook handler (subscription lifecycle)
  - `delete-account/` - User account deletion (RGPD)
  - `log-consent/` - Cookie consent logging
  - `cleanup-unconfirmed/` - Remove unconfirmed accounts

- **Email Templates** (`supabase/email-templates/`):
  - `confirm-signup.html` - Bilingual email for account confirmation
  - `reset-password.html` - Bilingual email for password reset
  - `invite-user.html` - Bilingual email for user invitations (optional)
  - `README.md` - Configuration guide for Supabase Dashboard
  - `SUBJECTS.md` - Recommended email subjects

### Supabase Tables

- `taches` - User tasks (label, fait, aujourdhui, imagePath, position, category_id)
- `recompenses` - Rewards (label, imagePath, selected)
- `parametres` - Global settings (confettis toggle)
- `categories` - Task categories
- `stations` - Metro station names per line (theme feature)
- `abonnements` - Stripe subscription data (customer_id, subscription_id, status)
- `user_roles` - User role assignments
- `user_permissions` - Fine-grained permissions

**Storage**: `images` bucket (private) for user-uploaded pictograms

## User Roles & Quotas

### Role System

- **Visiteur** (visitor): Demo mode with 3 predefined tasks, no account
- **Free**: Limited quotas (5 tasks/month, 2 rewards/month, 2 categories max)
- **AbonnÃ©** (subscriber): Full quotas (40 tasks, 10 rewards, 50 categories)
- **Admin**: Full access, no subscription required
- **Staff**: Future role for support

### Feature Gates

Use `<FeatureGate role="abonne">...</FeatureGate>` to restrict UI features. Server-side enforcement via RLS policies.

## Important Patterns

## Next.js Patterns

### Routing with App Router

**Routes are defined by folder structure** in `src/app/`:

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

### Route Groups

- `(public)/` - Routes accessibles sans authentification (tableau, login, signup, legal)
- `(protected)/` - Routes nécessitant authentification (edition, profil, abonnement, admin)

### Server vs Client Components

**Default** : Server Components (pas de `'use client'`)
**Require `'use client'`** si utilisation de :

- React hooks (`useState`, `useEffect`, `useContext`, etc.)
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`window`, `document`, `localStorage`)
- Client-side libraries (Supabase client-side auth)

**Pattern** :

```typescript
'use client' // Requis pour interactivité

import { useState } from 'react'

export default function InteractiveComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Image Optimization

Use `next/image` for automatic optimization (WebP/AVIF, lazy loading):

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

### Environment Variables

**Client-side** : `NEXT_PUBLIC_*` (exposed to browser)
**Server-side** : Any other name (server-only)

```typescript
// ✅ Accessible client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// ❌ Undefined client-side, OK server-side
const secretKey = process.env.SECRET_KEY
```

## CRITICAL Patterns

### Supabase Client

**NEVER create multiple Supabase instances**. ALWAYS import from:

```javascript
import { supabase } from '@/utils/supabaseClient'
```

### Hook-Based Data Access

CRITICAL: ALL Supabase interactions MUST go through custom hooks in src/hooks/.
NEVER write raw Supabase queries in components:

Example:

```javascript
// âŒ WRONG - Direct query in component
const { data } = await supabase.from('taches').select()

// âœ… CORRECT - Use hook
import { useTaches } from '@/hooks'
const { taches, loading } = useTaches()
```

### Image Upload Flow

1. User uploads â†’ compressed to 100KB max (`compressImageIfNeeded`)
2. Stored in private `images` bucket
3. Access via signed URLs (1-24h validity)
4. Magic bytes verification + metadata stripping for security

### State Management

- **Authentication**: `AuthContext` provides `user`, `authReady`, `error`
- **Permissions**: `PermissionsContext` provides role checks
- **Toasts**: `ToastContext` for user notifications
- **Display**: `DisplayContext` for UI preferences

### Component Structure

Each component typically has:

```
ComponentName/
â”œâ”€â”€ ComponentName.jsx
â””â”€â”€ ComponentName.scss
```

SCSS uses BEM-lite naming and pastel color palette.

## Key Files to Reference

- **Authentication**: `src/contexts/AuthContext.jsx`
- **Permissions**: `src/contexts/PermissionsContext.jsx`, `src/hooks/useEntitlements.js`
- **Task Management**: `src/hooks/useTaches.js`, `src/hooks/useTachesEdition.js`, `src/hooks/useTachesDnd.js`
- **Quota Logic**: `src/hooks/useQuotas.js`
- **Stripe Integration**: `supabase/functions/create-checkout-session/`, `supabase/functions/stripe-webhook/`
- **Main Routes**: `src/main.jsx`

## RGPD/CNIL Compliance

- No third-party cookies without explicit consent
- Cookie consent managed via `CookieBanner` and `log-consent` edge function
- User data is private by default (enforced by RLS)
- Account deletion via `delete-account` edge function
- Legal documents in `src/assets/legal/` (markdown format)

## Testing Notes

- Testing framework: Vitest with jsdom environment
- Setup file: `src/test/setup.js`
- Limited test coverage currently - focus on hooks and critical components
- Run tests with `yarn test` or `yarn test:ui`

## Drag & Drop

Uses `@dnd-kit` library (not `react-beautiful-dnd`). Implementation in `src/components/taches/taches-dnd/TachesDnd.jsx`.

## Path Aliases

```javascript
'@' â†’ src/
'@styles' â†’ src/styles/
```

## Stripe Integration

- Checkout: `createCheckoutSession` edge function creates Stripe sessions
- Webhooks: `stripe-webhook` handles `customer.subscription.*` events
- Portal: Users manage subscriptions via Stripe Customer Portal
- Test mode uses Stripe test keys from environment variables

## Important Conventions

1. **Always respond in French** - this is a French-language project for French users
2. **Accessibility first** - maintain WCAG 2.2 AA compliance
3. **Gentle UX** - animations should be smooth and non-intrusive for TSA users
4. **Security by default** - all data is private, enforce RLS on all tables
5. **Hook-based architecture** - never bypass custom hooks for Supabase access
6. **Component modularity** - each component should be self-contained with its styles

## Environment Variables

Key variables (in `.env`):

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key
- `VITE_GA4_ID` - Google Analytics 4 ID
- `VITE_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key

Edge function variables (in `supabase/.env`):

- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

## Issue: "Quota exceeded"

Solution: Always check quotas BEFORE allowing actions:

```javascript
const { canCreateTache } = useQuotas()
if (!canCreateTache) return <QuotaExceeded />
```

## Issue: "Image upload fails"

Solution: Ensure compression runs first:

```javascript
const compressed = await compressImageIfNeeded(file)
await supabase.storage.from('images').upload(path, compressed)
```

## Issue: "User not authenticated"

Solution: Always check `authReady` before accessing `user`:

```javascript
const { user, authReady } = useAuth()
if (!authReady) return <Loader />
```

## Issue: "RLS blocks query"

Solution: Verify user permissions and RLS policies match role. Check Supabase logs for policy violations.
