-- Migration: Phase 3.3 — Table user_card_categories (PIVOT)
-- Description: Lier cartes visibles à catégories par utilisateur (CONTRAT EXPLICITE)
-- Date: 2026-01-30

-- Table: user_card_categories (PIVOT)
-- Association utilisateur ↔ carte ↔ catégorie (UNIQUE: 1 carte = 1 catégorie par user)
CREATE TABLE user_card_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CONTRAT EXPLICITE: 1 carte = 1 catégorie par utilisateur (pas de multi-catégories)
  CONSTRAINT unique_user_card UNIQUE (user_id, card_id)
);

-- Index pour recherches associations par utilisateur
CREATE INDEX idx_user_card_categories_user ON user_card_categories(user_id);

-- Index pour recherches associations par carte
CREATE INDEX idx_user_card_categories_card ON user_card_categories(card_id);

-- Index pour recherches associations par catégorie
CREATE INDEX idx_user_card_categories_category ON user_card_categories(category_id);

-- Commentaires
COMMENT ON TABLE user_card_categories IS 'Pivot utilisateur ↔ carte ↔ catégorie (UNIQUE: 1 carte = 1 catégorie par user)';
COMMENT ON COLUMN user_card_categories.user_id IS 'FK accounts, CASCADE DELETE si suppression compte';
COMMENT ON COLUMN user_card_categories.card_id IS 'FK cards, CASCADE DELETE si suppression carte';
COMMENT ON COLUMN user_card_categories.category_id IS 'FK categories, CASCADE DELETE si suppression catégorie';
COMMENT ON CONSTRAINT unique_user_card ON user_card_categories IS 'CONTRAT EXPLICITE: 1 carte = 1 catégorie par utilisateur (pas de multi-catégories)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Table pivot user_card_categories avec UNIQUE (user_id, card_id)
-- - Garantit qu'une carte a toujours 1 catégorie max par utilisateur
-- - Fallback applicatif: si aucune ligne pour (user_id, card_id) → "Sans catégorie" côté front
-- ============================================================
