-- Migration: Phase 3.1 — Table cards
-- Description: Cartes visuelles (banque Admin + personnelles utilisateurs)
-- Date: 2026-01-30

-- Table: cards
-- Cartes visuelles: banque (Admin, publique) ou personnelles (Abonné/Admin, privées)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type card_type NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  published BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: type bank => account_id NULL, type personal => account_id NOT NULL
  CONSTRAINT check_card_ownership CHECK (
    (type = 'bank' AND account_id IS NULL) OR
    (type = 'personal' AND account_id IS NOT NULL)
  ),

  -- Contrainte: published uniquement pour bank (NULL si personal)
  CONSTRAINT check_card_published CHECK (
    (type = 'bank' AND published IS NOT NULL) OR
    (type = 'personal' AND published IS NULL)
  )
);

-- Index pour recherches cartes banque publiées (visibles à tous)
CREATE INDEX idx_cards_bank_published ON cards(type, published) WHERE type = 'bank' AND published = TRUE;

-- Index pour recherches cartes personnelles par compte
CREATE INDEX idx_cards_personal_account ON cards(account_id) WHERE type = 'personal';

-- Index pour calcul quota mensuel (created_at + account_id)
CREATE INDEX idx_cards_quota_monthly ON cards(account_id, created_at) WHERE type = 'personal';

-- Commentaires
COMMENT ON TABLE cards IS 'Cartes visuelles (image + nom): banque (Admin, publique) ou personnelles (Abonné/Admin, privées)';
COMMENT ON COLUMN cards.type IS 'Type: bank (Admin, account_id NULL) ou personal (user, account_id NOT NULL)';
COMMENT ON COLUMN cards.account_id IS 'FK accounts si personal (NULL si bank), CASCADE DELETE';
COMMENT ON COLUMN cards.name IS 'Nom carte (modifiable)';
COMMENT ON COLUMN cards.image_url IS 'URL Supabase Storage (FIGÉE après création si personal)';
COMMENT ON COLUMN cards.published IS 'Banque uniquement: TRUE = visible tous, FALSE = dépubliée (NULL si personal)';
COMMENT ON COLUMN cards.created_at IS 'Utilisé pour quota mensuel cartes personnelles (calcul début mois selon timezone compte)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Table cards avec types bank (Admin, publique) et personal (utilisateur, privée)
-- - Contraintes CHECK garantissent cohérence type/account_id/published
-- - created_at utilisé pour quota mensuel (100 cartes/mois Abonné), image_url figée après création (personal)
-- ============================================================
