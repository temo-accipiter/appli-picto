-- Migration: Enable DELETE on child_profiles with trigger invariant
-- Date: 2026-03-03
--
-- Objectif:
-- Permettre suppression individuelle profils enfants avec guards DB-first :
-- - Policy DELETE : permissions (owner, active, not execution-only)
-- - Trigger BEFORE DELETE : invariant "min 1 profil" (erreur explicite)
--
-- Invariants enforced (DB-first):
-- - Au moins 1 profil enfant par compte (PLATFORM.md §2.7.2)
-- - Profils locked non supprimables (read-only après downgrade)
-- - Suppression bloquée en execution-only mode
-- - Owner-only (account_id = auth.uid())
-- - Concurrence-safe (verrou FOR UPDATE)
--
-- Cascade: child_profiles → timelines → slots → sessions → validations

BEGIN;

-- ============================================================
-- PARTIE 1: Trigger invariant "min 1 profil"
-- ============================================================

-- Fonction trigger (pas SECURITY DEFINER car lecture seule child_profiles)
CREATE OR REPLACE FUNCTION public.tg_child_profiles_prevent_delete_last()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_count INT;
BEGIN
  -- ⚠️ BYPASS CASCADE : Si le compte parent n'existe plus (suppression compte RGPD),
  -- ne pas bloquer la cascade DELETE. Permet suppression complète du compte.
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = OLD.account_id) THEN
    RETURN OLD;
  END IF;

  -- Verrou anti-concurrence : bloquer autres deletes du même compte
  -- Évite scénario double-delete simultané qui passerait tous deux le COUNT
  PERFORM 1
  FROM public.child_profiles
  WHERE account_id = OLD.account_id
  FOR UPDATE;

  -- Compter profils restants APRÈS suppression (OLD exclu)
  SELECT COUNT(*)
  INTO remaining_count
  FROM public.child_profiles
  WHERE account_id = OLD.account_id
    AND id <> OLD.id;

  -- Si aucun profil ne restera → erreur explicite
  IF remaining_count = 0 THEN
    -- ERRCODE 23514 : CHECK_VIOLATION (distinct de P0001 pour quotas/triggers génériques)
    RAISE EXCEPTION USING
      ERRCODE = '23514', -- CHECK_VIOLATION PostgreSQL standard
      MESSAGE = 'child_profile_min_one_required: Au moins 1 profil enfant doit être conservé.',
      DETAIL = 'Pour effacer toutes vos données, supprimez votre compte entier (RGPD).',
      HINT = 'La suppression individuelle du dernier profil est interdite (invariant système).';
  END IF;

  RETURN OLD; -- Permettre suppression si count > 0
END;
$$;

COMMENT ON FUNCTION public.tg_child_profiles_prevent_delete_last() IS
  'Trigger BEFORE DELETE: bloque suppression du dernier profil enfant (invariant PLATFORM.md §2.7.2). Erreur explicite ERRCODE 23514 (CHECK_VIOLATION). Verrou FOR UPDATE anti-concurrence.';

-- Créer trigger
DROP TRIGGER IF EXISTS trg_child_profiles_prevent_delete_last ON public.child_profiles;

CREATE TRIGGER trg_child_profiles_prevent_delete_last
  BEFORE DELETE ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_child_profiles_prevent_delete_last();

COMMENT ON TRIGGER trg_child_profiles_prevent_delete_last ON public.child_profiles IS
  'Empêche suppression du dernier profil enfant (au moins 1 obligatoire). Lève erreur 23514 (CHECK_VIOLATION). Concurrence-safe via FOR UPDATE.';

-- ============================================================
-- PARTIE 2: Policy DELETE (permissions uniquement)
-- ============================================================

-- Drop policy existante si présente (idempotence)
DROP POLICY IF EXISTS child_profiles_delete_owner ON public.child_profiles;

-- Policy DELETE : gère permissions, pas invariants métier (délégués au trigger)
CREATE POLICY child_profiles_delete_owner
  ON public.child_profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Owner-only
    account_id = auth.uid()
    -- Profil doit être actif (locked = read-only, pas de suppression)
    AND status = 'active'
    -- Bloquer en execution-only mode (structural)
    AND NOT public.is_execution_only()
    -- Invariant "min 1 profil" géré par trigger (pas ici)
  );

COMMENT ON POLICY child_profiles_delete_owner ON public.child_profiles IS
  'Owner-only: user can delete active child profiles (not locked, blocked in execution-only mode). Minimum 1 profile enforced by trigger tg_child_profiles_prevent_delete_last (explicit error 23514). Cascade DELETE: timelines → slots → sessions → validations.';

COMMIT;
