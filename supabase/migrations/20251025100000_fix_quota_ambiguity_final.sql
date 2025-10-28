-- Migration: Fix REAL ambiguous column reference "quota_type"
-- Date: 2025-10-25
-- Issue: PostgreSQL error 42702 dans get_user_quota_info et check_user_quota
--
-- Root cause: Dans get_user_quota_info, l'utilisation de
-- "get_user_quota_info.quota_type" comme référence au paramètre
-- crée une ambiguïté car PostgreSQL interprète "quota_type" comme
-- une colonne de la table role_quotas dans le contexte de la requête.
--
-- Solution: Utiliser des variables locales DECLARE pour éviter
-- toute ambiguïté entre paramètres et colonnes de table.

-- =========================================================================
-- 1. Corriger check_user_quota
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_user_quota(
  user_uuid uuid,
  quota_type text,
  quota_period text DEFAULT 'monthly'
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
  -- ✅ Créer des variables locales pour éviter l'ambiguïté
  v_quota_type text := quota_type;
  v_quota_period text := quota_period;
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  -- ✅ Utiliser les variables locales v_quota_type et v_quota_period
  SELECT quota_limit, current_usage, remaining, is_limited
  INTO v_limit, v_usage, v_dummy1, v_is_limited
  FROM public.get_user_quota_info(user_uuid, v_quota_type, v_quota_period);

  IF v_limit IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_usage < v_limit;
END
$$;

-- =========================================================================
-- 2. Corriger get_user_quota_info
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_user_quota_info(
  user_uuid uuid,
  quota_type text,
  quota_period text DEFAULT 'monthly'
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
  v_end   timestamptz;
  -- ✅ Variables locales pour éviter toute ambiguïté
  v_quota_type text := quota_type;
  v_quota_period text := quota_period;
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

  -- ✅ Utiliser v_quota_type et v_quota_period (variables locales)
  SELECT rq.quota_limit INTO v_limit
  FROM public.role_quotas rq
  JOIN public.roles r ON r.id = rq.role_id
  WHERE r.name = user_role
    AND rq.quota_type = v_quota_type      -- ✅ Pas d'ambiguïté
    AND rq.quota_period = v_quota_period; -- ✅ Pas d'ambiguïté

  IF v_limit IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  v_usage := 0;

  -- ✅ Utiliser v_quota_period et v_quota_type partout
  IF v_quota_period = 'monthly' THEN
    SELECT start_utc, end_utc INTO v_start, v_end
    FROM public.get_user_month_bounds_utc(user_uuid);

    IF v_quota_type = 'monthly_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;
    ELSIF v_quota_type = 'monthly_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid
        AND created_at >= v_start
        AND created_at < v_end;
    END IF;
  ELSE
    IF v_quota_type = 'max_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid;
    ELSIF v_quota_type = 'max_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid;
    END IF;
  END IF;

  RETURN QUERY SELECT v_limit, v_usage, GREATEST(0, v_limit - v_usage), true;
END
$$;

-- =========================================================================
-- Note: Cette migration utilise des variables locales DECLARE pour éviter
-- complètement l'ambiguïté entre paramètres de fonction et colonnes de table.
-- PostgreSQL ne peut plus confondre v_quota_type (variable locale DECLARE)
-- avec rq.quota_type (colonne de table).
-- =========================================================================
