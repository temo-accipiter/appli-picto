-- Migration: Phase 5.3 — Triggers transitions état sessions + auto-completion
-- Description: Gestion automatique transitions état et completion session
-- Référence: MIGRATION_PLAN.md Migration 29, PRODUCT_MODEL.md Ch.7.2
-- Date: 2026-01-30

-- ============================================================
-- Fonction: Valider transitions état autorisées
-- ============================================================
-- Transitions autorisées:
-- - active_preview → active_started (première validation)
-- - active_started → completed (dernière validation)
-- Transitions interdites:
-- - completed → active_* (réinitialisation crée nouvelle session avec epoch++)

CREATE OR REPLACE FUNCTION validate_session_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si pas de changement d'état, autoriser
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  -- Transition: active_preview → active_started (OK)
  IF OLD.state = 'active_preview' AND NEW.state = 'active_started' THEN
    RETURN NEW;
  END IF;

  -- Transition: active_started → completed (OK)
  IF OLD.state = 'active_started' AND NEW.state = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Toutes autres transitions interdites
  RAISE EXCEPTION 'Transition état session interdite: % → %', OLD.state, NEW.state
    USING HINT = 'Utiliser réinitialisation (nouvelle session avec epoch++) pour redémarrer';
END;
$$;

-- Trigger: Vérification transitions avant UPDATE
CREATE TRIGGER sessions_validate_state_transition
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  WHEN (OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION validate_session_state_transition();

-- ============================================================
-- Fonction: Auto-transition état après insertion validation
-- ============================================================
-- Logique:
-- 1. Si session en active_preview ET ≥1 validation → active_started
-- 2. Si session en active_started ET toutes étapes validées → completed
--
-- Définition "toutes étapes validées" (APPROCHE DYNAMIQUE):
-- - Étapes comptées = slots avec (kind='step' AND card_id IS NOT NULL)
-- - Référence: DB_BLUEPRINT.md L463-470 (slots step vides ignorés en Tableau)
-- - Choix dynamique conforme TSA:
--   * Étapes validées verrouillées (non supprimables)
--   * Slots step vides ne comptent pas
--   * Ajout étape avec carte = immédiatement comptée (cohérent UX)
--   * Suppression étape non validée = décision adulte délibérée

CREATE OR REPLACE FUNCTION auto_transition_session_on_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_session RECORD;
  v_total_steps INTEGER;
  v_validated_steps INTEGER;
BEGIN
  -- Récupérer session et timeline associées
  SELECT s.id, s.state, s.timeline_id
    INTO v_session
    FROM sessions s
    WHERE s.id = NEW.session_id;

  -- Si session n'existe pas ou déjà completed, rien à faire
  IF NOT FOUND OR v_session.state = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Compter étapes totales (slots step avec carte, dans timeline de la session)
  -- Note: slots step vides (card_id IS NULL) ne comptent pas
  SELECT COUNT(*)
    INTO v_total_steps
    FROM slots
    WHERE timeline_id = v_session.timeline_id
      AND kind = 'step'
      AND card_id IS NOT NULL;

  -- Compter étapes validées (validations de cette session)
  SELECT COUNT(DISTINCT sv.slot_id)
    INTO v_validated_steps
    FROM session_validations sv
    INNER JOIN slots sl ON sl.id = sv.slot_id
    WHERE sv.session_id = NEW.session_id
      AND sl.kind = 'step';

  -- Transition 1: active_preview → active_started (première validation)
  IF v_session.state = 'active_preview' AND v_validated_steps >= 1 THEN
    UPDATE sessions
      SET state = 'active_started',
          updated_at = NOW()
      WHERE id = NEW.session_id;

    RETURN NEW;
  END IF;

  -- Transition 2: active_started → completed (toutes étapes validées)
  IF v_session.state = 'active_started' AND v_validated_steps >= v_total_steps THEN
    UPDATE sessions
      SET state = 'completed',
          updated_at = NOW()
      WHERE id = NEW.session_id;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Auto-transition après insertion validation
CREATE TRIGGER session_validations_auto_transition
  AFTER INSERT ON session_validations
  FOR EACH ROW
  EXECUTE FUNCTION auto_transition_session_on_validation();

-- ============================================================
-- Fonction: Empêcher validation si session completed
-- ============================================================
-- Sécurité: Une session completed est lecture seule
-- UX TSA: Prévisibilité (session terminée = finie, pas de modification)

CREATE OR REPLACE FUNCTION prevent_validation_if_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_state session_state;
BEGIN
  -- Vérifier état session
  SELECT state INTO v_session_state
    FROM sessions
    WHERE id = NEW.session_id;

  IF v_session_state = 'completed' THEN
    RAISE EXCEPTION 'Impossible de valider étape: session terminée (completed)'
      USING HINT = 'Utiliser réinitialisation pour redémarrer la session';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Bloquer validation sur session completed
CREATE TRIGGER session_validations_prevent_if_completed
  BEFORE INSERT ON session_validations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_validation_if_completed();

-- ============================================================
-- Fonction: Garantir epoch monotone (création et reset)
-- ============================================================
-- Règle: epoch ne peut jamais décroître
-- - Création session = epoch défaut 1 (OK par défaut colonne)
-- - Reset (nouvelle session) = MAX(epoch précédent) + 1

CREATE OR REPLACE FUNCTION ensure_epoch_monotone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_epoch INTEGER;
BEGIN
  -- Récupérer epoch max existant pour ce (child_profile_id, timeline_id)
  SELECT COALESCE(MAX(epoch), 0)
    INTO v_max_epoch
    FROM sessions
    WHERE child_profile_id = NEW.child_profile_id
      AND timeline_id = NEW.timeline_id
      AND id != NEW.id;  -- Exclure ligne en cours d'insertion

  -- Si epoch fourni est inférieur ou égal au max, incrémenter
  IF NEW.epoch <= v_max_epoch THEN
    NEW.epoch := v_max_epoch + 1;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Garantir epoch monotone à insertion
CREATE TRIGGER sessions_ensure_epoch_monotone
  BEFORE INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_epoch_monotone();

-- ============================================================
-- Ce que cette migration introduit:
-- - Validation transitions état (active_preview → active_started → completed)
-- - Auto-transition 1: première validation → active_started
-- - Auto-transition 2: dernière étape validée → completed
-- - Définition "étapes comptées" = slots step avec card_id NOT NULL (dynamique)
-- - Protection: pas de validation si session completed
-- - Garantie epoch monotone (création=1, reset=MAX+1)
-- ============================================================
