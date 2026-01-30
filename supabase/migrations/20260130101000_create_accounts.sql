-- Migration: Phase 2.1 — Table accounts
-- Description: Extension auth.users avec données métier utilisateur
-- Date: 2026-01-30

-- Table: accounts
-- Extension de auth.users (Supabase Auth) avec métier applicatif
CREATE TABLE accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status account_status NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherches par statut
CREATE INDEX idx_accounts_status ON accounts(status);

-- Commentaires
COMMENT ON TABLE accounts IS 'Extension auth.users avec statut utilisateur et timezone pour quotas mensuels';
COMMENT ON COLUMN accounts.id IS 'PK = auth.users.id (UUID), CASCADE DELETE avec auth';
COMMENT ON COLUMN accounts.status IS 'Statut fonctionnel: free, subscriber, admin (Visitor n''existe PAS en DB)';
COMMENT ON COLUMN accounts.timezone IS 'Timezone IANA pour calcul début mois quota mensuel (défaut Europe/Paris)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Table accounts (extension auth.users) avec statut + timezone
-- - PK = auth.users.id, CASCADE DELETE si suppression compte auth
-- - Timezone utilisé pour calcul quota mensuel cartes personnelles
-- ============================================================
