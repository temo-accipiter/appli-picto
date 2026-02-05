-- Migration: Phase 7.7 — RLS policies: Sessions (sessions, session_validations)
-- Date: 2026-02-03
--
-- Objectif:
-- Créer policies RLS pour sessions d'exécution + validations
--
-- Tables affectées: sessions, session_validations
--
-- Invariants enforced:
-- - sessions: owner via child_profile, pas DELETE standard (historique)
-- - session completed = lecture seule (pas UPDATE)
-- - session_validations: owner via session, immutable (pas UPDATE)
-- - execution-only: pas de reset session (DELETE réinit interdit)
--
-- Décisions appliquées:
-- - D3: execution-only détecté via is_execution_only()
-- - D4: triggers gardent contexte normal (policies compatibles avec state transitions)
--
-- Smoke test: voir supabase/tests/phase7_7_smoke_test.sql

BEGIN;

-- ============================================================
-- TABLE: sessions
-- ============================================================
-- Owner via child_profile (FK chain)
-- Lecture seule si completed
-- DELETE standard interdit (historique), réinit autorisée si pas execution-only

-- SELECT: lire sessions de ses propres child_profiles
CREATE POLICY sessions_select_owner
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (
    child_profile_id IN (
      SELECT id FROM public.child_profiles WHERE account_id = auth.uid()
    )
  );

-- INSERT: créer session (entrée Contexte Tableau)
-- Note: normalement via trigger, mais policy permet création explicite
CREATE POLICY sessions_insert_owner
  ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM public.child_profiles WHERE account_id = auth.uid()
    )
  );

-- UPDATE: modifier session (transitions état via triggers)
-- Restrictions:
-- - owner via child_profile
-- - pas UPDATE si completed (lecture seule)
-- - epoch monotone (trigger protège)
-- - started_at, completed_at, steps_total_snapshot (triggers gérent)
CREATE POLICY sessions_update_owner
  ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (
    child_profile_id IN (
      SELECT id FROM public.child_profiles WHERE account_id = auth.uid()
    )
    -- Peut modifier uniquement si pas completed
    AND state IN ('active_preview', 'active_started')
  )
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM public.child_profiles WHERE account_id = auth.uid()
    )
  );

-- DELETE: réinitialisation session uniquement
-- Restrictions:
-- - owner via child_profile
-- - pas en execution-only mode (reset interdit après downgrade)
-- Note: historique conservation => DELETE rare (uniquement réinit explicite)
CREATE POLICY sessions_delete_owner
  ON public.sessions
  FOR DELETE
  TO authenticated
  USING (
    child_profile_id IN (
      SELECT id FROM public.child_profiles WHERE account_id = auth.uid()
    )
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- TABLE: session_validations
-- ============================================================
-- Owner via session->child_profile (FK chain)
-- Immutable: pas d'UPDATE (INSERT only)
-- DELETE uniquement pour réinit (avec session)

-- SELECT: lire validations des sessions de ses propres child_profiles
CREATE POLICY session_validations_select_owner
  ON public.session_validations
  FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT s.id
      FROM public.sessions s
      JOIN public.child_profiles cp ON cp.id = s.child_profile_id
      WHERE cp.account_id = auth.uid()
    )
  );

-- INSERT: créer validation (checkbox Tableau)
-- Restrictions:
-- - owner via session
-- - session active uniquement (pas completed)
-- - slot step non vide (trigger vérifie)
-- - pas reward (trigger vérifie)
CREATE POLICY session_validations_insert_owner
  ON public.session_validations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT s.id
      FROM public.sessions s
      JOIN public.child_profiles cp ON cp.id = s.child_profile_id
      WHERE cp.account_id = auth.uid()
      AND s.state IN ('active_preview', 'active_started')
    )
  );

-- UPDATE: interdit (validations immutables)
-- Pas de policy UPDATE => bloqué par défaut

-- DELETE: réinitialisation uniquement (avec session)
-- Restrictions:
-- - owner via session
-- - pas en execution-only mode (reset interdit après downgrade)
CREATE POLICY session_validations_delete_owner
  ON public.session_validations
  FOR DELETE
  TO authenticated
  USING (
    session_id IN (
      SELECT s.id
      FROM public.sessions s
      JOIN public.child_profiles cp ON cp.id = s.child_profile_id
      WHERE cp.account_id = auth.uid()
    )
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- Commentaires
-- ============================================================
COMMENT ON POLICY sessions_select_owner ON public.sessions IS
  'Owner via child_profile: user can read sessions of their own profiles';

COMMENT ON POLICY sessions_insert_owner ON public.sessions IS
  'Owner via child_profile: user can create session (normally via trigger)';

COMMENT ON POLICY sessions_update_owner ON public.sessions IS
  'Owner via child_profile: user can update active session (completed = read-only, state transitions by trigger)';

COMMENT ON POLICY sessions_delete_owner ON public.sessions IS
  'Owner via child_profile: user can reset session (delete) if not execution-only';

COMMENT ON POLICY session_validations_select_owner ON public.session_validations IS
  'Owner via session->child_profile: user can read validations of their own sessions';

COMMENT ON POLICY session_validations_insert_owner ON public.session_validations IS
  'Owner via session: user can create validation (active session only, step checks by trigger)';

COMMENT ON POLICY session_validations_delete_owner ON public.session_validations IS
  'Owner via session: user can delete validation for reset (not execution-only)';

COMMIT;
