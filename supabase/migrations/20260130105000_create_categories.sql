-- Migration: Phase 3.2 — Table categories
-- Description: Catégories personnelles avec "Sans catégorie" système
-- Date: 2026-01-30

-- Table: categories
-- Catégories personnelles pour organiser bibliothèque cartes (toujours par utilisateur)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: pas de doublons nom par utilisateur
  CONSTRAINT unique_category_name_per_user UNIQUE (account_id, name)
);

-- Index pour recherches catégories par compte
CREATE INDEX idx_categories_account_id ON categories(account_id);

-- Index pour catégorie système "Sans catégorie" (utilisée comme fallback)
CREATE INDEX idx_categories_system ON categories(account_id, is_system) WHERE is_system = TRUE;

-- Commentaires
COMMENT ON TABLE categories IS 'Catégories personnelles utilisateur avec "Sans catégorie" système (fallback)';
COMMENT ON COLUMN categories.account_id IS 'FK accounts, CASCADE DELETE si suppression compte';
COMMENT ON COLUMN categories.name IS 'Nom catégorie (UNIQUE par utilisateur)';
COMMENT ON COLUMN categories.is_system IS 'TRUE = catégorie système "Sans catégorie" (non supprimable, non modifiable)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Table categories (personnelles, pas de catégories globales)
-- - UNIQUE (account_id, name): pas de doublons nom par utilisateur
-- - is_system TRUE = "Sans catégorie" (créée auto via trigger ou fallback applicatif)
-- ============================================================
