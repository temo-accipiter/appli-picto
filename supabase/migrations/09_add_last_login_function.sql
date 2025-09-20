-- Fonction pour récupérer les dernières connexions des utilisateurs
CREATE OR REPLACE FUNCTION public.get_user_last_logins()
RETURNS TABLE(user_id uuid, last_login timestamp with time zone, is_online boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier si l'utilisateur est un administrateur
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: User is not an administrator.';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.last_sign_in_at AS last_login,
    CASE 
      WHEN u.last_sign_in_at > (NOW() - INTERVAL '15 minutes') THEN true
      ELSE false
    END AS is_online
  FROM
    auth.users u
  WHERE
    u.email_confirmed_at IS NOT NULL; -- Seulement les utilisateurs confirmés
END;
$$;

-- Donner les droits d'exécution à authenticated
GRANT EXECUTE ON FUNCTION public.get_user_last_logins() TO authenticated;
