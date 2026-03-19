-- ============================================================================
-- Migration : Fix timeline update soft sync (epoch++ in-place)
-- ============================================================================
--
-- PROBLÈME ANCIEN (Hard Reset) :
-- La fonction reset_active_started_session_for_timeline() clôturait la session active
-- (state → 'completed') puis créait une NOUVELLE session avec epoch++.
--
-- Conséquence :
-- - Les validations (session_validations) pointaient vers l'ancien session_id
-- - Le frontend chargeait les validations avec le NOUVEAU session_id → Set vide
-- - Toutes les cases cochées disparaissaient au moindre changement de timeline
--
-- SOLUTION NOUVELLE (Soft Sync) :
-- Incrémenter epoch IN-PLACE sur la session active existante.
-- Cela préserve le session_id → les validations survivent.
--
-- Contrat Produit :
-- "Modifier la structure de la timeline déclenche epoch++, mais ne doit
--  JAMAIS effacer les validations existantes."
--
-- Triggers qui appellent cette fonction :
-- - slots_sync_active_started_session_on_delete (DELETE slot)
-- - slots_sync_active_started_session_on_update (UPDATE slot)
-- - slots_sync_active_started_session_on_insert (INSERT slot)
-- ============================================================================

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

  -- ✅ SOFT SYNC : Incrémenter epoch in-place
  -- Préserve session_id → préserve validations (FK session_validations.session_id)
  -- Le frontend détecte epoch++ et rafraîchit les validations existantes
  UPDATE sessions
  SET epoch = epoch + 1,
      updated_at = NOW()
  WHERE id = v_session_id;

  -- Note : p_reason ignoré côté DB (pas de colonne dédiée dans le contrat)
  -- Peut être loggé côté application si nécessaire
END;
$$;

-- Mise à jour commentaire fonction
COMMENT ON FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text")
IS 'Incrémente epoch de la session active lors modification structurelle (Soft Sync) - préserve validations existantes';

-- ============================================================================
-- Ce que cette migration corrige :
-- - ✅ Préservation des validations lors de modifications de timeline
-- - ✅ Epoch++ in-place (pas de nouvelle session créée)
-- - ✅ Respect du contrat produit TSA (anti-choc, prévisibilité)
-- - ✅ Compatible avec tous les triggers existants (même signature)
-- ============================================================================
