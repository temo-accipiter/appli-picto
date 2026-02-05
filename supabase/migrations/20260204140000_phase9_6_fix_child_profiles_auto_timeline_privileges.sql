BEGIN;

-- ============================================================
-- Fix: child_profiles_auto_create_timeline must be able to INSERT timelines
-- even when authenticated has no INSERT privilege on timelines.
-- Make it a SECURITY DEFINER system trigger function with guards.
-- ============================================================

CREATE OR REPLACE FUNCTION public.child_profiles_auto_create_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  -- Guard: must be called from trigger
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'forbidden: system trigger function'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve owner account
  SELECT cp.account_id INTO v_account_id
  FROM public.child_profiles cp
  WHERE cp.id = NEW.id;

  -- Cross-account guard (when auth context exists)
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_account_id THEN
    RAISE EXCEPTION 'forbidden: cross-account'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.timelines (child_profile_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.child_profiles_auto_create_timeline() IS
  'SECURITY DEFINER system trigger: auto-creates timeline on child_profile insert (bypasses strict GRANT).';

REVOKE EXECUTE ON FUNCTION public.child_profiles_auto_create_timeline() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.child_profiles_auto_create_timeline() TO authenticated;

-- ============================================================
-- Optional but strongly recommended:
-- timelines_auto_create_minimal_slots also inserts into slots.
-- If slots INSERT is also not granted later, this will break.
-- Harden it the same way to avoid the next failure.
-- ============================================================

CREATE OR REPLACE FUNCTION public.timelines_auto_create_minimal_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'forbidden: system trigger function'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve owner account via timeline -> child_profile
  SELECT cp.account_id INTO v_account_id
  FROM public.child_profiles cp
  JOIN public.timelines t ON t.child_profile_id = cp.id
  WHERE t.id = NEW.id;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_account_id THEN
    RAISE EXCEPTION 'forbidden: cross-account'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.slots (timeline_id, kind, position, card_id, tokens)
  VALUES (NEW.id, 'step', 0, NULL, 0);

  INSERT INTO public.slots (timeline_id, kind, position, card_id, tokens)
  VALUES (NEW.id, 'reward', 1, NULL, NULL);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.timelines_auto_create_minimal_slots() IS
  'SECURITY DEFINER system trigger: auto-creates minimal slots on timeline insert (bypasses strict GRANT).';

REVOKE EXECUTE ON FUNCTION public.timelines_auto_create_minimal_slots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.timelines_auto_create_minimal_slots() TO authenticated;

COMMIT;
