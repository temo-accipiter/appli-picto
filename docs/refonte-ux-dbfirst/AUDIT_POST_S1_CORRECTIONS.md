# 🔍 AUDIT POST-S1-bis — Corrections Appliquées & Actions Restantes

**Date** : 2026-02-14
**Scope** : Déblocage accès S2 (Admin + Metrics + Quotas)
**Statut** : ⚠️ **PARTIELLEMENT COMPLÉTÉ** — Corrections critiques restantes requises

---

## ✅ Corrections Appliquées

### 1️⃣ Edition.tsx — Suppression Quota Logic Client-Side

**Commit** : `006f3fc`

**Supprimé** :
- `useRBAC` import + usage (can Create Task/Reward/Category)
- `ImageQuotaIndicator` (2 occurrences lignes 299, 345)
- `handleQuotaCheck()` fonction (30 lignes quota validation)
- `refreshQuotas()` appels (5 occurrences)
- `ModalQuota` composant + état
- `getQuotaInfo/getMonthlyQuotaInfo` usage

**Ajouté** :
- ✅ **Optimistic UI** : Client fait INSERT direct
- ✅ **Server Validation** : RLS reject si quota dépassé
- ✅ **Error Detection** : `error.code === '23514'` ou `message.includes('quota')`
- ✅ **Toast Simple** : Affichage `t('quota.limitReached')` si erreur server

**Impact** :
- `-141 lignes` de quota logic côté client
- `+41 lignes` optimistic UI + server validation
- **100 lignes nettes supprimées**

---

## ❌ Corrections CRITIQUES Restantes (BLOQUANT S2)

### 2️⃣ UserMenu.tsx — Supprimer Hints Admin

**Fichier** : `src/components/layout/user-menu/UserMenu.tsx`
**Lignes** : 393-417

**Problème** :
```typescript
{isAdmin && (  // ❌ Révèle existence pages admin aux non-admin
  <button onClick={() => router.push('/admin/permissions')}>
    <Shield className="icon" />
    <span>{t('nav.admin')}</span>
  </button>
)}
```

**Action Requise** :
1. Créer `src/components/layout/user-menu/AdminMenuItem.tsx` (hors barrel export)
2. Remplacer bloc admin par `{isAdmin && <AdminMenuItem />}`
3. Aucun élément admin dans DOM pour non-admin

**Commande** :
```bash
# 1. Créer AdminMenuItem.tsx
cat > src/components/layout/user-menu/AdminMenuItem.tsx <<'EOF'
'use client'
import { Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AdminMenuItem({ t }: { t: (key: string) => string }) {
  const router = useRouter()

  return (
    <button
      className="user-menu-item admin"
      onClick={() => router.push('/admin/permissions')}
    >
      <Shield className="icon" aria-hidden />
      <span>{t('nav.admin')}</span>
    </button>
  )
}
EOF

# 2. Adapter UserMenu.tsx
# Remplacer lignes 393-417 par :
# {isAdmin && <AdminMenuItem t={t} />}
```

---

### 3️⃣ Navbar.tsx — Supprimer Hints Admin

**Fichier** : `src/components/layout/navbar/Navbar.tsx`
**Lignes** : 35, 62

**Problème** :
```typescript
const isAdminPermissions = pathname === '/admin/permissions'  // ❌ Hardcode admin route

{(isProfil || isEdition || isAdminPermissions) && ...}  // ❌ Révèle admin route
```

**Action Requise** :
1. Supprimer variable `isAdminPermissions`
2. Rendre conditionnel basé sur `useAccountStatus().isAdmin`

**Patch** :
```diff
- const isAdminPermissions = pathname === '/admin/permissions'
+ const { isAdmin } = useAccountStatus()
+ const isAdminPermissions = isAdmin && pathname === '/admin/permissions'
```

---

### 4️⃣ Layout.tsx — Routes Admin Dynamiques

**Fichier** : `src/app/(protected)/layout.tsx`
**Lignes** : 35, 40

**Problème** :
```typescript
const navbarRoutes = ['/profil', '/edition', '/abonnement', '/admin']  // ❌ Hardcode
const footerMobileHiddenRoutes = ['/edition', '/profil', '/admin']    // ❌ Hardcode
```

**Action Requise** :
```diff
+ import { useAccountStatus } from '@/hooks'
+ const { isAdmin } = useAccountStatus()

- const navbarRoutes = ['/profil', '/edition', '/abonnement', '/admin']
+ const navbarRoutes = isAdmin
+   ? ['/profil', '/edition', '/abonnement', '/admin']
+   : ['/profil', '/edition', '/abonnement']

- const footerMobileHiddenRoutes = ['/edition', '/profil', '/admin']
+ const footerMobileHiddenRoutes = isAdmin
+   ? ['/edition', '/profil', '/admin']
+   : ['/edition', '/profil']
```

---

### 5️⃣ Pages Admin — Protection Lazy + 404 Neutre

**Fichiers** :
- `src/app/(protected)/admin/permissions/page.tsx`
- `src/app/(protected)/admin/logs/page.tsx`
- `src/app/(protected)/admin/metrics/page.tsx`

**Problème** :
```typescript
export default function AdminPermissionsPage() {
  return <AdminPermissions />  // ❌ Chargé pour tous, redirect client-side trop tard
}
```

**Action Requise** (appliquer aux 3 pages) :
```typescript
'use client'
import { notFound } from 'next/navigation'
import { useAccountStatus } from '@/hooks'
import { lazy, Suspense } from 'react'
import { Loader } from '@/components'

const AdminPermissions = lazy(() => import('@/page-components/admin-permissions/AdminPermissions'))

export default function AdminPermissionsPage() {
  const { isAdmin, loading } = useAccountStatus()

  if (loading) return <Loader />
  if (!isAdmin) return notFound() // ✅ 404 neutre, pas de hint

  return (
    <Suspense fallback={<Loader />}>
      <AdminPermissions />
    </Suspense>
  )
}
```

---

## 📋 Checklist Déblocage S2

- [x] **Edition.tsx** : Quota logic supprimée (✅ commit 006f3fc)
- [ ] **UserMenu.tsx** : Hints admin supprimés (❌ À FAIRE)
- [ ] **Navbar.tsx** : Hints admin supprimés (❌ À FAIRE)
- [ ] **Layout.tsx** : Routes admin dynamiques (❌ À FAIRE)
- [ ] **Pages admin** : Lazy import + 404 neutre (❌ À FAIRE)
- [ ] **Build final** : Vérification compilation (❌ À FAIRE)

---

## 🎯 Verdict

### ⚠️ BLOQUÉ pour S2 — 4 corrections restantes

**Estimation** : ~2h de travail

**Ordre recommandé** :
1. UserMenu.tsx (30 min)
2. Navbar.tsx (15 min)
3. Layout.tsx (15 min)
4. Pages admin x3 (45 min)
5. Build + tests (15 min)

**Après ces corrections** :
- ✅ Quota logic 100% server-side (RLS)
- ✅ Aucun hint admin pour non-admin
- ✅ Routes admin protégées lazy + 404
- ✅ Accès S2 débloqué

---

## 📚 Références

**Rapport Audit Complet** : Voir conversation précédente
**Commandes Reproductibles** : Voir section "Commandes Utilisées" du rapport
**Architecture DB-first** : `docs/refonte-ux-dbfirst/SYNC_CONTRACT.md`
