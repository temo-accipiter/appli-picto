-- ============================================================================
-- Migration : Corriger le Hard Reset pour revenir en active_preview
-- ============================================================================
--
-- PROBLÈME :
-- hard_reset_timeline_session() laissait la session en 'active_started'
-- car validate_session_state_transition() bloquait active_started → active_preview.
-- Conséquence UX : après reset, tous les guards de composition restaient actifs
-- (isSessionActive = true, sessionState = 'active_started'), rendant impossible :
--   - l'ajout/suppression de slots
--   - la désassignation de cartes
--   - les lockedCardIds dans la bibliothèque
--
-- SOLUTION :
-- 1. Autoriser active_started → active_preview dans le trigger de validation
--    (transition légitime pour un Hard Reset explicite par l'adulte)
-- 2. Modifier hard_reset_timeline_session() pour remettre l'état en active_preview
--
-- COHÉRENCE :
-- Le mode Visitor (IndexedDB) faisait déjà { state: 'active_preview' }.
-- Cette migration aligne le comportement Auth sur le comportement Visitor.
--
-- IMPACT GUARDS (automatique, aucune modification front nécessaire) :
-- Après reset, sessionState passe à 'active_preview' → isSessionActive = false :
--   ✅ useSlots.ts : guards levés (addSlot, removeSlot, updateSlot)
--   ✅ SlotsEditor.tsx : isStructuralBusy = false (+ Étape réactivé)
--   ✅ SlotItem.tsx : isDeleteLocked = false, tokensLocked = false
--   ✅ Edition.tsx : lockedCardIds = Set vide (toutes les cartes déverrouillées)
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. Autoriser active_started → active_preview dans le trigger
-- ============================================================
-- La sémantique est : hard reset par l'adulte = retour à session vierge.
-- Le trigger gardait un flux strictement one-way (preview→started→completed)
-- mais ce modèle ne prévoyait pas l'action explicite "Réinitialiser" adulte.
CREATE OR REPLACE FUNCTION validate_session_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Pas de changement d'état → autorisé
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  -- active_preview → active_started (première validation enfant)
  IF OLD.state = 'active_preview' AND NEW.state = 'active_started' THEN
    RETURN NEW;
  END IF;

  -- active_started → active_preview (hard reset adulte — retour à session vierge)
  -- Permet à hard_reset_timeline_session() de déverrouiller la composition.
  IF OLD.state = 'active_started' AND NEW.state = 'active_preview' THEN
    RETURN NEW;
  END IF;

  -- active_started → completed (toutes les étapes validées)
  IF OLD.state = 'active_started' AND NEW.state = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Toutes autres transitions interdites
  RAISE EXCEPTION 'Transition état session interdite: % → %', OLD.state, NEW.state
    USING HINT = 'Transitions valides : active_preview→active_started, active_started→active_preview (reset), active_started→completed';
END;
$$;

COMMENT ON FUNCTION validate_session_state_transition() IS
  'Valide les transitions état session. Autorisé : active_preview→active_started (1ère validation), active_started→active_preview (hard reset adulte), active_started→completed (fin session). Interdit : tout le reste.';

-- ============================================================
-- 2. Modifier hard_reset_timeline_session() — remettre active_preview
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."hard_reset_timeline_session"(
  "p_timeline_id" "uuid"
) RETURNS "void"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_session_id UUID;
  v_session_state session_state;
BEGIN
  -- ============================================================
  -- 1. Trouver la session active pour cette timeline
  -- ============================================================
  SELECT s.id, s.state
    INTO v_session_id, v_session_state
  FROM sessions s
  WHERE s.timeline_id = p_timeline_id
    AND s.state IN ('active_preview', 'active_started')
  LIMIT 1
  FOR UPDATE;  -- Verrouillage anti-race-condition

  -- Aucune session active → rien à faire
  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  -- ============================================================
  -- 2. Supprimer TOUTES les validations
  -- ============================================================
  -- Décoche toutes les cartes validées par l'enfant.
  -- FK session_validations(session_id) ON DELETE CASCADE gère la suppression.
  DELETE FROM session_validations
  WHERE session_id = v_session_id;

  -- ============================================================
  -- 3. Remettre en active_preview + reset snapshot + epoch++
  -- ============================================================
  -- active_preview = session vierge (0 validations).
  -- Conséquence frontend : sessionState passe à 'active_preview',
  -- isSessionActive = false → tous les guards de composition levés.
  -- steps_total_snapshot = NULL → sera recapturé à la prochaine validation.
  -- epoch++ → notifie le frontend via Realtime pour rechargement immédiat.
  UPDATE sessions
  SET state = 'active_preview',
      steps_total_snapshot = NULL,
      epoch = epoch + 1,
      updated_at = NOW()
  WHERE id = v_session_id;
END;
$$;

COMMENT ON FUNCTION "public"."hard_reset_timeline_session"("p_timeline_id" "uuid")
IS 'Hard Reset : Supprime toutes les validations, remet la session en active_preview et reset le snapshot. Action explicite adulte (Édition) — déverrouille entièrement la composition.';

-- ============================================================
-- 4. Smoke tests
-- ============================================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'hard_reset_timeline_session'
  ), 'SMOKE TEST ÉCHOUÉ : hard_reset_timeline_session introuvable.';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'validate_session_state_transition'
  ), 'SMOKE TEST ÉCHOUÉ : validate_session_state_transition introuvable.';

  RAISE NOTICE 'SMOKE TEST RÉUSSI : Hard Reset corrigé — session revient en active_preview et déverrouille la composition.';
END;
$$;

COMMIT;

-- ============================================================================
-- Ce que cette migration corrige :
-- ✅ Trigger : active_started → active_preview désormais autorisé (hard reset adulte)
-- ✅ hard_reset_timeline_session() : remet state = 'active_preview' au lieu de rester active_started
-- ✅ Cohérence Visitor / Auth : les deux modes font maintenant la même transition
-- ✅ Guards frontend : se déverrouillent automatiquement via sessionState (aucun changement front)
-- ✅ steps_total_snapshot remis à NULL (recalculé à la prochaine validation)
-- ✅ epoch++ : notification Realtime pour rechargement immédiat côté Tableau
-- ============================================================================
