# MEMORY — Appli-Picto

## 🎨 SCSS Tokens — Pièges connus

### `size()` — Token `'44'` inexistant

- ❌ `size('44')` → **ERREUR BUILD Next.js** (pas dans $size-tokens)
- ✅ Pour cible tactile 44px WCAG → `size('touch-target-min')`
- Les tokens disponibles sont : `touch-target-min`, `touch-target-optimal`, `touch-target-preferred`, `touch-target-large`, et des valeurs numériques comme `'40'`, `'48'`...
- ⚠️ Le hook `pnpm build:css` (sass standalone) NE détecte pas ce bug — seul `pnpm build` (Next.js) le révèle. Toujours vérifier avec `pnpm build`.

### `spacing()` — Grille 4px STRICTE

- ✅ Numériques valides : `'1'`(1px), `'2'`(2px), `'4'`(4px), `'6'`(6px), `'8'`(8px)
- ✅ Primitives (Phase 6) : `'xs'`(4px), `'sm'`(8px), `'md'`(16px), `'lg'`(24px), `'xl'`(32px)
- ✅ Sémantiques : `'card-padding'`, `'modal-padding'`, `'nav-padding'`, `'section-gap'`...
- ❌ `spacing('3')`, `spacing('5')`, `spacing('7')` → **ERREUR BUILD** (pas dans la grille)

### `surface()` — Tokens disponibles

- ✅ Valides : `'page'`, `'bg'`, `'card'`, `'overlay'`, `'border'`, `'divider'`, `'hover'`, `'soft'`
- ❌ `surface('warning-subtle')` → **ERREUR BUILD**
- ✅ Alternative fond warning : `surface('soft')` + bordure `semantic('warning')`

## 🏗️ Architecture Slices complétées

- S8 — Offline + Sync (commit `1a06a38`)
- S9 — Execution-only guard (commit `c21f362`)
- S10 — Devices lifecycle (commit `1526f31`)
- S11 — Plateforme (commit `529bc2c`)
- S12 — Administration (en cours)

## 🗄️ Supabase Local — Pièges connus

### Migrations sur `storage.objects` — Permission refusée en local

- ❌ Les migrations dans `supabase/migrations/` s'exécutent avec `postgres` (non superuser)
- ❌ `postgres` n'est PAS propriétaire de `storage.objects` → erreur `must be owner of table objects`
- ✅ En production Supabase cloud, les migrations ont les droits suffisants (ça marche)
- ✅ **Solution locale** : appliquer manuellement avec `supabase_admin` (superuser) :
  ```bash
  PGPASSWORD=postgres psql -h 127.0.0.1 -U supabase_admin -d postgres -f migration.sql
  ```
- ✅ La migration reste dans `supabase/migrations/` avec une NOTE en tête de fichier

### Démarrage Supabase — Health checks qui échouent

- ❌ Avec CLI v2.67.1 les health checks échouent souvent (timeout trop court)
- ✅ Solution : `pnpm supabase start --ignore-health-check`
- ✅ Les services fonctionnent quand même, vérifier avec `pnpm supabase status`

### Volumes Docker corrompus après `db reset` interrompu

- ❌ `supabase db reset` interrompu → volumes corrompus → migrations ne s'appliquent plus
- ✅ Solution : `docker volume rm supabase_db_appli-picto supabase_storage_appli-picto`
- ✅ Puis `pnpm supabase start --ignore-health-check` pour repartir proprement

### Utilisateur superuser local

- `supabase_admin` = superuser (pour DDL sur tables Supabase internes)
- `postgres` = utilisateur des migrations (PAS superuser)

## 📋 Patterns établis

### Hooks DB-first

- Pattern AbortController systématique dans chaque `useEffect` avec fetch Supabase
- Import `isAbortLike` depuis `@/hooks/_net` obligatoire
- Fallback sécurisé sur erreur réseau (jamais bloquer l'utilisateur)

### Confirmation inline (anti-surprise TSA)

- 1er clic → demande confirmation (state `confirmId`)
- 2e clic → exécute l'action
- Bouton "Annuler" toujours accessible
- Pattern utilisé dans : SlotsEditor, DeviceList

### Exports barrel S10

- `src/hooks/index.ts` → `useDevices`, `useDeviceRegistration`, type `Device`
- `src/components/index.ts` → `DeviceList` (features/profil)

## 🔐 Admin Architecture (S12)

### Routes protégées

- `/admin/logs` — Logs d'abonnement (100% implémentée)
- `/admin/metrics` — Métriques (placeholder)
- `/admin/permissions` — Permissions (placeholder)

### Guards multi-niveaux

1. **Middleware** : Authentification cookies (`sb-access-token`, `sb-refresh-token`)
2. **AdminRoute** : Affichage 404 neutre si non-admin (utilise `useAccountStatus().isAdmin`)
3. **RLS** : Bloque accès données DB via `is_admin()` function
4. **Hooks** : DB-first strict (tenter action, gérer refus DB)

### Sécurité D2

- Admin JAMAIS accès images personnelles (`image_url` from `admin_get_account_support_info`)
- Storage policies owner-only bucket (garantie primaire)
- Accès ciblé par account_id (JAMAIS liste globale)

### Table accounts

- PK = `auth.users.id`
- Statut : `'free' | 'subscriber' | 'admin'`
- Index sur status (recherche rapide)
- Timezone pour quotas mensuels

### RLS Policies principales

- `cards_select_admin` : Admin lire bank (all), JAMAIS personal autres
- `subscription_logs_select_admin_only` : Admin seulement (via is_admin())
- `admin_audit_log_*` : Admin-only append-only

### Hooks admin

- `useAccountStatus()` : Lire statut (cosmétique seulement, JAMAIS auteur)
- `useAdminBankCards()` : CRUD cartes banque + realtime broadcast
- `useAdminSupportInfo()` : RPC metadata support (account, devices, profiles, cards, sessions)

### Composants

- `AdminRoute` : Guard visuel 404 neutre
- `AdminMenuItem` : Sous-menu admin (import dynamique → pas en bundle non-admin)
- `UserMenu` intègre AdminMenuItem (rendu conditionnel si isAdmin)

### Page logs complet

- `src/page-components/admin/logs/Logs.tsx` : Pagination 50/page, filtres UI, table 4 colonnes
- Fetch `subscription_logs` avec RLS (is_admin() appliquée DB)
- Erreurs contractuelles + toast notifications
- Styles SCSS tokens-first responsive mobile-first
