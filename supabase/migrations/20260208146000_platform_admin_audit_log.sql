-- PLATFORM / Admin: admin_audit_log (append-only, owner-only)
-- Source: MIGRATION_PLAN_PLATFORM §5 + DB_BLUEPRINT_PLATFORM §4 :contentReference[oaicite:20]{index=20} :contentReference[oaicite:21]{index=21}

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_action') THEN
    CREATE TYPE public.admin_action AS ENUM (
      'revoke_sessions',
      'disable_device',
      'resync_subscription_from_stripe',
      'append_subscription_log',
      'request_account_deletion',
      'export_proof_evidence'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  target_account_id uuid NULL REFERENCES public.accounts(id) ON DELETE SET NULL,

  action public.admin_action NOT NULL,

  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT admin_audit_reason_non_empty_chk CHECK (length(btrim(reason)) > 0),
  CONSTRAINT admin_audit_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object'),
  -- Bornage simple: ~8KB max (stringified)
  CONSTRAINT admin_audit_metadata_size_chk CHECK (octet_length(metadata::text) <= 8192)
);

-- Append-only guard
DROP TRIGGER IF EXISTS trg_platform_admin_audit_log_no_update ON public.admin_audit_log;
CREATE TRIGGER trg_platform_admin_audit_log_no_update
BEFORE UPDATE ON public.admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.platform_forbid_update_delete();

DROP TRIGGER IF EXISTS trg_platform_admin_audit_log_no_delete ON public.admin_audit_log;
CREATE TRIGGER trg_platform_admin_audit_log_no_delete
BEFORE DELETE ON public.admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.platform_forbid_update_delete();

-- RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log FORCE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

-- Policies: owner/admin only (is_admin())
DROP POLICY IF EXISTS admin_audit_log_select_admin_only ON public.admin_audit_log;
CREATE POLICY admin_audit_log_select_admin_only
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS admin_audit_log_insert_admin_only ON public.admin_audit_log;
CREATE POLICY admin_audit_log_insert_admin_only
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

COMMIT;
