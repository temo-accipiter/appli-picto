-- 20260204102000_phase9_3_quota_check_cards.sql
BEGIN;

-- Ensure index for monthly quota is optimal (already exists, but keep schema strict)
-- Your schema already has:
--   idx_cards_quota_monthly ON cards(account_id, created_at) WHERE type='personal'
-- so we don't recreate anything here.

CREATE OR REPLACE FUNCTION public.check_can_create_personal_card(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_status account_status;
  v_stock_limit integer;
  v_monthly_limit integer;
  v_stock_count integer;
  v_monthly_count integer;
  v_ctx RECORD;
BEGIN
  v_status := public.get_account_status(p_account_id);

  -- Feature gating: Free => N/A (no personal card creation)
  IF NOT public.cards_personal_feature_enabled(v_status) THEN
    RAISE EXCEPTION 'Création de cartes personnelles indisponible avec ce statut.'
      USING ERRCODE = 'P0001',
            DETAIL = 'FEATURE_UNAVAILABLE';
  END IF;

  -- Admin => unlimited
  IF v_status = 'admin' THEN
    RETURN;
  END IF;

  -- Subscriber limits
  v_stock_limit := public.quota_cards_stock_limit(v_status);
  v_monthly_limit := public.quota_cards_monthly_limit(v_status);

  -- Stock count: existing personal cards; DELETE frees immediately by definition
  SELECT COUNT(*) INTO v_stock_count
  FROM public.cards
  WHERE type = 'personal'
    AND account_id = p_account_id;

  IF v_stock_limit IS NOT NULL AND v_stock_count >= v_stock_limit THEN
    RAISE EXCEPTION 'Nombre maximum de cartes personnelles atteint.'
      USING ERRCODE = 'P0001',
            DETAIL = 'QUOTA_STOCK_EXCEEDED';
  END IF;

  -- Monthly quota counts "creations" and is NOT freed by DELETE.
  -- Uses locked month context (anti-abus timezone, predictable).
  SELECT * INTO v_ctx
  FROM public.ensure_quota_month_context(p_account_id);

  IF v_monthly_limit IS NOT NULL THEN
    -- Atomic: only succeeds while personal_cards_created < limit.
    UPDATE public.account_quota_months aqm
    SET personal_cards_created = aqm.personal_cards_created + 1
    WHERE aqm.account_id = p_account_id
      AND aqm.period_ym = v_ctx.period_ym
      AND aqm.personal_cards_created < v_monthly_limit
    RETURNING aqm.personal_cards_created INTO v_monthly_count;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nombre maximum de nouvelles cartes ce mois-ci atteint.'
        USING ERRCODE = 'P0001',
              DETAIL = 'QUOTA_MONTHLY_EXCEEDED';
    END IF;
  END IF;

  RETURN;
END;
$$;

-- Trigger on cards: only for personal inserts
CREATE OR REPLACE FUNCTION public.tg_cards_quota_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type = 'personal' THEN
    PERFORM public.check_can_create_personal_card(NEW.account_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cards_quota_before_insert ON public.cards;

CREATE TRIGGER trg_cards_quota_before_insert
  BEFORE INSERT ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cards_quota_before_insert();

COMMIT;
