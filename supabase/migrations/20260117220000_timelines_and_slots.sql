-- ============================================================================
-- Migration 003 : timelines_and_slots
-- ============================================================================
-- Perimetre : Tables timelines + slots (planning visuel + economie jetons)
-- Pas de RLS, pas de seed
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table : timelines
-- ----------------------------------------------------------------------------
-- Timelines (plannings visuels) appartenant a un utilisateur
-- is_active : 1 seule timeline active par utilisateur (UNIQUE partiel)
-- owner_id : FK vers profiles (garantit existence profile)
-- ----------------------------------------------------------------------------
CREATE TABLE public.timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (utilisateur proprietaire, FK vers profiles)
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  -- Nom timeline (optionnel)
  name TEXT CHECK (name IS NULL OR (length(trim(name)) > 0 AND length(name) <= 200)),

  -- Statut actif (1 seule timeline active par user)
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index UNIQUE partiel (1 seule timeline active par user)
CREATE UNIQUE INDEX timelines_active_per_user
  ON public.timelines(owner_id)
  WHERE is_active = true;

-- Index performance (queries par owner)
CREATE INDEX idx_timelines_owner ON public.timelines(owner_id);

-- Trigger auto-update updated_at
CREATE TRIGGER timelines_updated_at
  BEFORE UPDATE ON public.timelines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- Table : slots
-- ----------------------------------------------------------------------------
-- Slots dans une timeline (steps ou rewards)
-- position : ordre dans la timeline (UNIQUE par timeline, >= 0)
-- jetons : 0-5 pour steps, 0 pour rewards
-- card_id : FK RESTRICT (empeche suppression carte utilisee)
-- Max 1 reward par timeline (UNIQUE partiel)
-- ----------------------------------------------------------------------------
CREATE TABLE public.slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timeline parente
  timeline_id UUID NOT NULL REFERENCES public.timelines(id) ON DELETE CASCADE,

  -- Carte associee (RESTRICT empeche suppression si utilisee)
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE RESTRICT,

  -- Type de slot (step ou reward)
  slot_type TEXT NOT NULL CHECK (slot_type IN ('step', 'reward')),

  -- Position dans la timeline (ordre affichage, >= 0)
  position INTEGER NOT NULL CHECK (position >= 0),

  -- Jetons (economie de jetons)
  jetons INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contrainte : jetons selon slot_type
  CONSTRAINT slots_jetons_check CHECK (
    (slot_type = 'step' AND jetons >= 0 AND jetons <= 5) OR
    (slot_type = 'reward' AND jetons = 0)
  ),

  -- Contrainte : 1 seule position par timeline
  CONSTRAINT slots_timeline_position_unique UNIQUE (timeline_id, position)
);

-- Index UNIQUE partiel (max 1 reward par timeline)
CREATE UNIQUE INDEX slots_timeline_reward_unique
  ON public.slots(timeline_id)
  WHERE slot_type = 'reward';

-- Index performance (lecture ordonnee timeline)
CREATE INDEX idx_slots_timeline_position ON public.slots(timeline_id, position);

-- Index performance (FK card_id)
CREATE INDEX idx_slots_card ON public.slots(card_id);

-- Trigger auto-update updated_at
CREATE TRIGGER slots_updated_at
  BEFORE UPDATE ON public.slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- Commentaires documentation
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.timelines IS 'Timelines (plannings visuels) utilisateur - 1 seule active par user';
COMMENT ON COLUMN public.timelines.owner_id IS 'Utilisateur proprietaire (FK profiles.user_id, ON DELETE CASCADE)';
COMMENT ON COLUMN public.timelines.name IS 'Nom timeline (optionnel, max 200 char, trim valide)';
COMMENT ON COLUMN public.timelines.is_active IS 'Timeline active (UNIQUE partiel : 1 seule active par owner_id)';

COMMENT ON TABLE public.slots IS 'Slots dans timelines (steps ou rewards) avec jetons - max 1 reward par timeline';
COMMENT ON COLUMN public.slots.timeline_id IS 'Timeline parente (FK timelines, ON DELETE CASCADE)';
COMMENT ON COLUMN public.slots.card_id IS 'Carte associee (FK cards, ON DELETE RESTRICT empeche suppression carte utilisee)';
COMMENT ON COLUMN public.slots.slot_type IS 'Type slot : step (avec jetons 0-5) ou reward (0 jetons) - max 1 reward par timeline';
COMMENT ON COLUMN public.slots.position IS 'Position dans timeline (ordre affichage >= 0, UNIQUE par timeline)';
COMMENT ON COLUMN public.slots.jetons IS 'Jetons economie : 0-5 pour steps, 0 pour rewards (CHECK constraint)';
