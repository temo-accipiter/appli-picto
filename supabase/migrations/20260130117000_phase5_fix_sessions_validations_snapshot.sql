-- Migration: Phase 5.4 — Correctifs DB-first (sessions + validations + completion)
-- Date: 2026-01-30
--
-- Objectifs:
-- 1) Défendre la cohérence sessions(child_profile_id, timeline_id)
-- 2) Défendre les validations: step-only, step non vide, slot appartient à la timeline de la session
-- 3) Completion robuste: snapshot total_steps au 1er check + verrou session (anti race condition)
-- 4) Epoch monotone aussi en UPDATE (jamais décroissant)
--
-- NOTE TSA:
-- - Cette migration évite les incohérences silencieuses (surprise + frustration).
-- - Elle n’implémente pas "anti-choc UI" (hors DB), mais garantit que la DB ne peut pas dériver.

BEGIN;

-- ============================================================
-- 0) Colonnes techniques (snapshot / timestamps)
-- ============================================================
-- Snapshot du nombre d'étapes "comptées" au démarrage effectif (1ère validation)
-- pour éviter de déplacer la ligne d'arrivée en cours de session.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS steps_total_snapshot INTEGER,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================
-- 1) Cohérence sessions: timeline_id doit appartenir au child_profile_id
-- ============================================================
CREATE OR REPLACE FUNCTION sessions_enforce_profile_timeline_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_timeline_child UUID;
BEGIN
  -- Récupérer le child_profile propriétaire de la timeline
  SELECT t.child_profile_id
    INTO v_timeline_child
    FROM timelines t
    WHERE t.id = NEW.timeline_id;

  IF v_timeline_child IS NULL THEN
    RAISE EXCEPTION 'Session invalide: timeline_id % introuvable', NEW.timeline_id;
  END IF;

  IF v_timeline_child <> NEW.child_profile_id THEN
    RAISE EXCEPTION
      'Session invalide: timeline_id % appartient à child_profile_id %, pas %',
      NEW.timeline_id, v_timeline_child, NEW.child_profile_id
      USING HINT = 'Toujours créer une session sur la timeline du profil enfant (1:1)';
  END IF;

  RETURN NEW;
END;
$$;

-- Remplacer le trigger si déjà présent (idempotent)
DROP TRIGGER IF EXISTS sessions_enforce_profile_timeline_consistency ON sessions;

CREATE TRIGGER sessions_enforce_profile_timeline_consistency
  BEFORE INSERT OR UPDATE OF child_profile_id, timeline_id
  ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION sessions_enforce_profile_timeline_consistency();

COMMENT ON FUNCTION sessions_enforce_profile_timeline_consistency()
IS 'Invariant DB-first: sessions.timeline_id doit correspondre au child_profile_id (cohérence 1:1).';

-- ============================================================
-- 2) Epoch monotone aussi en UPDATE (jamais décroissant)
-- ============================================================
CREATE OR REPLACE FUNCTION sessions_prevent_epoch_decrement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.epoch < OLD.epoch THEN
    RAISE EXCEPTION 'Epoch invalide: décroissance interdite (% -> %)', OLD.epoch, NEW.epoch
      USING HINT = 'Reset = nouvelle session (INSERT) avec epoch = MAX(epoch)+1';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_prevent_epoch_decrement ON sessions;

CREATE TRIGGER sessions_prevent_epoch_decrement
  BEFORE UPDATE OF epoch
  ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION sessions_prevent_epoch_decrement();

COMMENT ON FUNCTION sessions_prevent_epoch_decrement()
IS 'Invariant DB-first: epoch ne peut jamais décroître (protection UPDATE).';

-- ============================================================
-- 3) Validations: step-only, non-vide, slot appartient à la timeline de la session,
--    session non-completed + session active uniquement
-- ============================================================
CREATE OR REPLACE FUNCTION session_validations_enforce_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_state session_state;
  v_session_timeline UUID;

  v_slot_kind slot_kind;
  v_slot_card UUID;
  v_slot_timeline UUID;
BEGIN
  -- Charger session
  SELECT s.state, s.timeline_id
    INTO v_session_state, v_session_timeline
    FROM sessions s
    WHERE s.id = NEW.session_id;

  IF v_session_state IS NULL THEN
    RAISE EXCEPTION 'Validation invalide: session_id % introuvable', NEW.session_id;
  END IF;

  -- Session terminée = lecture seule
  IF v_session_state = 'completed' THEN
    RAISE EXCEPTION 'Impossible de valider: session terminée (completed)'
      USING HINT = 'Utiliser un reset (nouvelle session) pour redémarrer';
  END IF;

  -- Autoriser seulement les sessions actives (preview/started)
  IF v_session_state NOT IN ('active_preview', 'active_started') THEN
    RAISE EXCEPTION 'Impossible de valider: session non active (%)', v_session_state;
  END IF;

  -- Charger slot
  SELECT sl.kind, sl.card_id, sl.timeline_id
    INTO v_slot_kind, v_slot_card, v_slot_timeline
    FROM slots sl
    WHERE sl.id = NEW.slot_id;

  IF v_slot_kind IS NULL THEN
    RAISE EXCEPTION 'Validation invalide: slot_id % introuvable', NEW.slot_id;
  END IF;

  -- Step-only
  IF v_slot_kind <> 'step' THEN
    RAISE EXCEPTION 'Validation invalide: seul un slot step est validable (slot kind=%)', v_slot_kind;
  END IF;

  -- Step non vide
  IF v_slot_card IS NULL THEN
    RAISE EXCEPTION 'Validation invalide: impossible de valider un step vide (card_id NULL)';
  END IF;

  -- Slot doit appartenir à la timeline de la session
  IF v_slot_timeline <> v_session_timeline THEN
    RAISE EXCEPTION
      'Validation invalide: slot.timeline_id % ≠ session.timeline_id %',
      v_slot_timeline, v_session_timeline;
  END IF;

  RETURN NEW;
END;
$$;

-- On remplace le trigger existant prevent_if_completed par un trigger plus strict
DROP TRIGGER IF EXISTS session_validations_prevent_if_completed ON session_validations;
DROP TRIGGER IF EXISTS session_validations_enforce_integrity ON session_validations;

CREATE TRIGGER session_validations_enforce_integrity
  BEFORE INSERT
  ON session_validations
  FOR EACH ROW
  EXECUTE FUNCTION session_validations_enforce_integrity();

COMMENT ON FUNCTION session_validations_enforce_integrity()
IS 'Invariant DB-first: validation step-only, non-vide, appartenant à la timeline de la session + session active.';

-- ============================================================
-- 4) Completion robuste + snapshot + anti race condition (FOR UPDATE)
--    Remplace la logique dynamique précédente.
-- ============================================================
CREATE OR REPLACE FUNCTION auto_transition_session_on_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
  v_state session_state;
  v_timeline_id UUID;
  v_steps_snapshot INTEGER;
  v_validated_steps INTEGER;
BEGIN
  v_session_id := NEW.session_id;

  -- Verrouiller la session (évite race multi-appareils)
  SELECT s.state, s.timeline_id, s.steps_total_snapshot
    INTO v_state, v_timeline_id, v_steps_snapshot
    FROM sessions s
    WHERE s.id = v_session_id
    FOR UPDATE;

  IF v_state IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si déjà completed, rien à faire (la contrainte BEFORE INSERT bloque normalement)
  IF v_state = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Snapshot au démarrage effectif (1ère validation)
  IF v_state = 'active_preview' THEN
    SELECT COUNT(*)
      INTO v_steps_snapshot
      FROM slots
      WHERE timeline_id = v_timeline_id
        AND kind = 'step'
        AND card_id IS NOT NULL;

    UPDATE sessions
      SET state = 'active_started',
          steps_total_snapshot = v_steps_snapshot,
          started_at = NOW(),
          updated_at = NOW()
      WHERE id = v_session_id;

    v_state := 'active_started';
  END IF;

  -- Défense: si snapshot manquant (cas legacy / import), on le fixe une fois
  IF v_steps_snapshot IS NULL THEN
    SELECT COUNT(*)
      INTO v_steps_snapshot
      FROM slots
      WHERE timeline_id = v_timeline_id
        AND kind = 'step'
        AND card_id IS NOT NULL;

    UPDATE sessions
      SET steps_total_snapshot = v_steps_snapshot,
          updated_at = NOW()
      WHERE id = v_session_id;
  END IF;

  -- Compter validations (ici c'est sûr: BEFORE INSERT a déjà filtré step-only et timeline match)
  SELECT COUNT(*)
    INTO v_validated_steps
    FROM session_validations sv
    WHERE sv.session_id = v_session_id;

  -- Completion: toutes étapes snapshot validées
  -- NB: si snapshot=0, aucune validation ne devrait exister (step non vide requis)
  IF v_state = 'active_started'
     AND v_steps_snapshot IS NOT NULL
     AND v_steps_snapshot > 0
     AND v_validated_steps >= v_steps_snapshot THEN

    UPDATE sessions
      SET state = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_session_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Le trigger session_validations_auto_transition existe déjà en Phase 5.3.
-- On ne le recrée pas: CREATE OR REPLACE FUNCTION suffit.

COMMIT;
