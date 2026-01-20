-- ============================================================================
-- Migration : add_timelines_mode
-- ============================================================================
-- Perimetre : Ajouter colonne mode a public.timelines
-- Objectif : Distinguer plannings visuels (planning) vs sequences (sequence)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Colonne : timelines.mode
-- ----------------------------------------------------------------------------
-- Valeurs possibles : 'planning' | 'sequence'
-- Defaut : 'planning' (toutes les timelines existantes sont des plannings)
-- ----------------------------------------------------------------------------
ALTER TABLE public.timelines
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'planning';

-- ----------------------------------------------------------------------------
-- Contrainte : mode valide
-- ----------------------------------------------------------------------------
-- Garantit que mode IN ('planning', 'sequence')
-- Idempotente : verifie existence avant creation
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timelines_mode_check'
      AND conrelid = 'public.timelines'::regclass
  ) THEN
    ALTER TABLE public.timelines
      ADD CONSTRAINT timelines_mode_check
      CHECK (mode IN ('planning', 'sequence'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Commentaire DB
-- ----------------------------------------------------------------------------
-- Documente le contrat produit pour la colonne mode
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.timelines.mode IS
  'Mode de la timeline. "planning" = planning visuel avec economie de jetons et recompense possible (affiche dans page Tableau). "sequence" = sequencage pour decomposer une tache complexe en micro-etapes visuelles (affiche sous carte au focus, sans jetons/recompense, slots Etapes uniquement).';
