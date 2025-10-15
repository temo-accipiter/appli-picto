-- ========================================
-- Script pour supprimer UN utilisateur spécifique
-- ========================================
--
-- REMPLACER 'EMAIL_ICI' par l'email de l'utilisateur à supprimer
--
-- ========================================

-- Étape 1: Trouver l'ID de l'utilisateur
SELECT
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'EMAIL_ICI';  -- ⚠️ REMPLACER 'EMAIL_ICI'

-- ========================================
-- DÉCOMMENTER CI-DESSOUS POUR SUPPRIMER
-- ========================================

/*
-- Étape 2: Supprimer l'utilisateur (CASCADE supprime tout le reste)
DELETE FROM auth.users
WHERE email = 'EMAIL_ICI';  -- ⚠️ REMPLACER 'EMAIL_ICI'

-- Étape 3: Vérification
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'EMAIL_ICI';  -- ⚠️ REMPLACER 'EMAIL_ICI'
-- (Devrait retourner 0 lignes)
*/
