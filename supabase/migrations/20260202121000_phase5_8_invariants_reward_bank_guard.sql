-- Migration: Phase 5.8 — Invariants DB (reward unique + bank delete guard)
-- Date: 2026-02-02
--
-- Objectifs:
-- A) Garantir exactement 1 slot Récompense par timeline
--    - UNIQUE (timeline_id) WHERE kind='reward'
--    - Interdire contournements via UPDATE/INSERT
--    - Stopper si données existantes "sales"
-- B) Interdire suppression d'une carte bank si référencée (slots ou pivot)

BEGIN;

-- ============================================================
-- A) Slots: 1 seul reward par timeline (STOP si données sales)
-- ============================================================
DO $$
DECLARE
  v_count INTEGER;
  v_list TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT timeline_id
    FROM slots
    WHERE kind = 'reward'
    GROUP BY timeline_id
    HAVING COUNT(*) > 1
  ) t;

  IF v_count > 0 THEN
    SELECT string_agg(timeline_id::text, ', ' ORDER BY timeline_id::text)
      INTO v_list
    FROM (
      SELECT timeline_id
      FROM slots
      WHERE kind = 'reward'
      GROUP BY timeline_id
      HAVING COUNT(*) > 1
      ORDER BY timeline_id
      LIMIT 20
    ) s;

    RAISE EXCEPTION
      'Invariant violation: % timeline(s) have multiple reward slots. Sample timeline_id(s): %',
      v_count, COALESCE(v_list, '<none>');
  END IF;
END $$;

-- Unicité: au plus 1 reward par timeline
CREATE UNIQUE INDEX IF NOT EXISTS slots_one_reward_per_timeline
  ON slots (timeline_id)
  WHERE kind = 'reward';

-- Gardes: empêcher contournements via INSERT/UPDATE
CREATE OR REPLACE FUNCTION slots_enforce_single_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'reward' THEN
      SELECT EXISTS (
        SELECT 1
        FROM slots
        WHERE timeline_id = NEW.timeline_id
          AND kind = 'reward'
      ) INTO v_exists;

      IF v_exists THEN
        RAISE EXCEPTION
          'Invariant violation: timeline % already has a reward slot',
          NEW.timeline_id
          USING HINT = 'Only one reward slot is allowed per timeline';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Un reward existant ne peut pas changer de kind ni de timeline
    IF OLD.kind = 'reward' THEN
      IF NEW.kind <> 'reward' THEN
        RAISE EXCEPTION
          'Invariant violation: reward slot cannot change kind (slot_id=%)',
          OLD.id;
      END IF;

      IF NEW.timeline_id <> OLD.timeline_id THEN
        RAISE EXCEPTION
          'Invariant violation: reward slot cannot change timeline_id (slot_id=%)',
          OLD.id;
      END IF;
      RETURN NEW;
    END IF;

    -- Un step ne peut pas devenir reward si un reward existe déjà
    IF NEW.kind = 'reward' THEN
      SELECT EXISTS (
        SELECT 1
        FROM slots
        WHERE timeline_id = NEW.timeline_id
          AND kind = 'reward'
          AND id <> NEW.id
      ) INTO v_exists;

      IF v_exists THEN
        RAISE EXCEPTION
          'Invariant violation: timeline % already has a reward slot',
          NEW.timeline_id
          USING HINT = 'A step cannot be converted to reward when reward already exists';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_slots_enforce_single_reward ON slots;

CREATE TRIGGER trigger_slots_enforce_single_reward
  BEFORE INSERT OR UPDATE OF kind, timeline_id
  ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_enforce_single_reward();

COMMENT ON FUNCTION slots_enforce_single_reward() IS
  'Invariant DB: exactly one reward slot per timeline (unique index + guard on kind/timeline_id updates)';

-- ============================================================
-- B) Cards: interdire suppression bank si référencée
-- ============================================================
CREATE OR REPLACE FUNCTION cards_prevent_delete_bank_if_referenced()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_slot BOOLEAN;
  v_has_pivot BOOLEAN;
BEGIN
  IF OLD.type <> 'bank' THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM slots WHERE card_id = OLD.id
  ) INTO v_has_slot;

  SELECT EXISTS (
    SELECT 1 FROM user_card_categories WHERE card_id = OLD.id
  ) INTO v_has_pivot;

  IF v_has_slot OR v_has_pivot THEN
    RAISE EXCEPTION
      'Cannot delete bank card %: still referenced (slots=% , categories=%)',
      OLD.id, v_has_slot, v_has_pivot
      USING HINT = 'Unpublish the bank card instead of deleting while referenced';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cards_prevent_delete_bank_if_referenced ON cards;

CREATE TRIGGER trigger_cards_prevent_delete_bank_if_referenced
  BEFORE DELETE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION cards_prevent_delete_bank_if_referenced();

COMMENT ON FUNCTION cards_prevent_delete_bank_if_referenced() IS
  'Blocks deletion of bank cards while referenced in slots or user_card_categories';

COMMIT;
