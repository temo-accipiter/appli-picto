-- Migration: Phase 2.2 — Table devices
-- Description: Multi-appareils avec révocation non-destructive
-- Date: 2026-01-30

-- Table: devices
-- Gestion multi-appareils avec révocation manuelle (Page Profil)
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID UNIQUE NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherches par compte
CREATE INDEX idx_devices_account_id ON devices(account_id);

-- Index pour recherches devices actifs (quota)
CREATE INDEX idx_devices_active ON devices(account_id) WHERE revoked_at IS NULL;

-- Commentaires
COMMENT ON TABLE devices IS 'Gestion multi-appareils avec révocation non-destructive (revoked_at)';
COMMENT ON COLUMN devices.device_id IS 'UUID généré côté client au premier usage, UNIQUE';
COMMENT ON COLUMN devices.account_id IS 'FK accounts (NOT NULL), CASCADE DELETE (pas de devices orphelins)';
COMMENT ON COLUMN devices.revoked_at IS 'Timestamp révocation manuelle (NULL = actif, NOT NULL = révoqué)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Table devices pour multi-appareils avec révocation non-destructive
-- - device_id UNIQUE (généré client), account_id NOT NULL + CASCADE DELETE
-- - revoked_at NULL = actif, utilisé pour calcul quota devices actifs
-- ============================================================
