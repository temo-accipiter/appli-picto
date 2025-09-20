-- =====================================================
-- MIGRATION 1.5 : Système de logs d'audit
-- =====================================================
-- Date: 2025-01-05
-- Description: Crée le système de logs d'audit pour tracer les changements
-- 
-- Permet de tracer:
-- - Changements d'état de compte
-- - Changements de rôle
-- - Actions administratives
-- - Modifications de quotas
-- =====================================================

-- 1. Créer la table des logs d'audit pour changements d'état
CREATE TABLE IF NOT EXISTS public.account_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL,
    old_status text,
    new_status text,
    old_role text,
    new_role text,
    changed_by uuid REFERENCES auth.users(id),
    reason text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Ajouter les index pour les performances
CREATE INDEX IF NOT EXISTS idx_account_audit_logs_user_id ON public.account_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_account_audit_logs_created_at ON public.account_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_audit_logs_action ON public.account_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_account_audit_logs_changed_by ON public.account_audit_logs (changed_by);

-- 3. RLS pour la table account_audit_logs
ALTER TABLE public.account_audit_logs ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs voient leurs propres logs
CREATE POLICY "account_audit_logs_select_own" ON public.account_audit_logs
FOR SELECT USING (user_id = auth.uid());

-- Politique pour que les admins voient tous les logs
CREATE POLICY "account_audit_logs_select_admin" ON public.account_audit_logs
FOR SELECT USING (public.is_admin());

-- Politique pour l'insertion (seulement par les admins et le système)
CREATE POLICY "account_audit_logs_insert_admin" ON public.account_audit_logs
FOR INSERT WITH CHECK (public.is_admin() OR changed_by = auth.uid());

-- 4. Fonction pour changer l'état d'un compte
CREATE OR REPLACE FUNCTION public.change_account_status(
    target_user_id uuid,
    new_status text,
    changed_by_user_id uuid DEFAULT NULL,
    reason text DEFAULT NULL,
    metadata jsonb DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_status text;
    old_role text;
    new_role text;
BEGIN
    -- Récupérer l'état actuel
    SELECT p.account_status, r.name INTO old_status, old_role
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.is_active = true
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = target_user_id;
    
    -- Mettre à jour l'état
    UPDATE public.profiles 
    SET account_status = new_status,
        deletion_scheduled_at = CASE 
            WHEN new_status = 'deletion_scheduled' THEN now() + interval '30 days'
            ELSE NULL
        END
    WHERE id = target_user_id;
    
    -- Déterminer le nouveau rôle basé sur l'état
    IF new_status = 'active' THEN
        -- Rôle basé sur l'abonnement
        SELECT CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.abonnements 
                WHERE user_id = target_user_id 
                AND status IN ('active', 'trialing', 'past_due')
            ) THEN 'abonne'
            ELSE 'free'
        END INTO new_role;
    ELSIF new_status = 'suspended' THEN
        new_role := 'visitor';
    ELSIF new_status = 'deletion_scheduled' THEN
        new_role := 'visitor';
    ELSIF new_status = 'pending_verification' THEN
        new_role := 'visitor';
    END IF;
    
    -- Mettre à jour le rôle si nécessaire
    IF new_role IS NOT NULL AND new_role != old_role THEN
        -- Désactiver tous les rôles actuels
        UPDATE public.user_roles 
        SET is_active = false 
        WHERE user_id = target_user_id;
        
        -- Ajouter le nouveau rôle
        INSERT INTO public.user_roles (user_id, role_id, assigned_by)
        SELECT target_user_id, r.id, changed_by_user_id
        FROM public.roles r
        WHERE r.name = new_role;
    END IF;
    
    -- Logger le changement
    INSERT INTO public.account_audit_logs (
        user_id, action, old_status, new_status, 
        old_role, new_role, changed_by, reason, metadata
    ) VALUES (
        target_user_id, 'status_change', old_status, new_status,
        old_role, new_role, changed_by_user_id, reason, metadata
    );
    
    RETURN true;
END;
$$;

-- 5. Fonction pour vérifier l'état d'un compte
CREATE OR REPLACE FUNCTION public.get_account_status(user_uuid uuid)
RETURNS TABLE(
    user_id uuid,
    account_status text,
    role_name text,
    is_suspended boolean,
    is_pending_verification boolean,
    is_scheduled_for_deletion boolean,
    deletion_date timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        p.id as user_id,
        p.account_status,
        r.name as role_name,
        (p.account_status = 'suspended') as is_suspended,
        (p.account_status = 'pending_verification') as is_pending_verification,
        (p.account_status = 'deletion_scheduled') as is_scheduled_for_deletion,
        p.deletion_scheduled_at as deletion_date
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.is_active = true
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = user_uuid;
$$;

-- 6. Fonction pour obtenir l'historique d'un compte
CREATE OR REPLACE FUNCTION public.get_account_history(user_uuid uuid, limit_count integer DEFAULT 50)
RETURNS TABLE(
    id uuid,
    action text,
    old_status text,
    new_status text,
    old_role text,
    new_role text,
    reason text,
    changed_by_pseudo text,
    created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        aal.id,
        aal.action,
        aal.old_status,
        aal.new_status,
        aal.old_role,
        aal.new_role,
        aal.reason,
        p.pseudo as changed_by_pseudo,
        aal.created_at
    FROM public.account_audit_logs aal
    LEFT JOIN public.profiles p ON p.id = aal.changed_by
    WHERE aal.user_id = user_uuid
    ORDER BY aal.created_at DESC
    LIMIT limit_count;
$$;

-- 7. Fonction pour nettoyer les anciens logs (maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.account_audit_logs 
    WHERE created_at < (now() - make_interval(days => retention_days));
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- 8. Commentaires pour la documentation
COMMENT ON TABLE public.account_audit_logs IS 'Logs d''audit pour tracer les changements d''état et de rôle des comptes';
COMMENT ON COLUMN public.account_audit_logs.action IS 'Type d''action: status_change, role_change, quota_change, etc.';
COMMENT ON COLUMN public.account_audit_logs.metadata IS 'Données supplémentaires au format JSON';

-- 9. Vérification de la migration
DO $$
DECLARE
    audit_table_exists boolean;
    functions_created integer;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'account_audit_logs' 
        AND table_schema = 'public'
    ) INTO audit_table_exists;
    
    SELECT COUNT(*) INTO functions_created
    FROM information_schema.routines 
    WHERE routine_name IN ('change_account_status', 'get_account_status', 'get_account_history', 'cleanup_old_audit_logs')
    AND routine_schema = 'public';
    
    RAISE NOTICE 'Migration 1.5 terminée:';
    RAISE NOTICE '- Table account_audit_logs créée: %', CASE WHEN audit_table_exists THEN 'OUI' ELSE 'NON' END;
    RAISE NOTICE '- Fonctions créées: %', functions_created;
    RAISE NOTICE '- RLS activé avec politiques appropriées';
    RAISE NOTICE '- Index ajoutés pour les performances';
    RAISE NOTICE '- Fonctions: change_account_status, get_account_status, get_account_history, cleanup_old_audit_logs';
END $$;
