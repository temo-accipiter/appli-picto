-- Migration: Phase 4.1 — Table timelines
-- Description: Structure timeline par profil enfant (1:1)
-- Date: 2026-01-30

-- Table: timelines
-- Une timeline unique par profil enfant pour organiser les activités
CREATE TABLE timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: 1 timeline unique par profil enfant (1:1 strict)
  CONSTRAINT unique_timeline_per_profile UNIQUE (child_profile_id)
);

-- Index pour recherches timeline par profil enfant
CREATE INDEX idx_timelines_child_profile_id ON timelines(child_profile_id);

-- Commentaires
COMMENT ON TABLE timelines IS 'Structure timeline par profil enfant (1:1 strict)';
COMMENT ON COLUMN timelines.id IS 'PK UUID (génération auto via gen_random_uuid)';
COMMENT ON COLUMN timelines.child_profile_id IS 'FK child_profiles, CASCADE DELETE, UNIQUE (1 timeline par profil)';
COMMENT ON CONSTRAINT unique_timeline_per_profile ON timelines IS 'Garantit 1 timeline unique par profil enfant (1:1)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Table timelines avec relation 1:1 vers child_profiles
-- - UNIQUE(child_profile_id): garantit qu'un profil enfant a exactement 1 timeline
-- - CASCADE DELETE: suppression profil → suppression timeline
-- ============================================================

-- Vérifications (manuel):
-- 1. Création d'une timeline pour un child_profile (OK)
--    INSERT INTO timelines (child_profile_id) VALUES ('<uuid_profil>');
-- 2. Création d'une 2e timeline pour le même child_profile (DOIT échouer UNIQUE)
--    INSERT INTO timelines (child_profile_id) VALUES ('<uuid_profil>');
-- 3. Suppression d'un child_profile cascade sur sa timeline (OK)
--    DELETE FROM child_profiles WHERE id = '<uuid_profil>';
-- 4. SELECT COUNT(*) FROM timelines WHERE child_profile_id = '<uuid>' retourne 0 ou 1 (jamais >1)
