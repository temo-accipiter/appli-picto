-- PLATFORM / Preferences: account_preferences (1..1 target) + auto-create row on account insert
-- Source: PRODUCT_MODEL_PLATFORM §5 + DB_BLUEPRINT_PLATFORM §3 :contentReference[oaicite:16]{index=16} :contentReference[oaicite:17]{index=17}

BEGIN;

CREATE TABLE IF NOT EXISTS public.account_preferences (
  account_id uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,

  reduced_motion boolean NOT NULL DEFAULT true,
  toasts_enabled boolean NOT NULL DEFAULT true,
  confetti_enabled boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at
DROP TRIGGER IF EXISTS trg_platform_account_preferences_set_updated_at ON public.account_preferences;
CREATE TRIGGER trg_platform_account_preferences_set_updated_at
BEFORE UPDATE ON public.account_preferences
FOR EACH ROW
EXECUTE FUNCTION public.platform_set_updated_at();

-- Backfill: assurer 1 ligne pour tous les comptes existants
INSERT INTO public.account_preferences (account_id)
SELECT a.id
FROM public.accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_preferences p WHERE p.account_id = a.id
);

-- Auto-create on account insert (idempotent)
CREATE OR REPLACE FUNCTION public.create_default_account_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.account_preferences (account_id)
  VALUES (NEW.id)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_default_account_preferences() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_platform_accounts_create_preferences ON public.accounts;
CREATE TRIGGER trg_platform_accounts_create_preferences
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.create_default_account_preferences();

-- RLS
ALTER TABLE public.account_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_preferences FORCE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.account_preferences TO authenticated;
GRANT ALL ON public.account_preferences TO service_role;

-- Policies: self-only (owner-only = account owner)
DROP POLICY IF EXISTS account_preferences_self_select ON public.account_preferences;
CREATE POLICY account_preferences_self_select
ON public.account_preferences
FOR SELECT
TO authenticated
USING (account_id = auth.uid());

DROP POLICY IF EXISTS account_preferences_self_insert ON public.account_preferences;
CREATE POLICY account_preferences_self_insert
ON public.account_preferences
FOR INSERT
TO authenticated
WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS account_preferences_self_update ON public.account_preferences;
CREATE POLICY account_preferences_self_update
ON public.account_preferences
FOR UPDATE
TO authenticated
USING (account_id = auth.uid())
WITH CHECK (account_id = auth.uid());

-- (Option) delete interdit par défaut : pas de policy DELETE

COMMIT;
