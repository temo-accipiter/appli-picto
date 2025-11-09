-- ═══════════════════════════════════════════════════════════════
-- 🌱 Seed file pour Supabase Local
-- ═══════════════════════════════════════════════════════════════
--
-- Ce fichier contient des données de test pour le développement local.
-- Il est automatiquement exécuté lors de `yarn supabase:reset`.
--
-- ⚠️ ATTENTION : Ce fichier est pour TESTS LOCAUX uniquement !
--    Ne JAMAIS exécuter en production !
--
-- ═══════════════════════════════════════════════════════════════

-- Désactiver temporairement RLS pour le seed
SET session_replication_role = replica;

-- ═══════════════════════════════════════════════════════════════
-- 1. ROLES & FEATURES
-- ═══════════════════════════════════════════════════════════════

-- Insérer les rôles de base (s'ils n'existent pas déjà)
INSERT INTO public.roles (id, name, description)
VALUES
  (1, 'visiteur', 'Utilisateur en mode démo (non connecté)'),
  (2, 'free', 'Utilisateur gratuit avec quotas limités'),
  (3, 'abonne', 'Utilisateur avec abonnement premium'),
  (4, 'admin', 'Administrateur avec accès complet')
ON CONFLICT (id) DO NOTHING;

-- Insérer les features de base
INSERT INTO public.features (id, name, description)
VALUES
  (1, 'create_taches', 'Créer des tâches'),
  (2, 'create_recompenses', 'Créer des récompenses'),
  (3, 'create_categories', 'Créer des catégories'),
  (4, 'upload_images', 'Uploader des images personnalisées'),
  (5, 'export_data', 'Exporter les données'),
  (6, 'admin_panel', 'Accéder au panel admin')
ON CONFLICT (id) DO NOTHING;

-- Permissions par rôle
INSERT INTO public.role_permissions (role_id, feature_id, can_access)
VALUES
  -- Visiteur (très limité)
  (1, 1, false),
  (1, 2, false),
  (1, 3, false),
  (1, 4, false),
  (1, 5, false),
  (1, 6, false),

  -- Free (accès limité)
  (2, 1, true),
  (2, 2, true),
  (2, 3, true),
  (2, 4, true),
  (2, 5, false),
  (2, 6, false),

  -- Abonné (accès complet sauf admin)
  (3, 1, true),
  (3, 2, true),
  (3, 3, true),
  (3, 4, true),
  (3, 5, true),
  (3, 6, false),

  -- Admin (accès complet)
  (4, 1, true),
  (4, 2, true),
  (4, 3, true),
  (4, 4, true),
  (4, 5, true),
  (4, 6, true)
ON CONFLICT (role_id, feature_id) DO NOTHING;

-- Quotas par rôle
INSERT INTO public.role_quotas (role_id, resource_type, max_count)
VALUES
  -- Visiteur
  (1, 'taches', 3),
  (1, 'recompenses', 0),
  (1, 'categories', 0),

  -- Free
  (2, 'taches', 5),
  (2, 'recompenses', 2),
  (2, 'categories', 2),

  -- Abonné
  (3, 'taches', 40),
  (3, 'recompenses', 10),
  (3, 'categories', 50),

  -- Admin (illimité)
  (4, 'taches', 999),
  (4, 'recompenses', 999),
  (4, 'categories', 999)
ON CONFLICT (role_id, resource_type) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2. UTILISATEURS DE TEST
-- ═══════════════════════════════════════════════════════════════

-- Note: Les utilisateurs sont créés via auth.users
-- Ici on va juste préparer les UUID que l'on utilisera

DO $$
DECLARE
  user_free_id UUID := '11111111-1111-1111-1111-111111111111';
  user_abonne_id UUID := '22222222-2222-2222-2222-222222222222';
  user_admin_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN

  -- ═══════════════════════════════════════════════════════════════
  -- 3. PROFILS & RÔLES
  -- ═══════════════════════════════════════════════════════════════

  -- Profils
  INSERT INTO public.profiles (id, email, created_at)
  VALUES
    (user_free_id, 'test-free@appli-picto.test', NOW()),
    (user_abonne_id, 'test-abonne@appli-picto.test', NOW()),
    (user_admin_id, 'test-admin@appli-picto.test', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Assigner les rôles
  -- Note: Il faut gérer le conflit car la table peut avoir une contrainte unique
  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (user_free_id, 'free'),
    (user_abonne_id, 'abonne'),
    (user_admin_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- Paramètres par défaut
  INSERT INTO public.parametres (user_id, confettis)
  VALUES
    (user_free_id, true),
    (user_abonne_id, true),
    (user_admin_id, true)
  ON CONFLICT (user_id) DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════
  -- 4. CATÉGORIES DE TEST
  -- ═══════════════════════════════════════════════════════════════

  -- Catégories pour utilisateur Free
  INSERT INTO public.categories (user_id, label, color, created_at)
  VALUES
    (user_free_id, 'Matin', '#FF6B6B', NOW()),
    (user_free_id, 'Soir', '#4ECDC4', NOW())
  ON CONFLICT DO NOTHING;

  -- Catégories pour utilisateur Abonné
  INSERT INTO public.categories (user_id, label, color, created_at)
  VALUES
    (user_abonne_id, 'Matin', '#FF6B6B', NOW()),
    (user_abonne_id, 'Midi', '#FFA07A', NOW()),
    (user_abonne_id, 'Soir', '#4ECDC4', NOW()),
    (user_abonne_id, 'École', '#45B7D1', NOW()),
    (user_abonne_id, 'Maison', '#96CEB4', NOW())
  ON CONFLICT DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════
  -- 5. TÂCHES DE TEST
  -- ═══════════════════════════════════════════════════════════════

  -- Tâches pour utilisateur Free (3 max)
  INSERT INTO public.taches (user_id, label, fait, aujourdhui, position, created_at)
  VALUES
    (user_free_id, 'Se brosser les dents', false, true, 0, NOW()),
    (user_free_id, 'S''habiller', false, true, 1, NOW()),
    (user_free_id, 'Ranger sa chambre', false, false, 2, NOW())
  ON CONFLICT DO NOTHING;

  -- Tâches pour utilisateur Abonné (plus variées)
  INSERT INTO public.taches (user_id, label, fait, aujourdhui, position, created_at)
  VALUES
    (user_abonne_id, 'Se lever', true, true, 0, NOW()),
    (user_abonne_id, 'Petit-déjeuner', false, true, 1, NOW()),
    (user_abonne_id, 'Se brosser les dents', false, true, 2, NOW()),
    (user_abonne_id, 'S''habiller', false, true, 3, NOW()),
    (user_abonne_id, 'Préparer son sac', false, true, 4, NOW()),
    (user_abonne_id, 'Faire ses devoirs', false, false, 5, NOW()),
    (user_abonne_id, 'Ranger sa chambre', false, false, 6, NOW()),
    (user_abonne_id, 'Prendre sa douche', false, false, 7, NOW()),
    (user_abonne_id, 'Lire une histoire', false, false, 8, NOW()),
    (user_abonne_id, 'Se coucher', false, false, 9, NOW())
  ON CONFLICT DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════
  -- 6. RÉCOMPENSES DE TEST
  -- ═══════════════════════════════════════════════════════════════

  -- Récompenses pour utilisateur Free (2 max)
  INSERT INTO public.recompenses (user_id, label, selected, created_at)
  VALUES
    (user_free_id, 'Jouer aux jeux vidéo', true, NOW()),
    (user_free_id, 'Regarder la télé', false, NOW())
  ON CONFLICT DO NOTHING;

  -- Récompenses pour utilisateur Abonné (plus variées)
  INSERT INTO public.recompenses (user_id, label, selected, created_at)
  VALUES
    (user_abonne_id, 'Jouer dehors', true, NOW()),
    (user_abonne_id, 'Dessiner', false, NOW()),
    (user_abonne_id, 'Regarder un film', false, NOW()),
    (user_abonne_id, 'Jouer avec les copains', false, NOW()),
    (user_abonne_id, 'Aller au parc', false, NOW())
  ON CONFLICT DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════
  -- 7. ABONNEMENT POUR UTILISATEUR ABONNÉ
  -- ═══════════════════════════════════════════════════════════════

  INSERT INTO public.abonnements (user_id, customer_id, subscription_id, status, current_period_end, created_at)
  VALUES
    (user_abonne_id, 'cus_test_abonne', 'sub_test_abonne', 'active', NOW() + INTERVAL '30 days', NOW())
  ON CONFLICT (user_id) DO NOTHING;

END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. DONNÉES SYSTÈME
-- ═══════════════════════════════════════════════════════════════

-- Stations de métro (pour la feature thème métro)
INSERT INTO public.stations (line, name, position, transport)
VALUES
  ('1', 'La Défense', 1, 'metro'),
  ('1', 'Esplanade de La Défense', 2, 'metro'),
  ('1', 'Pont de Neuilly', 3, 'metro'),
  ('1', 'Les Sablons', 4, 'metro'),
  ('1', 'Porte Maillot', 5, 'metro'),
  ('14', 'Saint-Lazare', 1, 'metro'),
  ('14', 'Madeleine', 2, 'metro'),
  ('14', 'Pyramides', 3, 'metro'),
  ('14', 'Châtelet', 4, 'metro'),
  ('14', 'Gare de Lyon', 5, 'metro')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 9. CARTES DÉMO (pour mode visiteur)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.demo_cards (type, label, position, is_done)
VALUES
  ('tache', 'Se brosser les dents', 0, false),
  ('tache', 'S''habiller', 1, false),
  ('tache', 'Prendre son petit-déjeuner', 2, false),
  ('recompense', 'Jouer dehors', 0, false),
  ('recompense', 'Regarder la télé', 1, false)
ON CONFLICT DO NOTHING;

-- Réactiver RLS
SET session_replication_role = DEFAULT;

-- ═══════════════════════════════════════════════════════════════
-- FIN DU SEED
-- ═══════════════════════════════════════════════════════════════

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Seed completed successfully!';
  RAISE NOTICE '📝 3 test users created:';
  RAISE NOTICE '   - test-free@appli-picto.test (password: TestPassword123!)';
  RAISE NOTICE '   - test-abonne@appli-picto.test (password: TestPassword123!)';
  RAISE NOTICE '   - test-admin@appli-picto.test (password: TestPassword123!)';
  RAISE NOTICE '🎯 Use these credentials for E2E tests';
END $$;
