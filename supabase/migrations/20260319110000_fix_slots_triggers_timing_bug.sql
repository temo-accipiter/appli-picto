-- ============================================================================
-- Migration : Fix Timing Bug dans les triggers slots (BEFORE → AFTER)
-- ============================================================================
--
-- PROBLÈME (Timing Bug SQL) :
-- Les triggers BEFORE DELETE/UPDATE sur slots appellent reset_active_started_session_for_timeline()
-- qui fait un COUNT(*) FROM slots WHERE card_id IS NOT NULL.
--
-- Conséquence :
-- - BEFORE DELETE : COUNT(*) lit la table AVANT suppression → snapshot = N (devrait être N-1)
-- - BEFORE UPDATE : COUNT(*) lit OLD.card_id AVANT mutation → snapshot décalé de 1
--
-- SYMPTÔMES QA :
-- 1. Ajouter 3ème carte alors que j'en ai 2 → snapshot DB = 2 (au lieu de 3)
-- 2. Retirer 3ème carte pour n'en avoir que 2 → snapshot DB = 3 (session impossible à finir)
--
-- SOLUTION :
-- Séparer les Guards (RAISE EXCEPTION) des Side Effects (epoch++, snapshot recalcul).
-- - BEFORE triggers : Guards uniquement (bloquer actions interdites)
-- - AFTER triggers : Side effects uniquement (epoch++, COUNT(*) après mutation)
--
-- CONTRAT :
-- Les règles de blocage (slot validé non modifiable) restent strictement identiques.
-- Seul le timing d'appel de reset_active_started_session_for_timeline() change.
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. Nouvelle fonction GUARD (BEFORE) : Bloque modifications interdites
-- ============================================================
CREATE OR REPLACE FUNCTION slots_guard_validated_on_structural_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_session_id UUID;
  v_is_validated BOOLEAN;
BEGIN
  -- On ne s'intéresse qu'aux slots Étape
  IF (TG_OP = 'DELETE' AND OLD.kind <> 'step')
     OR (TG_OP IN ('UPDATE','INSERT') AND NEW.kind <> 'step') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Session active_started ?
  SELECT s.id INTO v_active_session_id
  FROM sessions s
  WHERE s.timeline_id = COALESCE(NEW.timeline_id, OLD.timeline_id)
    AND s.state = 'active_started'
  LIMIT 1;

  IF v_active_session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- GUARD DELETE : Bloquer suppression slot validé
  IF TG_OP = 'DELETE' THEN
    SELECT EXISTS (
      SELECT 1 FROM session_validations sv
      WHERE sv.session_id = v_active_session_id
        AND sv.slot_id = OLD.id
    ) INTO v_is_validated;

    IF v_is_validated THEN
      RAISE EXCEPTION
        'Action interdite: suppression d''un slot étape déjà validé (slot_id=%) pendant une session démarrée',
        OLD.id;
    END IF;

    RETURN OLD;
  END IF;

  -- GUARD UPDATE : Bloquer modification slot validé
  IF TG_OP = 'UPDATE' THEN
    SELECT EXISTS (
      SELECT 1 FROM session_validations sv
      WHERE sv.session_id = v_active_session_id
        AND sv.slot_id = OLD.id
    ) INTO v_is_validated;

    IF v_is_validated THEN
      IF NEW.position IS DISTINCT FROM OLD.position
         OR NEW.card_id IS DISTINCT FROM OLD.card_id
         OR NEW.tokens IS DISTINCT FROM OLD.tokens
         OR NEW.kind IS DISTINCT FROM OLD.kind THEN
        RAISE EXCEPTION
          'Action interdite: modification d''un slot étape déjà validé (slot_id=%) pendant une session démarrée',
          OLD.id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- INSERT : Pas de guard (toujours autorisé)
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION slots_guard_validated_on_structural_change() IS
  'BEFORE trigger GUARD : Bloque modifications/suppressions de slots validés pendant active_started';

-- ============================================================
-- 2. Nouvelle fonction SIDE EFFECT (AFTER) : Epoch++ et snapshot recalcul
-- ============================================================
CREATE OR REPLACE FUNCTION slots_trigger_epoch_increment_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_session_id UUID;
  v_affects_steps_count BOOLEAN;
BEGIN
  -- On ne s'intéresse qu'aux slots Étape
  IF (TG_OP = 'DELETE' AND OLD.kind <> 'step')
     OR (TG_OP IN ('UPDATE','INSERT') AND NEW.kind <> 'step') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Session active_started ?
  SELECT s.id INTO v_active_session_id
  FROM sessions s
  WHERE s.timeline_id = COALESCE(NEW.timeline_id, OLD.timeline_id)
    AND s.state = 'active_started'
  LIMIT 1;

  IF v_active_session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- AFTER DELETE : Suppression d'un slot step (non validé car guard a déjà bloqué si validé)
  IF TG_OP = 'DELETE' THEN
    -- Si le slot supprimé avait une card_id, cela impacte le COUNT(*)
    IF OLD.card_id IS NOT NULL THEN
      PERFORM reset_active_started_session_for_timeline(OLD.timeline_id, 'delete_step_slot');
    END IF;
    RETURN OLD;
  END IF;

  -- AFTER UPDATE : Mutation card_id (NULL ↔ NOT NULL) ou kind
  IF TG_OP = 'UPDATE' THEN
    v_affects_steps_count :=
      (OLD.card_id IS NULL) IS DISTINCT FROM (NEW.card_id IS NULL)
      OR (NEW.kind IS DISTINCT FROM OLD.kind);

    IF v_affects_steps_count THEN
      PERFORM reset_active_started_session_for_timeline(NEW.timeline_id, 'update_step_slot_affects_count');
    END IF;

    RETURN NEW;
  END IF;

  -- AFTER INSERT : Ajout slot step avec card_id non vide
  IF TG_OP = 'INSERT' THEN
    IF NEW.card_id IS NOT NULL THEN
      PERFORM reset_active_started_session_for_timeline(NEW.timeline_id, 'insert_nonempty_step_slot');
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION slots_trigger_epoch_increment_after_change() IS
  'AFTER trigger SIDE EFFECT : Epoch++ et recalcul snapshot APRÈS mutation (fix timing bug)';

-- ============================================================
-- 3. DROP anciens triggers
-- ============================================================
DROP TRIGGER IF EXISTS trigger_slots_before_delete_guard_reset ON slots;
DROP TRIGGER IF EXISTS trigger_slots_before_update_guard_reset ON slots;
DROP TRIGGER IF EXISTS trigger_slots_after_insert_guard_reset ON slots;

-- ============================================================
-- 4. Créer nouveaux triggers BEFORE (Guards)
-- ============================================================
CREATE TRIGGER trigger_slots_before_delete_guard
  BEFORE DELETE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_guard_validated_on_structural_change();

CREATE TRIGGER trigger_slots_before_update_guard
  BEFORE UPDATE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_guard_validated_on_structural_change();

CREATE TRIGGER trigger_slots_before_insert_guard
  BEFORE INSERT ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_guard_validated_on_structural_change();

-- ============================================================
-- 5. Créer nouveaux triggers AFTER (Side Effects)
-- ============================================================
CREATE TRIGGER trigger_slots_after_delete_epoch
  AFTER DELETE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_trigger_epoch_increment_after_change();

CREATE TRIGGER trigger_slots_after_update_epoch
  AFTER UPDATE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_trigger_epoch_increment_after_change();

CREATE TRIGGER trigger_slots_after_insert_epoch
  AFTER INSERT ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_trigger_epoch_increment_after_change();

COMMIT;

-- ============================================================================
-- Ce que cette migration corrige :
-- - ✅ Timing Bug : COUNT(*) exécuté APRÈS mutation (snapshot correct)
-- - ✅ Guards préservés : Slots validés toujours protégés (BEFORE)
-- - ✅ Snapshot synchrone : Ajouter 3ème carte → snapshot = 3 (pas 2)
-- - ✅ Snapshot synchrone : Retirer carte → snapshot = N-1 (pas N)
-- - ✅ Contrat produit respecté : Aucune régression sur règles de blocage
-- ============================================================================
