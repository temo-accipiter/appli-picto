# useRBACv2.ts - Work In Progress

## 📁 Statut

Le fichier `useRBACv2.ts` a été **temporairement désactivé** (renommé en `.wip`) car il n'est pas encore prêt pour la production.

## ❓ Pourquoi Désactivé ?

Le hook utilise des **fonctions RPC Supabase qui n'existent pas encore** :

- `get_user_plan_info(p_user_id)` → Retourne infos du plan utilisateur
- `get_user_quotas_with_usage(p_user_id)` → Retourne quotas + usage actuel

Sans ces fonctions, le hook génère des erreurs TypeScript et ne peut pas compiler.

## 🎯 Objectif du Hook

**Migration progressive** du système RBAC actuel vers un nouveau système basé sur `account_plans` :

### Système Actuel (useRBAC.ts)

- Utilise `role_quotas` table (ancienne structure)
- 4 rôles : visiteur, free, abonne, admin
- Quotas hardcodés dans le code

### Système Cible (useRBACv2.ts)

- Utilise `account_plans` table (nouvelle structure)
- 4 rôles : free, abonne, staff, admin
- Quotas configurables en DB
- Permissions plus granulaires

## ✅ Prérequis pour Réactiver

### 1. Créer les fonctions RPC Supabase

**Fichier** : `supabase/migrations/YYYYMMDD_add_rbac_v2_functions.sql`

```sql
-- Fonction 1 : Récupérer infos plan utilisateur
CREATE OR REPLACE FUNCTION public.get_user_plan_info(
  p_user_id UUID
)
RETURNS TABLE (
  plan_name TEXT,
  display_name TEXT,
  max_tasks INTEGER,
  max_rewards INTEGER,
  max_categories INTEGER,
  max_custom_cards INTEGER,
  can_access_settings BOOLEAN,
  can_access_profil BOOLEAN,
  can_access_admin BOOLEAN,
  can_manage_users BOOLEAN,
  can_view_metrics BOOLEAN,
  can_manage_plans BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- TODO: Implémenter logique récupération plan
  -- Doit joindre profiles + account_plans
  -- Retourner permissions du plan
END;
$$;

-- Fonction 2 : Récupérer quotas + usage
CREATE OR REPLACE FUNCTION public.get_user_quotas_with_usage(
  p_user_id UUID
)
RETURNS TABLE (
  plan_name TEXT,
  max_tasks INTEGER,
  max_rewards INTEGER,
  max_categories INTEGER,
  tasks_used INTEGER,
  rewards_used INTEGER,
  categories_used INTEGER,
  can_create_task BOOLEAN,
  can_create_reward BOOLEAN,
  can_create_category BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- TODO: Implémenter logique comptage usage
  -- Doit compter taches/recompenses/categories par user
  -- Comparer avec limites du plan
END;
$$;
```

### 2. Appliquer la Migration

```bash
pnpm supabase db push
pnpm db:types:remote  # Régénérer types TypeScript
```

### 3. Corriger l'Import useAuth

Dans `useRBACv2.ts.wip`, ligne 15 :

```typescript
// ❌ Incorrect
import { useAuth } from '@/hooks/useAuth'

// ✅ Correct
import useAuth from '@/hooks/useAuth'
```

### 4. Vérifier les Types

Créer/vérifier `src/types/plans.d.ts` avec :

```typescript
export type RoleName = 'free' | 'abonne' | 'staff' | 'admin'

export interface UserPlanInfo {
  plan_name: RoleName
  display_name: string
  max_tasks: number
  max_rewards: number
  max_categories: number
  max_custom_cards: number
  can_access_settings: boolean
  can_access_profil: boolean
  can_access_admin: boolean
  can_manage_users: boolean
  can_view_metrics: boolean
  can_manage_plans: boolean
}

export interface UserQuotasWithUsage {
  plan_name: RoleName
  max_tasks: number
  max_rewards: number
  max_categories: number
  tasks_used: number
  rewards_used: number
  categories_used: number
  can_create_task: boolean
  can_create_reward: boolean
  can_create_category: boolean
}

export interface QuotaInfo {
  type: 'task' | 'reward' | 'category' | 'custom_card'
  limit: number
  current: number
  remaining: number
  percentage: number
  canCreate: boolean
}

export interface PlanPermissions {
  canAccessSettings: boolean
  canAccessProfil: boolean
  canAccessAdmin: boolean
  canManageUsers: boolean
  canViewMetrics: boolean
  canManagePlans: boolean
  canCreateTask: boolean
  canCreateReward: boolean
  canCreateCategory: boolean
  canCreateCustomCard: boolean
}
```

### 5. Renommer et Tester

```bash
# Renommer .wip en .ts
mv src/hooks/useRBACv2.ts.wip src/hooks/useRBACv2.ts

# Vérifier compilation
pnpm type-check

# Tester dans un composant isolé
# import useRBACv2 from '@/hooks/useRBACv2'
```

### 6. Migration Progressive

1. Tester `useRBACv2` dans un composant non critique
2. Comparer comportement avec `useRBAC` actuel
3. Migrer progressivement les composants
4. Quand tout fonctionne, supprimer `useRBAC.ts`

## 📚 Références

- **Hook actuel** : `src/hooks/useRBAC.ts`
- **Guide RBAC** : `src/hooks/RBAC_GUIDE.md`
- **Types plans** : `src/types/plans.d.ts`
- **Doc système** : `docs/RBAC-Quotas/RBAC-QUOTAS-SYSTEM.md`

## ⚠️ Important

**NE PAS** utiliser `useRBACv2` en production tant que :

- ✅ Les fonctions RPC ne sont pas créées
- ✅ La migration n'est pas testée en isolation
- ✅ Les types TypeScript ne sont pas validés
- ✅ Les tests unitaires ne passent pas

**Utiliser** `useRBAC.ts` (système actuel) pour l'instant.
