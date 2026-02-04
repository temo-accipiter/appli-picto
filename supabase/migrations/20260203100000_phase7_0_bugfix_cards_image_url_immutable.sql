-- Migration: Phase 7.0 — Bugfix: immutabilité cards.image_url pour type='personal'
-- Date: 2026-02-03
--
-- Objectif:
-- Enforce DB_BLUEPRINT.md invariant #18: "Image figée après création (personal)"
-- PRODUCT_MODEL.md décision D1: "Once a personal card is created, its image_url cannot be updated"
--
-- Tables affectées: cards
--
-- Invariant enforced:
-- - UPDATE cards.image_url interdit si type='personal'
-- - Raison: "Replace image" = delete card + create new one (PRODUCT_MODEL.md)
--
-- Smoke test: voir supabase/tests/phase7_0_smoke_test.sql

BEGIN;

-- ============================================================
-- Fonction: empêcher UPDATE image_url sur cartes personnelles
-- ============================================================
CREATE OR REPLACE FUNCTION cards_prevent_update_image_url_personal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si type='personal' ET image_url a changé
  IF OLD.type = 'personal' AND NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    RAISE EXCEPTION
      'Invariant violation: cannot update image_url for personal card (card_id=%)',
      OLD.id
      USING HINT = 'To replace image, delete the card and create a new one';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Trigger: bloquer UPDATE image_url si personal
-- ============================================================
DROP TRIGGER IF EXISTS trigger_cards_prevent_update_image_url_personal ON cards;

CREATE TRIGGER trigger_cards_prevent_update_image_url_personal
  BEFORE UPDATE OF image_url
  ON cards
  FOR EACH ROW
  EXECUTE FUNCTION cards_prevent_update_image_url_personal();

COMMENT ON FUNCTION cards_prevent_update_image_url_personal() IS
  'Invariant DB: personal card image_url is immutable after creation (DB_BLUEPRINT.md #18, PRODUCT_MODEL.md D1)';

COMMIT;
