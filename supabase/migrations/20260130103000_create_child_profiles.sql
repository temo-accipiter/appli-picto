-- Migration: Phase 2.3 — Table child_profiles
-- Description: Profils enfants avec statut verrouillage (downgrade) et ancienneté
-- Date: 2026-01-30

-- Table: child_profiles
-- Représentation enfants accompagnés avec statut actif/verrouillé (downgrade Abonné→Free)
CREATE TABLE child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status child_profile_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherches par compte
CREATE INDEX idx_child_profiles_account_id ON child_profiles(account_id);

-- Index pour tri par ancienneté (utilisé lors downgrade pour déterminer profil actif)
CREATE INDEX idx_child_profiles_created_at ON child_profiles(account_id, created_at);

-- Commentaires
COMMENT ON TABLE child_profiles IS 'Profils enfants avec statut verrouillage (downgrade) et ancienneté';
COMMENT ON COLUMN child_profiles.account_id IS 'FK accounts, CASCADE DELETE si suppression compte';
COMMENT ON COLUMN child_profiles.name IS 'Nom affiché du profil enfant';
COMMENT ON COLUMN child_profiles.status IS 'Statut: active (accessible) ou locked (lecture seule après downgrade)';
COMMENT ON COLUMN child_profiles.created_at IS 'Utilisé pour ancienneté (profil le plus ancien = actif lors downgrade Free)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Table child_profiles avec statut active/locked (gestion downgrade Abonné→Free)
-- - created_at utilisé pour ancienneté (profil le plus ancien reste actif lors downgrade)
-- - 1 compte → 0..n profils enfants (quota: 1 Free, 3 Abonné, ∞ Admin)
-- ============================================================
