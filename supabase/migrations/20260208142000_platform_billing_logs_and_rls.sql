-- PLATFORM / Billing Stripe: subscription_logs (append-only)
-- Source: DB_BLUEPRINT_PLATFORM §1.2 + PLATFORM.md §1.5 :contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5}

BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NULL REFERENCES public.accounts(id) ON DELETE SET NULL,

  event_type text NOT NULL,
  details jsonb NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Append-only guard (DB-side, pas seulement RLS)
CREATE OR REPLACE FUNCTION public.platform_forbid_update_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'append-only table: update/delete forbidden';
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_subscription_logs_no_update ON public.subscription_logs;
CREATE TRIGGER trg_platform_subscription_logs_no_update
BEFORE UPDATE ON public.subscription_logs
FOR EACH ROW
EXECUTE FUNCTION public.platform_forbid_update_delete();

DROP TRIGGER IF EXISTS trg_platform_subscription_logs_no_delete ON public.subscription_logs;
CREATE TRIGGER trg_platform_subscription_logs_no_delete
BEFORE DELETE ON public.subscription_logs
FOR EACH ROW
EXECUTE FUNCTION public.platform_forbid_update_delete();

ALTER TABLE public.subscription_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_logs FORCE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.subscription_logs TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.subscription_logs TO service_role;

-- Policies:
-- - SELECT: admin only (PLATFORM.md §1.5.4) :contentReference[oaicite:6]{index=6}
-- - INSERT: service_role only
-- - UPDATE/DELETE: nobody (trigger en plus)
DROP POLICY IF EXISTS subscription_logs_select_admin_only ON public.subscription_logs;
CREATE POLICY subscription_logs_select_admin_only
ON public.subscription_logs
FOR SELECT
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS subscription_logs_insert_service_only ON public.subscription_logs;
CREATE POLICY subscription_logs_insert_service_only
ON public.subscription_logs
FOR INSERT
TO service_role
WITH CHECK (true);

COMMIT;
