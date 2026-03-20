-- ============================================================================
-- Migration : Add Victory Check on Snapshot Reduction
-- ============================================================================
--
-- PROBLÈME IDENTIFIÉ :
-- La fonction reset_active_started_session_for_timeline() recalcule steps_total_snapshot
-- lors d'une réduction de timeline (suppression de cartes), mais ne vérifie PAS
-- si cette réduction entraîne une complétion immédiate de la session.
--
-- Scénario Bug :
-- 1. Session démarre avec 2 cartes → snapshot = 2
-- 2. Enfant valide 1ère carte → 1 validation, state = 'active_started'
-- 3. Adulte supprime 2ème carte → trigger appelle reset_active_started_session_for_timeline()
-- 4. Snapshot recalculé = 1 (✅), epoch++ (✅)
-- 5. BUG : Session reste 'active_started' alors que validations (1) >= snapshot (1)
--    → Devrait passer en 'completed' immédiatement
--
-- CAUSE RACINE :
-- La transition vers 'completed' n'est vérifiée QUE lors d'un INSERT sur session_validations
-- (via trigger auto_transition_session_on_validation).
-- Quand on RÉDUIT le snapshot, aucun "Victory Check" n'est effectué.
--
-- SOLUTION :
-- Ajouter un "Victory Check" après recalcul du snapshot :
-- - Compter validations existantes
-- - Si validations >= nouveau snapshot → transition vers 'completed'
-- - Sinon → UPDATE classique (epoch++, snapshot)
--
-- Contrat Produit TSA :
-- "Une session est complète dès que TOUTES les étapes actuelles sont validées,
--  que ce soit par validation normale OU par réduction de timeline."
--
-- Règle DB-first :
-- Logique de complétion 100% backend (triggers + fonctions).
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
  v_current_validations INTEGER;  -- 🆕 Compteur validations pour Victory Check
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

  -- 🆕 SNAPSHOT SYNC + VICTORY CHECK : Recalculer snapshot ET vérifier complétion
  -- Rationale :
  -- - Si state = 'active_preview' → pas encore de snapshot (sera fait à la 1ère validation)
  -- - Si state = 'active_started' → snapshot existe, DOIT être mis à jour ET vérifié
  IF v_session_state = 'active_started' THEN
    -- Recalculer steps_total_snapshot (nombre actuel de slots step avec card_id NOT NULL)
    SELECT COUNT(*)
      INTO v_new_steps_snapshot
      FROM slots
      WHERE timeline_id = p_timeline_id
        AND kind = 'step'
        AND card_id IS NOT NULL;

    -- 🆕 VICTORY CHECK : Compter validations existantes
    -- Note : COUNT(*) = nombre de validations pour cette session
    -- (pas de DISTINCT car UNIQUE constraint sur (session_id, slot_id))
    SELECT COUNT(*)
      INTO v_current_validations
      FROM session_validations
      WHERE session_id = v_session_id;

    -- 🆕 LOGIQUE CONDITIONNELLE : Complétion immédiate OU Update classique
    --
    -- CAS 1 : VICTORY (validations >= nouveau snapshot)
    -- → La réduction de timeline entraîne une complétion immédiate
    -- → Transition vers 'completed' (UX TSA : fin claire, prévisible)
    --
    -- CAS 2 : EN COURS (validations < nouveau snapshot)
    -- → La session continue avec le nouveau snapshot
    -- → Update classique (epoch++, snapshot)
    IF v_current_validations >= v_new_steps_snapshot THEN
      -- 🎉 VICTORY : Session complète après réduction de timeline
      UPDATE sessions
      SET state = 'completed',
          completed_at = NOW(),
          epoch = epoch + 1,
          steps_total_snapshot = v_new_steps_snapshot,
          updated_at = NOW()
      WHERE id = v_session_id;
    ELSE
      -- ⏳ EN COURS : Session continue avec nouveau snapshot
      UPDATE sessions
      SET epoch = epoch + 1,
          steps_total_snapshot = v_new_steps_snapshot,
          updated_at = NOW()
      WHERE id = v_session_id;
    END IF;
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
IS 'Incrémente epoch + resync steps_total_snapshot + Victory Check lors modification structurelle (Soft Sync + Snapshot Sync + Complétion) - préserve validations existantes';

-- ============================================================================
-- Ce que cette migration corrige :
-- - ✅ Préservation des validations lors de modifications de timeline (acquis)
-- - ✅ Epoch++ in-place (acquis)
-- - ✅ Recalcul steps_total_snapshot lors epoch++ si session démarrée (acquis)
-- - 🆕 Victory Check : vérification complétion après réduction de snapshot
-- - 🆕 Transition vers 'completed' si validations >= nouveau snapshot (AJOUT)
-- - ✅ Respect du contrat produit TSA (anti-choc, prévisibilité, fin claire)
-- - ✅ DB-first strict : logique complétion 100% backend (dans les deux sens)
--
-- LOGIQUE ÉTANCHE DANS LES DEUX SENS :
-- 1. Validation normale → auto_transition_session_on_validation() (acquis)
--    → Vérifie validations >= snapshot → 'completed'
--
-- 2. Réduction timeline → reset_active_started_session_for_timeline() (🆕)
--    → Vérifie validations >= nouveau snapshot réduit → 'completed'
--
-- → Complétion détectée dans TOUS les cas (ajout validation OU réduction snapshot)
-- ============================================================================
