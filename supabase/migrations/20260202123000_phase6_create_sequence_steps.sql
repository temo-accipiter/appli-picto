-- Migration: Phase 6.2 — Table sequence_steps
-- Description: Étapes ordonnées pour une séquence
-- Date: 2026-02-02
--
-- Notes DB-first:
-- - L'unicité (sequence_id, position) est DEFERRABLE pour permettre reorder multi-lignes en transaction.
-- - step_card_id est ON DELETE CASCADE: suppression d'une carte supprime ses références d'étapes.

CREATE TABLE sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Pas de doublon de carte dans une même séquence
  CONSTRAINT unique_sequence_step_card UNIQUE (sequence_id, step_card_id),

  -- Ordre stable + reorder transactionnel
  CONSTRAINT unique_sequence_step_position UNIQUE (sequence_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);
CREATE INDEX idx_sequence_steps_step_card_id ON sequence_steps(step_card_id);
CREATE INDEX idx_sequence_steps_sequence_position ON sequence_steps(sequence_id, position);

COMMENT ON TABLE sequence_steps IS 'Étapes (cards) ordonnées pour chaque séquence.';
COMMENT ON COLUMN sequence_steps.position IS 'Index 0..n-1 (sans trous imposés par la DB).';
