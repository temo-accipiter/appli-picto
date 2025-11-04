-- Migration: Fix ambiguous column reference "quota_type" in check_user_quota_free_only
-- Date: 2025-10-25
-- Issue: PostgreSQL error 42702 - "column reference 'quota_type' is ambiguous"
--
-- Root cause: In the WHERE clause `rq.quota_type = p_quota_type`, PostgreSQL
-- cannot determine if the unqualified `quota_type` refers to the table column
-- or the function parameter.
--
-- Solution: Explicitly qualify ALL references to quota_type with table alias or parameter prefix

CREATE OR REPLACE FUNCTION public.check_user_quota_free_only(
  p_user_id uuid,
  p_quota_type text,
  p_period text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_free boolean;
  v_limite int;
  v_count int;
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id);
  IF p_user_id IS NULL THEN RETURN false; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active = true AND r.name = 'free'
  ) INTO v_is_free;

  IF NOT v_is_free THEN
    RETURN true; -- on ne bloque que FREE ici
  END IF;

  -- ✅ FIX: Qualifier explicitement rq.quota_type et rq.quota_period
  SELECT rq.quota_limit
  INTO v_limite
  FROM role_quotas rq
  JOIN roles r ON r.id = rq.role_id
  WHERE r.name = 'free'
    AND rq.quota_type = p_quota_type  -- ✅ Déjà qualifié
    AND rq.quota_period = CASE WHEN p_period='monthly' THEN 'monthly' ELSE 'total' END
  LIMIT 1;

  IF v_limite IS NULL THEN
    RETURN true;
  END IF;

  IF p_period = 'monthly' THEN
    SELECT start_utc, end_utc INTO v_start, v_end FROM get_user_month_bounds_utc(p_user_id);

    -- ✅ FIX: Utiliser explicitement p_quota_type (paramètre de fonction)
    IF p_quota_type = 'task' THEN
      SELECT COUNT(*) INTO v_count FROM taches
      WHERE user_id = p_user_id AND created_at >= v_start AND created_at < v_end;

    ELSIF p_quota_type = 'reward' THEN
      SELECT COUNT(*) INTO v_count FROM recompenses
      WHERE user_id = p_user_id AND created_at >= v_start AND created_at < v_end;

    ELSIF p_quota_type = 'category' THEN
      SELECT COUNT(*) INTO v_count FROM categories
      WHERE user_id = p_user_id AND created_at >= v_start AND created_at < v_end;

    ELSE
      RETURN true;
    END IF;

  ELSE
    -- ✅ FIX: Utiliser explicitement p_quota_type (paramètre de fonction)
    IF p_quota_type = 'task' THEN
      SELECT COUNT(*) INTO v_count FROM taches WHERE user_id = p_user_id;
    ELSIF p_quota_type = 'reward' THEN
      SELECT COUNT(*) INTO v_count FROM recompenses WHERE user_id = p_user_id;
    ELSIF p_quota_type = 'category' THEN
      SELECT COUNT(*) INTO v_count FROM categories WHERE user_id = p_user_id;
    ELSE
      RETURN true;
    END IF;
  END IF;

  RETURN v_count < v_limite;
END;
$$;

-- Note: Cette migration ne fait que recréer la fonction avec des qualifications explicites.
-- Le code logique reste identique, mais PostgreSQL peut maintenant résoudre les références
-- sans ambiguïté.
