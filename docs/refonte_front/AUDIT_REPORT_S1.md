# Rapport AUDIT — Slice S1

**Date** : 2026-02-13
**Auditeur** : Claude Code CLI
**Objectif** : Analyser Auth + Accounts + Statut + Visitor (Slice S1)
**Règle** : Audit détaillé AVANT toute modification de code

---

## 📋 Résumé Exécutif

### Verdict : ⚠️ **PRÊT POUR ADAPT avec réserves majeures**

**Points clés** :
- ✅ Client Supabase conforme (anon key uniquement)
- ✅ Auth flows fonctionnels (signup/login/logout)
- 🔴 **CRITIQUE** : Système RBAC complet côté client à supprimer (~1500+ lignes)
- 🔴 **MAJEUR** : Accès table `profiles` legacy dans `useAccountStatus`
- ⚠️ Signup nécessite adaptation (RPC `email_exists`, pseudo legacy)
- ⚠️ Visitor géré via RBAC (à reconstruire en local-only)

---

## 1) Initialisation Supabase

### 1.1 Client Supabase (✅ CONFORME)

**Fichier** : `src/utils/supabaseClient.ts` (238 lignes)

**Clé utilisée** :
```typescript
// Ligne 30-31
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Fallback hardcodée
```

**✅ CONFORME** :
- Utilise uniquement `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Instance unique exportée (`export const supabase`)
- Fonction `recreateSupabaseClient()` pour restauration session

**⚠️ Point d'attention** :
- **Fallback anon key hardcodée** (ligne 31) : acceptable en dev, mais devrait être uniquement en `.env` en production
- **Console.log debug** actifs (ligne 34-35) : retirer en production (déjà géré par `removeConsole: true` dans `next.config.js`)

**Vérification service_role** :
```bash
rg "service_role" src/
# Résultat : 0 occurrence ✅
```

**Décision** : **KEEP** (aucune modification nécessaire)

---

## 2) Auth Flows (Signup / Login / Logout)

### 2.1 AuthContext.tsx (✅ GLOBALEMENT CORRECT)

**Fichier** : `src/contexts/AuthContext.tsx` (234 lignes)

**API exposée** :
```typescript
interface AuthContextValue {
  user: User | null
  authReady: boolean
  loading: boolean
  error: Error | null
  signOut: () => Promise<void>
}
```

**✅ Points positifs** :
- Pattern correct : `getSession()` + `onAuthStateChange()`
- Gestion timeout 5s pour `getSession()` (évite blocage)
- Flag `authReady` pour éviter flash non-auth
- Fonction `signOut()` propre

**⚠️ Point d'attention** :
- **Ligne 56** : `role: user.user_metadata?.role || 'user'` pour Sentry
  - Utilise `user.user_metadata.role` (potentiel RBAC legacy)
  - **Action** : Vérifier si `user_metadata.role` existe dans nouveau schéma
  - **Impact** : Faible (Sentry uniquement, pas logique métier)

**Décision** : **MODIFY (mineur)** - Vérifier `user_metadata.role` avec nouveau schéma

---

### 2.2 Login.tsx (✅ CONFORME)

**Fichier** : `src/page-components/login/Login.tsx` (144 lignes)

**Flow** :
1. Validation email + password (fonctions `validateEmail`, `validatePasswordNotEmpty`)
2. Vérification Turnstile (Cloudflare anti-bot)
3. `supabase.auth.signInWithPassword(email, password, { captchaToken })`
4. Redirection `/tableau` si succès

**✅ CONFORME** :
- Pattern standard Supabase Auth
- Validation robuste
- Gestion erreurs propre
- Utilise instance unique `supabase`

**Décision** : **KEEP** (aucune modification nécessaire)

---

### 2.3 Signup.tsx (⚠️ NÉCESSITE ADAPTATION)

**Fichier** : `src/page-components/signup/Signup.tsx` (191 lignes)

**Flow actuel** :
1. Validation email + password
2. **RPC `email_exists`** (ligne 69-72) — ❓ Existe dans nouveau schéma ?
3. `defaultPseudo` dérivé de l'email (ligne 86)
4. `supabase.auth.signUp()` avec `options.data.pseudo` (ligne 94)

**⚠️ Points d'attention** :

#### a) RPC `email_exists` (ligne 69-78)
```typescript
const { data: exists, error: checkError } = await supabase.rpc(
  'email_exists',
  { email_to_check: emailNorm }
)
```

**Question** : Cette RPC existe-t-elle dans les migrations récentes ?
- ✅ **Vérification** : Chercher `email_exists` dans `supabase/migrations/`
- **Si NON** : Supprimer cette vérification (Supabase Auth gère déjà les doublons)
- **Si OUI** : Garder tel quel

#### b) `defaultPseudo` dans `user_metadata` (ligne 86-94)
```typescript
const defaultPseudo = (emailNorm || '').split('@')[0] || t('auth.pseudo')

const { error: signUpError } = await supabase.auth.signUp({
  email: emailNorm,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/login`,
    captchaToken,
    data: { pseudo: defaultPseudo }, // ⚠️ Ancien schéma ?
  },
})
```

**Question** : Le nouveau schéma `accounts` stocke-t-il `pseudo` dans `user_metadata` ?
- **Action** : Vérifier migrations pour voir si `pseudo` est dans `accounts` ou `user_metadata`
- **Hypothèse** : `accounts` a probablement une colonne `name` ou équivalent

**Décision** : **MODIFY** - Adapter après vérification schéma DB

---

## 3) Système RBAC (🔴 CRITIQUE — À SUPPRIMER)

### 3.1 PermissionsContext.tsx (🔴 ~300 lignes)

**Fichier** : `src/contexts/PermissionsContext.tsx`

**API exposée** :
```typescript
interface PermissionsContextValue {
  ready: boolean
  loading: boolean
  role: string
  isUnknown: boolean
  isVisitor: boolean
  isAdmin: boolean
  permissions: Record<string, boolean>
  error: Error | null
  can: (featureName: string) => boolean
  canAll: (featureNames: string[]) => boolean
  canAny: (featureNames: string[]) => boolean
  reload: () => Promise<void>
}
```

**Logique interne** :
- Appelle RPC `get_user_permissions` (ligne référencée dans code)
- Construit map de permissions `{ feature_name: boolean }`
- Retry exponentiel en cas d'erreur

**🔴 VIOLATION CONTRAT** :
- **§0.3** : "Le frontend NE DOIT JAMAIS implémenter un système de rôles ou de permissions côté client"
- **§1.6** : "Ne jamais re-implémenter des règles critiques (quotas, statuts, droits)"
- **Annexe B** : "Le frontend ne maintient aucune table de rôles, aucune matrice de permissions"

**Impact** : ~40 fichiers utilisent `usePermissions()` ou ce contexte

**Décision** : **DELETE** (suppression complète)

**Fichiers dépendants à adapter** :
- `src/hooks/useRBAC.ts`
- `src/hooks/useSimpleRole.ts`
- `src/components/shared/feature-gate/FeatureGate.tsx`
- `src/components/shared/protected-route/ProtectedRoute.tsx`
- Tous les composants utilisant `usePermissions()` (~40 fichiers)

---

### 3.2 useRBAC.ts (🔴 ~500 lignes)

**Fichier** : `src/hooks/useRBAC.ts`

**API exposée** :
```typescript
interface UseRBACReturn {
  ready: boolean
  loading: boolean
  role: string
  isVisitor: boolean
  isAdmin: boolean
  isUnknown: boolean
  isFree: boolean
  isSubscriber: boolean
  can: (featureName: string) => boolean
  canAll: (featureNames: string[]) => boolean
  canAny: (featureNames: string[]) => boolean
  quotas: QuotaMap
  usage: UsageMap
  canCreate: (contentType: ContentType) => boolean
  canCreateTask: () => boolean
  canCreateReward: () => boolean
  canCreateCategory: () => boolean
  getQuotaInfo: (contentType: ContentType) => QuotaInfo | null
  getMonthlyQuotaInfo: (contentType: ContentType) => QuotaInfo | null
  refreshQuotas: () => void
  reload: () => void
}
```

**Logique interne** :
- Combine `usePermissions()` + gestion quotas
- **Lecture quotas depuis DB** (ligne 100-268) :
  - Appelle RPC `get_usage_fast` (ou équivalent)
  - Compte `taches`, `recompenses`, `categories` côté client
- Calcule `canCreate()` basé sur quotas clients
- Écoute Realtime pour quotas

**🔴 VIOLATIONS MULTIPLES** :
- **§0.3** : RBAC côté client interdit
- **§1.6** : Re-implémente quotas côté front (interdit)
- **Contrat §3.2.3** : "Quotas cartes personnelles (Subscriber)" — enforcement DB uniquement

**Impact** : ~30 fichiers utilisent `useRBAC()`

**Décision** : **DELETE** (suppression complète)

---

### 3.3 useSimpleRole.ts (🔴 ~40 lignes)

**Fichier** : `src/hooks/useSimpleRole.ts`

**API** : Wrapper simplifié de `PermissionsContext`

**Décision** : **DELETE** (dépend de `PermissionsContext`)

---

### 3.4 roleUtils.ts (⚠️ ~50 lignes)

**Fichier** : `src/utils/roleUtils.ts`

**Contenu** :
```typescript
export const ROLE = {
  ADMIN: 'admin',
  STAFF: 'staff',
  ABONNE: 'abonne',
  FREE: 'free',
  VISITOR: 'visitor',
} as const

export const SYSTEM_ROLES = [ROLE.ADMIN, ROLE.VISITOR, ROLE.FREE, ROLE.ABONNE, ROLE.STAFF]
export const SYSTEM_ROLE_PRIORITIES: Record<string, number> = { ... }

export const normalizeRoleName = (name: unknown): Role | string => {
  if (s === 'subscriber') return ROLE.ABONNE
  // ...
}
```

**⚠️ Analyse** :
- Constantes rôles : **potentiellement réutilisables** si adaptées au nouveau schéma
- Nouveau schéma utilise `accounts.status` : `'free' | 'subscriber' | 'admin'`
- `ROLE.VISITOR` n'existe pas en DB (local-only)

**Décision** : **MODIFY** - Adapter les constantes au nouveau schéma `accounts.status`

**Proposition** :
```typescript
// Nouveau roleUtils.ts adapté
export const ACCOUNT_STATUS = {
  FREE: 'free',
  SUBSCRIBER: 'subscriber',
  ADMIN: 'admin',
} as const

export const normalizeStatus = (status: unknown): string => {
  if (!status) return ACCOUNT_STATUS.FREE
  const s = String(status).toLowerCase()
  if (s === 'abonne') return ACCOUNT_STATUS.SUBSCRIBER // Normaliser ancien nom
  return s
}

// Visitor = état applicatif local-only (pas en DB)
export const VISITOR_STATUS = 'visitor' as const
```

---

## 4) Accès Anciennes Tables

### 4.1 useAccountStatus.ts (🔴 LEGACY)

**Fichier** : `src/hooks/useAccountStatus.ts` (267 lignes)

**Accès table legacy** :
```typescript
// Ligne 42-43
const { data, error } = await supabase
  .from('profiles') // ❌ Ancienne table
  .select('account_status, deletion_scheduled_at')
  .eq('id', user.id)
  .single()
```

**États gérés** (ligne 64-68) :
```typescript
const status = profileData?.account_status || 'active'
setAccountStatus(status)
setIsSuspended(status === 'suspended') // ❌ N'existe plus
setIsPendingVerification(status === 'pending_verification') // ❌ N'existe plus
setIsScheduledForDeletion(status === 'deletion_scheduled') // ❌ N'existe plus
setDeletionDate(profileData?.deletion_scheduled_at || null) // ❌ N'existe plus
```

**🔴 VIOLATIONS** :
- Table `profiles` n'existe plus → remplacer par `accounts`
- États `suspended`, `deletion_scheduled`, `pending_verification` **n'existent pas** dans nouveau schéma
- Nouveau schéma : `accounts.status` = `'free' | 'subscriber' | 'admin'` uniquement

**Nouveau schéma (d'après FRONTEND_CONTRACT.md §1.1)** :
- **Free** : `accounts.status = 'free'`
- **Subscriber** : `accounts.status = 'subscriber'`
- **Admin** : `accounts.status = 'admin'`
- **Visitor** : état applicatif local-only (pas en DB)

**Décision** : **DELETE/REWRITE** - Créer nouveau hook `useAccountStatus()` basé sur `accounts.status`

---

### 4.2 Autres anciennes tables (référence S0)

Déjà identifiées en AUDIT S0 :
- `taches` : ~200+ occurrences (à traiter en S4/S5)
- `recompenses` : ~150+ occurrences (à traiter en S3)
- `parametres` : ~30 occurrences (à traiter en S11)
- `abonnements` : ~10 occurrences (à traiter en S11)

**Scope S1** : Uniquement `profiles` dans `useAccountStatus`

---

## 5) Gestion Visitor

### 5.1 État actuel

**Détection Visitor** : Via `PermissionsContext`
```typescript
// PermissionsContext.tsx
const isVisitor = role === ROLE.VISITOR
```

**Logique** :
- Si `!user` (non connecté) → `role = ROLE.VISITOR`
- Visitor = statut applicatif (pas de DB)

**Utilisation** :
- `FeatureGate.tsx` : `const { isVisitor } = usePermissions()`
- Conditions `if (isVisitor)` dans plusieurs composants

**⚠️ Problème** :
- Dépend de `PermissionsContext` (à supprimer)
- Pas de système de persistance local-only clair (IndexedDB)

**Nouveau contrat (§7)** :
- **Visitor** = local-only (IndexedDB)
- Profil enfant local implicite unique
- Timelines/slots/sessions locales
- Séquences locales
- Accès lecture banque cartes (published) via Supabase
- **Interdit** : Page Profil, cartes perso, catégories, account_preferences, TimeTimer

### 5.2 localStorage existant

**Vérification** :
```bash
rg "localStorage\.setItem|localStorage\.getItem" src/
```

**Usages trouvés** (10 fichiers) :
1. `src/utils/supabaseClient.ts` - Session auth
2. `src/hooks/useTimerPreferences.ts` - Préférences TimeTimer (local-only, OK)
3. `src/utils/consent.ts` - Consentement cookies (local-only, OK)
4. `src/components/shared/theme-toggle/ThemeToggle.tsx` - Thème (local-only, OK)
5. `src/config/i18n/i18n.ts` - Langue (local-only, OK)
6. `src/contexts/DisplayContext.tsx` - Préférences affichage (local-only, OK)

**✅ Constats** :
- `localStorage` utilisé pour préférences locales (acceptable)
- **Aucun système IndexedDB** pour données Visitor actuellement

**Décision** : **CREATE** - Implémenter système IndexedDB pour Visitor

---

## 6) Analyse par Fichier (KEEP / MODIFY / DELETE)

### 6.1 Auth & Supabase

| Fichier | Décision | Raison | Priorité |
|---------|----------|--------|----------|
| `src/utils/supabaseClient.ts` | **KEEP** | ✅ Conforme (anon key uniquement) | Aucune |
| `src/contexts/AuthContext.tsx` | **MODIFY** (mineur) | ⚠️ Vérifier `user_metadata.role` avec nouveau schéma | Faible |
| `src/page-components/login/Login.tsx` | **KEEP** | ✅ Conforme | Aucune |
| `src/page-components/signup/Signup.tsx` | **MODIFY** | ⚠️ RPC `email_exists` + `defaultPseudo` à adapter | Moyenne |

### 6.2 RBAC (À SUPPRIMER)

| Fichier | Décision | Raison | Priorité |
|---------|----------|--------|----------|
| `src/contexts/PermissionsContext.tsx` | **DELETE** | 🔴 RBAC interdit (DB-first) | **CRITIQUE** |
| `src/hooks/useRBAC.ts` | **DELETE** | 🔴 RBAC + quotas côté front interdit | **CRITIQUE** |
| `src/hooks/useSimpleRole.ts` | **DELETE** | 🔴 Dépend PermissionsContext | **CRITIQUE** |
| `src/utils/roleUtils.ts` | **MODIFY** | ⚠️ Adapter constantes → `accounts.status` | Moyenne |
| `src/hooks/usePermissionsAPI.ts` | **DELETE** | 🔴 API permissions côté client | **CRITIQUE** |
| `src/hooks/useAdminPermissions.ts` | **DELETE** | 🔴 Permissions admin côté client | **CRITIQUE** |

### 6.3 Accès anciennes tables

| Fichier | Décision | Raison | Priorité |
|---------|----------|--------|----------|
| `src/hooks/useAccountStatus.ts` | **DELETE/REWRITE** | 🔴 Lit table `profiles` (legacy) | **CRITIQUE** |

### 6.4 Composants dépendants RBAC (~40 fichiers)

| Fichier | Décision | Raison | Priorité |
|---------|----------|--------|----------|
| `src/components/shared/feature-gate/FeatureGate.tsx` | **MODIFY** | Utilise `usePermissions()` → adapter | Haute |
| `src/components/shared/protected-route/ProtectedRoute.tsx` | **MODIFY** | Utilise `usePermissions()` → adapter | Haute |
| `src/components/features/admin/*` | **MODIFY** | Vérifie `isAdmin` → adapter | Moyenne |
| `src/components/layout/user-menu/UserMenu.tsx` | **MODIFY** | Affiche statut via `usePermissions()` | Moyenne |

---

## 7) Manquants (À créer)

### 7.1 Hook lecture `accounts.status`

**Besoin** : Hook simple pour lire `accounts.status` depuis DB

**Proposition** : `src/hooks/useAccountStatus.ts` (nouveau)

```typescript
// Nouveau useAccountStatus.ts (DB-first)
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/hooks'
import type { Database } from '@/types/supabase'

type AccountStatus = Database['public']['Tables']['accounts']['Row']['status']

export default function useAccountStatus() {
  const { user, authReady } = useAuth()
  const [status, setStatus] = useState<AccountStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authReady || !user) {
      setStatus(null)
      setLoading(false)
      return
    }

    async function fetchStatus() {
      const { data, error } = await supabase
        .from('accounts')
        .select('status')
        .eq('id', user.id)
        .single()

      if (error) {
        console.warn('Erreur lecture accounts.status:', error)
        setStatus('free') // Fallback
      } else {
        setStatus(data.status)
      }

      setLoading(false)
    }

    fetchStatus()
  }, [user, authReady])

  return {
    status, // 'free' | 'subscriber' | 'admin'
    loading,
    isFree: status === 'free',
    isSubscriber: status === 'subscriber',
    isAdmin: status === 'admin',
  }
}
```

**Usage cosmétique uniquement** :
```typescript
const { status, isFree } = useAccountStatus()

// ✅ CORRECT - Affichage uniquement
if (isFree) {
  return <button disabled>Créer carte perso (Premium)</button>
}

// ❌ INTERDIT - Source d'autorisation
if (isFree) {
  return // Ne pas tenter création (la DB refuse de toute façon)
}
// ✅ Tenter création → gérer refus DB proprement
```

### 7.2 Système Visitor local-only (IndexedDB)

**Besoin** : Persistance locale pour Visitor

**À créer** :
- `src/utils/visitorStorage.ts` - Abstraction IndexedDB
- `src/hooks/useVisitorData.ts` - Hook accès données Visitor
- Structure IndexedDB :
  - `visitor_timelines` (table)
  - `visitor_slots` (table)
  - `visitor_sessions` (table)
  - `visitor_sequences` (table)

**Références** : Voir S10 EXECUTION_PLAN.md pour détails implémentation Visitor

---

## 8) Risques & Blocants

### 🔴 CRITIQUES

#### C1 — Système RBAC massif à supprimer

**Impact** : **ARCHITECTURAL MAJEUR**

**Description** :
- ~1500+ lignes de code RBAC à supprimer
- 3 fichiers principaux : `PermissionsContext` (~300L), `useRBAC` (~500L), hooks dérivés (~700L)
- ~40 fichiers dépendants à adapter
- Logique de quotas côté front à retirer complètement

**Effort estimé** : **Élevé** (~8-12 heures)

**Plan d'action** :
1. Créer nouveau `useAccountStatus()` (lecture simple `accounts.status`)
2. Identifier tous usages `usePermissions()`, `useRBAC()`, `useSimpleRole()`
3. Remplacer par `useAccountStatus()` + usage cosmétique
4. Supprimer `PermissionsContext`, `useRBAC`, `useSimpleRole`, `usePermissionsAPI`
5. Adapter composants (`FeatureGate`, `ProtectedRoute`)
6. Tests end-to-end

---

#### C2 — Hook `useAccountStatus` legacy (table `profiles`)

**Impact** : **FONCTIONNEL MAJEUR**

**Description** :
- Lit table `profiles` (n'existe plus)
- États `suspended`, `deletion_scheduled`, `pending_verification` (n'existent plus)
- Logique métier complexe (changeAccountStatus, cancelDeletion, etc.)

**Effort estimé** : **Moyen** (~4 heures)

**Plan d'action** :
1. Supprimer ancien `useAccountStatus.ts`
2. Créer nouveau hook basé sur `accounts.status`
3. Adapter composants utilisant ancien hook (~10 fichiers)

---

### ⚠️ MAJEURS

#### M1 — Signup RPC `email_exists` et `defaultPseudo`

**Impact** : **FONCTIONNEL**

**Description** :
- RPC `email_exists` : à vérifier si existe dans migrations récentes
- `defaultPseudo` dans `user_metadata` : à vérifier avec nouveau schéma

**Effort estimé** : **Faible** (~1-2 heures)

**Plan d'action** :
1. Vérifier migrations pour RPC `email_exists`
2. Si absente : supprimer (Supabase Auth gère déjà doublons)
3. Vérifier si `accounts` a colonne `name` ou équivalent
4. Adapter `options.data` signup

---

#### M2 — Système Visitor local-only absent

**Impact** : **FONCTIONNEL**

**Description** :
- Pas de système IndexedDB pour Visitor
- Dépend de RBAC (à supprimer)

**Effort estimé** : **Moyen** (~6 heures)

**Plan d'action** :
1. Créer abstraction IndexedDB (`src/utils/visitorStorage.ts`)
2. Créer hook `useVisitorData()`
3. Implémenter détection Visitor sans RBAC
4. Tests intégration

---

### 🟢 MINEURS

#### m1 — AuthContext `user_metadata.role` pour Sentry

**Impact** : **FAIBLE**

**Description** :
- Utilise `user.user_metadata?.role` pour Sentry (ligne 56)
- À vérifier avec nouveau schéma

**Effort estimé** : **Très faible** (~30 min)

**Plan d'action** :
1. Vérifier si `user_metadata.role` existe après signup
2. Si non : adapter pour utiliser `accounts.status`

---

## 9) Conclusion & Décision

### ⚠️ **PRÊT POUR ADAPT : OUI avec réserves majeures**

### Prérequis AVANT ADAPT

1. ✅ **Vérifier migrations** : RPC `email_exists`, structure `accounts`, colonnes `name`/`pseudo`
2. ✅ **Valider plan suppression RBAC** : ~40 fichiers impactés → découpage atomique
3. ✅ **Créer mock Visitor** : Données démo pour tests (avant IndexedDB complet)

### Effort estimé Slice S1

| Tâche | Complexité | Effort | Risque |
|-------|------------|--------|--------|
| Adapter Supabase client | **Aucune** | 0h | Aucun |
| Adapter AuthContext | **Faible** | 0.5h | Faible |
| Adapter Signup | **Moyenne** | 2h | Moyen |
| Créer `useAccountStatus()` | **Faible** | 2h | Faible |
| **Supprimer RBAC** | **ÉLEVÉE** | 12h | **Élevé** |
| Implémenter Visitor local-only | **Moyenne** | 6h | Moyen |
| Tests S1 | **Moyenne** | 4h | Moyen |
| **TOTAL** | — | **~26h** | **Élevé** |

### Recommandations

1. **Découpage supplémentaire RBAC** : Ne pas supprimer les 40 fichiers d'un coup
   - **Phase 1** : Créer `useAccountStatus()` + tests
   - **Phase 2** : Adapter `FeatureGate` + `ProtectedRoute`
   - **Phase 3** : Adapter composants features (admin, edition, etc.)
   - **Phase 4** : Supprimer `PermissionsContext` + `useRBAC` + hooks dérivés

2. **Visitor minimal S1** : Mode "lecture seule" Visitor sans IndexedDB complet
   - Détection `!user` → Visitor
   - Données démo locales (pas persistence)
   - IndexedDB complet → S10 (slice dédiée)

3. **Tests critiques S1** :
   - Signup → vérifier profil "Mon enfant" auto-créé
   - Login → vérifier `accounts.status` lisible
   - Visitor → vérifier lecture banque cartes sans auth

---

## Annexes

### A) Fichiers à créer

1. `src/hooks/useAccountStatus.ts` (nouveau) - Lecture simple `accounts.status`
2. `src/utils/visitorStorage.ts` (futur S10) - Abstraction IndexedDB
3. `src/hooks/useVisitorData.ts` (futur S10) - Hook Visitor
4. Tests unitaires pour nouveaux hooks

### B) Fichiers à supprimer

1. `src/contexts/PermissionsContext.tsx`
2. `src/hooks/useRBAC.ts`
3. `src/hooks/useSimpleRole.ts`
4. `src/hooks/usePermissionsAPI.ts`
5. `src/hooks/useAdminPermissions.ts`
6. `src/hooks/useAccountStatus.ts` (ancien — legacy)
7. `src/hooks/RBAC_GUIDE.md` (documentation RBAC)

### C) Commandes de vérification

```bash
# Vérifier service_role (doit rester 0)
rg "service_role" src/

# Vérifier RBAC (doit être 0 après S1)
rg "(usePermissions|useRBAC|PermissionsContext|canCreate|isAdmin)" src/

# Vérifier accès table profiles (doit être 0 après S1)
rg "from\('profiles'\)" src/

# Vérifier nouveau hook
rg "useAccountStatus" src/

# Tests
pnpm test src/hooks/useAccountStatus.test.ts
pnpm test:e2e -- signup
```

---

**FIN DU RAPPORT AUDIT S1**
