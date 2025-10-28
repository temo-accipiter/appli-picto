-- ============================================================================
-- Migration: Fix complet des bugs de quotas (ambiguïté + mapping)
-- ============================================================================
-- Date: 2025-10-25
-- Issue: Comptes Free/Abonné ne peuvent pas créer de cards
-- Erreur: PostgreSQL 42702 "column reference quota_type is ambiguous"
--
-- Root causes:
-- 1. Bug ambiguïté: PostgreSQL confond paramètres et colonnes de table
-- 2. Bug mapping: Policies passent 'task' mais DB contient 'max_tasks'
--
-- Solutions:
-- 1. Variables locales DECLARE pour éviter ambiguïté
-- 2. Normalisation automatique 'task' → 'max_tasks' dans get_user_quota_info
-- ============================================================================

-- =========================================================================
-- 1️⃣ Corriger check_user_quota (ambiguïté PostgreSQL)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_user_quota(
  user_uuid uuid,
  p_quota_type text,
  p_quota_period text DEFAULT 'monthly'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit integer;
  v_usage integer;
  v_dummy1 integer;
  v_dummy2 integer;
  v_is_limited boolean;
  -- ✅ Variables locales pour éviter collision avec colonnes
  v_quota_type text := p_quota_type;
  v_quota_period text := p_quota_period;
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  -- ✅ Utiliser les variables locales v_quota_type et v_quota_period
  SELECT quota_limit, current_usage, remaining, is_limited
  INTO v_limit, v_usage, v_dummy1, v_is_limited
  FROM public.get_user_quota_info(user_uuid, v_quota_type, v_quota_period);

  IF v_limit IS NULL THEN
    RETURN true; -- Pas de limite = autorisé (admin ou quota non défini)
  END IF;

  RETURN v_usage < v_limit;
END
$$;

COMMENT ON FUNCTION public.check_user_quota IS 'Vérifie si l''utilisateur peut créer une ressource selon son quota. Retourne TRUE si autorisé, FALSE si quota dépassé.';

-- =========================================================================
-- 2️⃣ Corriger get_user_quota_info (ambiguïté + mapping)
-- =========================================================================
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
  -- ✅ Variables locales pour éviter ambiguïté PostgreSQL
  v_quota_type text := p_quota_type;
  v_quota_period text := p_quota_period;
  v_normalized_type text; -- ✅ AJOUT pour normalisation mapping
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  -- Récupérer le rôle de l'utilisateur
  SELECT r.name INTO user_role
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = user_uuid
    AND ur.is_active = true
  ORDER BY r.priority DESC  -- Prioriser le rôle le plus élevé
  LIMIT 1;

  -- Admin ou pas de rôle = pas de limite
  IF user_role IS NULL OR user_role = 'admin' THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  -- ✅ NORMALISATION: Mapper 'task'/'reward'/'category' → 'max_tasks'/'max_rewards'/'max_categories'
  -- Cela permet aux policies RLS d'utiliser les noms courts ('task')
  -- tout en gardant les noms descriptifs en DB ('max_tasks')
  v_normalized_type := CASE
    WHEN v_quota_type = 'task' THEN 'max_tasks'
    WHEN v_quota_type = 'reward' THEN 'max_rewards'
    WHEN v_quota_type = 'category' THEN 'max_categories'
    ELSE v_quota_type  -- Garder tel quel si déjà normalisé
  END;

  -- Récupérer la limite de quota pour ce rôle
  -- ✅ Utiliser v_normalized_type au lieu de v_quota_type
  SELECT rq.quota_limit INTO v_limit
  FROM public.role_quotas rq
  JOIN public.roles r ON r.id = rq.role_id
  WHERE r.name = user_role
    AND rq.quota_type = v_normalized_type      -- ✅ Plus d'ambiguïté + bon mapping
    AND rq.quota_period = v_quota_period;      -- ✅ Plus d'ambiguïté

  -- Pas de quota défini pour ce type = pas de limite
  IF v_limit IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  -- Initialiser usage
  v_usage := 0;

  -- Calculer l'usage selon la période
  IF v_quota_period = 'monthly' THEN
    -- Récupérer les bornes du mois en cours (timezone-aware)
    SELECT start_utc, end_utc INTO v_start, v_end
    FROM public.get_user_month_bounds_utc(user_uuid);

    -- ✅ Utiliser v_normalized_type pour compter
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

    -- Support des anciens noms (rétrocompatibilité)
    ELSIF v_normalized_type = 'monthly_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;

    ELSIF v_normalized_type = 'monthly_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;
    END IF;

  ELSE  -- quota_period = 'total' ou 'daily'
    -- Comptage total (toutes périodes confondues)
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

    -- Support pour quotas d'images (total)
    ELSIF v_normalized_type = 'max_task_images' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.user_assets
      WHERE user_id = user_uuid
        AND asset_type = 'task_image'
        AND deleted_at IS NULL;

    ELSIF v_normalized_type = 'max_reward_images' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.user_assets
      WHERE user_id = user_uuid
        AND asset_type = 'reward_image'
        AND deleted_at IS NULL;

    ELSIF v_normalized_type = 'max_total_images' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.user_assets
      WHERE user_id = user_uuid
        AND deleted_at IS NULL;

    ELSIF v_normalized_type = 'max_total_images_size' THEN
      SELECT COALESCE(SUM(file_size), 0)::integer INTO v_usage
      FROM public.user_assets
      WHERE user_id = user_uuid
        AND deleted_at IS NULL;
    END IF;
  END IF;

  -- Retourner limite, usage, restant, et flag is_limited=true
  RETURN QUERY SELECT
    v_limit,
    v_usage,
    GREATEST(0, v_limit - v_usage),
    true;
END
$$;

COMMENT ON FUNCTION public.get_user_quota_info IS 'Retourne les informations de quota pour un utilisateur. Normalise automatiquement task→max_tasks, reward→max_rewards, category→max_categories.';

-- =========================================================================
-- 3️⃣ Notes sur les changements
-- =========================================================================

-- ✅ Correctifs appliqués:
--
-- 1. Variables locales DECLARE:
--    - v_quota_type := p_quota_type
--    - v_quota_period := p_quota_period
--    → Élimine l'ambiguïté PostgreSQL 42702
--
-- 2. Normalisation automatique:
--    - 'task' → 'max_tasks'
--    - 'reward' → 'max_rewards'
--    - 'category' → 'max_categories'
--    → Les policies RLS peuvent utiliser les noms courts
--    → La DB garde les noms descriptifs
--
-- 3. Support étendu:
--    - Quotas mensuels (monthly_tasks, max_tasks + monthly)
--    - Quotas totaux (max_tasks + total)
--    - Quotas d'images (max_task_images, max_total_images, etc.)
--    - Rétrocompatibilité avec anciens noms
--
-- 4. Sécurité:
--    - SECURITY DEFINER maintenu
--    - assert_self_or_admin() vérifié
--    - search_path = 'public' pour éviter schema hijacking

-- =========================================================================
-- 4️⃣ Tests recommandés après migration
-- =========================================================================

-- Test 1: Vérifier qu'un compte Free peut créer une tâche
-- SELECT check_user_quota('<free_user_uuid>', 'task', 'monthly');
-- → Doit retourner TRUE si usage < 5

-- Test 2: Vérifier le mapping automatique
-- SELECT * FROM get_user_quota_info('<free_user_uuid>', 'task', 'monthly');
-- → Doit retourner quota_limit=5 (même en passant 'task' au lieu de 'max_tasks')

-- Test 3: Vérifier qu'admin bypass les quotas
-- SELECT check_user_quota('<admin_user_uuid>', 'task', 'monthly');
-- → Doit retourner TRUE (toujours)

-- Test 4: Insérer une tâche via RLS policy
-- INSERT INTO taches (label, user_id, position)
-- VALUES ('Test Free', '<free_user_uuid>', 0);
-- → Doit réussir si quota respecté, échouer si dépassé

-- =========================================================================
-- Fin de la migration
-- =========================================================================
