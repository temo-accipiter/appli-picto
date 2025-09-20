-- =====================================================
-- MIGRATION 1.3 : Système de quotas pour comptes gratuits
-- =====================================================
-- Date: 2025-01-05
-- Description: Crée le système de quotas pour limiter les comptes gratuits
-- 
-- Quotas pour le rôle 'free':
-- - max_tasks: 5 (total)
-- - max_rewards: 2 (total)  
-- - monthly_tasks: 5 (par mois)
-- - monthly_rewards: 2 (par mois)
-- =====================================================

-- 1. Créer la table des quotas par rôle
CREATE TABLE IF NOT EXISTS public.role_quotas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    quota_type text NOT NULL,
    quota_limit integer NOT NULL,
    quota_period text DEFAULT 'monthly' CHECK (quota_period IN ('monthly', 'total', 'daily')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(role_id, quota_type, quota_period)
);

-- 2. Insérer les quotas pour le rôle 'free'
INSERT INTO public.role_quotas (role_id, quota_type, quota_limit, quota_period)
SELECT r.id, 'max_tasks', 5, 'total'
FROM public.roles r WHERE r.name = 'free'
ON CONFLICT (role_id, quota_type, quota_period) DO NOTHING;

INSERT INTO public.role_quotas (role_id, quota_type, quota_limit, quota_period)
SELECT r.id, 'max_rewards', 2, 'total'
FROM public.roles r WHERE r.name = 'free'
ON CONFLICT (role_id, quota_type, quota_period) DO NOTHING;

INSERT INTO public.role_quotas (role_id, quota_type, quota_limit, quota_period)
SELECT r.id, 'monthly_tasks', 5, 'monthly'
FROM public.roles r WHERE r.name = 'free'
ON CONFLICT (role_id, quota_type, quota_period) DO NOTHING;

INSERT INTO public.role_quotas (role_id, quota_type, quota_limit, quota_period)
SELECT r.id, 'monthly_rewards', 2, 'monthly'
FROM public.roles r WHERE r.name = 'free'
ON CONFLICT (role_id, quota_type, quota_period) DO NOTHING;

-- 3. Créer la fonction pour vérifier les quotas
CREATE OR REPLACE FUNCTION public.check_user_quota(
    user_uuid uuid,
    quota_type text,
    quota_period text DEFAULT 'monthly'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
    quota_limit integer;
    current_usage integer;
BEGIN
    -- Récupérer le rôle de l'utilisateur
    SELECT r.name INTO user_role
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_uuid AND ur.is_active = true
    LIMIT 1;
    
    -- Si pas de rôle ou admin, pas de limite
    IF user_role IS NULL OR user_role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Récupérer la limite de quota
    SELECT rq.quota_limit INTO quota_limit
    FROM public.role_quotas rq
    JOIN public.roles r ON r.id = rq.role_id
    WHERE r.name = user_role 
    AND rq.quota_type = quota_type 
    AND rq.quota_period = quota_period;
    
    -- Si pas de quota défini, autoriser
    IF quota_limit IS NULL THEN
        RETURN true;
    END IF;
    
    -- Calculer l'usage actuel
    IF quota_period = 'total' THEN
        -- Usage total
        IF quota_type = 'max_tasks' THEN
            SELECT COUNT(*) INTO current_usage
            FROM public.taches 
            WHERE user_id = user_uuid;
        ELSIF quota_type = 'max_rewards' THEN
            SELECT COUNT(*) INTO current_usage
            FROM public.recompenses 
            WHERE user_id = user_uuid;
        END IF;
    ELSIF quota_period = 'monthly' THEN
        -- Usage mensuel
        IF quota_type = 'monthly_tasks' THEN
            SELECT COUNT(*) INTO current_usage
            FROM public.taches 
            WHERE user_id = user_uuid 
            AND created_at >= date_trunc('month', CURRENT_DATE);
        ELSIF quota_type = 'monthly_rewards' THEN
            SELECT COUNT(*) INTO current_usage
            FROM public.recompenses 
            WHERE user_id = user_uuid 
            AND created_at >= date_trunc('month', CURRENT_DATE);
        END IF;
    END IF;
    
    -- Vérifier si la limite est respectée
    RETURN current_usage < quota_limit;
END;
$$;

-- 4. Créer la fonction pour obtenir les informations de quota
CREATE OR REPLACE FUNCTION public.get_user_quota_info(
    user_uuid uuid,
    quota_type text,
    quota_period text DEFAULT 'monthly'
) RETURNS TABLE(
    quota_limit integer,
    current_usage integer,
    remaining integer,
    is_limited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
    quota_limit integer;
    current_usage integer;
BEGIN
    -- Récupérer le rôle de l'utilisateur
    SELECT r.name INTO user_role
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_uuid AND ur.is_active = true
    LIMIT 1;
    
    -- Si pas de rôle ou admin, pas de limite
    IF user_role IS NULL OR user_role = 'admin' THEN
        RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
        RETURN;
    END IF;
    
    -- Récupérer la limite de quota
    SELECT rq.quota_limit INTO quota_limit
    FROM public.role_quotas rq
    JOIN public.roles r ON r.id = rq.role_id
    WHERE r.name = user_role 
    AND rq.quota_type = quota_type 
    AND rq.quota_period = quota_period;
    
    -- Si pas de quota défini, pas de limite
    IF quota_limit IS NULL THEN
        RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
        RETURN;
    END IF;
    
    -- Calculer l'usage actuel
    current_usage := 0;
    IF quota_period = 'total' THEN
        IF quota_type = 'max_tasks' THEN
            SELECT COUNT(*) INTO current_usage FROM public.taches WHERE user_id = user_uuid;
        ELSIF quota_type = 'max_rewards' THEN
            SELECT COUNT(*) INTO current_usage FROM public.recompenses WHERE user_id = user_uuid;
        END IF;
    ELSIF quota_period = 'monthly' THEN
        IF quota_type = 'monthly_tasks' THEN
            SELECT COUNT(*) INTO current_usage 
            FROM public.taches 
            WHERE user_id = user_uuid 
            AND created_at >= date_trunc('month', CURRENT_DATE);
        ELSIF quota_type = 'monthly_rewards' THEN
            SELECT COUNT(*) INTO current_usage 
            FROM public.recompenses 
            WHERE user_id = user_uuid 
            AND created_at >= date_trunc('month', CURRENT_DATE);
        END IF;
    END IF;
    
    -- Retourner les informations
    RETURN QUERY SELECT 
        quota_limit,
        current_usage,
        GREATEST(0, quota_limit - current_usage),
        true;
END;
$$;

-- 5. Ajouter les index pour les performances
CREATE INDEX IF NOT EXISTS idx_role_quotas_role_type ON public.role_quotas (role_id, quota_type);
CREATE INDEX IF NOT EXISTS idx_taches_user_created ON public.taches (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recompenses_user_created ON public.recompenses (user_id, created_at);

-- 6. RLS pour la table role_quotas
ALTER TABLE public.role_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_quotas_select_public" ON public.role_quotas
FOR SELECT USING (true);

-- 7. Vérification de la migration
DO $$
DECLARE
    quota_count integer;
    free_role_id uuid;
BEGIN
    SELECT COUNT(*) INTO quota_count FROM public.role_quotas;
    SELECT id INTO free_role_id FROM public.roles WHERE name = 'free';
    
    RAISE NOTICE 'Migration 1.3 terminée:';
    RAISE NOTICE '- Table role_quotas créée';
    RAISE NOTICE '- Quotas configurés pour le rôle free: %', quota_count;
    RAISE NOTICE '- Fonctions créées: check_user_quota, get_user_quota_info';
    RAISE NOTICE '- Index ajoutés pour les performances';
    RAISE NOTICE '- RLS activé pour role_quotas';
END $$;
