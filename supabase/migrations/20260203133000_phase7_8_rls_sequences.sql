-- Migration: Phase 7.8 — RLS policies: Sequences (sequences, sequence_steps)
-- Date: 2026-02-03
--
-- Objectif:
-- Créer policies RLS pour séquençage visuel (carte mère → étapes)
--
-- Tables affectées: sequences, sequence_steps
--
-- Invariants enforced:
-- - sequences: owner-only (account_id = auth.uid())
-- - execution-only mode: pas de modifications structurelles
-- - sequence_steps: owner via sequence, min 2 étapes (trigger)
--
-- Décisions appliquées:
-- - D3: execution-only détecté via is_execution_only()
-- - Ownership guards déjà en place (phase6) pour personal cards
--
-- Smoke test: voir supabase/tests/phase7_8_smoke_test.sql

BEGIN;

-- ============================================================
-- TABLE: sequences
-- ============================================================
-- Owner-only: user peut uniquement gérer ses propres séquences
-- execution-only => pas de modifications structurelles

-- SELECT: lire ses propres séquences
CREATE POLICY sequences_select_owner
  ON public.sequences
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

-- INSERT: créer séquence (Mode Séquençage)
-- Restrictions:
-- - owner-only
-- - pas en execution-only mode
-- - mother_card_id ownership vérifié par trigger (phase6)
CREATE POLICY sequences_insert_owner
  ON public.sequences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id = auth.uid()
    AND NOT public.is_execution_only()
  );

-- UPDATE: modifier séquence (metadata si nécessaire)
-- Restrictions:
-- - owner-only
-- - pas en execution-only mode
CREATE POLICY sequences_update_owner
  ON public.sequences
  FOR UPDATE
  TO authenticated
  USING (
    account_id = auth.uid()
    AND NOT public.is_execution_only()
  )
  WITH CHECK (
    account_id = auth.uid()
    AND NOT public.is_execution_only()
  );

-- DELETE: supprimer séquence
-- Restrictions:
-- - owner-only
-- - pas en execution-only mode
CREATE POLICY sequences_delete_owner
  ON public.sequences
  FOR DELETE
  TO authenticated
  USING (
    account_id = auth.uid()
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- TABLE: sequence_steps
-- ============================================================
-- Owner via sequence (FK chain)
-- Min 2 étapes strict (trigger phase6)
-- execution-only => read-only

-- SELECT: lire étapes de ses propres séquences
CREATE POLICY sequence_steps_select_owner
  ON public.sequence_steps
  FOR SELECT
  TO authenticated
  USING (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
  );

-- INSERT: créer étape (Mode Séquençage)
-- Restrictions:
-- - owner via sequence
-- - pas en execution-only mode
-- - step_card_id ownership vérifié par trigger (phase6)
CREATE POLICY sequence_steps_insert_owner
  ON public.sequence_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
    AND NOT public.is_execution_only()
  );

-- UPDATE: modifier étape (DnD position)
-- Restrictions:
-- - owner via sequence
-- - pas en execution-only mode
CREATE POLICY sequence_steps_update_owner
  ON public.sequence_steps
  FOR UPDATE
  TO authenticated
  USING (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
    AND NOT public.is_execution_only()
  )
  WITH CHECK (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
    AND NOT public.is_execution_only()
  );

-- DELETE: supprimer étape
-- Restrictions:
-- - owner via sequence
-- - pas en execution-only mode
-- - min 2 étapes après suppression (trigger phase6)
CREATE POLICY sequence_steps_delete_owner
  ON public.sequence_steps
  FOR DELETE
  TO authenticated
  USING (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- Commentaires
-- ============================================================
COMMENT ON POLICY sequences_select_owner ON public.sequences IS
  'Owner-only: user can read their own sequences';

COMMENT ON POLICY sequences_insert_owner ON public.sequences IS
  'Owner-only: user can create sequence (not execution-only, ownership checks by trigger)';

COMMENT ON POLICY sequences_update_owner ON public.sequences IS
  'Owner-only: user can update sequence (not execution-only)';

COMMENT ON POLICY sequences_delete_owner ON public.sequences IS
  'Owner-only: user can delete sequence (not execution-only)';

COMMENT ON POLICY sequence_steps_select_owner ON public.sequence_steps IS
  'Owner via sequence: user can read steps of their own sequences';

COMMENT ON POLICY sequence_steps_insert_owner ON public.sequence_steps IS
  'Owner via sequence: user can create step (not execution-only, ownership checks by trigger)';

COMMENT ON POLICY sequence_steps_update_owner ON public.sequence_steps IS
  'Owner via sequence: user can update step (not execution-only, DnD position)';

COMMENT ON POLICY sequence_steps_delete_owner ON public.sequence_steps IS
  'Owner via sequence: user can delete step (not execution-only, min 2 steps by trigger)';

COMMIT;
