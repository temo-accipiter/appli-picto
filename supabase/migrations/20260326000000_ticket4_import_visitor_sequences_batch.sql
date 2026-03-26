-- Migration: Ticket 4 — Import atomique séquences Visitor → Free
-- Date: 2026-03-26
--
-- Contexte:
-- Lorsqu'un Visitor (non authentifié) crée des séquences localement (IndexedDB),
-- puis s'inscrit et devient Free/Subscriber, ces données locales doivent être
-- importées dans Supabase de manière atomique.
--
-- Solution:
-- - RPC import_visitor_sequences_batch() reçoit TOUTES les séquences en JSON
-- - Transaction atomique : tout ou rien (rollback auto en cas d'erreur réseau)
-- - Gestion conflits : ON CONFLICT DO NOTHING sur (account_id, mother_card_id)
-- - Validation auth : SECURITY INVOKER avec check auth.uid()
-- - Retour détaillé : { success, imported_count, skipped_count, errors }
--
-- Décisions de sécurité:
-- - SECURITY INVOKER: utilise les RLS existantes (owner-only)
-- - account_id dérivé de auth.uid(), JAMAIS fourni par le client
-- - Validation permissions via can_write_sequences() et is_execution_only()
-- - Triggers existants gardent contrôles ownership + min 2 steps
--
-- Format JSON attendu:
-- {
--   "sequences": [
--     {
--       "mother_card_id": "uuid",
--       "steps": [
--         { "step_card_id": "uuid", "position": 0 },
--         { "step_card_id": "uuid", "position": 1 }
--       ]
--     }
--   ]
-- }

BEGIN;

-- ============================================================
-- RPC: import_visitor_sequences_batch()
-- ============================================================

CREATE OR REPLACE FUNCTION public.import_visitor_sequences_batch(
  p_sequences_json JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id UUID;
  v_sequence_record JSONB;
  v_sequence_id UUID;
  v_step_record JSONB;
  v_imported_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_mother_card_id UUID;
  v_step_card_id UUID;
  v_position INTEGER;
  v_steps_array JSONB;
  v_step_count INTEGER;
  v_distinct_step_count INTEGER;
BEGIN
  -- 1. Validation auth (CRITIQUE pour RLS)
  v_account_id := auth.uid();

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION
      'Authentication required: import_visitor_sequences_batch'
      USING ERRCODE = '42501',
            HINT = 'Sign in with an authenticated account.';
  END IF;

  -- 2. Validation permissions (Free accounts bloqués par RLS)
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

  -- 3. Validation JSON structure
  IF p_sequences_json IS NULL OR NOT (p_sequences_json ? 'sequences') THEN
    RAISE EXCEPTION
      'Invalid JSON: sequences array is required'
      USING ERRCODE = '22023',
            HINT = 'Provide a valid JSON with "sequences" array.';
  END IF;

  -- 4. Parcourir toutes les séquences (atomique dans cette transaction)
  FOR v_sequence_record IN
    SELECT * FROM jsonb_array_elements(p_sequences_json->'sequences')
  LOOP
    BEGIN
      -- Extraire mother_card_id
      v_mother_card_id := (v_sequence_record->>'mother_card_id')::UUID;

      IF v_mother_card_id IS NULL THEN
        -- Ajouter erreur et continuer
        v_errors := v_errors || jsonb_build_object(
          'error', 'missing_mother_card_id',
          'sequence', v_sequence_record
        );
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Extraire steps array
      v_steps_array := v_sequence_record->'steps';

      IF v_steps_array IS NULL OR jsonb_array_length(v_steps_array) < 2 THEN
        -- Minimum 2 étapes requises
        v_errors := v_errors || jsonb_build_object(
          'error', 'min_2_steps_required',
          'mother_card_id', v_mother_card_id,
          'step_count', COALESCE(jsonb_array_length(v_steps_array), 0)
        );
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Valider unicité des step_card_id dans cette séquence
      SELECT
        jsonb_array_length(v_steps_array),
        COUNT(DISTINCT (step->>'step_card_id')::UUID)
      INTO v_step_count, v_distinct_step_count
      FROM jsonb_array_elements(v_steps_array) AS step;

      IF v_step_count != v_distinct_step_count THEN
        -- Doublons détectés
        v_errors := v_errors || jsonb_build_object(
          'error', 'duplicate_step_card_ids',
          'mother_card_id', v_mother_card_id
        );
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Insérer séquence (gestion conflit: si mother_card_id existe déjà, skip)
      INSERT INTO public.sequences (account_id, mother_card_id)
      VALUES (v_account_id, v_mother_card_id)
      ON CONFLICT (account_id, mother_card_id) DO NOTHING
      RETURNING id INTO v_sequence_id;

      -- Si v_sequence_id est NULL, c'est que la séquence existait déjà (conflit)
      IF v_sequence_id IS NULL THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Insérer toutes les étapes de cette séquence
      FOR v_step_record IN
        SELECT * FROM jsonb_array_elements(v_steps_array)
      LOOP
        v_step_card_id := (v_step_record->>'step_card_id')::UUID;
        v_position := (v_step_record->>'position')::INTEGER;

        IF v_step_card_id IS NULL OR v_position IS NULL OR v_position < 0 THEN
          -- Étape invalide, on rollback toute la séquence en cours
          RAISE EXCEPTION
            'Invalid step: step_card_id and position >= 0 required'
            USING ERRCODE = '23514';
        END IF;

        INSERT INTO public.sequence_steps (sequence_id, step_card_id, position)
        VALUES (v_sequence_id, v_step_card_id, v_position);
      END LOOP;

      -- Séquence importée avec succès
      v_imported_count := v_imported_count + 1;

    EXCEPTION
      WHEN OTHERS THEN
        -- En cas d'erreur (FK invalide, contrainte, etc.), logger et continuer
        v_errors := v_errors || jsonb_build_object(
          'error', SQLERRM,
          'sqlstate', SQLSTATE,
          'mother_card_id', v_mother_card_id
        );
        v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;

  -- 5. Retour détaillé
  RETURN jsonb_build_object(
    'success', true,
    'imported_count', v_imported_count,
    'skipped_count', v_skipped_count,
    'total_sequences', jsonb_array_length(p_sequences_json->'sequences'),
    'errors', v_errors
  );

END;
$$;

-- ============================================================
-- Commentaires et permissions
-- ============================================================

COMMENT ON FUNCTION public.import_visitor_sequences_batch(JSONB) IS
'Import atomique des séquences Visitor (IndexedDB) vers compte Free/Subscriber.
 - Reçoit toutes les séquences en JSON pour garantir atomicité.
 - Gère les conflits (mother_card_id existe déjà) : ON CONFLICT DO NOTHING.
 - Validation auth : SECURITY INVOKER (utilise RLS owner-only).
 - Transaction implicite : tout ou rien (rollback auto si erreur réseau).
 - Retour : { success, imported_count, skipped_count, errors }.';

-- Accorder permissions (SECURITY INVOKER utilise RLS existantes)
GRANT EXECUTE ON FUNCTION public.import_visitor_sequences_batch(JSONB) TO authenticated;

COMMIT;
