-- Migration: Ajouter fonction RPC get_users_with_roles
-- Résout le problème de jointure entre profiles et user_roles pour l'admin
-- Date: 2025-10-17

-- Fonction RPC pour récupérer les utilisateurs avec leurs rôles
-- Permet de joindre profiles et user_roles malgré l'absence de FK directe
CREATE OR REPLACE FUNCTION get_users_with_roles(
  page_num INT DEFAULT 1,
  page_limit INT DEFAULT 20,
  role_filter TEXT DEFAULT 'all',
  status_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  pseudo TEXT,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  account_status TEXT,
  is_online BOOLEAN,
  user_roles JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_val INT;
  total BIGINT;
BEGIN
  -- Calculer l'offset
  offset_val := (page_num - 1) * page_limit;

  -- Compter le total (pour la pagination)
  SELECT COUNT(DISTINCT p.id) INTO total
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE
    (status_filter = 'all' OR p.account_status = status_filter)
    AND (
      role_filter = 'all'
      OR (role_filter = 'no_roles' AND ur.id IS NULL)
      OR r.name = role_filter
    );

  -- Retourner les résultats
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.pseudo,
    p.created_at,
    p.last_login,
    p.account_status,
    p.is_online,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN ur.id IS NOT NULL THEN
            jsonb_build_object(
              'id', ur.id,
              'role_id', ur.role_id,
              'roles', jsonb_build_object(
                'id', r.id,
                'name', r.name,
                'display_name', r.display_name
              )
            )
          ELSE NULL
        END
      ) FILTER (WHERE ur.id IS NOT NULL),
      '[]'::jsonb
    ) AS user_roles,
    total AS total_count
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE
    (status_filter = 'all' OR p.account_status = status_filter)
    AND (
      role_filter = 'all'
      OR (role_filter = 'no_roles' AND ur.id IS NULL)
      OR r.name = role_filter
    )
  GROUP BY p.id, p.email, p.pseudo, p.created_at, p.last_login, p.account_status, p.is_online
  ORDER BY p.created_at DESC
  LIMIT page_limit
  OFFSET offset_val;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION get_users_with_roles IS 'Récupère les utilisateurs avec leurs rôles assignés (avec pagination et filtres)';
