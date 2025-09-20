-- =====================================================
-- MIGRATION 1.1 : Ajout des états de compte
-- =====================================================
-- Date: 2025-01-05
-- Description: Ajoute les colonnes pour gérer les états de compte utilisateur
-- 
-- États supportés:
-- - active : compte normal et fonctionnel
-- - suspended : compte suspendu (fraude, impayés, abus)
-- - deletion_scheduled : suppression programmée RGPD (30 jours)
-- - pending_verification : en attente de confirmation email
-- =====================================================

-- 1. Ajouter la colonne account_status avec une valeur par défaut
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active' NOT NULL;

-- 2. Ajouter la contrainte de validation pour les états autorisés
-- (Vérifier d'abord si la contrainte n'existe pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_account_status_check' 
        AND table_name = 'profiles' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_account_status_check 
        CHECK (account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'deletion_scheduled'::text, 'pending_verification'::text]));
    END IF;
END $$;

-- 3. Ajouter la colonne pour la date de suppression programmée
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamp with time zone;

-- 4. Ajouter les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled ON public.profiles (deletion_scheduled_at) 
WHERE account_status = 'deletion_scheduled';

-- 5. Mettre à jour tous les profils existants pour qu'ils aient le statut 'active'
UPDATE public.profiles 
SET account_status = 'active' 
WHERE account_status IS NULL;

-- 6. Commentaires pour la documentation
COMMENT ON COLUMN public.profiles.account_status IS 'État du compte utilisateur: active, suspended, deletion_scheduled, pending_verification';
COMMENT ON COLUMN public.profiles.deletion_scheduled_at IS 'Date de suppression programmée pour les comptes en état deletion_scheduled (30 jours après la demande)';

-- 7. Vérification de la migration
DO $$
DECLARE
    profile_count integer;
    active_count integer;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO active_count FROM public.profiles WHERE account_status = 'active';
    
    RAISE NOTICE 'Migration 1.1 terminée:';
    RAISE NOTICE '- Total des profils: %', profile_count;
    RAISE NOTICE '- Profils actifs: %', active_count;
    RAISE NOTICE '- Colonnes ajoutées: account_status, deletion_scheduled_at';
    RAISE NOTICE '- Index créés: idx_profiles_account_status, idx_profiles_deletion_scheduled';
END $$;
