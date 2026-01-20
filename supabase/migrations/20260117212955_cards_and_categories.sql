-- ============================================================================
-- Migration 002 : cards_and_categories
-- ============================================================================
-- Perimetre : Tables categories + cards (avec ownership)
-- Pas de RLS, pas de seed
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions PostgreSQL
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Table : categories
-- ----------------------------------------------------------------------------
-- Categories de cartes (bank globales + user custom)
-- user_id NULL = categorie bank (visible tous utilisateurs)
-- user_id UUID = categorie user custom (visible createur uniquement)
-- ----------------------------------------------------------------------------
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Affichage et identifiant stable
  label TEXT NOT NULL CHECK (length(trim(label)) > 0 AND length(label) <= 100),
  value TEXT NOT NULL CHECK (value ~ '^[a-z0-9_-]+$' AND length(value) <= 100),

  -- Ownership (NULL = bank, UUID = user custom)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index UNIQUE partiels (bank vs user)
CREATE UNIQUE INDEX categories_bank_value_unique
  ON public.categories(value)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX categories_user_value_unique
  ON public.categories(user_id, value)
  WHERE user_id IS NOT NULL;

-- Index performance (user categories)
CREATE INDEX idx_categories_user
  ON public.categories(user_id)
  WHERE user_id IS NOT NULL;

-- Trigger auto-update updated_at
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- Table : cards
-- ----------------------------------------------------------------------------
-- Cartes atomiques (image + nom)
-- owner_type : 'bank' (globale) ou 'user' (personnalisee)
-- owner_id : NULL si bank, auth.users(id) si user
-- image_path : chemin relatif storage (ex: cards/uuid.webp)
-- ----------------------------------------------------------------------------
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (bank vs user)
  owner_type TEXT NOT NULL CHECK (owner_type IN ('bank', 'user')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contenu carte
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 200),
  image_path TEXT NOT NULL CHECK (length(trim(image_path)) > 0 AND length(image_path) <= 500),

  -- Categorie (nullable, ON DELETE SET NULL si categorie supprimee)
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contrainte ownership coherent
  CONSTRAINT cards_ownership_check CHECK (
    (owner_type = 'bank' AND owner_id IS NULL) OR
    (owner_type = 'user' AND owner_id IS NOT NULL)
  )
);

-- Index performance (queries frequentes)
CREATE INDEX idx_cards_owner ON public.cards(owner_type, owner_id);
CREATE INDEX idx_cards_category ON public.cards(category_id);

-- Trigger auto-update updated_at
CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- Commentaires documentation
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.categories IS 'Categories de cartes (bank globales + user custom)';
COMMENT ON COLUMN public.categories.label IS 'Nom affiche UI (modifiable, max 100 char, trim valide)';
COMMENT ON COLUMN public.categories.value IS 'Slug stable technique (a-z0-9_- uniquement, max 100 char)';
COMMENT ON COLUMN public.categories.user_id IS 'NULL = categorie bank, UUID = categorie user custom (ON DELETE CASCADE)';

COMMENT ON TABLE public.cards IS 'Cartes atomiques (image + nom) - bank ou user';
COMMENT ON COLUMN public.cards.owner_type IS 'Type ownership : bank (globale) ou user (personnalisee)';
COMMENT ON COLUMN public.cards.owner_id IS 'NULL si bank, auth.users(id) si user (ON DELETE CASCADE)';
COMMENT ON COLUMN public.cards.name IS 'Nom carte affiche UI (max 200 char, trim valide)';
COMMENT ON COLUMN public.cards.image_path IS 'Chemin relatif storage (ex: cards/uuid.webp, max 500 char, trim valide)';
COMMENT ON COLUMN public.cards.category_id IS 'Categorie carte (nullable, ON DELETE SET NULL)';
