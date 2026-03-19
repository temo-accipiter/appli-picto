-- Migration : Garde-fous suppression carte (DB-first pur)
-- Description : Bloquer suppression si carte validée en session active, auto epoch++ sinon
-- Date : 2026-03-18
-- Contrat : FRONTEND_CONTRACT.md §3.2.2bis + ux.md (anti-choc TSA)
--
-- Comportement :
-- 1. Carte utilisée DIRECTEMENT dans slots (card_id) :
--    → Si slot validé dans session active → RAISE EXCEPTION (bloque DELETE)
--    → Si slot non validé mais session active → epoch++ (marque changement structurant)
--
-- 2. Carte utilisée comme STEP dans séquences (step_card_id) :
--    → Si carte mère validée dans session active → RAISE EXCEPTION
--    → Si carte mère non validée mais session active → epoch++
--
-- Règle anti-choc : epoch++ garantit que le changement s'applique uniquement au
-- prochain Chargement Contexte Tableau (jamais "en direct" côté enfant).

CREATE OR REPLACE FUNCTION check_card_delete_guardrails()
RETURNS TRIGGER AS $$
DECLARE
  v_session RECORD;
  v_slot_id UUID;
  v_is_validated BOOLEAN;
  v_affected_sessions UUID[];
BEGIN
  v_affected_sessions := ARRAY[]::UUID[];

  -- ══════════════════════════════════════════════════════════════════
  -- CAS 1 : Carte utilisée DIRECTEMENT dans des slots (card_id)
  -- ══════════════════════════════════════════════════════════════════
  FOR v_session IN
    SELECT DISTINCT s.id, s.timeline_id
    FROM sessions s
    WHERE s.state IN ('active_preview', 'active_started')
      AND EXISTS (
        SELECT 1 FROM slots sl
        WHERE sl.timeline_id = s.timeline_id
          AND sl.card_id = OLD.id
      )
  LOOP
    -- Vérifier chaque slot de cette timeline contenant la carte
    FOR v_slot_id IN
      SELECT sl.id
      FROM slots sl
      WHERE sl.timeline_id = v_session.timeline_id
        AND sl.card_id = OLD.id
    LOOP
      -- Ce slot est-il validé dans cette session ?
      SELECT EXISTS (
        SELECT 1
        FROM session_validations sv
        WHERE sv.session_id = v_session.id
          AND sv.slot_id = v_slot_id
      ) INTO v_is_validated;

      -- 🛑 Si validé → BLOQUER suppression (RAISE EXCEPTION)
      IF v_is_validated THEN
        RAISE EXCEPTION 'Cette carte est actuellement utilisée dans une session active (étape déjà validée). Réinitialisez la session avant de supprimer la carte.';
      END IF;
    END LOOP;

    -- ✅ Session active mais carte non validée → marquer pour epoch++
    v_affected_sessions := array_append(v_affected_sessions, v_session.id);
  END LOOP;

  -- ══════════════════════════════════════════════════════════════════
  -- CAS 2 : Carte utilisée comme STEP dans une séquence (step_card_id)
  -- ══════════════════════════════════════════════════════════════════
  FOR v_session IN
    SELECT DISTINCT s.id, s.timeline_id
    FROM sessions s
    WHERE s.state IN ('active_preview', 'active_started')
      AND EXISTS (
        SELECT 1
        FROM slots sl
        INNER JOIN sequences seq ON seq.mother_card_id = sl.card_id
        INNER JOIN sequence_steps ss ON ss.sequence_id = seq.id
        WHERE sl.timeline_id = s.timeline_id
          AND ss.step_card_id = OLD.id
      )
  LOOP
    -- Trouver les slots contenant des cartes mères dont les séquences utilisent cette carte
    FOR v_slot_id IN
      SELECT sl.id
      FROM slots sl
      INNER JOIN sequences seq ON seq.mother_card_id = sl.card_id
      INNER JOIN sequence_steps ss ON ss.sequence_id = seq.id
      WHERE sl.timeline_id = v_session.timeline_id
        AND ss.step_card_id = OLD.id
    LOOP
      -- Le slot carte mère est-il validé ?
      SELECT EXISTS (
        SELECT 1
        FROM session_validations sv
        WHERE sv.session_id = v_session.id
          AND sv.slot_id = v_slot_id
      ) INTO v_is_validated;

      -- 🛑 Si carte mère validée → BLOQUER suppression step
      IF v_is_validated THEN
        RAISE EXCEPTION 'Cette carte est utilisée dans une séquence dont la carte mère a été validée. Réinitialisez la session avant de supprimer.';
      END IF;
    END LOOP;

    -- ✅ Session active mais carte mère non validée → marquer pour epoch++
    v_affected_sessions := array_append(v_affected_sessions, v_session.id);
  END LOOP;

  -- ══════════════════════════════════════════════════════════════════
  -- 🔄 Incrémenter epoch pour toutes les sessions affectées (non bloquées)
  -- ══════════════════════════════════════════════════════════════════
  IF array_length(v_affected_sessions, 1) > 0 THEN
    UPDATE sessions
    SET epoch = epoch + 1,
        updated_at = NOW()
    WHERE id = ANY(v_affected_sessions);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger BEFORE DELETE
CREATE TRIGGER guard_card_delete_active_sessions
  BEFORE DELETE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION check_card_delete_guardrails();

-- Commentaires
COMMENT ON FUNCTION check_card_delete_guardrails() IS 'Garde-fous suppression carte : bloque si carte validée en session active (RAISE EXCEPTION), incrémente epoch sinon (anti-choc TSA)';
COMMENT ON TRIGGER guard_card_delete_active_sessions ON cards IS 'Déclenché AVANT suppression carte pour vérifier sessions actives et protéger cohérence Tableau enfant';

-- ============================================================
-- Ce que cette migration introduit :
-- - Fonction PL/pgSQL check_card_delete_guardrails()
-- - Trigger BEFORE DELETE sur cards
-- - Protection stricte : carte validée en session active → suppression BLOQUÉE
-- - Marquage automatique : carte non validée en session active → epoch++ (changement structurant)
-- - Garantie anti-choc : changements appliqués uniquement au prochain Chargement Contexte Tableau
-- ============================================================
