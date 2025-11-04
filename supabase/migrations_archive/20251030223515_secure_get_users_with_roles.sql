-- ============================================================================
-- Migration: Sécurisation des fonctions get_users_with_roles
-- Date: 2025-10-30
-- Description: Fixe le search_path pour éviter les vulnérabilités d'injection
-- ============================================================================

-- ✅ Sécuriser la version avec pagination (la seule qui existe)
ALTER FUNCTION public.get_users_with_roles(
  page_num integer,
  page_limit integer,
  role_filter text,
  status_filter text
)
SET search_path TO public, pg_temp;

-- Commentaire pour documentation
COMMENT ON FUNCTION public.get_users_with_roles(integer, integer, text, text) IS
'Returns users with their roles (paginated) - Secured with search_path (2025-10-30)';