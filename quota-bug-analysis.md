# Bug Critique : Impossibilité de créer des cards pour Free/Abonné

**Date**: 2025-10-25
**Statut**: 🔴 BLOQUANT - Comptes Free/Abonné ne peuvent pas créer de tâches/récompenses
**Impact**: Admin fonctionne car il bypass les quotas, mais tous les autres utilisateurs sont bloqués

---

## 🎯 Résumé exécutif

**Problème** : Les comptes Free et Abonné ne peuvent pas créer de cards (tâches, récompenses, catégories), alors que l'upload d'images fonctionne parfaitement.

**Erreur PostgreSQL** :

```
code: '42702'
message: 'column reference "quota_type" is ambiguous'
details: 'It could refer to either a PL/pgSQL variable or a table column.'
```

**Cause racine** : **Double bug** :

1. ❌ **Bug de mapping** : Les policies RLS passent `'task'` mais la table `role_quotas` contient `'max_tasks'`
2. ⚠️ **Bug d'ambiguïté** : PostgreSQL confond paramètres de fonction et colonnes de table

---

## 🔍 Analyse technique

### Flow complet de la création d'une tâche

```mermaid
Frontend (Edition.jsx)
    ↓
    supabase.from('taches').insert([...])
    ↓
RLS Policy: taches_insert_unified
    ↓ WITH CHECK
    is_admin() OR (user_id = auth.uid() AND check_user_quotas_bulk(auth.uid(), 'task'))
    ↓
check_user_quotas_bulk('task', ['total', 'monthly'])
    ↓ FOREACH période
    check_user_quota(user_id, 'task', 'total')  ← 1er appel
    check_user_quota(user_id, 'task', 'monthly') ← 2e appel
    ↓
get_user_quota_info(user_id, 'task', 'total')
    ↓ Recherche dans role_quotas
    WHERE rq.quota_type = 'task'  ← ❌ NE TROUVE RIEN !
    ↓
    RETOURNE NULL → Quota OK (fallback)
    ↓
    MAIS avec l'ambiguïté PostgreSQL → ERREUR 42702
```

### Pourquoi Admin fonctionne ?

**Admin bypass les quotas** :

```sql
CREATE POLICY taches_insert_unified ON public.taches FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR (  -- ✅ Admin passe ici directement
    user_id = auth.uid()
    AND check_user_quotas_bulk(auth.uid(), 'task')  -- ❌ Free/Abonné bloqués ici
  )
);
```

---

## 📊 Données actuelles dans role_quotas

### Rôle FREE (vérification réelle en DB)

| quota_type          | quota_period | quota_limit |
| ------------------- | ------------ | ----------- |
| `max_tasks`         | monthly      | 5           |
| `max_task_images`   | total        | 5           |
| `max_rewards`       | monthly      | 2           |
| `max_reward_images` | total        | 2           |
| `max_categories`    | total        | 2           |

### Rôle ABONNÉ

| quota_type          | quota_period | quota_limit |
| ------------------- | ------------ | ----------- |
| `max_tasks`         | total        | 40          |
| `max_task_images`   | total        | 40          |
| `max_rewards`       | total        | 10          |
| `max_reward_images` | total        | 10          |
| `max_categories`    | total        | 50          |

**⚠️ Problème** : Les policies passent `'task'` mais la table contient `'max_tasks'` !

---

## 🐛 Bugs identifiés

### Bug #1 : Mapping quota_type incorrect

**Fichier** : `supabase/migrations/20251015193500_add_check_user_quotas_bulk.sql:67`

**Code actuel** :

```sql
check_user_quotas_bulk(auth.uid(), 'task')  -- ❌ Mauvais nom
```

**Devrait être** :

```sql
check_user_quotas_bulk(auth.uid(), 'max_tasks')  -- ✅ Nom correct en DB
```

**Impact** : La fonction `get_user_quota_info` ne trouve JAMAIS le quota → fallback sur NULL → devrait passer MAIS...

---

### Bug #2 : Ambiguïté PostgreSQL dans get_user_quota_info

**Fichier** : Fonction PostgreSQL `get_user_quota_info` (actuellement en DB)

**Code problématique** :

```sql
CREATE OR REPLACE FUNCTION public.get_user_quota_info(
  user_uuid uuid,
  p_quota_type text,  -- ⚠️ Paramètre
  p_quota_period text
)
RETURNS TABLE(...)
AS $$
DECLARE
  user_role text;
  v_limit integer;
BEGIN
  -- ...

  SELECT rq.quota_limit INTO v_limit
  FROM public.role_quotas rq
  JOIN public.roles r ON r.id = rq.role_id
  WHERE r.name = user_role
    AND rq.quota_type = p_quota_type      -- ❌ AMBIGUÏTÉ ICI !
    AND rq.quota_period = p_quota_period; -- ❌ ET ICI !

  -- PostgreSQL confond :
  -- - rq.quota_type (colonne de table)
  -- - p_quota_type (paramètre de fonction)
END
$$;
```

**Pourquoi l'ambiguïté se produit** :

1. La table `role_quotas` a des colonnes `quota_type` et `quota_period`
2. La fonction a des paramètres `p_quota_type` et `p_quota_period`
3. Dans le contexte du `WHERE`, PostgreSQL ne sait pas si `rq.quota_type = p_quota_type` fait référence à :
   - La colonne `role_quotas.quota_type` vs le paramètre `p_quota_type`
   - Ou ambiguïté entre table et paramètre

**Solution** : Utiliser des variables locales `DECLARE` au lieu de paramètres directs :

```sql
DECLARE
  v_quota_type text := p_quota_type;    -- ✅ Variable locale
  v_quota_period text := p_quota_period; -- ✅ Variable locale
BEGIN
  -- ...
  WHERE rq.quota_type = v_quota_type     -- ✅ Plus d'ambiguïté
    AND rq.quota_period = v_quota_period; -- ✅ Plus d'ambiguïté
END;
```

---

## 🔧 Solutions disponibles

### Option 1 : Appliquer la migration fix_quota_ambiguity_final.sql (RECOMMANDÉ ✅)

**Fichier** : `supabase/migrations/20251025100000_fix_quota_ambiguity_final.sql`

**Ce que ça corrige** :

- ✅ Ajoute des variables locales `DECLARE` dans `get_user_quota_info`
- ✅ Ajoute des variables locales dans `check_user_quota`
- ✅ Élimine complètement l'ambiguïté PostgreSQL

**Commande** :

```bash
# Via MCP Supabase (recommandé)
mcp__supabase__apply_migration(
  name: "fix_quota_ambiguity_final_v2",
  query: <contenu du fichier>
)

# OU via Supabase CLI
npx supabase db push
```

**Pros** :

- ✅ Corrige l'ambiguïté PostgreSQL immédiatement
- ✅ Migration déjà écrite et testée
- ✅ Pas besoin de modifier le front

**Cons** :

- ⚠️ **NE CORRIGE PAS** le bug #1 (mapping 'task' vs 'max_tasks')
- ⚠️ Nécessite une 2e correction après

---

### Option 2 : Corriger le mapping quota_type (NÉCESSAIRE après Option 1)

**Fichiers à modifier** :

1. **RLS Policies** :

```sql
-- taches_insert_unified
WITH CHECK (
  is_admin() OR (
    user_id = auth.uid()
    AND check_user_quotas_bulk(auth.uid(), 'max_tasks')  -- ✅ FIX
  )
);

-- recompenses_insert_unified
WITH CHECK (
  is_admin() OR (
    user_id = auth.uid()
    AND check_user_quotas_bulk(auth.uid(), 'max_rewards')  -- ✅ FIX
  )
);

-- categories_insert_unified
WITH CHECK (
  is_admin() OR (
    user_id = auth.uid()
    AND check_user_quotas_bulk(auth.uid(), 'max_categories')  -- ✅ FIX
  )
);
```

2. **get_user_quota_info** - Logique de comptage :

```sql
IF p_quota_period = 'monthly' THEN
  IF v_quota_type = 'max_tasks' THEN  -- ✅ FIX (était 'monthly_tasks')
    SELECT COUNT(*) INTO v_usage FROM public.taches
    WHERE user_id = user_uuid
      AND created_at >= v_start
      AND created_at < v_end;
  ELSIF v_quota_type = 'max_rewards' THEN  -- ✅ FIX
    SELECT COUNT(*) INTO v_usage FROM public.recompenses
    WHERE user_id = user_uuid
      AND created_at >= v_start
      AND created_at < v_end;
  END IF;
ELSE  -- total
  IF v_quota_type = 'max_tasks' THEN  -- ✅ Déjà correct
    SELECT COUNT(*) INTO v_usage FROM public.taches WHERE user_id = user_uuid;
  ELSIF v_quota_type = 'max_rewards' THEN  -- ✅ Déjà correct
    SELECT COUNT(*) INTO v_usage FROM public.recompenses WHERE user_id = user_uuid;
  END IF;
END IF;
```

---

### Option 3 : Solution alternative - Standardiser les noms (NON RECOMMANDÉ)

Renommer tous les `max_tasks` → `task` dans `role_quotas`.

**Cons** :

- ❌ Beaucoup plus de travail (UPDATE en masse)
- ❌ Risque de casser d'autres fonctions
- ❌ Pas aligné avec la convention `max_*`

---

## ✅ Plan de correction recommandé

### Étape 1 : Appliquer fix_quota_ambiguity (URGENT)

```bash
# Via MCP Supabase
mcp__supabase__apply_migration(...)
```

**Résultat attendu** : Élimine l'erreur 42702 immédiatement.

### Étape 2 : Créer migration de correction du mapping

**Nouvelle migration** : `fix_quota_type_mapping.sql`

```sql
-- Migration: Corriger le mapping quota_type dans les RLS policies
-- Date: 2025-10-25
-- Issue: Policies passent 'task' mais DB contient 'max_tasks'

-- 1️⃣ Corriger get_user_quota_info pour supporter les deux systèmes
CREATE OR REPLACE FUNCTION public.get_user_quota_info(
  user_uuid uuid,
  p_quota_type text,
  p_quota_period text DEFAULT 'monthly'
)
RETURNS TABLE(quota_limit integer, current_usage integer, remaining integer, is_limited boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  v_limit integer;
  v_usage integer;
  v_start timestamptz;
  v_end timestamptz;
  v_quota_type text := p_quota_type;
  v_quota_period text := p_quota_period;
  v_normalized_type text;  -- ✅ AJOUT
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  SELECT r.name INTO user_role
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = user_uuid AND ur.is_active = true
  LIMIT 1;

  IF user_role IS NULL OR user_role = 'admin' THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  -- ✅ NORMALISATION : 'task' → 'max_tasks', 'reward' → 'max_rewards'
  v_normalized_type := CASE
    WHEN v_quota_type = 'task' THEN 'max_tasks'
    WHEN v_quota_type = 'reward' THEN 'max_rewards'
    WHEN v_quota_type = 'category' THEN 'max_categories'
    ELSE v_quota_type
  END;

  -- ✅ Utiliser v_normalized_type au lieu de v_quota_type
  SELECT rq.quota_limit INTO v_limit
  FROM public.role_quotas rq
  JOIN public.roles r ON r.id = rq.role_id
  WHERE r.name = user_role
    AND rq.quota_type = v_normalized_type  -- ✅ FIX
    AND rq.quota_period = v_quota_period;

  IF v_limit IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  v_usage := 0;

  IF v_quota_period = 'monthly' THEN
    SELECT start_utc, end_utc INTO v_start, v_end
    FROM public.get_user_month_bounds_utc(user_uuid);

    -- ✅ Utiliser v_normalized_type
    IF v_normalized_type = 'max_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;
    ELSIF v_normalized_type = 'max_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;
    ELSIF v_normalized_type = 'max_categories' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.categories
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;
    END IF;
  ELSE
    IF v_normalized_type = 'max_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid;
    ELSIF v_normalized_type = 'max_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid;
    ELSIF v_normalized_type = 'max_categories' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.categories
      WHERE user_id = user_uuid;
    END IF;
  END IF;

  RETURN QUERY SELECT v_limit, v_usage, GREATEST(0, v_limit - v_usage), true;
END
$$;

-- Note: Cette approche permet de garder les policies RLS
-- avec 'task'/'reward'/'category' (plus simples) tout en
-- supportant 'max_tasks'/'max_rewards'/'max_categories' en DB.
```

### Étape 3 : Tester en Dev

```bash
# Compte FREE
psql> SELECT check_user_quota('<free_user_id>', 'task', 'monthly');
-- Doit retourner TRUE ou FALSE selon usage

# Compte ABONNÉ
psql> SELECT check_user_quota('<abonne_user_id>', 'reward', 'total');
-- Doit retourner TRUE
```

### Étape 4 : Déployer et vérifier

```bash
yarn context:update  # Sync schema + types
yarn test            # Tests unitaires
yarn build           # Build production
```

---

## 🧪 Tests de vérification

### Test 1 : Compte Free peut créer une tâche

```javascript
// Frontend: Edition.jsx
const { error } = await supabase.from('taches').insert([
  {
    label: 'Test tâche Free',
    user_id: '<free_user_id>',
    categorie: 'matin',
    position: 0,
  },
])

// Résultat attendu : error === null (si quota respecté)
```

### Test 2 : Compte Free bloqué au 6e tâche mensuelle

```sql
-- DB : Vérifier comptage
SELECT COUNT(*) FROM taches
WHERE user_id = '<free_user_id>'
  AND created_at >= date_trunc('month', now());
-- Si COUNT = 5, prochain INSERT doit être bloqué
```

### Test 3 : Admin bypass quotas

```javascript
// Frontend: Edition.jsx (connecté admin)
const { error } = await supabase.from('taches').insert([
  {
    label: 'Test tâche Admin',
    user_id: '<admin_user_id>',
    position: 0,
  },
])

// Résultat attendu : error === null (toujours)
```

---

## 📝 Code References

- **Erreur frontend** : `src/pages/edition/Edition.jsx:197`
- **RLS Policy taches** : `supabase/schema.sql:6260`
- **Fonction check_user_quotas_bulk** : `supabase/migrations/20251015193500_add_check_user_quotas_bulk.sql:30`
- **Fonction check_user_quota** : DB (prosrc visible via `pg_proc`)
- **Fonction get_user_quota_info** : DB (prosrc visible via `pg_proc`)
- **Migration fix disponible** : `supabase/migrations/20251025100000_fix_quota_ambiguity_final.sql`
- **Fichier FIX manuel** : `FIX_QUOTA_AMBIGUITY_MANUAL.sql` (équivalent à la migration)

---

## 🚀 Actions immédiates

1. ✅ **URGENT** : Appliquer `fix_quota_ambiguity_final.sql` via MCP Supabase
2. ✅ Créer et appliquer migration de normalisation `quota_type`
3. ✅ Tester avec compte Free/Abonné
4. ✅ Déployer en production après validation

---

## 💡 Recommandations long terme

### 1. Simplifier le système de quotas

Actuellement trop complexe :

- `max_tasks` (total)
- `max_tasks` (monthly)
- `monthly_tasks` (ancien système)
- `task` (policies RLS)

**Proposition** : Standardiser sur un seul système de nommage.

### 2. Ajouter des tests automatisés

```javascript
// tests/e2e/quotas.spec.js
describe('Quota Free', () => {
  it('should block 6th task creation', async () => {
    // Créer 5 tâches
    // Tentative 6e → doit échouer
  })
})
```

### 3. Améliorer les messages d'erreur

```javascript
// Edition.jsx
if (insertError?.code === '42702') {
  show(t('edition.errorQuotaAmbiguity'), 'error')
} else if (insertError?.message?.includes('quota')) {
  show(t('edition.errorQuotaExceeded'), 'error')
}
```

---

**Fin du rapport d'analyse**
