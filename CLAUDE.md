# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Appli-Picto** is a motivational dashboard web application designed for autistic children (TSA). It uses visual pictograms, drag-and-drop task management, and reward systems to help children complete daily activities. The interface emphasizes calming design with pastel colors, gentle animations, and WCAG 2.2 AA accessibility compliance.

## Tech Stack

- **Frontend**: React 19, Vite, Yarn PnP (Plug'n'Play), React Router
- **Styling**: SCSS with BEM-lite methodology, custom animations
- **Backend**: 100% Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Payment**: Stripe (Checkout, subscriptions, webhooks)
- **Security**: Cloudflare Turnstile (CAPTCHA), RGPD/CNIL compliant
- **Testing**: Vitest with jsdom
- **Node version**: 20.19.4 (managed by Volta)

## Development Commands

### Core Development

```bash
yarn dev              # Start dev server (port 5173)
yarn build            # Build for production
yarn preview          # Preview production build
```

### Code Quality

```bash
yarn lint             # Run ESLint
yarn lint:fix         # Run ESLint with auto-fix
yarn format           # Format with Prettier
yarn check            # Run lint:fix + format
```

### Testing

```bash
yarn test             # Run Vitest
yarn test:ui          # Run Vitest with UI
yarn test:coverage    # Run tests with coverage
```

### Database & Types

```bash
yarn db:dump          # Dump Supabase schema to supabase/schema.sql
yarn db:types         # Generate TypeScript types from Supabase
yarn context:update   # Run db:dump + db:types
```

### Supabase Functions

```bash
yarn supabase:serve   # Serve edge functions locally
yarn deploy:checkout  # Deploy create-checkout-session function
yarn deploy:webhook   # Deploy stripe-webhook function
yarn logs:checkout    # Follow checkout function logs
yarn logs:webhook     # Follow webhook function logs
```

### MCP Bridge (backend/mcp-supabase)

```bash
cd backend/mcp-supabase
yarn dev              # Start MCP bridge server (port 8787)
yarn check            # Health check
```

### CRITICAL Workflows

**BEFORE any commit**:

```bash
yarn check    # MUST run lint:fix + format
yarn test     # MUST pass all tests
```

**BEFORE deploying**:

```bash
yarn build # MUST succeed
yarn preview # MUST test production build
yarn test:coverage # MUST maintain coverage
```

**AFTER modifying Supabase schema**:

```bash
yarn context:update # MUST update schema.sql + types
```

**NEVER**:

Commit without running yarn check
Deploy without testing yarn preview
Modify database without updating types
Upload images > 100KB (auto-compression enforced)

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
