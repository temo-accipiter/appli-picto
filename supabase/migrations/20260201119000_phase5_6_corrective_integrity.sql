-- Migration: Phase 5.6 — Correctifs d’intégrité (DB-first)
-- Date: 2026-02-01
--
-- Objectifs (fondés sur ux.md / PRODUCT_MODEL.md / DB_BLUEPRINT.md):
-- 1) Empêcher toute référence cross-compte pour les cartes personnelles (privacy/invariants)
--    - user_card_categories: une carte personal ne peut être catégorisée que par son propriétaire
--    - slots: une carte personal ne peut être placée que dans une timeline du même compte
-- 2) Durcir le fallback "Sans catégorie"
--    - identification par is_system (pas par name)
--    - unicité "1 seule catégorie système par compte"
--    - remap scoped (anti-corruption) + création robuste
-- 3) Garantir cohérence session_started vs modifications structurelles:
--    - si une session active_started existe et qu’une action change le nombre d’étapes comptées,
--      alors on force une Réinitialisation de session (epoch++) (sans dépendre du front).
--    - empêcher toute modification d’un slot déjà validé pendant une session active_started.

BEGIN;

-- ============================================================
-- A) categories : garantir 1 seule catégorie système par compte
-- ============================================================
DROP INDEX IF EXISTS idx_categories_system;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_system
  ON categories (account_id)
  WHERE is_system = TRUE;

COMMENT ON INDEX idx_categories_system IS 'UNIQUE: une seule catégorie système (Sans catégorie) par compte';

-- ============================================================
-- B) categories : remap ON DELETE durci (is_system-only + scoped + concurrent-safe)
-- ============================================================
CREATE OR REPLACE FUNCTION categories_before_delete_remap_to_system()
RETURNS TRIGGER AS $$
DECLARE
  system_category_id UUID;
BEGIN
  -- Bloquer suppression catégorie système
  IF OLD.is_system = TRUE THEN
    RAISE EXCEPTION 'Impossible de supprimer la catégorie système (id: %)', OLD.id;
  END IF;

  -- Récupérer la catégorie système (par is_system uniquement)
  SELECT id INTO system_category_id
  FROM categories
  WHERE account_id = OLD.account_id
    AND is_system = TRUE
  LIMIT 1;

  -- Créer la catégorie système si absente (robuste concurrence)
  IF system_category_id IS NULL THEN
    INSERT INTO categories (account_id, name, is_system)
    VALUES (OLD.account_id, 'Sans catégorie', TRUE)
    ON CONFLICT (account_id, name)
    DO UPDATE SET is_system = TRUE
    RETURNING id INTO system_category_id;

    -- En cas rare où RETURNING ne remonte rien, re-sélectionner
    IF system_category_id IS NULL THEN
      SELECT id INTO system_category_id
      FROM categories
      WHERE account_id = OLD.account_id
        AND is_system = TRUE
      LIMIT 1;
    END IF;
  END IF;

  IF system_category_id IS NULL THEN
    RAISE EXCEPTION 'Catégorie système introuvable/impossible à créer pour account_id=%', OLD.account_id;
  END IF;

  -- Remapper défensivement: uniquement les associations du même compte
  UPDATE user_card_categories
  SET category_id = system_category_id,
      updated_at = NOW()
  WHERE category_id = OLD.id
    AND user_id = OLD.account_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Remplacer le trigger pour pointer vers la fonction durcie
DROP TRIGGER IF EXISTS trigger_categories_before_delete_remap ON categories;

CREATE TRIGGER trigger_categories_before_delete_remap
  BEFORE DELETE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION categories_before_delete_remap_to_system();

COMMENT ON FUNCTION categories_before_delete_remap_to_system() IS
  'Bloque suppression catégorie système + remap scoped vers catégorie système (is_system) avant suppression';

-- ============================================================
-- C) user_card_categories : intégrité ownership (cards personal + categories)
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_user_card_categories_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_card_type card_type;
  v_card_owner UUID;
BEGIN
  -- 1) La catégorie doit appartenir au même compte que user_id
  PERFORM 1
  FROM categories c
  WHERE c.id = NEW.category_id
    AND c.account_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Association invalide: category_id % n''appartient pas à user_id %',
      NEW.category_id, NEW.user_id;
  END IF;

  -- 2) La carte doit exister; si personal, doit appartenir au même user_id
  SELECT c.type, c.account_id
    INTO v_card_type, v_card_owner
  FROM cards c
  WHERE c.id = NEW.card_id;

  IF v_card_type IS NULL THEN
    RAISE EXCEPTION 'Association invalide: card_id % introuvable', NEW.card_id;
  END IF;

  IF v_card_type = 'personal' AND v_card_owner <> NEW.user_id THEN
    RAISE EXCEPTION
      'Association invalide: carte personnelle % appartient à %, pas à user_id %',
      NEW.card_id, v_card_owner, NEW.user_id
      USING HINT = 'Une carte personnelle ne peut être catégorisée que par son propriétaire';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_user_card_categories_integrity ON user_card_categories;

CREATE TRIGGER trigger_user_card_categories_integrity
  BEFORE INSERT OR UPDATE OF user_id, card_id, category_id ON user_card_categories
  FOR EACH ROW
  EXECUTE FUNCTION enforce_user_card_categories_integrity();

COMMENT ON FUNCTION enforce_user_card_categories_integrity() IS
  'Empêche cross-compte sur user_card_categories: catégorie du user + carte personal du user';

-- ============================================================
-- D) slots : intégrité ownership (cards personal ↔ timeline/account)
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_slot_card_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_card_type card_type;
  v_card_owner UUID;
  v_timeline_account UUID;
BEGIN
  -- slot vide autorisé
  IF NEW.card_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer owner de la carte
  SELECT c.type, c.account_id
    INTO v_card_type, v_card_owner
  FROM cards c
  WHERE c.id = NEW.card_id;

  IF v_card_type IS NULL THEN
    RAISE EXCEPTION 'Slot invalide: card_id % introuvable', NEW.card_id;
  END IF;

  -- Si banque: OK
  IF v_card_type = 'bank' THEN
    RETURN NEW;
  END IF;

  -- Si personal: vérifier que la timeline appartient au même compte
  SELECT cp.account_id
    INTO v_timeline_account
  FROM timelines t
  JOIN child_profiles cp ON cp.id = t.child_profile_id
  WHERE t.id = NEW.timeline_id;

  IF v_timeline_account IS NULL THEN
    RAISE EXCEPTION 'Slot invalide: timeline_id % introuvable', NEW.timeline_id;
  END IF;

  IF v_card_owner <> v_timeline_account THEN
    RAISE EXCEPTION
      'Slot invalide: carte personnelle % appartient à %, timeline appartient à %',
      NEW.card_id, v_card_owner, v_timeline_account
      USING HINT = 'Une carte personnelle ne peut être utilisée que dans une timeline du même compte';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_slots_enforce_card_ownership ON slots;

CREATE TRIGGER trigger_slots_enforce_card_ownership
  BEFORE INSERT OR UPDATE OF timeline_id, card_id ON slots
  FOR EACH ROW
  EXECUTE FUNCTION enforce_slot_card_ownership();

COMMENT ON FUNCTION enforce_slot_card_ownership() IS
  'Empêche qu’une carte personal d’un autre compte soit placée dans une timeline (slots.card_id)';

-- ============================================================
-- E) Sessions : reset DB-first sur modifications structurelles après démarrage
-- ============================================================

-- Helper: crée une nouvelle session active_preview epoch++ en clôturant la session active_started.
CREATE OR REPLACE FUNCTION reset_active_started_session_for_timeline(p_timeline_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
  v_child_profile_id UUID;
  v_new_epoch INTEGER;
BEGIN
  -- Verrouiller la session active_started si elle existe (anti race condition)
  SELECT s.id, s.child_profile_id
    INTO v_session_id, v_child_profile_id
  FROM sessions s
  WHERE s.timeline_id = p_timeline_id
    AND s.state = 'active_started'
  LIMIT 1
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  -- Clôturer la session courante (on libère l’unicité "active")
  -- Note: on utilise l’état 'completed' faute d’état contractuel 'aborted'.
  UPDATE sessions
  SET state = 'completed',
      completed_at = COALESCE(completed_at, NOW()),
      updated_at = NOW()
  WHERE id = v_session_id;

  -- Calcul epoch = MAX(epoch historique)+1 (par profil + timeline)
  SELECT COALESCE(MAX(epoch), 0) + 1
    INTO v_new_epoch
  FROM sessions
  WHERE child_profile_id = v_child_profile_id
    AND timeline_id = p_timeline_id;

  -- Nouvelle session en prévisualisation
  INSERT INTO sessions (child_profile_id, timeline_id, state, epoch, created_at, updated_at)
  VALUES (v_child_profile_id, p_timeline_id, 'active_preview', v_new_epoch, NOW(), NOW());

  -- (Optionnel) p_reason ignoré côté DB (pas de colonne dédiée dans le contrat)
END;
$$;

COMMENT ON FUNCTION reset_active_started_session_for_timeline(UUID, TEXT) IS
  'Réinitialise une session active_started (epoch++) lors d’une modification structurelle après démarrage';

-- Empêcher modification/destruction d’un slot déjà validé pendant active_started
CREATE OR REPLACE FUNCTION slots_guard_validated_and_reset_on_structural_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_session_id UUID;
  v_is_validated BOOLEAN;
  v_affects_steps_count BOOLEAN;
BEGIN
  -- On ne s’intéresse qu’aux slots Étape
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

  -- Slot déjà validé dans la session active ?
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

    -- DELETE d'un slot step non validé => impact structure => reset
    PERFORM reset_active_started_session_for_timeline(OLD.timeline_id, 'delete_step_slot');
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT EXISTS (
      SELECT 1 FROM session_validations sv
      WHERE sv.session_id = v_active_session_id
        AND sv.slot_id = OLD.id
    ) INTO v_is_validated;

    -- Verrouillage slot validé: aucune mutation (position, card_id, tokens, kind)
    IF v_is_validated THEN
      IF NEW.position IS DISTINCT FROM OLD.position
         OR NEW.card_id IS DISTINCT FROM OLD.card_id
         OR NEW.tokens IS DISTINCT FROM OLD.tokens
         OR NEW.kind IS DISTINCT FROM OLD.kind THEN
        RAISE EXCEPTION
          'Action interdite: modification d''un slot étape déjà validé (slot_id=%) pendant une session démarrée',
          OLD.id;
      END IF;
      RETURN NEW;
    END IF;

    -- Slot non validé: déterminer si la mutation change le nombre d’étapes "comptées"
    -- (card_id NULL/non-NULL) ou change la nature du slot
    v_affects_steps_count :=
      (OLD.card_id IS NULL) IS DISTINCT FROM (NEW.card_id IS NULL)
      OR (NEW.kind IS DISTINCT FROM OLD.kind);

    IF v_affects_steps_count THEN
      PERFORM reset_active_started_session_for_timeline(NEW.timeline_id, 'update_step_slot_affects_count');
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Ajout d’un slot étape non vide pendant active_started => impact structure => reset
    IF NEW.card_id IS NOT NULL THEN
      PERFORM reset_active_started_session_for_timeline(NEW.timeline_id, 'insert_nonempty_step_slot');
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION slots_guard_validated_and_reset_on_structural_change() IS
  'Pendant active_started: bloque mutations des slots validés + reset epoch++ sur changements structurels';

-- Triggers slots : DELETE/UPDATE (BEFORE) + INSERT (AFTER)
DROP TRIGGER IF EXISTS trigger_slots_before_delete_guard_reset ON slots;
DROP TRIGGER IF EXISTS trigger_slots_before_update_guard_reset ON slots;
DROP TRIGGER IF EXISTS trigger_slots_after_insert_guard_reset ON slots;

CREATE TRIGGER trigger_slots_before_delete_guard_reset
  BEFORE DELETE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_guard_validated_and_reset_on_structural_change();

CREATE TRIGGER trigger_slots_before_update_guard_reset
  BEFORE UPDATE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_guard_validated_and_reset_on_structural_change();

CREATE TRIGGER trigger_slots_after_insert_guard_reset
  AFTER INSERT ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_guard_validated_and_reset_on_structural_change();

COMMIT;
