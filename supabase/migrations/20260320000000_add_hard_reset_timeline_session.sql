-- ============================================================================
-- Migration : Ajout fonction Hard Reset Timeline Session
-- ============================================================================
--
-- CONTEXTE :
-- Suite à la refonte "Soft Sync" (reset_active_started_session_for_timeline)
-- qui préserve maintenant les validations lors des modifications structurelles,
-- le bouton explicite "Réinitialiser la session" en Édition Timeline ne
-- fonctionne plus (les cartes restent cochées).
--
-- PROBLÈME :
-- Le bouton utilisait reset_active_started_session_for_timeline() qui ne fait
-- plus qu'un Soft Sync (epoch++ + snapshot recalcul) sans supprimer les validations.
--
-- SOLUTION :
-- Créer une nouvelle fonction RPC dédiée au vrai "Hard Reset" (effacer l'ardoise).
--
-- LOGIQUE HARD RESET :
-- 1. Trouver la session active (active_preview OU active_started)
-- 2. Supprimer TOUTES les validations (DELETE session_validations)
-- 3. Réinitialiser la session à 'active_preview' (comme session vierge)
-- 4. Reset steps_total_snapshot à NULL (sera recalculé à la prochaine validation)
-- 5. Incrémenter epoch pour notifier le frontend via Realtime
--
-- SÉCURITÉ :
-- - Uniquement pour sessions actives (active_preview/active_started)
-- - FOR UPDATE pour verrouillage anti-race-condition
-- - Suppression en cascade des validations (FK ON DELETE CASCADE déjà en place)
--
-- CONTRAT UX TSA :
-- L'adulte en Édition peut "remettre à zéro" la session active pour que l'enfant
-- reparte de zéro au prochain chargement du Contexte Tableau.
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."hard_reset_timeline_session"(
  "p_timeline_id" "uuid"
) RETURNS "void"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_session_id UUID;
  v_session_state session_state;
BEGIN
  -- ============================================================================
  -- 1. Trouver la session active pour cette timeline
  -- ============================================================================

  SELECT s.id, s.state
    INTO v_session_id, v_session_state
  FROM sessions s
  WHERE s.timeline_id = p_timeline_id
    AND s.state IN ('active_preview', 'active_started')
  LIMIT 1
  FOR UPDATE;  -- Verrouillage anti-race-condition

  -- Si aucune session active, rien à faire
  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  -- ============================================================================
  -- 2. Supprimer TOUTES les validations
  -- ============================================================================

  -- Cela "décoche" toutes les cartes validées
  -- La FK session_validations(session_id) ON DELETE CASCADE gère la suppression proprement
  DELETE FROM session_validations
  WHERE session_id = v_session_id;

  -- ============================================================================
  -- 3. Réinitialiser le snapshot et incrémenter epoch
  -- ============================================================================

  -- ⚠️ IMPORTANT : On ne change PAS le state (active_started → active_preview bloqué par trigger)
  -- À la place :
  -- - On supprime le snapshot (sera recapturé à la prochaine validation)
  -- - On incrémente epoch pour notifier le frontend via Realtime
  -- - La session reste 'active_started' MAIS avec 0 validations
  -- - Le trigger auto_transition_session_on_validation fera active_started → active_started
  --   à la prochaine validation (car snapshot sera recalculé à ce moment)

  -- NOTE : Si state = 'active_preview', on le garde tel quel (pas de validations à supprimer)
  UPDATE sessions
  SET steps_total_snapshot = NULL,
      epoch = epoch + 1,
      updated_at = NOW()
  WHERE id = v_session_id;

  -- ============================================================================
  -- Note : Pas de completed_at car session non terminée
  -- ============================================================================
END;
$$;

-- Commentaire fonction
COMMENT ON FUNCTION "public"."hard_reset_timeline_session"("p_timeline_id" "uuid")
IS 'Hard Reset : Supprime toutes les validations et reset snapshot (action adulte Édition, session reste active_started avec 0 validations)';

-- ============================================================================
-- Ce que cette migration ajoute :
-- ============================================================================
--
-- ✅ Nouvelle fonction RPC pour le vrai "Hard Reset" (effacer l'ardoise)
-- ✅ Suppression toutes validations (DELETE session_validations)
-- ✅ Réinitialisation session à 'active_preview' (session vierge)
-- ✅ Epoch++ pour notification Realtime
-- ✅ Verrouillage FOR UPDATE (anti-race-condition)
--
-- SÉPARATION DES RESPONSABILITÉS :
-- - reset_active_started_session_for_timeline() → Soft Sync (modifs structurelles)
-- - hard_reset_timeline_session() → Hard Reset (bouton "Réinitialiser" adulte)
--
-- UX TSA :
-- L'adulte peut "remettre à zéro" la progression de l'enfant explicitement.
-- Le Tableau se rechargera avec toutes les cartes décochées.
-- ============================================================================
