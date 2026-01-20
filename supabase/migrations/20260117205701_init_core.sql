-- ============================================================================
-- Migration 001 : init_core
-- ============================================================================
-- Perimetre : Table profiles uniquement (source unique verite utilisateurs)
-- Pas de RLS, pas de seed, pas d'autres tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions PostgreSQL
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : auto-update updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Table : profiles
-- ----------------------------------------------------------------------------
-- Source unique verite utilisateurs (lien auth.users)
-- Plan : 'free' (defaut) ou 'subscriber' (abonne actif)
-- is_admin : acces administrateur (bypass quotas/RLS)
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
  -- PK + FK vers auth.users (source verite authentification)
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan utilisateur (Free ou Subscriber)
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'subscriber')),

  -- Statut administrateur (acces illimite)
  is_admin BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Trigger : auto-update updated_at sur modification
-- ----------------------------------------------------------------------------
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- Commentaires table (documentation)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE profiles IS 'Profils utilisateurs - source unique verite (lien auth.users)';
COMMENT ON COLUMN profiles.user_id IS 'PK + FK vers auth.users(id) - identifiant unique utilisateur';
COMMENT ON COLUMN profiles.plan IS 'Plan utilisateur : free (defaut) ou subscriber (abonne actif)';
COMMENT ON COLUMN profiles.is_admin IS 'Administrateur systeme (bypass quotas et permissions)';
COMMENT ON COLUMN profiles.created_at IS 'Date creation profil';
COMMENT ON COLUMN profiles.updated_at IS 'Date derniere modification (auto-update via trigger)';
