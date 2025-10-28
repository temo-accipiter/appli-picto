-- ============================================================================
-- FIX URGENT : Ambiguïté "quota_type" dans check_user_quota
-- ============================================================================
-- À EXÉCUTER dans Supabase Dashboard > SQL Editor
-- Date: 2025-10-25
-- Bug: Erreur 42702 "column reference quota_type is ambiguous"
-- Cause: PostgreSQL confond les paramètres avec les colonnes de tables
-- Solution: Renommer les variables locales avec préfixe "param_"
-- ============================================================================

-- 1️⃣ Corriger check_user_quota (appelée par RLS policies)
CREATE OR REPLACE FUNCTION public.check_user_quota(
  user_uuid uuid,
  quota_type text,
  quota_period text DEFAULT 'monthly'::text
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
  -- ✅ Noms UNIQUES pour éviter collision avec colonnes
  param_quota_type text := quota_type;
  param_quota_period text := quota_period;
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  SELECT quota_limit, current_usage, remaining, is_limited
  INTO v_limit, v_usage, v_dummy1, v_is_limited
  FROM public.get_user_quota_info(user_uuid, param_quota_type, param_quota_period);

  IF v_limit IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_usage < v_limit;
END
$$;

-- 2️⃣ Corriger get_user_quota_info (appelée par check_user_quota)
CREATE OR REPLACE FUNCTION public.get_user_quota_info(
  user_uuid uuid,
  quota_type text,
  quota_period text DEFAULT 'monthly'::text
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
  -- ✅ Préfixe "param_" pour différencier des colonnes de tables
  param_quota_type text := quota_type;
  param_quota_period text := quota_period;
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

  -- ✅ Utilisation de param_quota_type (AUCUNE ambiguïté possible)
  SELECT rq.quota_limit INTO v_limit
  FROM public.role_quotas rq
  JOIN public.roles r ON r.id = rq.role_id
  WHERE r.name = user_role
    AND rq.quota_type = param_quota_type
    AND rq.quota_period = param_quota_period;

  IF v_limit IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  v_usage := 0;

  IF param_quota_period = 'monthly' THEN
    SELECT start_utc, end_utc INTO v_start, v_end
    FROM public.get_user_month_bounds_utc(user_uuid);

    IF param_quota_type = 'monthly_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;
    ELSIF param_quota_type = 'monthly_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;
    END IF;
  ELSE
    IF param_quota_type = 'max_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid;
    ELSIF param_quota_type = 'max_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid;
    END IF;
  END IF;

  RETURN QUERY SELECT v_limit, v_usage, GREATEST(0, v_limit - v_usage), true;
END
$$;

-- ============================================================================
-- IMPORTANT : Après exécution de ce script
-- ============================================================================
-- 1. Vérifier qu'aucune erreur ne s'affiche
-- 2. Attendre 10 secondes
-- 3. Tester la création de tâche/récompense/catégorie avec compte Free
-- 4. Si ça ne fonctionne toujours pas, redémarrer l'instance Supabase
--    (Dashboard > Settings > General > Restart Database)
-- ============================================================================
