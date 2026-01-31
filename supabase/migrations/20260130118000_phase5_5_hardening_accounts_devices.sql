-- Migration: Phase 5.5 — Hardening accounts.timezone + devices constraints
-- File: 20260130118000_phase5_5_hardening_accounts_devices.sql
-- Description:
--   1) Validate accounts.timezone against PostgreSQL IANA timezone catalog
--   2) Relax devices.device_id uniqueness to per-account scope
--   3) Enforce revoked_at temporal coherence

-- ============================================================
-- 1) accounts.timezone must be a valid IANA timezone
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_valid_timezone(tz TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names
    WHERE name = tz
  );
$$;

COMMENT ON FUNCTION public.is_valid_timezone(TEXT)
IS 'Returns true if input matches a timezone name known by PostgreSQL (IANA tz).';

ALTER TABLE accounts
  ADD CONSTRAINT accounts_timezone_valid_chk
  CHECK (public.is_valid_timezone(timezone));

-- ============================================================
-- 2) devices: uniqueness should be (account_id, device_id), not global
-- ============================================================

-- In Phase 2.2, device_id declared UNIQUE typically creates:
--   devices_device_id_key
ALTER TABLE devices
  DROP CONSTRAINT IF EXISTS devices_device_id_key;

ALTER TABLE devices
  ADD CONSTRAINT devices_account_device_id_key
  UNIQUE (account_id, device_id);

-- ============================================================
-- 3) devices: revoked_at cannot be earlier than created_at
-- ============================================================

ALTER TABLE devices
  ADD CONSTRAINT devices_revoked_after_created_chk
  CHECK (revoked_at IS NULL OR revoked_at >= created_at);
