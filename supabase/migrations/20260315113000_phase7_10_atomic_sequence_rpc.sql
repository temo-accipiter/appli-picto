-- Migration: Phase 7.10 — RPC atomiques séquençage cloud
-- Date: 2026-03-15
--
-- Problème corrigé:
-- Le backend expose seulement des écritures unitaires sur sequences et
-- sequence_steps, alors que l'invariant DB exige >= 2 étapes au commit.
-- Le flow client "créer une séquence vide puis ajouter les étapes" ne peut
-- donc pas réussir proprement en cloud.
--
-- Solution:
-- - Ajouter create_sequence_with_steps(...) pour créer une séquence + sa liste
--   initiale d'étapes dans une seule requête atomique.
-- - Ajouter replace_sequence_steps(...) pour remplacer atomiquement toute la
--   liste des étapes d'une séquence existante.
--
-- Décisions de sécurité:
-- - SECURITY INVOKER: la fonction n'affaiblit pas la RLS existante.
-- - account_id est dérivé de auth.uid(), jamais fourni par le client.
-- - can_write_sequences() et is_execution_only() restent la source de vérité
--   backend pour l'écriture.
-- - Les triggers existants gardent les contrôles ownership cartes + min 2 steps.

BEGIN;

-- ============================================================
-- RPC: create_sequence_with_steps()
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_sequence_with_steps(
  p_mother_card_id UUID,
  p_step_card_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id UUID;
  v_sequence_id UUID;
  v_constraint_name TEXT;
  v_step_count INTEGER;
  v_distinct_step_count INTEGER;
  v_has_null BOOLEAN;
BEGIN
  v_account_id := auth.uid();

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION
      'Authentication required: create_sequence_with_steps'
      USING ERRCODE = '42501',
            HINT = 'Sign in with an authenticated account.';
  END IF;

  IF p_mother_card_id IS NULL THEN
    RAISE EXCEPTION
      'Sequence invalid: mother_card_id is required'
      USING ERRCODE = '23514',
            HINT = 'Provide the mother card id.';
  END IF;

  IF NOT public.can_write_sequences() THEN
    RAISE EXCEPTION
      'Access denied: sequence creation is not allowed for current account'
      USING ERRCODE = '42501',
            HINT = 'Sequence write is reserved to subscriber/admin accounts.';
  END IF;

  IF public.is_execution_only() THEN
    RAISE EXCEPTION
      'Access denied: sequence creation is unavailable in execution-only mode'
      USING ERRCODE = '42501',
            HINT = 'Upgrade or reduce locked structure before editing sequences.';
  END IF;

  IF p_step_card_ids IS NULL THEN
    RAISE EXCEPTION
      'Sequence invalid: step_card_ids is required'
      USING ERRCODE = '23514',
            HINT = 'Provide at least 2 step card ids.';
  END IF;

  SELECT
    COUNT(*),
    COUNT(DISTINCT step_card_id),
    COALESCE(BOOL_OR(step_card_id IS NULL), FALSE)
  INTO v_step_count, v_distinct_step_count, v_has_null
  FROM unnest(p_step_card_ids) AS input(step_card_id);

  IF v_has_null THEN
    RAISE EXCEPTION
      'Sequence invalid: step_card_ids cannot contain null values'
      USING ERRCODE = '23514',
            HINT = 'Remove empty steps before saving.';
  END IF;

  IF v_step_count < 2 THEN
    RAISE EXCEPTION
      'Sequence invalid: at least 2 steps are required (current=%)',
      v_step_count
      USING ERRCODE = '23514',
            HINT = 'Provide at least 2 distinct step cards.';
  END IF;

  IF v_distinct_step_count <> v_step_count THEN
    RAISE EXCEPTION
      'Sequence invalid: duplicate step_card_id detected'
      USING ERRCODE = '23505',
            HINT = 'Each card can appear only once in a sequence.';
  END IF;

  INSERT INTO public.sequences (account_id, mother_card_id)
  VALUES (v_account_id, p_mother_card_id)
  RETURNING id INTO v_sequence_id;

  INSERT INTO public.sequence_steps (sequence_id, step_card_id, position)
  SELECT
    v_sequence_id,
    input.step_card_id,
    input.ordinality - 1
  FROM unnest(p_step_card_ids) WITH ORDINALITY AS input(step_card_id, ordinality)
  ORDER BY input.ordinality;

  RETURN v_sequence_id;
EXCEPTION
  WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

    IF v_constraint_name = 'unique_sequence_per_account_mother' THEN
      RAISE EXCEPTION
        'Sequence already exists for mother_card_id %',
        p_mother_card_id
        USING ERRCODE = '23505',
              HINT = 'Use replace_sequence_steps(...) to update the existing sequence.';
    END IF;

    IF v_constraint_name = 'unique_sequence_step_card' THEN
      RAISE EXCEPTION
        'Sequence invalid: duplicate step_card_id detected during creation'
        USING ERRCODE = '23505',
              HINT = 'Each card can appear only once in a sequence.';
    END IF;

    RAISE;
END;
$$;

COMMENT ON FUNCTION public.create_sequence_with_steps(UUID, UUID[]) IS
  'Atomic sequencing RPC: creates one sequence for auth.uid() and inserts all initial steps in stable order. RLS and triggers remain enforced.';

REVOKE EXECUTE ON FUNCTION public.create_sequence_with_steps(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sequence_with_steps(UUID, UUID[]) TO authenticated;

-- ============================================================
-- RPC: replace_sequence_steps()
-- ============================================================

CREATE OR REPLACE FUNCTION public.replace_sequence_steps(
  p_sequence_id UUID,
  p_step_card_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id UUID;
  v_locked_sequence_id UUID;
  v_constraint_name TEXT;
  v_step_count INTEGER;
  v_distinct_step_count INTEGER;
  v_has_null BOOLEAN;
BEGIN
  v_account_id := auth.uid();

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION
      'Authentication required: replace_sequence_steps'
      USING ERRCODE = '42501',
            HINT = 'Sign in with an authenticated account.';
  END IF;

  IF p_sequence_id IS NULL THEN
    RAISE EXCEPTION
      'Sequence invalid: sequence_id is required'
      USING ERRCODE = '23514',
            HINT = 'Provide the sequence id to update.';
  END IF;

  IF NOT public.can_write_sequences() THEN
    RAISE EXCEPTION
      'Access denied: sequence update is not allowed for current account'
      USING ERRCODE = '42501',
            HINT = 'Sequence write is reserved to subscriber/admin accounts.';
  END IF;

  IF public.is_execution_only() THEN
    RAISE EXCEPTION
      'Access denied: sequence update is unavailable in execution-only mode'
      USING ERRCODE = '42501',
            HINT = 'Upgrade or reduce locked structure before editing sequences.';
  END IF;

  IF p_step_card_ids IS NULL THEN
    RAISE EXCEPTION
      'Sequence invalid: step_card_ids is required'
      USING ERRCODE = '23514',
            HINT = 'Provide at least 2 step card ids.';
  END IF;

  SELECT
    COUNT(*),
    COUNT(DISTINCT step_card_id),
    COALESCE(BOOL_OR(step_card_id IS NULL), FALSE)
  INTO v_step_count, v_distinct_step_count, v_has_null
  FROM unnest(p_step_card_ids) AS input(step_card_id);

  IF v_has_null THEN
    RAISE EXCEPTION
      'Sequence invalid: step_card_ids cannot contain null values'
      USING ERRCODE = '23514',
            HINT = 'Remove empty steps before saving.';
  END IF;

  IF v_step_count < 2 THEN
    RAISE EXCEPTION
      'Sequence invalid: at least 2 steps are required (current=%)',
      v_step_count
      USING ERRCODE = '23514',
            HINT = 'Provide at least 2 distinct step cards.';
  END IF;

  IF v_distinct_step_count <> v_step_count THEN
    RAISE EXCEPTION
      'Sequence invalid: duplicate step_card_id detected'
      USING ERRCODE = '23505',
            HINT = 'Each card can appear only once in a sequence.';
  END IF;

  SELECT s.id
  INTO v_locked_sequence_id
  FROM public.sequences s
  WHERE s.id = p_sequence_id
    AND s.account_id = v_account_id
  FOR UPDATE;

  IF v_locked_sequence_id IS NULL THEN
    RAISE EXCEPTION
      'Sequence not found or inaccessible: %',
      p_sequence_id
      USING ERRCODE = '42501',
            HINT = 'You can only update your own sequences.';
  END IF;

  DELETE FROM public.sequence_steps
  WHERE sequence_id = p_sequence_id;

  INSERT INTO public.sequence_steps (sequence_id, step_card_id, position)
  SELECT
    p_sequence_id,
    input.step_card_id,
    input.ordinality - 1
  FROM unnest(p_step_card_ids) WITH ORDINALITY AS input(step_card_id, ordinality)
  ORDER BY input.ordinality;

  UPDATE public.sequences
  SET updated_at = NOW()
  WHERE id = p_sequence_id;
EXCEPTION
  WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

    IF v_constraint_name = 'unique_sequence_step_card' THEN
      RAISE EXCEPTION
        'Sequence invalid: duplicate step_card_id detected during replacement'
        USING ERRCODE = '23505',
              HINT = 'Each card can appear only once in a sequence.';
    END IF;

    RAISE;
END;
$$;

COMMENT ON FUNCTION public.replace_sequence_steps(UUID, UUID[]) IS
  'Atomic sequencing RPC: replaces the full ordered step list of one owned sequence in a single transaction-safe call. RLS and triggers remain enforced.';

REVOKE EXECUTE ON FUNCTION public.replace_sequence_steps(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_sequence_steps(UUID, UUID[]) TO authenticated;

COMMIT;
