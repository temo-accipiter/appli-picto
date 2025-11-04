-- Migration: Ajouter surcharge de get_usage_fast() sans paramètres
-- Date: 2025-10-15
-- Description: Permet d'appeler get_usage_fast() sans passer explicitement l'user_id.
--              La fonction utilise automatiquement auth.uid() pour l'utilisateur connecté.

-- Créer une surcharge de get_usage_fast sans paramètres
CREATE OR REPLACE FUNCTION public.get_usage_fast()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Appeler la version avec paramètre en passant l'ID de l'utilisateur connecté
  RETURN public.get_usage_fast(auth.uid());
END
$$;

-- Commenter la fonction pour documenter son usage
COMMENT ON FUNCTION public.get_usage_fast() IS
'Surcharge sans paramètres de get_usage_fast. Utilise automatiquement auth.uid() pour récupérer les quotas et usage de l''utilisateur connecté.';

-- Grant des permissions appropriées
GRANT EXECUTE ON FUNCTION public.get_usage_fast() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_fast() TO anon;
