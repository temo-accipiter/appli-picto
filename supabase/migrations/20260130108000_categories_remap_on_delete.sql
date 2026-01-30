-- Migration: Correction 2 — Re-mapping catégorie vers "Sans catégorie" lors suppression
-- Description: Empêcher suppression catégorie système + re-mapper cartes vers "Sans catégorie"
-- Date: 2026-01-30

-- Fonction trigger: Protéger suppression + re-mapper vers "Sans catégorie"
CREATE OR REPLACE FUNCTION categories_before_delete_remap_to_system()
RETURNS TRIGGER AS $$
DECLARE
  system_category_id UUID;
BEGIN
  -- Bloquer suppression catégorie système (is_system = TRUE)
  IF OLD.is_system = TRUE THEN
    RAISE EXCEPTION 'Impossible de supprimer la catégorie système "Sans catégorie" (id: %)', OLD.id;
  END IF;

  -- Chercher ou créer la catégorie système "Sans catégorie" pour cet account_id
  SELECT id INTO system_category_id
  FROM categories
  WHERE account_id = OLD.account_id
    AND is_system = TRUE
    AND name = 'Sans catégorie'
  LIMIT 1;

  -- Si "Sans catégorie" n'existe pas pour cet account, la créer
  IF system_category_id IS NULL THEN
    INSERT INTO categories (account_id, name, is_system)
    VALUES (OLD.account_id, 'Sans catégorie', TRUE)
    RETURNING id INTO system_category_id;
  END IF;

  -- Re-mapper toutes les associations carte→catégorie vers "Sans catégorie"
  UPDATE user_card_categories
  SET category_id = system_category_id,
      updated_at = NOW()
  WHERE category_id = OLD.id;

  -- Autoriser la suppression (cartes déjà re-mappées)
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Appliquer protection + re-mapping BEFORE DELETE
CREATE TRIGGER trigger_categories_before_delete_remap
  BEFORE DELETE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION categories_before_delete_remap_to_system();

-- Commentaire
COMMENT ON FUNCTION categories_before_delete_remap_to_system() IS 'Protège "Sans catégorie" + re-mappe cartes vers système avant suppression catégorie personnelle';

-- ============================================================
-- Intent:
-- - Bloquer suppression catégorie système (is_system=TRUE) via RAISE EXCEPTION
-- - Avant suppression catégorie personnelle: créer "Sans catégorie" si absente + re-mapper toutes cartes associées
-- - Garantit qu'aucune carte ne perd son association catégorie (robustesse serveur, pas dépendant front)
-- - Conforme au contrat: catégories personnelles, fallback "Sans catégorie" automatique
-- ============================================================
