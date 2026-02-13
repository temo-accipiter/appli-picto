# S1-bis TODO — Ce qui reste après S1 Minimal

**Date** : 2026-02-13
**Context** : Suite du travail S1 (Auth + Accounts + Statut + Visitor)

---

## ✅ S1 Minimal — Complété

**Changements commitées** :

1. ✅ **Nouveau hook useAccountStatus** (`src/hooks/useAccountStatus.ts`)
   - Lit `accounts.status` depuis DB (DB-first)
   - API : `{ status, isFree, isSubscriber, isAdmin, loading, error }`
   - Usage cosmétique uniquement (pas d'autorisation)
   - ~95 lignes (vs 267 lignes legacy)

2. ✅ **Signup adapté** (`src/page-components/signup/Signup.tsx`)
   - RPC `email_exists` supprimée (n'existe pas dans migrations)
   - `defaultPseudo` supprimé (non utilisé par backend)
   - Simplifié : Supabase Auth gère nativement doublons email

3. ✅ **AuthContext adapté** (`src/contexts/AuthContext.tsx`)
   - Commentaire documentant que `user_metadata.role` n'est plus géré
   - Impact faible (Sentry uniquement)

4. ✅ **Ancien hook sauvegardé** (`src/hooks/useAccountStatus.legacy.ts`)
   - Pour référence et comparaison

5. ✅ **AUDIT_REPORT_S1.md** complet
   - Analyse détaillée 28 fichiers impactés RBAC
   - Plan suppression en 4 phases
   - Effort estimé ~26h total

---

## ⏳ S1-bis — À Faire

### 🔴 CRITIQUE — Suppression RBAC (12h estimées)

**Fichiers core RBAC à supprimer** (6 fichiers) :

```bash
src/contexts/PermissionsContext.tsx          # ~300 lignes
src/contexts/PermissionsContext.test.tsx
src/hooks/useRBAC.ts                         # ~500 lignes
src/hooks/useRBAC.test.tsx
src/hooks/useSimpleRole.ts                   # ~40 lignes
src/hooks/usePermissionsAPI.ts
src/hooks/useAdminPermissions.ts
```

**Composants à adapter** (22 fichiers) :

| Catégorie | Fichiers | Action |
|-----------|----------|--------|
| **Shared (prioritaire)** | 5 fichiers | Adapter en premier |
| - `FeatureGate.tsx` | | Remplacer `usePermissions()` par logique simple ou supprimer |
| - `ProtectedRoute.tsx` | | Utiliser `useAuth()` + `useAccountStatus()` |
| - `QuotaIndicator.tsx` | | Utiliser nouveau `useAccountStatus()` |
| - `ImageQuotaIndicator.tsx` | | Idem |
| - `InitializationLoader.tsx` | | Vérifier usage RBAC |
| **Layout** | 2 fichiers | |
| - `Navbar.tsx` | | Affichage conditionnel via `useAccountStatus()` |
| - `UserMenu.tsx` | | Badge statut via `useAccountStatus()` |
| **Features** | 3 fichiers | |
| - `admin/AccountManagement.tsx` | | Vérifier logique admin |
| - `admin/QuotaManagement.tsx` | | Adapter quotas |
| - `time-timer/FloatingTimeTimer.tsx` | | Vérifier permissions |
| **Pages** | 7 fichiers | |
| - `tableau/Tableau.tsx` | | Affichage conditionnel |
| - `edition/Edition.tsx` | | Idem |
| - `admin/logs/Logs.tsx` | | Admin only (RLS) |
| - `admin/metrics/Metrics.tsx` | | Idem |
| - `admin-permissions/AdminPermissions.tsx` | | Refactor complet |
| - `HomeRedirect.tsx` | | Logique routing |
| **App & Contexts** | 2 fichiers | |
| - `app/providers.tsx` | | Retirer PermissionsProvider |
| - `contexts/DisplayContext.tsx` | | Vérifier dépendances |
| **Barrel Exports** | 3 fichiers | |
| - `hooks/index.ts` | | Retirer exports RBAC |
| - `contexts/index.ts` | | Retirer PermissionsContext |
| - `types/contexts.d.ts` | | Nettoyer types |

**Plan recommandé (4 phases)** :

#### Phase 1 : Composants Shared (2h)
1. Adapter `FeatureGate` ou le supprimer
2. Adapter `ProtectedRoute` → `useAuth()` + `useAccountStatus()`
3. Adapter `QuotaIndicator` → nouveau `useAccountStatus()`
4. Tests adaptations

#### Phase 2 : Layout + Pages simples (3h)
1. Adapter `Navbar`, `UserMenu` (affichage badges)
2. Adapter pages tableau/edition (affichage conditionnel)
3. Tests

#### Phase 3 : Features Admin (4h)
1. Adapter composants admin (gestion errors TS legacy tables)
2. Créer nouveaux hooks admin si nécessaire
3. Tests admin flows

#### Phase 4 : Suppression Core RBAC (3h)
1. Retirer `PermissionsProvider` de `app/providers.tsx`
2. Supprimer 6 fichiers core RBAC
3. Nettoyer barrel exports
4. Vérifier `rg "usePermissions|useRBAC"` = 0 occurrences
5. Tests E2E complets

---

### 🟡 MAJEUR — Visitor Mode Local-Only (6h estimées)

**Besoin** : Système Visitor sans RBAC

**À créer** :

1. **Détection Visitor simple** (`src/hooks/useIsVisitor.ts`)
   ```typescript
   // Hook simple : Visitor = !user
   export default function useIsVisitor() {
     const { user, authReady } = useAuth()
     return { isVisitor: authReady && !user, authReady }
   }
   ```

2. **Données démo Visitor** (existant : `src/hooks/useDemoCards.ts`)
   - Déjà présent : 3 tâches, 2 récompenses
   - Utiliser tel quel pour S1-bis

3. **IndexedDB Visitor** (reporter S10 si complexe)
   - `src/utils/visitorStorage.ts` - Abstraction IndexedDB
   - `src/hooks/useVisitorData.ts` - Hook accès données locales
   - Structure : `visitor_timelines`, `visitor_slots`, `visitor_sessions`, `visitor_sequences`
   - **Note** : Peut être reporté à S10 (slice dédiée Visitor), utiliser démo simple en attendant

---

### 🟢 MINEUR — Nettoyage Types (1h estimée)

**Fichiers à nettoyer** :

```bash
src/types/contexts.d.ts          # Retirer types PermissionsContext
src/utils/roleUtils.ts           # Adapter au nouveau schéma (déjà identifié)
```

**Proposition `roleUtils.ts` adapté** :

```typescript
// Nouveau roleUtils.ts adapté au schéma accounts.status
export const ACCOUNT_STATUS = {
  FREE: 'free',
  SUBSCRIBER: 'subscriber',
  ADMIN: 'admin',
} as const

export const VISITOR_STATUS = 'visitor' as const // Local-only

export const normalizeStatus = (status: unknown): string => {
  if (!status) return ACCOUNT_STATUS.FREE
  const s = String(status).toLowerCase()
  if (s === 'abonne') return ACCOUNT_STATUS.SUBSCRIBER // Normaliser ancien nom
  return s
}
```

---

## ⚠️ Erreurs TypeScript Attendues (Hors Scope S1)

**Erreurs actuelles** : 11 erreurs TS dans composants admin

**Tables legacy encore référencées** :
- `profiles` → doit être `accounts`
- `roles` → n'existe plus (RBAC)
- `role_quotas` → n'existe plus (RBAC)

**RPC legacy** :
- `get_image_analytics_summary` → vérifier existence ou adapter

**Scope traitement** : **S2+** (Admin + Métriques)

**Impact actuel** : ZÉRO
- ✅ Build Next.js passe
- ✅ Application fonctionnelle
- ⚠️ Composants admin peuvent avoir comportements legacy (acceptable temporairement)

---

## 🎯 Prochaine Session S1-bis

**Ordre recommandé** :

1. **Phase 1 RBAC** : Adapter FeatureGate + ProtectedRoute (2h)
2. **Phase 2 RBAC** : Adapter Layout + Pages simples (3h)
3. **Visitor simple** : Hook useIsVisitor + démo cards (1h)
4. **Phase 3 RBAC** : Features Admin (4h)
5. **Phase 4 RBAC** : Suppression core RBAC (3h)

**Total estimé S1-bis** : ~13h

**Critères acceptation S1 complet (S1 + S1-bis)** :

- [ ] 0 occurrence `usePermissions`, `useRBAC`, `PermissionsContext`
- [ ] 0 occurrence `from('profiles')` dans scope S1
- [ ] Hook `useAccountStatus()` utilisé pour affichage statut
- [ ] Visitor détecté via `useIsVisitor()` (simple `!user`)
- [ ] Signup fonctionne → profil "Mon enfant" auto-créé
- [ ] Login fonctionne → `accounts.status` lisible
- [ ] Build passe sans erreurs TS S1 (admin ok avoir erreurs S2+)
- [ ] Tests E2E signup/login passent

---

## 📋 Commandes Utiles

```bash
# Vérifier occurrences RBAC
rg "usePermissions|useRBAC|PermissionsContext" src/

# Vérifier accès table profiles
rg "from\('profiles'\)" src/

# Vérifier nouveau hook
rg "useAccountStatus" src/

# Tests
pnpm test src/hooks/useAccountStatus
pnpm test:e2e -- signup
pnpm test:e2e -- login

# Build
pnpm build
pnpm type-check
```

---

**FIN S1_BIS_TODO.md**
