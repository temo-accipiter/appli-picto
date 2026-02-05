-- 20260204136000_phase9_2_quota_helpers.sql
BEGIN;

-- Centralize account status lookup (source of truth)
CREATE OR REPLACE FUNCTION public.get_account_status(p_account_id uuid)
RETURNS account_status
LANGUAGE sql
STABLE
AS $$
  SELECT a.status
  FROM public.accounts a
  WHERE a.id = p_account_id
$$;

-- Quota helpers return NULL = unlimited.
-- Cards: subscriber limited; admin unlimited; free => feature unavailable (gated elsewhere)
CREATE OR REPLACE FUNCTION public.quota_cards_stock_limit(p_status account_status)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status = 'subscriber' THEN 50
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.quota_cards_monthly_limit(p_status account_status)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status = 'subscriber' THEN 100
    ELSE NULL
  END
$$;

-- Profiles: free=1, subscriber=3, admin unlimited
CREATE OR REPLACE FUNCTION public.quota_profiles_limit(p_status account_status)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status = 'free'       THEN 1
    WHEN p_status = 'subscriber' THEN 3
    ELSE NULL
  END
$$;

-- Devices: free=1, subscriber=3, admin unlimited
CREATE OR REPLACE FUNCTION public.quota_devices_limit(p_status account_status)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status = 'free'       THEN 1
    WHEN p_status = 'subscriber' THEN 3
    ELSE NULL
  END
$$;

-- Cards personal feature enabled?
CREATE OR REPLACE FUNCTION public.cards_personal_feature_enabled(p_status account_status)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_status = 'subscriber' OR p_status = 'admin')
$$;

COMMIT;
