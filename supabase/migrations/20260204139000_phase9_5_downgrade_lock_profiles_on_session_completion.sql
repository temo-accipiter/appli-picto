BEGIN;

-- Enforce child_profile status after a session completes (system rule).
-- Needs to bypass RLS because child_profiles.status is user-immutable by design.
CREATE OR REPLACE FUNCTION public.enforce_child_profile_limit_after_session_completion(p_child_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_status account_status;
  v_limit integer;
BEGIN
  -- Guard: must be called from a trigger, not directly
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'forbidden: system function'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve account_id from the profile involved in the completed session
  SELECT cp.account_id
    INTO v_account_id
  FROM public.child_profiles cp
  WHERE cp.id = p_child_profile_id;

  IF v_account_id IS NULL THEN
    RETURN;
  END IF;

  -- Resolve account_id from the profile involved in the completed session
  SELECT cp.account_id
    INTO v_account_id
  FROM public.child_profiles cp
  WHERE cp.id = p_child_profile_id;

  IF v_account_id IS NULL THEN
    RETURN;
  END IF;

  -- Guard: in app context, caller must be the account owner (defense in depth)
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_account_id THEN
    RAISE EXCEPTION 'forbidden: cross-account'
      USING ERRCODE = '42501';
  END IF;

  v_status := public.get_account_status(v_account_id);

  -- Admin: no locking
  IF v_status = 'admin' THEN
    RETURN;
  END IF;

  v_limit := public.quota_profiles_limit(v_status);
  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  -- Deterministic: keep the oldest v_limit profiles active, lock the others.
  WITH ranked AS (
    SELECT id,
           row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
    FROM public.child_profiles
    WHERE account_id = v_account_id
  ),
  desired AS (
    SELECT
      r.id,
      CASE WHEN r.rn <= v_limit THEN 'active'::child_profile_status
           ELSE 'locked'::child_profile_status
      END AS desired_status
    FROM ranked r
  )
  UPDATE public.child_profiles cp
  SET status = d.desired_status,
      updated_at = now()
  FROM desired d
  WHERE cp.id = d.id
    AND cp.status IS DISTINCT FROM d.desired_status;

  RETURN;
END;
$$;

-- Keep this function non-invokable in normal SQL usage (but trigger still needs EXECUTE).
REVOKE EXECUTE ON FUNCTION public.enforce_child_profile_limit_after_session_completion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_child_profile_limit_after_session_completion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_sessions_on_completed_lock_profiles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.state IS DISTINCT FROM NEW.state) AND NEW.state = 'completed' THEN
    PERFORM public.enforce_child_profile_limit_after_session_completion(NEW.child_profile_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_on_completed_lock_profiles ON public.sessions;

CREATE TRIGGER trg_sessions_on_completed_lock_profiles
  AFTER UPDATE ON public.sessions
  FOR EACH ROW
  WHEN (OLD.state IS DISTINCT FROM NEW.state AND NEW.state = 'completed')
  EXECUTE FUNCTION public.tg_sessions_on_completed_lock_profiles();

COMMIT;
