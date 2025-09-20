-- =====================================================
-- MIGRATION 1.6 : Migration des données existantes
-- =====================================================
-- Date: 2025-01-05
-- Description: Migre les utilisateurs existants vers le nouveau système
-- 
-- Cette migration:
-- - Assigne le bon rôle aux utilisateurs existants
-- - Met à jour les statuts de compte
-- - Configure les quotas appropriés
-- =====================================================

-- 1. Migration des utilisateurs existants vers le nouveau système
DO $$
DECLARE
    user_record RECORD;
    user_role text;
    migration_count integer := 0;
    admin_count integer := 0;
    abonne_count integer := 0;
    free_count integer := 0;
BEGIN
    RAISE NOTICE 'Début de la migration des utilisateurs existants...';
    
    -- Parcourir tous les profils existants
    FOR user_record IN 
        SELECT 
            p.id, 
            p.is_admin, 
            a.status as subscription_status,
            p.account_status
        FROM public.profiles p
        LEFT JOIN public.abonnements a ON a.user_id = p.id
        WHERE a.id IS NULL OR a.status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')
    LOOP
        -- Déterminer le rôle basé sur l'état actuel
        IF user_record.is_admin THEN
            user_role := 'admin';
            admin_count := admin_count + 1;
        ELSIF user_record.subscription_status IN ('active', 'trialing', 'past_due') THEN
            user_role := 'abonne';
            abonne_count := abonne_count + 1;
        ELSE
            user_role := 'free';
            free_count := free_count + 1;
        END IF;

        -- Mettre à jour le statut du compte si nécessaire
        IF user_record.account_status IS NULL OR user_record.account_status = 'active' THEN
            UPDATE public.profiles 
            SET account_status = 'active'
            WHERE id = user_record.id;
        END IF;

        -- S'assurer que l'utilisateur a le bon rôle
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = user_record.id 
            AND ur.is_active = true 
            AND r.name = user_role
        ) THEN
            -- Désactiver tous les rôles actuels
            UPDATE public.user_roles 
            SET is_active = false 
            WHERE user_id = user_record.id;

            -- Ajouter le nouveau rôle
            INSERT INTO public.user_roles (user_id, role_id)
            SELECT user_record.id, r.id
            FROM public.roles r
            WHERE r.name = user_role;
            
            migration_count := migration_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration des utilisateurs terminée:';
    RAISE NOTICE '- Utilisateurs migrés: %', migration_count;
    RAISE NOTICE '- Admins: %', admin_count;
    RAISE NOTICE '- Abonnés: %', abonne_count;
    RAISE NOTICE '- Gratuits: %', free_count;
END $$;

-- 2. Vérifier que tous les utilisateurs ont un statut de compte
UPDATE public.profiles 
SET account_status = 'active' 
WHERE account_status IS NULL;

-- 3. Créer un rapport de migration
CREATE OR REPLACE FUNCTION public.get_migration_report()
RETURNS TABLE(
    total_users integer,
    active_users integer,
    suspended_users integer,
    pending_users integer,
    deletion_scheduled_users integer,
    admin_users integer,
    abonne_users integer,
    free_users integer,
    visitor_users integer,
    staff_users integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        (SELECT COUNT(*) FROM public.profiles) as total_users,
        (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'active') as active_users,
        (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'suspended') as suspended_users,
        (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'pending_verification') as pending_users,
        (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'deletion_scheduled') as deletion_scheduled_users,
        (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'admin' AND ur.is_active = true) as admin_users,
        (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'abonne' AND ur.is_active = true) as abonne_users,
        (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'free' AND ur.is_active = true) as free_users,
        (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'visitor' AND ur.is_active = true) as visitor_users,
        (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'staff' AND ur.is_active = true) as staff_users;
$$;

-- 4. Vérification finale de la migration
DO $$
DECLARE
    report RECORD;
BEGIN
    SELECT * INTO report FROM public.get_migration_report();
    
    RAISE NOTICE 'Migration 1.6 terminée - Rapport final:';
    RAISE NOTICE '- Total des utilisateurs: %', report.total_users;
    RAISE NOTICE '- Utilisateurs actifs: %', report.active_users;
    RAISE NOTICE '- Utilisateurs suspendus: %', report.suspended_users;
    RAISE NOTICE '- Utilisateurs en attente: %', report.pending_users;
    RAISE NOTICE '- Utilisateurs programmés pour suppression: %', report.deletion_scheduled_users;
    RAISE NOTICE '- Admins: %', report.admin_users;
    RAISE NOTICE '- Abonnés: %', report.abonne_users;
    RAISE NOTICE '- Gratuits: %', report.free_users;
    RAISE NOTICE '- Visiteurs: %', report.visitor_users;
    RAISE NOTICE '- Staff: %', report.staff_users;
    RAISE NOTICE '- Fonction de rapport créée: get_migration_report()';
END $$;
