-- Migration: Phase 4.2 — Table slots
-- Description: Emplacements timeline (Étapes + Récompense) avec identité stable
-- Date: 2026-01-30

-- Table: slots
-- Emplacements ordonnés dans une timeline (kind: step ou reward)
-- PK = identité stable (slot_id métier), position = ordre d'affichage (modifiable DnD)
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
  kind slot_kind NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  tokens INTEGER CHECK (tokens BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: pas de doublons position sur même timeline
  CONSTRAINT unique_timeline_position UNIQUE (timeline_id, position),

  -- Contrainte: tokens selon kind (step: 0-5, reward: NULL)
  CONSTRAINT check_tokens_by_kind CHECK (
    (kind = 'step' AND tokens IS NOT NULL AND tokens BETWEEN 0 AND 5) OR
    (kind = 'reward' AND tokens IS NULL)
  )
);

-- Index pour recherches slots par timeline
CREATE INDEX idx_slots_timeline_id ON slots(timeline_id);

-- Index pour tri par position (ordre affichage)
CREATE INDEX idx_slots_timeline_position ON slots(timeline_id, position);

-- Index pour recherches slots par kind
CREATE INDEX idx_slots_kind ON slots(timeline_id, kind);

-- Commentaires
COMMENT ON TABLE slots IS 'Emplacements timeline (Étapes + Récompense) avec identité stable (PK = slot_id métier)';
COMMENT ON COLUMN slots.id IS 'PK UUID (slot_id métier stable), indépendant de la position';
COMMENT ON COLUMN slots.timeline_id IS 'FK timelines, CASCADE DELETE si suppression timeline';
COMMENT ON COLUMN slots.kind IS 'Type: step (étape) ou reward (récompense)';
COMMENT ON COLUMN slots.position IS 'Ordre d affichage (modifiable drag & drop), UNIQUE par timeline';
COMMENT ON COLUMN slots.card_id IS 'FK cards, SET NULL si suppression carte (slot devient vide)';
COMMENT ON COLUMN slots.tokens IS 'Jetons (0-5 si step, NULL si reward)';
COMMENT ON CONSTRAINT unique_timeline_position ON slots IS 'Garantit pas de doublons position sur même timeline';
COMMENT ON CONSTRAINT check_tokens_by_kind ON slots IS 'Garantit tokens 0-5 si step, NULL si reward';

-- ============================================================
-- Ce que cette migration introduit:
-- - Table slots avec PK = slot_id stable (indépendant position)
-- - position = ordre affichage (modifiable), UNIQUE(timeline_id, position)
-- - kind ∈ {step, reward}, card_id nullable (slot vide), tokens 0-5 si step
-- - CHECK tokens selon kind: step = 0-5, reward = NULL
-- ============================================================

-- Vérifications (manuel):
-- 1. Insertion slot step avec tokens valides (OK)
--    INSERT INTO slots (timeline_id, kind, position, tokens) VALUES ('<uuid_timeline>', 'step', 0, 3);
-- 2. Insertion slot reward avec tokens NULL (OK)
--    INSERT INTO slots (timeline_id, kind, position, tokens) VALUES ('<uuid_timeline>', 'reward', 1, NULL);
-- 3. Insertion slot step avec tokens NULL (DOIT échouer CHECK)
--    INSERT INTO slots (timeline_id, kind, position, tokens) VALUES ('<uuid_timeline>', 'step', 2, NULL);
-- 4. Insertion slot reward avec tokens (DOIT échouer CHECK)
--    INSERT INTO slots (timeline_id, kind, position, tokens) VALUES ('<uuid_timeline>', 'reward', 3, 2);
-- 5. Deux slots mêmes position sur même timeline (DOIT échouer UNIQUE)
--    INSERT INTO slots (timeline_id, kind, position, tokens) VALUES ('<uuid_timeline>', 'step', 0, 1);
-- 6. Modification position (drag & drop) ne change pas PK (OK)
--    UPDATE slots SET position = 5 WHERE id = '<uuid_slot>';
