-- Migration: Fix trigger cards_prevent_delete_bank_if_referenced
-- Date: 2026-05-20
--
-- Problème : Le trigger bloquait la suppression d'une carte banque si elle était
--   dans user_card_categories (catégorisation par un utilisateur), même si elle
--   n'était utilisée dans aucun slot ni séquence.
--
-- Cause : La vérification de user_card_categories est redondante car :
--   1. La FK user_card_categories.card_id ON DELETE CASCADE supprime automatiquement
--      les mappings lors de la suppression de la carte.
--   2. user_card_categories est une organisation visuelle (cosmétique), pas une
--      utilisation réelle de la carte.
--   3. L'admin n'a pas les droits RLS pour supprimer les mappings des autres
--      utilisateurs avant de supprimer la carte.
--
-- Solution : Retirer la vérification de user_card_categories du trigger.
--   Seuls les slots et sequences (utilisation réelle) restent des blocages valides.

BEGIN;

CREATE OR REPLACE FUNCTION cards_prevent_delete_bank_if_referenced()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_slot       BOOLEAN;
  v_has_seq_mother BOOLEAN;
  v_has_seq_step   BOOLEAN;
BEGIN
  IF OLD.type <> 'bank' THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (SELECT 1 FROM slots WHERE card_id = OLD.id)
    INTO v_has_slot;

  SELECT EXISTS (SELECT 1 FROM sequences WHERE mother_card_id = OLD.id)
    INTO v_has_seq_mother;

  SELECT EXISTS (SELECT 1 FROM sequence_steps WHERE step_card_id = OLD.id)
    INTO v_has_seq_step;

  IF v_has_slot OR v_has_seq_mother OR v_has_seq_step THEN
    RAISE EXCEPTION
      'Cannot delete bank card %: still referenced (slots=% , seq_mother=% , seq_steps=%)',
      OLD.id, v_has_slot, v_has_seq_mother, v_has_seq_step
      USING HINT = 'Unpublish the bank card instead of deleting while referenced in slots or sequences';
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION cards_prevent_delete_bank_if_referenced() IS
  'Blocks deletion of bank cards while referenced in slots or sequences. Note: user_card_categories is excluded — FK CASCADE handles cleanup automatically.';

COMMIT;
