-- CORRECTIVE / Remove reduced_motion constraint - Adult decides everything
-- Context: Adult professionals accompany children and know best what is appropriate
-- Decision: Remove DB constraint that forces confetti_enabled=false when reduced_motion=true
-- Result: Adult has full control over confetti settings independently

BEGIN;

-- 1) Drop CHECK constraint (prevents confetti_enabled=true when reduced_motion=true)
ALTER TABLE public.account_preferences
  DROP CONSTRAINT IF EXISTS account_preferences_confetti_reduced_motion_chk;

-- 2) Drop trigger that auto-corrects confetti_enabled to false
DROP TRIGGER IF EXISTS trg_platform_account_preferences_enforce_accessibility
  ON public.account_preferences;

-- 3) Drop function (no longer needed)
DROP FUNCTION IF EXISTS public.platform_account_preferences_enforce_accessibility();

-- 4) Change default value: reduced_motion = FALSE (adult decides)
ALTER TABLE public.account_preferences
  ALTER COLUMN reduced_motion SET DEFAULT false;

-- 5) Change default value: confetti_enabled = TRUE (enabled by default, adult can disable)
ALTER TABLE public.account_preferences
  ALTER COLUMN confetti_enabled SET DEFAULT true;

-- 6) Update existing accounts: reduced_motion = false, confetti_enabled = true
-- (Give adults full control, they can disable if needed)
UPDATE public.account_preferences
SET reduced_motion = false,
    confetti_enabled = true
WHERE reduced_motion = true OR confetti_enabled = false;

COMMIT;
