-- Migration: Phase 6.1 — Table sequences
-- Description: Séquences par compte et carte mère (0..1)
-- Date: 2026-02-02
--
-- Notes DB-first:
-- - Aucune RLS / Storage / Quotas dans cette phase.
-- - Les invariants métier (>= 2 étapes, ownership) sont ajoutés en Phase 6.3.

CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  mother_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 0..1 séquence par (account, mother_card)
  CONSTRAINT unique_sequence_per_account_mother UNIQUE (account_id, mother_card_id)
);

CREATE INDEX idx_sequences_account_id ON sequences(account_id);
CREATE INDEX idx_sequences_mother_card_id ON sequences(mother_card_id);

COMMENT ON TABLE sequences IS 'Séquences (décomposition visuelle) par compte et carte mère. 0..1 séquence par carte mère par compte.';
COMMENT ON COLUMN sequences.mother_card_id IS 'Carte mère de la séquence (peut être bank ou personal).';
