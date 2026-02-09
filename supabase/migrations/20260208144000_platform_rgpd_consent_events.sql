-- PLATFORM / RGPD: consent_events (append-only)
-- Source: DB_BLUEPRINT_PLATFORM §2.1 + PLATFORM.md §2.5 :contentReference[oaicite:12]{index=12} :contentReference[oaicite:13]{index=13}

BEGIN;

CREATE TABLE IF NOT EXISTS public.consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NULL REFERENCES public.accounts(id) ON DELETE SET NULL,

  consent_type text NOT NULL,
  mode text NOT NULL DEFAULT 'refuse_all',
  choices jsonb NOT NULL DEFAULT '{}'::jsonb,

  action text NULL,

  ip_hash text NULL,
  ua text NULL,
  locale text NULL,
  app_version text NULL,
  origin text NULL,
  ts_client timestamptz NULL,

  version text NOT NULL DEFAULT '1.0.0',

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT consent_events_mode_chk CHECK (mode IN ('accept_all','refuse_all','custom')),
  CONSTRAINT consent_events_action_chk CHECK (
    action IS NULL OR action IN ('first_load','update','withdraw','restore','revoke')
  ),
  CONSTRAINT consent_events_choices_object_chk CHECK (jsonb_typeof(choices) = 'object'),
  CONSTRAINT consent_events_ip_hash_len_chk CHECK (
    ip_hash IS NULL OR (length(ip_hash) BETWEEN 32 AND 128)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_events_account_created
  ON public.consent_events (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_events_origin_created
  ON public.consent_events (origin, created_at DESC);

-- Append-only guard
DROP TRIGGER IF EXISTS trg_platform_consent_events_no_update ON public.consent_events;
CREATE TRIGGER trg_platform_consent_events_no_update
BEFORE UPDATE ON public.consent_events
FOR EACH ROW
EXECUTE FUNCTION public.platform_forbid_update_delete();

DROP TRIGGER IF EXISTS trg_platform_consent_events_no_delete ON public.consent_events;
CREATE TRIGGER trg_platform_consent_events_no_delete
BEFORE DELETE ON public.consent_events
FOR EACH ROW
EXECUTE FUNCTION public.platform_forbid_update_delete();

-- RLS
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events FORCE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.consent_events TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.consent_events TO service_role;

-- Policies:
-- SELECT: self OR admin
-- INSERT: service_role only
DROP POLICY IF EXISTS consent_events_select_self_or_admin ON public.consent_events;
CREATE POLICY consent_events_select_self_or_admin
ON public.consent_events
FOR SELECT
TO authenticated
USING (account_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS consent_events_insert_service_only ON public.consent_events;
CREATE POLICY consent_events_insert_service_only
ON public.consent_events
FOR INSERT
TO service_role
WITH CHECK (true);

COMMIT;
