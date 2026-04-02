---
name: Admin Architecture Appli-Picto
description: Découverte complète du système admin avec routes, guards, RLS, hooks et données
type: reference
---

# Architecture Admin — Appli-Picto S12

## Routes Admin (Next.js App Router)

### Chemins

- `/admin/logs` — Page admin logs d'abonnement (Client Component wrapper)
- `/admin/metrics` — Dashboard métriques (placeholder en migration)
- `/admin/permissions` — Management permissions (placeholder en migration)

### Fichiers Routes

- `src/app/(protected)/admin/logs/page.tsx` — Route protégée (Client Component)
- `src/app/(protected)/admin/metrics/page.tsx` — Route protégée (Client Component)
- `src/app/(protected)/admin/permissions/page.tsx` — Route protégée (Client Component)

## Guards & Protection

### AdminRoute (Protection visuelle)

**Chemin** : `src/components/shared/admin-route/AdminRoute.tsx`

- Hook `useAccountStatus()` pour lire `isAdmin`
- Si loading → affiche `<Loader />`
- Si non-admin → affiche 404 neutre (JAMAIS "access denied")
- Si admin → rend les enfants

**Règles d'implémentation** :

- JAMAIS redirect (router.replace/redirect)
- JAMAIS mot "admin", "forbidden", "permission" visible côté non-admin
- Comportement identique à 404 globale (page non trouvée)

### Middleware (Protection réseau)

**Chemin** : `middleware.ts`

Routes matcher :

- `/profil/:path*`
- `/edition/:path*`
- `/abonnement/:path*`
- `/admin/:path*`

Logique :

- Vérifie cookies `sb-access-token` ou `sb-refresh-token`
- Si non authentifié → redirige vers `/login` avec `returnUrl`
- Si authentifié → laisse passer (côté client, AdminRoute fait la vérification admin)

### PrivateRoute (Distinction avec ProtectedRoute)

**Chemin** : `src/components/shared/private-route/PrivateRoute.tsx`

- Utilise `useAuth()` pour vérifier `user`
- BLOQUE les visiteurs (mode visitor local-only)
- SEULEMENT pour routes authentifiées strictement (profil, abonnement, admin)
- Redirige vers `/login` si pas connecté

## Statut Admin — Table accounts

### Enum account_status

**Migration** : `20260130100000_create_extensions_enums.sql`

```sql
CREATE TYPE account_status AS ENUM ('free', 'subscriber', 'admin');
```

Trois statuts :

- `'free'` — Utilisateur gratuit
- `'subscriber'` — Abonné Stripe
- `'admin'` — Administrateur

### Table accounts

**Migration** : `20260130101000_create_accounts.sql`

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status account_status NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- PK = `auth.users.id` (CASCADE DELETE)
- Index sur `status` pour recherches rapides
- Timezone pour quotas mensuels (fuseau utilisateur)

## RLS Helper Function is_admin()

**Migration** : `20260203126000_phase7_1_rls_helpers.sql`

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status account_status;
BEGIN
  -- Retourne TRUE si current user (auth.uid()) a status = 'admin'
  SELECT status INTO v_status
  FROM public.accounts
  WHERE id = auth.uid();

  RETURN v_status = 'admin';
END;
$$;
```

**Propriétés** :

- SECURITY DEFINER — Exécutée avec droits de owner (lecture accounts autorisée)
- STABLE — Résultat stable durante une session
- search_path hardened pour éviter injections SQL
- Lecture SEULEMENT du compte courant (pas de mass surveillance)
- Utilisée dans toutes les policies RLS admin-only

## Hooks Admin

### useAccountStatus()

**Chemin** : `src/hooks/useAccountStatus.ts`

```typescript
interface UseAccountStatusReturn {
  status: AccountStatus | null // 'free' | 'subscriber' | 'admin' | null
  loading: boolean
  error: Error | null
  isFree: boolean
  isSubscriber: boolean
  isAdmin: boolean
}
```

**Utilisation** :

- ✅ Affichage cosmétique UNIQUEMENT (badges, labels)
- ❌ JAMAIS pour autorisation (l'autorisation vient de la DB via RLS)
- Fallback `'free'` en cas d'erreur
- AbortController pour cleanup propre

**Code clé** :

- Lignes 58-119 : Hook complet avec useEffect + AbortController

### useAdminSupportInfo()

**Chemin** : `src/hooks/useAdminSupportInfo.ts`

```typescript
interface UseAdminSupportInfoReturn {
  info: AdminSupportAccountInfo | null
  loading: boolean
  error: unknown
  fetch: (accountId: string) => Promise<void>
  reset: () => void
}
```

**Infos retournées** (via RPC `admin_get_account_support_info`) :

- Account : status, timezone, created_at, updated_at
- Devices : total, active, revoked
- Profiles : total, active, locked, + liste (name, status, created_at)
- Cards : personal_cards_count, personal_cards_current_month (PAS image_url)
- Sessions : total, active, completed

**Sécurité (D2)** :

- JAMAIS d'image_url pour personal cards (donnée sensible)
- Accès ciblé par account_id (pas de liste globale)
- is_admin() check côté DB
- withAbortSafe() pour cleanup réseau

**Code clé** :

- Lignes 69-130 : Hook avec RPC call
- Ligne 94-98 : withAbortSafe wrapper

### useAdminBankCards()

**Chemin** : `src/hooks/useAdminBankCards.ts`

```typescript
interface UseAdminBankCardsReturn {
  cards: AdminBankCard[]
  loading: boolean
  error: Error | null
  createCard: (input: CreateBankCardInput) => Promise<ActionResult>
  updatePublished: (id: string, published: boolean) => Promise<ActionResult>
  updateName: (id: string, name: string) => Promise<ActionResult>
  deleteCard: (id: string) => Promise<ActionResult>
  refresh: () => void
}
```

**CRUD Cartes Banque** :

- ✅ Createcard : UUID client-side, path strict {cardId}.jpg, published bool
- ✅ updatePublished : true=visible, false=dépubliée
- ✅ updateName : modifie nom
- ✅ deleteCard : bloque si carte référencée par trigger DB

**Broadcast notifications** :

- Après create/update/delete → envoie broadcast via Realtime persistent channel
- Contourne limitation RLS (non-admins ne reçoivent pas UPDATE non-publiés)
- Événements : 'card_published', 'card_unpublished', 'card_deleted'

**Code clé** :

- Lignes 64-312 : Hook CRUD complet
- Lignes 151-162 : Broadcast après create
- Lignes 200-209 : Broadcast après update published
- Lignes 281-288 : Broadcast après delete

## RLS Policies Admin

### Cartes (cards)

**Migration** : `20260203129000_phase7_4_rls_library.sql`

**SELECT policies** :

- Anon : SELECT bank published uniquement
- Authenticated : bank published + personal owner-only + bank unpublished si référencée (BLOCKER 5)
- Admin : SELECT bank (toutes, published ou non), JAMAIS personal d'autres users (D2)

**Code** :

- Lignes 37-41 : cards_select_bank_published_anon
- Lignes 46-83 : cards_select_authenticated (avec BLOCKER 5)
- Lignes 88-95 : cards_select_admin

**INSERT policies** :

- Authenticated : personal uniquement (quota via trigger)
- Bloqué en mode execution-only (structural BLOCKER 4)

**UPDATE/DELETE policies** :

- Personal : owner-only uniquement
- Bank : admin-only (INSERT/UPDATE/DELETE)
- DELETE bank : bloqué si référencée (trigger cards_prevent_delete_bank_if_referenced)

### subscription_logs

**Migration** : `20260208142000_platform_billing_logs_and_rls.sql`

- SELECT : admin-only (policy utilise is_admin())
- INSERT : service_role uniquement (webhooks Stripe)
- UPDATE/DELETE : personne (triggers forbid_update_delete)
- Append-only table (immuable après création)

**Code** :

- Lignes 49-54 : subscription_logs_select_admin_only

### admin_audit_log

**Migration** : `20260208146000_platform_admin_audit_log.sql`

- SELECT : admin-only (is_admin())
- INSERT : admin-only (is_admin())
- UPDATE/DELETE : personne (triggers forbid_update_delete)
- Append-only table (immuable)

Actions loggées enum :

- 'revoke_sessions'
- 'disable_device'
- 'resync_subscription_from_stripe'
- 'append_subscription_log'
- 'request_account_deletion'
- 'export_proof_evidence'

## RPC Functions Admin

### admin_get_account_support_info(target_account_id UUID)

**Migration** : `20260203130000_phase7_5_admin_support_channel.sql`

Retourne JSON avec métadonnées support ciblées :

- Account : id, status, timezone, created_at, updated_at
- Devices : counts (total, active, revoked)
- Profiles : counts + liste détails (id, name, status, created_at)
- Cards : personal_cards_count, personal_cards_current_month
- Sessions : counts (total, active, completed)

**Sécurité** :

- SECURITY DEFINER (STABLE)
- is_admin() check interne
- search_path hardened
- JAMAIS d'image_url personal (D2)
- Accès ciblé (requiert account_id explicite)

**Code** :

- Lignes 44-146 : Fonction complète
- Lignes 62-65 : is_admin() check
- Lignes 110-121 : Cards info (PAS image_url)

## Page Admin Logs

### Logs.tsx

**Chemin** : `src/page-components/admin/logs/Logs.tsx`

**Fonctionnalités** :

- Fetch subscription_logs depuis table (RLS is_admin())
- Pagination (50 items/page)
- Filtres (all, user, system, event:webhook, event:checkout)
- Total count exact
- Refresh button
- Load more button
- Table 4 colonnes : Timestamp, User (UUID truncated), Event, JSON details

**Hooks utilisés** :

- `useToast()` — notifications erreur
- `useRouter()` — navigation vers /profil

**Query DB** :

```typescript
const { data, error, count } = await supabase
  .from('subscription_logs')
  .select('id, account_id, event_type, details, created_at', {
    count: 'exact',
  })
  .order('created_at', { ascending: false })
  .range(page * 50, (page + 1) * 50 - 1)
```

**État** :

- logs : SubscriptionLog[]
- loading : boolean
- filter : FilterType
- page : number
- hasMore : boolean
- totalCount : number
- errorMessage : string | null

**Code clé** :

- Lignes 44-267 : Composant complet
- Lignes 59-117 : Fonction loadLogs avec AbortController (référence à useAbortSafe pattern)
- Lignes 228-241 : Rendu table dynamique

### Logs.scss

**Chemin** : `src/page-components/admin/logs/Logs.scss`

**Tokens utilisés** :

- spacing : 'xl', 'lg', 'md', 'sm', 'xs'
- surface : 'soft', 'bg', 'border', 'hover'
- radius : 'rounded-12px', 'md', 'sm'
- text : 'default', 'light', 'muted'
- shadow : 'elevation-sm', 'elevation-md'
- font-size : 'xl', 'lg', 'sm', 'xs'
- font-weight : 'semibold', 'medium'
- border-width : 'thin'
- z-index : 'fixed'

**Layout** :

- Mobile-first responsive
- Desktop : grid 4 colonnes (180px, 120px, 1fr, 2fr)
- Mobile : 1 colonne (cards)
- Breakpoints : sm (576px), md (1024px)

**Code clé** :

- Lignes 27-44 : Container principal
- Lignes 109-178 : Table grid + rows
- Lignes 197-308 : Responsive rules

## Components Admin Spécialisés

### AdminMenuItem.tsx

**Chemin** : `src/components/features/admin/AdminMenuItem.tsx`

Sous-menu admin dans UserMenu (dynamiquement chargé) :

- Import dynamique via `dynamic()` → code admin JAMAIS dans bundle non-admin
- État `adminOpen` pour collapse/expand
- Boutons de navigation :
  1. Logs d'abonnement → `/admin/logs`
  2. Métriques → `/admin/metrics`
  3. Permissions → `/admin/permissions`

**Code clé** :

- Lignes 20-69 : Composant complet
- Lignes 27-32 : Import dynamique (dans UserMenu)

### UserMenu.tsx (intégration admin)

**Chemin** : `src/components/layout/user-menu/UserMenu.tsx`

**Intégration admin** :

- Ligne 39 : `const { isAdmin } = useAccountStatus()`
- Lignes 29-32 : Import dynamique AdminMenuItem
- Ligne 369 : Rendre AdminMenuItem si isAdmin
- Ligne 329 : Masquer bouton subscription si isAdmin

**Pattern** :

```typescript
const AdminMenuItem = dynamic(
  () => import('@/components/features/admin/AdminMenuItem'),
  { ssr: false }
)

// Plus tard ...
{isAdmin && <AdminMenuItem />}
```

## Contextes

### AuthContext.tsx

**Chemin** : `src/contexts/AuthContext.tsx`

- Gère session Supabase (user, authReady, error, signOut)
- Sentry integration avec user.id
- Gestion du deadlock SDK (visibility handler)
- Fallback 3s pour `getSession()` timeout
- Recreation SDK si deadlock détecté

**Note** : Statut admin n'est PAS stocké ici (cosmétique via useAccountStatus)

## Middleware Configuration

**Chemin** : `middleware.ts`

```typescript
export const config = {
  matcher: [
    '/profil/:path*',
    '/edition/:path*',
    '/abonnement/:path*',
    '/admin/:path*',
  ],
}
```

Vérifie authentification au middleware level (cookies Supabase).

## Types Supabase Générés

**Chemin** : `src/types/supabase.ts`

```typescript
account_status: 'free' | 'subscriber' | 'admin'

admin_action:
  | 'revoke_sessions'
  | 'disable_device'
  | 'resync_subscription_from_stripe'
  | 'append_subscription_log'
  | 'request_account_deletion'
  | 'export_proof_evidence'
```

## Exports Hooks

**Chemin** : `src/hooks/index.ts`

Admin-specific exports (lignes 73-80) :

```typescript
export { default as useAdminSupportInfo } from './useAdminSupportInfo'
export type {
  AdminSupportAccountInfo,
  AdminSupportChildProfile,
} from './useAdminSupportInfo'
export { default as useAdminBankCards } from './useAdminBankCards'
export type { AdminBankCard } from './useAdminBankCards'
```

## Test Data

**Chemin** : `src/test/mocks/data.ts`

```typescript
export const ADMIN_USER_ID = '223e4567-e89b-12d3-a456-426614174000'
export const mockUsers = {
  adminUser: {
    id: ADMIN_USER_ID,
    email: 'admin@example.com',
    created_at: '2024-01-01T00:00:00Z',
  },
}
```

## Patterns & Conventions

### DB-First Stricte

- Aucune query Supabase directe (TOUJOURS via hooks)
- RLS enforced côté DB (is_admin() check)
- Front tente l'action → gère refus DB proprement

### Sécurité

- No mass surveillance (accès ciblé via account_id)
- D2 : Admin JAMAIS accès image_url personal
- Append-only logs (immuables après création)
- SECURITY DEFINER sur RPC admin (execution contexte owner)

### UX Admin

- 404 neutre pour non-admin (JAMAIS "access denied")
- Dynamical import AdminMenuItem (code admin pas en bundle non-admin)
- Error messages contractuels (pas leak DB)
- Toast notifications pour feedback utilisateur

### Performance

- Realtime broadcast pour notifier non-admins (contourne RLS delay)
- Pagination logs (50/page)
- Refresh key pattern pour forcer rechargement
- withAbortSafe pour cleanup réseau propre

## État Migration S12

- ✅ Logs d'abonnement (100% implémentée)
- 🔄 Métriques (placeholder, sera remis en place après migration DB)
- 🔄 Permissions (placeholder, en cours de migration)
