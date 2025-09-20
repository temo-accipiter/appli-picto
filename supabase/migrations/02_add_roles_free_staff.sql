-- =====================================================
-- MIGRATION 1.2 : Ajout des rôles free et staff
-- =====================================================
-- Date: 2025-01-05
-- Description: Ajoute les rôles free (compte gratuit) et staff (support/modération)
-- 
-- Rôles existants: admin (100), abonne (50), visitor (10)
-- Nouveaux rôles: free (20), staff (80)
-- =====================================================

-- 1. Insérer les nouveaux rôles
INSERT INTO public.roles (name, display_name, description, priority) VALUES
('free', 'Compte Gratuit', 'Utilisateur avec compte gratuit limité par quotas', 20),
('staff', 'Support', 'Personnel support et modération (rôle mixte)', 80)
ON CONFLICT (name) DO NOTHING;

-- 2. Mettre à jour les priorités existantes pour cohérence
UPDATE public.roles SET priority = 100 WHERE name = 'admin';
UPDATE public.roles SET priority = 50 WHERE name = 'abonne';
UPDATE public.roles SET priority = 10 WHERE name = 'visitor';

-- 3. Vérification de la migration
DO $$
DECLARE
    role_count integer;
    free_role_id uuid;
    staff_role_id uuid;
BEGIN
    SELECT COUNT(*) INTO role_count FROM public.roles;
    SELECT id INTO free_role_id FROM public.roles WHERE name = 'free';
    SELECT id INTO staff_role_id FROM public.roles WHERE name = 'staff';
    
    RAISE NOTICE 'Migration 1.2 terminée:';
    RAISE NOTICE '- Total des rôles: %', role_count;
    RAISE NOTICE '- Rôle free créé: %', CASE WHEN free_role_id IS NOT NULL THEN 'OUI' ELSE 'NON' END;
    RAISE NOTICE '- Rôle staff créé: %', CASE WHEN staff_role_id IS NOT NULL THEN 'OUI' ELSE 'NON' END;
    RAISE NOTICE '- Priorités mises à jour: admin(100), abonne(50), free(20), visitor(10), staff(80)';
END $$;
