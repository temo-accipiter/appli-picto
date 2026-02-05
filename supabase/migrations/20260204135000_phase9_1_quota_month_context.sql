-- 20260204100000_phase9_1_quota_month_context.sql
BEGIN;

CREATE TABLE public.account_quota_months (
  account_id      uuid        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  period_ym       integer     NOT NULL,  -- YYYYMM
  tz_ref          text        NOT NULL,
  month_start_utc timestamptz NOT NULL,
  month_end_utc   timestamptz NOT NULL,

  -- Monthly quota must count "creations" (delete does NOT free monthly quota).
  personal_cards_created integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT account_quota_months_pk PRIMARY KEY (account_id, period_ym),
  CONSTRAINT account_quota_months_tz_valid_chk CHECK (public.is_valid_timezone(tz_ref)),
  CONSTRAINT account_quota_months_bounds_chk CHECK (month_end_utc > month_start_utc),
  CONSTRAINT account_quota_months_personal_cards_created_chk CHECK (personal_cards_created >= 0)
);

COMMENT ON TABLE public.account_quota_months IS
'Per-account monthly context used for quota checks; locks timezone per month (anti-abuse + TSA predictability).';

CREATE INDEX account_quota_months_current_idx
  ON public.account_quota_months (account_id, month_start_utc, month_end_utc);

ALTER TABLE public.account_quota_months ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_quota_months_select_own  ON public.account_quota_months;
DROP POLICY IF EXISTS account_quota_months_insert_own  ON public.account_quota_months;
DROP POLICY IF EXISTS account_quota_months_update_own  ON public.account_quota_months;
DROP POLICY IF EXISTS account_quota_months_delete_own  ON public.account_quota_months;

CREATE POLICY account_quota_months_select_own
  ON public.account_quota_months
  FOR SELECT
  USING (account_id = auth.uid());

CREATE POLICY account_quota_months_insert_own
  ON public.account_quota_months
  FOR INSERT
  WITH CHECK (account_id = auth.uid());

CREATE POLICY account_quota_months_update_own
  ON public.account_quota_months
  FOR UPDATE
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

CREATE POLICY account_quota_months_delete_own
  ON public.account_quota_months
  FOR DELETE
  USING (account_id = auth.uid());

-- Returns/creates the locked month context for "now()"
CREATE OR REPLACE FUNCTION public.ensure_quota_month_context(p_account_id uuid)
RETURNS TABLE (
  period_ym       integer,
  tz_ref          text,
  month_start_utc timestamptz,
  month_end_utc   timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now       timestamptz := now();
  v_tz        text;
  v_local_now timestamp;
  v_period    integer;
  v_start_utc timestamptz;
  v_end_utc   timestamptz;
BEGIN
  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'ensure_quota_month_context: p_account_id cannot be NULL'
      USING ERRCODE = '22004';
  END IF;

  -- 1) Existing current-month row (by UTC interval inclusion)
  RETURN QUERY
  SELECT aqm.period_ym, aqm.tz_ref, aqm.month_start_utc, aqm.month_end_utc
  FROM public.account_quota_months aqm
  WHERE aqm.account_id = p_account_id
    AND v_now >= aqm.month_start_utc
    AND v_now <  aqm.month_end_utc
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- 2) Create month row: lock tz_ref based on current accounts.timezone
  SELECT a.timezone
    INTO v_tz
  FROM public.accounts a
  WHERE a.id = p_account_id;

  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'ensure_quota_month_context: account % not found or not accessible', p_account_id
      USING ERRCODE = '42501';
  END IF;

  v_local_now := (v_now AT TIME ZONE v_tz);

  v_period :=
    (EXTRACT(YEAR  FROM v_local_now)::int * 100) +
     EXTRACT(MONTH FROM v_local_now)::int;

  v_start_utc := (date_trunc('month', v_local_now) AT TIME ZONE v_tz);
  v_end_utc   := ((date_trunc('month', v_local_now) + INTERVAL '1 month') AT TIME ZONE v_tz);

  INSERT INTO public.account_quota_months (
    account_id, period_ym, tz_ref, month_start_utc, month_end_utc
  )
  VALUES (
    p_account_id, v_period, v_tz, v_start_utc, v_end_utc
  )
  -- ✅ FIX: avoids ambiguity with RETURNS TABLE(period_ym ...)
  ON CONFLICT ON CONSTRAINT account_quota_months_pk DO NOTHING;

  RETURN QUERY
  SELECT aqm.period_ym, aqm.tz_ref, aqm.month_start_utc, aqm.month_end_utc
  FROM public.account_quota_months aqm
  WHERE aqm.account_id = p_account_id
    AND aqm.period_ym = v_period
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ensure_quota_month_context: unable to create/read month context for account % period %',
      p_account_id, v_period
      USING ERRCODE = '42501';
  END IF;

  RETURN;
END;
$$;

COMMIT;
