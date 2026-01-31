-- Migration: Phase 5.1 — Table sessions (exécution timeline)
-- Description: Sessions d'exécution avec epoch et état (preview/started/completed)
-- Référence: DB_BLUEPRINT.md §2 Table sessions, PRODUCT_MODEL.md Ch.3.9
-- Date: 2026-01-30

-- ============================================================
-- Table: sessions
-- ============================================================
-- But: Gérer l'exécution des timelines avec état et epoch pour sync multi-appareils
-- Invariant: 1 seule session active max par (child_profile_id, timeline_id)
-- Epoch: incrémenté à chaque réinitialisation (reset), progression obsolète si epoch < epoch_courant

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  timeline_id UUID NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,

  -- État de la session
  -- active_preview: session active, 0 validation (Prévisualisation)
  -- active_started: session active, ≥1 validation (Démarrée)
  -- completed: session terminée, toutes étapes validées
  state session_state NOT NULL,

  -- Epoch: version de la session
  -- - Création session = 1
  -- - Réinitialisation = MAX(epoch) + 1
  -- - Toute progression avec epoch < epoch_courant = obsolète (écrasée)
  -- Référence: PRODUCT_MODEL.md Ch.8.5.3 (Exception fusion monotone)
  epoch INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Contrainte: 1 session active max par (profil, timeline)
-- ============================================================
-- Invariant #7 (DB_BLUEPRINT.md): Une seule session avec state IN ('active_preview', 'active_started')
-- Mécanisme: Partial UNIQUE index (sessions completed exclues)
-- UX TSA: Garantit prévisibilité (pas de sessions actives multiples)

CREATE UNIQUE INDEX sessions_one_active_per_profile_timeline
  ON sessions (child_profile_id, timeline_id)
  WHERE state IN ('active_preview', 'active_started');

-- ============================================================
-- Index de performance
-- ============================================================
CREATE INDEX sessions_child_profile_id_idx ON sessions (child_profile_id);
CREATE INDEX sessions_timeline_id_idx ON sessions (timeline_id);
CREATE INDEX sessions_state_idx ON sessions (state);

-- ============================================================
-- Trigger: updated_at automatique (remplace moddatetime)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Ce que cette migration introduit:
-- - Table sessions avec epoch (sync multi-appareils)
-- - États: active_preview (0 validation), active_started (≥1), completed
-- - Contrainte 1 session active max par (profil, timeline) via partial index
-- - Epoch monotone (défaut 1, incrémenté à reset)
-- ============================================================

