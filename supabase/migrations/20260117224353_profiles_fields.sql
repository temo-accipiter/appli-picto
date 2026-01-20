-- ============================================================================
-- Migration 004 : profiles_fields
-- ============================================================================
-- Perimetre : Ajouter colonnes editables profiles (pseudo, avatar, ville, date naissance, account_status)
-- Pas de RLS (migration RLS separee)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ALTER TABLE profiles : Ajouter colonnes editables utilisateur
-- ----------------------------------------------------------------------------

-- Pseudo (unique, trim non vide)
ALTER TABLE public.profiles
  ADD COLUMN pseudo TEXT CHECK (pseudo IS NULL OR (length(trim(pseudo)) > 0 AND length(pseudo) <= 50));

-- Avatar URL (nullable, chemin storage ou URL externe)
ALTER TABLE public.profiles
  ADD COLUMN avatar_url TEXT CHECK (avatar_url IS NULL OR length(avatar_url) <= 500);

-- Ville (nullable, trim valide si non null)
ALTER TABLE public.profiles
  ADD COLUMN ville TEXT CHECK (ville IS NULL OR (length(trim(ville)) > 0 AND length(ville) <= 100));

-- Date naissance (nullable, pas de date future, >= 1900)
ALTER TABLE public.profiles
  ADD COLUMN date_naissance DATE CHECK (
    date_naissance IS NULL OR
    (date_naissance <= CURRENT_DATE AND date_naissance >= '1900-01-01')
  );

-- Statut compte (admin-only, gestion suspension/suppression)
ALTER TABLE public.profiles
  ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended', 'deletion_scheduled'));

-- Date suppression planifiee RGPD (admin-only, nullable)
ALTER TABLE public.profiles
  ADD COLUMN deletion_scheduled_at TIMESTAMPTZ CHECK (
    deletion_scheduled_at IS NULL OR deletion_scheduled_at > now()
  );

-- ----------------------------------------------------------------------------
-- Index : Performance et contraintes uniques
-- ----------------------------------------------------------------------------

-- Index UNIQUE partiel (pseudo unique case-insensitive si non null)
CREATE UNIQUE INDEX profiles_pseudo_unique
  ON public.profiles(lower(pseudo))
  WHERE pseudo IS NOT NULL;

-- Index performance (queries admin par statut compte)
CREATE INDEX idx_profiles_account_status
  ON public.profiles(account_status);

-- Index partiel (cron job suppression planifiee)
CREATE INDEX idx_profiles_deletion_scheduled
  ON public.profiles(deletion_scheduled_at)
  WHERE account_status = 'deletion_scheduled' AND deletion_scheduled_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Commentaires documentation
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.profiles.pseudo IS 'Pseudo utilisateur (unique case-insensitive si non null, max 50 char, trim valide) - editable user';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL avatar (storage ou externe, max 500 char, nullable) - editable user';
COMMENT ON COLUMN public.profiles.ville IS 'Ville utilisateur (max 100 char, trim valide, nullable) - editable user';
COMMENT ON COLUMN public.profiles.date_naissance IS 'Date naissance (nullable, <= current_date, >= 1900-01-01) - editable user';
COMMENT ON COLUMN public.profiles.account_status IS 'Statut compte : active/suspended/deletion_scheduled (default active) - ADMIN-ONLY (protege par trigger guard)';
COMMENT ON COLUMN public.profiles.deletion_scheduled_at IS 'Date suppression planifiee RGPD (nullable, > now()) - ADMIN-ONLY (protege par trigger guard)';
