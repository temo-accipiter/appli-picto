-- Migration: Phase 6.3 — Invariants DB (séquences)
-- Date: 2026-02-02
--
-- Invariants implémentés ici (DB-first strict):
-- A) Minimum 2 étapes par séquence (STRICT, commit-safe):
--    - Toute transaction qui laisserait une séquence existante avec <2 steps échoue (RAISE EXCEPTION).
--    - Aucune auto-suppression silencieuse de séquence.
-- B) Ownership guard (cross-account) sans RLS:
--    - Les cartes personal ne peuvent être référencées que par leur compte propriétaire.
--    - Les cartes bank sont autorisées (account_id NULL).
-- C) Durcissement guard suppression cartes bank:
--    - Interdire suppression d'une carte bank si référencée (slots, pivots, séquences).

BEGIN;

-- ============================================================
-- A) Minimum 2 steps STRICT (commit-safe)
-- ============================================================

CREATE OR REPLACE FUNCTION sequences_enforce_min_two_steps(p_sequence_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_sequence_id IS NULL THEN
    RETURN;
  END IF;

  -- Si la séquence n'existe plus (DELETE explicite ou cascade mother), aucune contrainte.
  PERFORM 1 FROM sequences s WHERE s.id = p_sequence_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM sequence_steps ss
  WHERE ss.sequence_id = p_sequence_id;

  IF v_count < 2 THEN
    RAISE EXCEPTION
      'Invariant violation: sequence % must have at least 2 steps (current=%)',
      p_sequence_id, v_count
      USING HINT = 'Add steps in the same transaction, or delete the sequence explicitly.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_sequences_min_two_steps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'sequences' THEN
    -- Insert d'une séquence: doit avoir >=2 steps au commit (steps peuvent être ajoutés dans la même transaction)
    PERFORM sequences_enforce_min_two_steps(NEW.id);
    RETURN NULL;
  END IF;

  -- sequence_steps
  IF TG_OP = 'INSERT' THEN
    PERFORM sequences_enforce_min_two_steps(NEW.sequence_id);
    RETURN NULL;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM sequences_enforce_min_two_steps(OLD.sequence_id);
    RETURN NULL;
  ELSE
    -- UPDATE: vérifier OLD et NEW (si move entre séquences)
    PERFORM sequences_enforce_min_two_steps(OLD.sequence_id);
    PERFORM sequences_enforce_min_two_steps(NEW.sequence_id);
    RETURN NULL;
  END IF;
END;
$$;

-- Constraint triggers deferrable pour validation en fin de transaction
DROP TRIGGER IF EXISTS trigger_sequences_min_two_steps ON sequences;
CREATE CONSTRAINT TRIGGER trigger_sequences_min_two_steps
  AFTER INSERT ON sequences
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sequences_min_two_steps();

DROP TRIGGER IF EXISTS trigger_sequence_steps_min_two_steps ON sequence_steps;
CREATE CONSTRAINT TRIGGER trigger_sequence_steps_min_two_steps
  AFTER INSERT OR UPDATE OR DELETE ON sequence_steps
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sequences_min_two_steps();

COMMENT ON FUNCTION sequences_enforce_min_two_steps(UUID) IS
  'Invariant DB: a sequence must have >= 2 steps (strict, commit-safe, no auto-delete).';

-- ============================================================
-- B) Ownership guards (cross-account) — no RLS in this phase
-- Rules derived from cards schema:
-- - bank cards: cards.type = ''bank'' and cards.account_id IS NULL (allowed for any account)
-- - personal cards: cards.type = ''personal'' and cards.account_id IS NOT NULL (must match owner)
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_sequences_mother_card_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_card_type card_type;
  v_card_owner UUID;
BEGIN
  SELECT c.type, c.account_id
    INTO v_card_type, v_card_owner
  FROM cards c
  WHERE c.id = NEW.mother_card_id;

  IF v_card_type IS NULL THEN
    RAISE EXCEPTION 'Sequence invalid: mother_card_id % not found', NEW.mother_card_id;
  END IF;

  -- bank allowed
  IF v_card_type = 'bank' THEN
    RETURN NEW;
  END IF;

  -- personal must match account
  IF v_card_owner <> NEW.account_id THEN
    RAISE EXCEPTION
      'Sequence invalid: personal mother_card_id % belongs to %, not account_id %',
      NEW.mother_card_id, v_card_owner, NEW.account_id
      USING HINT = 'Personal cards can only be used by their owner account';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sequences_mother_card_ownership ON sequences;
CREATE TRIGGER trigger_sequences_mother_card_ownership
  BEFORE INSERT OR UPDATE OF account_id, mother_card_id ON sequences
  FOR EACH ROW
  EXECUTE FUNCTION enforce_sequences_mother_card_ownership();

COMMENT ON FUNCTION enforce_sequences_mother_card_ownership() IS
  'Ownership guard: personal mother_card_id must belong to sequences.account_id (bank allowed).';

CREATE OR REPLACE FUNCTION enforce_sequence_steps_card_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_card_type card_type;
  v_card_owner UUID;
  v_sequence_account UUID;
BEGIN
  SELECT c.type, c.account_id
    INTO v_card_type, v_card_owner
  FROM cards c
  WHERE c.id = NEW.step_card_id;

  IF v_card_type IS NULL THEN
    RAISE EXCEPTION 'Sequence step invalid: step_card_id % not found', NEW.step_card_id;
  END IF;

  -- bank allowed
  IF v_card_type = 'bank' THEN
    RETURN NEW;
  END IF;

  SELECT s.account_id
    INTO v_sequence_account
  FROM sequences s
  WHERE s.id = NEW.sequence_id;

  IF v_sequence_account IS NULL THEN
    RAISE EXCEPTION 'Sequence step invalid: sequence_id % not found', NEW.sequence_id;
  END IF;

  IF v_card_owner <> v_sequence_account THEN
    RAISE EXCEPTION
      'Sequence step invalid: personal step_card_id % belongs to %, sequence belongs to %',
      NEW.step_card_id, v_card_owner, v_sequence_account
      USING HINT = 'Personal cards can only be used within sequences of the owner account';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sequence_steps_card_ownership ON sequence_steps;
CREATE TRIGGER trigger_sequence_steps_card_ownership
  BEFORE INSERT OR UPDATE OF sequence_id, step_card_id ON sequence_steps
  FOR EACH ROW
  EXECUTE FUNCTION enforce_sequence_steps_card_ownership();

COMMENT ON FUNCTION enforce_sequence_steps_card_ownership() IS
  'Ownership guard: personal step_card_id must belong to sequences.account_id (bank allowed).';

-- ============================================================
-- C) Extend bank-card delete guard to include sequences
-- (Bug-critical once Phase 6 exists: a bank card can be referenced by sequences/steps)
-- ============================================================

CREATE OR REPLACE FUNCTION cards_prevent_delete_bank_if_referenced()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_slot BOOLEAN;
  v_has_pivot BOOLEAN;
  v_has_seq_mother BOOLEAN;
  v_has_seq_step BOOLEAN;
BEGIN
  IF OLD.type <> 'bank' THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (SELECT 1 FROM slots WHERE card_id = OLD.id)
    INTO v_has_slot;

  SELECT EXISTS (SELECT 1 FROM user_card_categories WHERE card_id = OLD.id)
    INTO v_has_pivot;

  SELECT EXISTS (SELECT 1 FROM sequences WHERE mother_card_id = OLD.id)
    INTO v_has_seq_mother;

  SELECT EXISTS (SELECT 1 FROM sequence_steps WHERE step_card_id = OLD.id)
    INTO v_has_seq_step;

  IF v_has_slot OR v_has_pivot OR v_has_seq_mother OR v_has_seq_step THEN
    RAISE EXCEPTION
      'Cannot delete bank card %: still referenced (slots=% , categories=% , seq_mother=% , seq_steps=%)',
      OLD.id, v_has_slot, v_has_pivot, v_has_seq_mother, v_has_seq_step
      USING HINT = 'Unpublish the bank card instead of deleting while referenced';
  END IF;

  RETURN OLD;
END;
$$;

-- Re-attach trigger (safe even if already attached)
DROP TRIGGER IF EXISTS trigger_cards_prevent_delete_bank_if_referenced ON cards;
CREATE TRIGGER trigger_cards_prevent_delete_bank_if_referenced
  BEFORE DELETE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION cards_prevent_delete_bank_if_referenced();

COMMENT ON FUNCTION cards_prevent_delete_bank_if_referenced() IS
  'Blocks deletion of bank cards while referenced (slots, user_card_categories, sequences, sequence_steps).';

COMMIT;

-- ============================================================
-- Smoke tests SQL (manuel)
-- ============================================================
-- 0) Setup: BEGIN; SAVEPOINT s; ...; ROLLBACK TO SAVEPOINT s; ROLLBACK;

-- 1) unique(account_id, mother_card_id) refuse doublon
-- INSERT INTO sequences (account_id, mother_card_id) VALUES ('<a1>', '<c1>');
-- INSERT INTO sequences (account_id, mother_card_id) VALUES ('<a1>', '<c1>'); -- DOIT échouer

-- 2) duplicate step_card refuse
-- INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES ('<s1>', '<c2>', 0);
-- INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES ('<s1>', '<c2>', 1); -- DOIT échouer

-- 3) reorder transactionnel (swap positions) passe grâce à DEFERRABLE
-- BEGIN;
-- UPDATE sequence_steps SET position = 1 WHERE sequence_id = '<s1>' AND position = 0;
-- UPDATE sequence_steps SET position = 0 WHERE sequence_id = '<s1>' AND position = 1;
-- COMMIT; -- DOIT passer

-- 4) min 2 steps STRICT (commit-safe)
-- BEGIN;
-- INSERT INTO sequences (account_id, mother_card_id) VALUES ('<a1>', '<c1>') RETURNING id; -- => <s1>
-- INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES ('<s1>', '<c2>', 0);
-- COMMIT; -- DOIT échouer (séquence < 2 steps)

-- 5) suppression d’une étape quand COUNT=2
-- BEGIN;
-- -- suppose <s1> a exactement 2 steps
-- DELETE FROM sequence_steps WHERE sequence_id = '<s1>' AND position = 0;
-- COMMIT; -- DOIT échouer (passerait à 1)

-- 6) step = mother autorisé
-- BEGIN;
-- INSERT INTO sequences (account_id, mother_card_id) VALUES ('<a1>', '<c1>') RETURNING id; -- <s1>
-- INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES ('<s1>', '<c1>', 0);
-- INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES ('<s1>', '<c2>', 1);
-- COMMIT; -- DOIT passer

-- 7) ownership guard
-- -- cross-account personal (DOIT échouer)
-- INSERT INTO sequences (account_id, mother_card_id) VALUES ('<a1>', '<personal_card_of_a2>');
-- -- bank autorisé
-- INSERT INTO sequences (account_id, mother_card_id) VALUES ('<a1>', '<bank_card>');
-- INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES ('<s1>', '<bank_card>', 0);

-- 8) delete step_card cascade + min2 strict
-- BEGIN;
-- -- suppose <c2> est step dans une séquence qui n'a que 2 steps
-- DELETE FROM cards WHERE id = '<c2>';
-- COMMIT; -- DOIT échouer (cascade ferait tomber <2)
