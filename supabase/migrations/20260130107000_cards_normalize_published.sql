-- Migration: Correction 1 — Normalisation cards.published
-- Description: Garantir cohérence published selon type carte (bank vs personal)
-- Date: 2026-01-30

-- Fonction trigger: Normaliser published selon type carte
CREATE OR REPLACE FUNCTION cards_normalize_published()
RETURNS TRIGGER AS $$
BEGIN
  -- Si carte banque: published ne peut pas être NULL, défaut FALSE
  IF NEW.type = 'bank' THEN
    IF NEW.published IS NULL THEN
      NEW.published := FALSE;
    END IF;

  -- Si carte personnelle: published doit toujours être NULL (non applicable)
  ELSIF NEW.type = 'personal' THEN
    NEW.published := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Appliquer normalisation BEFORE INSERT OR UPDATE
CREATE TRIGGER trigger_cards_normalize_published
  BEFORE INSERT OR UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION cards_normalize_published();

-- Commentaire
COMMENT ON FUNCTION cards_normalize_published() IS 'Normalise published selon type: bank → défaut FALSE si NULL, personal → force NULL';

-- ============================================================
-- Intent:
-- - Garantir cohérence cards.published: type='bank' → published NOT NULL (défaut FALSE), type='personal' → published NULL
-- - Éviter inserts invalides (bank sans published explicite)
-- - Renforce le contrat: published uniquement applicable aux cartes banque (Admin)
-- ============================================================
