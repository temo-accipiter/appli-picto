-- Migration: Fonction RPC optimisée pour vérification des quotas en bulk
-- Date: 2025-10-15
-- Objectif: Réduire les appels RPC dans les policies RLS (1 appel au lieu de 2)

-- ========================================================================
-- Fonction: check_user_quotas_bulk
-- ========================================================================
-- Vérifie PLUSIEURS quotas en un seul appel (total + monthly)
-- au lieu de faire 2 appels séparés dans les policies RLS.
--
-- Avantages:
-- - ✅ 1 seul appel dans les RLS policies au lieu de 2
-- - ✅ Performance améliorée pour les INSERT
-- - ✅ Code plus maintenable
--
-- Params:
--   p_user_id: UUID de l'utilisateur
--   p_quota_type: Type de quota ('task', 'reward', 'category')
--   p_periods: Tableau des périodes à vérifier (default: ['total', 'monthly'])
--
-- Returns:
--   TRUE si TOUS les quotas sont respectés
--   FALSE si AU MOINS UN quota est dépassé
--
-- Sécurité:
--   - SECURITY DEFINER: Élévation de privilèges nécessaire
--   - Réutilise la fonction check_user_quota existante (pas de duplication)
-- ========================================================================

CREATE OR REPLACE FUNCTION public.check_user_quotas_bulk(
  p_user_id uuid,
  p_quota_type text,
  p_periods text[] DEFAULT ARRAY['total', 'monthly']::text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_period text;
BEGIN
  -- Vérifier chaque période demandée
  FOREACH v_period IN ARRAY p_periods LOOP
    -- Réutiliser la fonction existante check_user_quota
    IF NOT public.check_user_quota(p_user_id, p_quota_type, v_period) THEN
      RETURN false; -- Dès qu'un quota est dépassé, retourner FALSE
    END IF;
  END LOOP;

  -- Tous les quotas sont OK
  RETURN true;
END;
$$;

-- ========================================================================
-- Mise à jour des RLS policies pour utiliser la nouvelle fonction
-- ========================================================================

-- 1️⃣ Policy taches_insert_unified
DROP POLICY IF EXISTS taches_insert_unified ON public.taches;

CREATE POLICY taches_insert_unified ON public.taches FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR (
    user_id = auth.uid()
    AND public.check_user_quotas_bulk(auth.uid(), 'task') -- ✅ 1 seul appel
  )
);

-- 2️⃣ Policy recompenses_insert_unified
DROP POLICY IF EXISTS recompenses_insert_unified ON public.recompenses;

CREATE POLICY recompenses_insert_unified ON public.recompenses FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR (
    user_id = auth.uid()
    AND public.check_user_quotas_bulk(auth.uid(), 'reward') -- ✅ 1 seul appel
  )
);

-- 3️⃣ Policy categories_insert_unified
DROP POLICY IF EXISTS categories_insert_unified ON public.categories;

CREATE POLICY categories_insert_unified ON public.categories FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR (
    user_id = auth.uid()
    AND public.check_user_quotas_bulk(auth.uid(), 'category') -- ✅ 1 seul appel
  )
);
