-- ============================================================================
-- Migration : Fix session completion snapshot sync (recalcul snapshot lors epoch++)
-- ============================================================================
--
-- PROBLÈME IDENTIFIÉ :
-- La fonction reset_active_started_session_for_timeline() incrémente epoch in-place
-- mais ne recalcule PAS le steps_total_snapshot.
--
-- Conséquence :
-- 1. Session démarre avec 2 slots step (card_id NOT NULL)
-- 2. User valide 1er slot → steps_total_snapshot = 2 (FROZEN)
-- 3. User ajoute 3ème slot → epoch++ ✅ mais snapshot RESTE 2 ❌
-- 4. User valide 2ème slot → 2 validations >= 2 snapshot → Session complète ❌
--    → Ignore complètement le 3ème slot non validé
--
-- SOLUTION :
-- Lors du Soft Sync (epoch++), recalculer steps_total_snapshot pour refléter
-- le nombre actuel de slots step avec card_id NOT NULL.
--
-- Contrat Produit :
-- "La session est complète quand TOUTES les étapes actuelles (pas gelées)
--  avec carte assignée sont validées, même si des étapes ont été ajoutées
--  en cours de session."
--
-- Règle DB-first :
-- Logique de complétion 100% backend (trigger auto_transition_session_on_validation).
-- Frontend affiche uniquement l'état DB (state='completed').
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."reset_active_started_session_for_timeline"(
  "p_timeline_id" "uuid",
  "p_reason" "text" DEFAULT NULL::"text"
) RETURNS "void"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_session_id UUID;
  v_session_state session_state;
  v_new_steps_snapshot INTEGER;
BEGIN
  -- Trouver la session active (active_preview ou active_started) pour cette timeline
  -- FOR UPDATE : verrouillage anti-race-condition
  SELECT s.id, s.state
    INTO v_session_id, v_session_state
  FROM sessions s
  WHERE s.timeline_id = p_timeline_id
    AND s.state IN ('active_preview', 'active_started')
  LIMIT 1
  FOR UPDATE;

  -- Si aucune session active, rien à faire
  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  -- ✅ SOFT SYNC : Incrémenter epoch in-place
  -- Préserve session_id → préserve validations (FK session_validations.session_id)

  -- 🆕 SNAPSHOT SYNC : Recalculer steps_total_snapshot SEULEMENT si session déjà démarrée
  -- Rationale :
  -- - Si state = 'active_preview' → pas encore de snapshot (sera fait à la 1ère validation)
  -- - Si state = 'active_started' → snapshot existe, DOIT être mis à jour pour refléter
  --   le nombre actuel de slots step avec card_id NOT NULL
  IF v_session_state = 'active_started' THEN
    SELECT COUNT(*)
      INTO v_new_steps_snapshot
      FROM slots
      WHERE timeline_id = p_timeline_id
        AND kind = 'step'
        AND card_id IS NOT NULL;

    -- Mettre à jour epoch + snapshot + updated_at
    UPDATE sessions
    SET epoch = epoch + 1,
        steps_total_snapshot = v_new_steps_snapshot,  -- 🆕 RESYNC SNAPSHOT
        updated_at = NOW()
    WHERE id = v_session_id;
  ELSE
    -- Session en preview → juste epoch++ (snapshot sera fait à la 1ère validation)
    UPDATE sessions
    SET epoch = epoch + 1,
        updated_at = NOW()
    WHERE id = v_session_id;
  END IF;

  -- Note : p_reason ignoré côté DB (pas de colonne dédiée dans le contrat)
  -- Peut être loggé côté application si nécessaire
END;
$$;

-- Mise à jour commentaire fonction
COMMENT ON FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text")
IS 'Incrémente epoch + resync steps_total_snapshot lors modification structurelle (Soft Sync + Snapshot Sync) - préserve validations existantes';

-- ============================================================================
-- Ce que cette migration corrige :
-- - ✅ Préservation des validations lors de modifications de timeline (acquis)
-- - ✅ Epoch++ in-place (acquis)
-- - 🆕 Recalcul steps_total_snapshot lors epoch++ si session démarrée
-- - 🆕 Session complète uniquement quand TOUTES les étapes ACTUELLES validées
-- - ✅ Respect du contrat produit TSA (anti-choc, prévisibilité)
-- - ✅ DB-first strict : logique complétion 100% backend
-- ============================================================================
