-- 20260204103000_phase9_4_quota_check_profiles_devices.sql
BEGIN;

-- --- Child profiles quota (creation)
CREATE OR REPLACE FUNCTION public.check_can_create_child_profile(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_status account_status;
  v_limit integer;
  v_count int;
BEGIN
  v_status := public.get_account_status(p_account_id);

  -- Admin unlimited
  IF v_status = 'admin' THEN
    RETURN;
  END IF;

  v_limit := public.quota_profiles_limit(v_status);

  -- For statuses where limit is NULL but not admin: treat as "no limit" only if that is intended.
  -- Here: free/subscriber have limits; others not expected in DB.
  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  -- Count existing profiles for this account (we count total rows; locked profiles still exist)
  SELECT COUNT(*) INTO v_count
  FROM public.child_profiles
  WHERE account_id = p_account_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Nombre maximum de profils enfants atteint.'
      USING ERRCODE='P0001',
            DETAIL='QUOTA_PROFILES_EXCEEDED';
  END IF;

  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_child_profiles_quota_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.check_can_create_child_profile(NEW.account_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_child_profiles_quota_before_insert ON public.child_profiles;

CREATE TRIGGER trg_child_profiles_quota_before_insert
  BEFORE INSERT ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_child_profiles_quota_before_insert();

-- --- Devices quota (registration)
CREATE OR REPLACE FUNCTION public.check_can_register_device(p_account_id uuid, p_revoked_at timestamptz)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_status account_status;
  v_limit integer;
  v_count int;
BEGIN
  v_status := public.get_account_status(p_account_id);

  -- Admin unlimited
  IF v_status = 'admin' THEN
    RETURN;
  END IF;

  v_limit := public.quota_devices_limit(v_status);

  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  -- Only active devices count (revoked_at IS NULL)
  -- If someone inserts an already-revoked device row, it shouldn't consume quota.
  IF p_revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.devices
  WHERE account_id = p_account_id
    AND revoked_at IS NULL;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Nombre maximum d''appareils atteint.'
      USING ERRCODE='P0001',
            DETAIL='QUOTA_DEVICES_EXCEEDED';
  END IF;

  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_devices_quota_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.check_can_register_device(NEW.account_id, NEW.revoked_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_devices_quota_before_insert ON public.devices;

CREATE TRIGGER trg_devices_quota_before_insert
  BEFORE INSERT ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_devices_quota_before_insert();

COMMIT;
