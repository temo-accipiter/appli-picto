-- ============================================================================
-- Migration : Simplification de reset_active_started_session_for_timeline()
-- ============================================================================
--
-- CONTEXTE :
-- La migration 20260408120000 a verrouillé la composition des timelines pendant
-- active_started. INSERT et DELETE sont maintenant bloqués par trigger BEFORE.
--
-- CONSÉQUENCE :
-- La branche 'active_started' dans reset_active_started_session_for_timeline()
-- recalculait steps_total_snapshot après chaque mutation de slot. Ce code est
-- désormais mort : il ne sera jamais atteint car le trigger BEFORE GUARD bloque
-- toute mutation INSERT/DELETE avant que l'AFTER trigger puisse appeler cette
-- fonction en contexte active_started.
--
-- CE QUE CETTE MIGRATION CHANGE :
-- Suppression de la branche de recalcul mid-session dans active_started.
-- Les deux états (active_preview et active_started) font désormais la même
-- chose : epoch++ uniquement.
--
-- CE QUI NE CHANGE PAS :
-- - La fonction reste présente (appellée par slots_trigger_epoch_increment_after_change)
-- - Le mécanisme epoch++ : inchangé
-- - Le comportement pendant active_preview : inchangé (snapshot = null jusqu'à 1ère validation)
-- - Le trigger auto_transition_session_on_validation : inchangé (snapshot pris à 1ère validation)
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION "public"."reset_active_started_session_for_timeline"(
  "p_timeline_id" "uuid",
  "p_reason" "text" DEFAULT NULL::"text"
) RETURNS "void"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Trouver la session active (active_preview ou active_started) pour cette timeline
  -- FOR UPDATE : verrouillage anti-race-condition
  SELECT s.id
    INTO v_session_id
  FROM sessions s
  WHERE s.timeline_id = p_timeline_id
    AND s.state IN ('active_preview', 'active_started')
  LIMIT 1
  FOR UPDATE;

  -- Si aucune session active, rien à faire
  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  -- ✅ EPOCH++ uniquement
  -- La branche de recalcul steps_total_snapshot pour active_started est supprimée :
  -- la composition est verrouillée pendant active_started (trigger slots_guard_validated_on_structural_change).
  -- Le snapshot reste immuable une fois fixé à la 1ère validation.
  UPDATE sessions
  SET epoch = epoch + 1,
      updated_at = NOW()
  WHERE id = v_session_id;
END;
$$;

COMMENT ON FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text")
IS 'Incrémente epoch (Soft Sync) lors d''une modification structurelle de timeline. Appelée par slots_trigger_epoch_increment_after_change. Snapshot immuable — recalcul mid-session supprimé car composition verrouillée pendant active_started.';

-- ============================================================
-- Smoke test : vérifier que la fonction simplifiée existe
-- ============================================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'reset_active_started_session_for_timeline'
  ), 'SMOKE TEST ÉCHOUÉ : Fonction reset_active_started_session_for_timeline introuvable.';

  RAISE NOTICE 'SMOKE TEST RÉUSSI : Fonction simplifiée — epoch++ sans recalcul snapshot mid-session.';
END;
$$;

COMMIT;

-- ============================================================================
-- Ce que cette migration corrige :
-- - ✅ Supprime branche recalcul snapshot mid-session (code mort depuis 20260408120000)
-- - ✅ Simplifie la fonction : epoch++ identique pour active_preview et active_started
-- - ✅ Clarté architecturale : snapshot immuable = contrat produit
-- ============================================================================
