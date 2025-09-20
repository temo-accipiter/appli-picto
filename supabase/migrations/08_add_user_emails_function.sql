-- Migration pour ajouter une fonction RPC qui récupère les emails des utilisateurs
-- Cette fonction permet aux admins de récupérer les emails pour la gestion des utilisateurs

-- Fonction pour récupérer les emails des utilisateurs (admin seulement)
CREATE OR REPLACE FUNCTION get_user_emails()
RETURNS TABLE (
  user_id UUID,
  email TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    au.id as user_id,
    au.email
  FROM auth.users au
  INNER JOIN public.profiles p ON p.id = au.id
  WHERE au.email IS NOT NULL
  ORDER BY p.created_at DESC;
$$;

-- Politique RLS pour la fonction (admin seulement)
CREATE POLICY "get_user_emails_admin_only" ON auth.users
FOR SELECT
TO authenticated
USING (is_admin());

-- Commentaire sur la fonction
COMMENT ON FUNCTION get_user_emails() IS 'Récupère les emails des utilisateurs pour la gestion admin. Accessible aux admins seulement.';
