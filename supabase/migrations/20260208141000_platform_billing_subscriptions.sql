-- PLATFORM / Billing Stripe: subscriptions
-- Source: DB_BLUEPRINT_PLATFORM §1.1 + PLATFORM.md §1.4 :contentReference[oaicite:1]{index=1} :contentReference[oaicite:2]{index=2}
-- DB-first strict: constraints + indexes + RLS + grants

BEGIN;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,

  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,

  status text NOT NULL,

  price_id text NULL,

  current_period_start timestamptz NULL,
  current_period_end   timestamptz NULL,

  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancel_at timestamptz NULL,

  last_event_id text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_status_chk CHECK (
    status IN (
      'active','past_due','canceled','unpaid','incomplete','incomplete_expired','trialing','paused'
    )
  ),
  CONSTRAINT subscriptions_period_chk CHECK (
    current_period_start IS NULL
    OR current_period_end IS NULL
    OR current_period_end >= current_period_start
  )
);

-- UNIQUE stripe_subscription_id (si non NULL)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 1 actif max par compte (active/trialing/past_due/paused)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_unique_active_per_account
  ON public.subscriptions (account_id)
  WHERE status IN ('active','trialing','past_due','paused');

CREATE INDEX IF NOT EXISTS idx_subscriptions_account_id
  ON public.subscriptions (account_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
  ON public.subscriptions (stripe_customer_id);

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.platform_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER trg_platform_subscriptions_set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.platform_set_updated_at();

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

-- Grants (Supabase roles)
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO service_role;

-- Policies:
-- - SELECT: self OR admin (PLATFORM.md §1.4.6) :contentReference[oaicite:3]{index=3}
-- - INSERT/UPDATE: service_role only
-- - DELETE: service_role only (CASCADE via accounts in practice)
DROP POLICY IF EXISTS subscriptions_select_admin_only ON public.subscriptions;
CREATE POLICY subscriptions_select_admin_only
ON public.subscriptions
FOR SELECT
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS subscriptions_write_service_only ON public.subscriptions;
CREATE POLICY subscriptions_write_service_only
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;
