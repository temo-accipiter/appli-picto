-- ========================================
-- Script pour supprimer tous les utilisateurs SAUF les admins
-- ========================================
--
-- ATTENTION: Ce script est DESTRUCTIF et IRRÉVERSIBLE !
-- À utiliser UNIQUEMENT en développement/test
--
-- Ce script:
-- 1. Identifie tous les utilisateurs qui ne sont PAS admin
-- 2. Supprime leurs données dans toutes les tables liées
-- 3. Supprime les utilisateurs de auth.users
--
-- ========================================

-- Étape 1: Afficher la liste des utilisateurs qui seront supprimés
SELECT
  u.id,
  u.email,
  u.created_at,
  COALESCE(ur.role_name, 'aucun rôle') as role
FROM auth.users u
LEFT JOIN (
  SELECT ur.user_id, r.name as role_name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE r.name = 'admin'
) ur ON u.id = ur.user_id
WHERE ur.role_name IS NULL OR ur.role_name != 'admin'
ORDER BY u.created_at DESC;

-- ========================================
-- DÉCOMMENTER LA PARTIE CI-DESSOUS POUR EXÉCUTER LA SUPPRESSION
-- ========================================

-- Étape 2: Supprimer les données des utilisateurs non-admin
-- (Les CASCADE devraient s'occuper de la plupart)

DO $$
DECLARE
  user_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  -- Parcourir tous les utilisateurs non-admin
  FOR user_record IN
    SELECT u.id, u.email
    FROM auth.users u
    LEFT JOIN (
      SELECT ur.user_id, r.name as role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'admin'
    ) ur ON u.id = ur.user_id
    WHERE ur.role_name IS NULL OR ur.role_name != 'admin'
  LOOP
    -- Supprimer les fichiers storage (avatars)
    DELETE FROM storage.objects
    WHERE bucket_id = 'avatars'
    AND name LIKE user_record.id::text || '/%';

    -- Supprimer l'utilisateur (CASCADE s'occupe du reste)
    DELETE FROM auth.users WHERE id = user_record.id;

    deleted_count := deleted_count + 1;
    RAISE NOTICE 'Utilisateur supprimé: % (ID: %)', user_record.email, user_record.id;
  END LOOP;

  RAISE NOTICE 'Total utilisateurs supprimés: %', deleted_count;
END $$;

-- Étape 3: Vérification finale
SELECT
  u.id,
  u.email,
  u.created_at,
  COALESCE(ur.role_name, 'aucun rôle') as role
FROM auth.users u
LEFT JOIN (
  SELECT ur.user_id, r.name as role_name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
) ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- ========================================
-- INSTRUCTIONS:
-- 1. Exécuter d'abord la partie SELECT (ligne 17-26) pour voir la liste
-- 2. Vérifier que seuls les non-admins sont listés
-- 3. Décommenter la partie DO $$ (ligne 33-80)
-- 4. Exécuter le script complet
-- ========================================
