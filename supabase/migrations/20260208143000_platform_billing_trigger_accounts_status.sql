-- PLATFORM / Billing Stripe: projection subscriptions -> accounts.status + unlock profiles on upgrade
-- Source: PLATFORM.md §1.6 + §1.7 :contentReference[oaicite:8]{index=8}

BEGIN;

CREATE OR REPLACE FUNCTION public.apply_subscription_to_account_status(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_has_active boolean;
BEGIN
  -- Guard: éviter appel direct applicatif
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'apply_subscription_to_account_status can only be called from trigger';
  END IF;

  SELECT (a.status = 'admin') INTO v_is_admin
  FROM public.accounts a
  WHERE a.id = p_account_id;

  IF v_is_admin THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.account_id = p_account_id
      AND s.status IN ('active','trialing','past_due','paused')
  ) INTO v_has_active;

  IF v_has_active THEN
    UPDATE public.accounts
      SET status = 'subscriber',
          updated_at = now()
    WHERE id = p_account_id
      AND status IS DISTINCT FROM 'subscriber';

    -- Upgrade path: réactiver profils locked automatiquement (PLATFORM.md §1.7) :contentReference[oaicite:9]{index=9}
    UPDATE public.child_profiles
      SET status = 'active',
          updated_at = now()
    WHERE account_id = p_account_id
      AND status = 'locked';

  ELSE
    UPDATE public.accounts
      SET status = 'free',
          updated_at = now()
    WHERE id = p_account_id
      AND status IS DISTINCT FROM 'free';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_subscription_to_account_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_subscription_to_account_status(uuid) TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.trg_subscriptions_project_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.apply_subscription_to_account_status(NEW.account_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_subscriptions_project_account_status() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_platform_subscriptions_project_status ON public.subscriptions;
CREATE TRIGGER trg_platform_subscriptions_project_status
AFTER INSERT OR UPDATE OF status, account_id ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.trg_subscriptions_project_account_status();

COMMIT;
