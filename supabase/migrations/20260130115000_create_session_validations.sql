-- Migration: Phase 5.2 — Table session_validations (progression)
-- Description: Ensemble validations (union ensembliste pour fusion monotone)
-- Référence: DB_BLUEPRINT.md §2 Table session_validations, PRODUCT_MODEL.md Ch.3.10
-- Date: 2026-01-30

-- ============================================================
-- Table: session_validations
-- ============================================================
-- But: Stocker les validations (étapes cochées) sous forme d'ensemble de slot_id
-- Fusion monotone: Union ensembliste multi-appareils (pas de régression)
-- Idempotence: UNIQUE (session_id, slot_id) garantit pas de doublon

CREATE TABLE session_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,

  -- Timestamp validation
  -- Note: Utilisé pour audit uniquement
  -- Logique métier utilise union ensembliste (set de slot_id), pas ordre temporel
  -- Référence: DB_BLUEPRINT.md L1049-1065, MIGRATION_PLAN.md §6.4
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Contrainte: Pas de doublon validation (idempotence)
-- ============================================================
-- Invariant #9 (DB_BLUEPRINT.md): Une validation = 1 ligne (session_id, slot_id)
-- UX TSA: Prévisibilité (cocher 2x = même effet)
-- Sync multi-appareils: Fusion monotone = UNION (pas de régression progression)

CREATE UNIQUE INDEX session_validations_unique_slot_per_session
  ON session_validations (session_id, slot_id);

-- ============================================================
-- Index de performance
-- ============================================================
CREATE INDEX session_validations_session_id_idx ON session_validations (session_id);
CREATE INDEX session_validations_slot_id_idx ON session_validations (slot_id);

-- ============================================================
-- Ce que cette migration introduit:
-- - Table session_validations avec ensemble (set) de slot_id validés
-- - UNIQUE (session_id, slot_id) garantit idempotence
-- - validated_at pour audit (logique métier = union ensembliste)
-- - Support fusion monotone multi-appareils (UNION validations)
-- ============================================================
