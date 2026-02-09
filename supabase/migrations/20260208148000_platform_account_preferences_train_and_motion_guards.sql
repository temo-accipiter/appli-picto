-- PLATFORM / Micro-features: TrainProgressBar prefs + accessibility guard (reduced_motion => confetti OFF)
-- Source: PLATFORM.md §5.4.1 + §7.1.3 (Invariant D) + §7.2.4

BEGIN;

-- 1) Add TrainProgressBar preferences (DB-authoritative)
ALTER TABLE public.account_preferences
  ADD COLUMN IF NOT EXISTS train_progress_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS train_line text NULL,
  ADD COLUMN IF NOT EXISTS train_type public.transport_type NOT NULL DEFAULT 'metro';

-- Guardrail train_line (souple : alphanum, longueur bornée)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_preferences_train_line_chk'
      AND conrelid = 'public.account_preferences'::regclass
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.account_preferences
      ADD CONSTRAINT account_preferences_train_line_chk
      CHECK (
        train_line IS NULL
        OR (
          char_length(train_line) BETWEEN 1 AND 32
          AND train_line ~ '^[0-9A-Za-z][0-9A-Za-z]*$'
        )
      )
    $sql$;
  END IF;
END $$;

-- 2) Accessibility guard: reduced_motion has absolute priority over confetti
-- UX TSA: on FORCE OFF (auto-correct), not "reject", to avoid frustration.
CREATE OR REPLACE FUNCTION public.platform_account_preferences_enforce_accessibility()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reduced_motion IS TRUE THEN
    NEW.confetti_enabled := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_account_preferences_enforce_accessibility() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_platform_account_preferences_enforce_accessibility ON public.account_preferences;
CREATE TRIGGER trg_platform_account_preferences_enforce_accessibility
BEFORE INSERT OR UPDATE ON public.account_preferences
FOR EACH ROW
EXECUTE FUNCTION public.platform_account_preferences_enforce_accessibility();

-- Backfill safety (au cas où des données incohérentes existent déjà)
UPDATE public.account_preferences
SET confetti_enabled = FALSE
WHERE reduced_motion IS TRUE
  AND confetti_enabled IS TRUE;

-- Belt-and-suspenders CHECK (ne doit jamais être violable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_preferences_confetti_reduced_motion_chk'
      AND conrelid = 'public.account_preferences'::regclass
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.account_preferences
      ADD CONSTRAINT account_preferences_confetti_reduced_motion_chk
      CHECK (NOT (reduced_motion IS TRUE AND confetti_enabled IS TRUE))
    $sql$;
  END IF;
END $$;

COMMIT;
