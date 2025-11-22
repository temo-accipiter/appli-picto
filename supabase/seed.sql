-- ═══════════════════════════════════════════════════════════════
-- 🌱 Seed file pour Supabase Local - VERSION MINIMALE
-- ═══════════════════════════════════════════════════════════════
--
-- Ce fichier contient uniquement les données essentielles pour le mode visiteur
-- ═══════════════════════════════════════════════════════════════

-- Désactiver temporairement RLS pour le seed
SET session_replication_role = replica;

-- ═══════════════════════════════════════════════════════════════
-- 1. RÔLES ET QUOTAS
-- ═══════════════════════════════════════════════════════════════

-- Insérer les rôles de base
INSERT INTO public.roles (name, display_name, description, priority)
VALUES
  ('admin', 'Administrateur', 'Administrateur avec accès complet', 100),
  ('abonne', 'Abonné', 'Utilisateur avec abonnement actif', 50),
  ('free', 'Gratuit', 'Utilisateur gratuit avec quotas limités', 20),
  ('visiteur', 'Visiteur', 'Mode démo sans compte', 10)
ON CONFLICT (name) DO NOTHING;

-- Insérer les quotas par rôle (format normalisé)
INSERT INTO public.role_quotas (role_id, quota_type, quota_limit, quota_period)
SELECT r.id, quota_data.qtype, quota_data.qlimit, 'monthly'
FROM public.roles r
CROSS JOIN (
  VALUES
    ('taches', 999),
    ('recompenses', 999),
    ('categories', 999)
) AS quota_data(qtype, qlimit)
WHERE r.name = 'admin'
UNION ALL
SELECT r.id, quota_data.qtype, quota_data.qlimit, 'monthly'
FROM public.roles r
CROSS JOIN (
  VALUES
    ('taches', 40),
    ('recompenses', 10),
    ('categories', 50)
) AS quota_data(qtype, qlimit)
WHERE r.name = 'abonne'
UNION ALL
SELECT r.id, quota_data.qtype, quota_data.qlimit, 'monthly'
FROM public.roles r
CROSS JOIN (
  VALUES
    ('taches', 5),
    ('recompenses', 2),
    ('categories', 2)
) AS quota_data(qtype, qlimit)
WHERE r.name = 'free'
UNION ALL
SELECT r.id, quota_data.qtype, quota_data.qlimit, 'total'
FROM public.roles r
CROSS JOIN (
  VALUES
    ('taches', 3),
    ('recompenses', 1),
    ('categories', 0)
) AS quota_data(qtype, qlimit)
WHERE r.name = 'visiteur'
ON CONFLICT (role_id, quota_type, quota_period) DO NOTHING;

-- Créer le compte admin fictif pour développement local
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  is_sso_user,
  is_anonymous
)
VALUES (
  'afcd1e0e-fd75-4c1c-b4ed-d347663fbeeb',
  '00000000-0000-0000-0000-000000000000',
  'admin@local.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  false,
  false
)
ON CONFLICT (id) DO UPDATE SET
  email_confirmed_at = NOW(),
  encrypted_password = crypt('admin123', gen_salt('bf')),
  email_change = '',
  email_change_token_new = '',
  email_change_token_current = '';

-- Assigner le rôle admin au compte
INSERT INTO public.user_roles (user_id, role_id, is_active)
SELECT
  'afcd1e0e-fd75-4c1c-b4ed-d347663fbeeb',
  r.id,
  true
FROM public.roles r
WHERE r.name = 'admin'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;

-- Créer le compte free fictif pour développement local
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  is_sso_user,
  is_anonymous
)
VALUES (
  'bfcd2e0e-fd75-4c1c-b4ed-d347663fbeec',
  '00000000-0000-0000-0000-000000000000',
  'free@local.com',
  crypt('free123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '',
  '',
  false,
  false
)
ON CONFLICT (id) DO UPDATE SET
  email_confirmed_at = NOW(),
  encrypted_password = crypt('free123', gen_salt('bf')),
  email_change = '',
  email_change_token_new = '',
  email_change_token_current = '';

-- Assigner le rôle free au compte
INSERT INTO public.user_roles (user_id, role_id, is_active)
SELECT
  'bfcd2e0e-fd75-4c1c-b4ed-d347663fbeec',
  r.id,
  true
FROM public.roles r
WHERE r.name = 'free'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;

-- Créer les profils pour les comptes de test
INSERT INTO public.profiles (id, pseudo)
VALUES
  ('afcd1e0e-fd75-4c1c-b4ed-d347663fbeeb', 'Admin'),
  ('bfcd2e0e-fd75-4c1c-b4ed-d347663fbeec', 'Free User')
ON CONFLICT (id) DO UPDATE SET
  pseudo = EXCLUDED.pseudo;

-- ═══════════════════════════════════════════════════════════════
-- 2. BUCKET STORAGE IMAGES
-- ═══════════════════════════════════════════════════════════════

-- Créer le bucket images (privé)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  false,
  5242880, -- 5 MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. STATIONS DE MÉTRO (pour la feature thème métro)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.stations (ligne, label, ordre, type)
VALUES
  -- Ligne 1
  ('1', 'La Défense', 1, 'metro'),
  ('1', 'Esplanade de La Défense', 2, 'metro'),
  ('1', 'Pont de Neuilly', 3, 'metro'),
  ('1', 'Les Sablons', 4, 'metro'),
  ('1', 'Porte Maillot', 5, 'metro'),
  ('1', 'Argentine', 6, 'metro'),
  ('1', 'Charles de Gaulle - Étoile', 7, 'metro'),
  ('1', 'George V', 8, 'metro'),
  ('1', 'Franklin D. Roosevelt', 9, 'metro'),
  ('1', 'Champs-Élysées - Clemenceau', 10, 'metro'),

  -- Ligne 6
  ('6', 'Charles de Gaulle - Étoile', 1, 'metro'),
  ('6', 'Kléber', 2, 'metro'),
  ('6', 'Boissière', 3, 'metro'),
  ('6', 'Trocadéro', 4, 'metro'),
  ('6', 'Passy', 5, 'metro'),
  ('6', 'Bir-Hakeim', 6, 'metro'),
  ('6', 'Dupleix', 7, 'metro'),
  ('6', 'La Motte-Picquet - Grenelle', 8, 'metro'),
  ('6', 'Cambronne', 9, 'metro'),
  ('6', 'Sèvres - Lecourbe', 10, 'metro'),

  -- Ligne 12
  ('12', 'Front Populaire', 1, 'metro'),
  ('12', 'Porte de la Chapelle', 2, 'metro'),
  ('12', 'Marx Dormoy', 3, 'metro'),
  ('12', 'Marcadet - Poissonniers', 4, 'metro'),
  ('12', 'Jules Joffrin', 5, 'metro'),
  ('12', 'Lamarck - Caulaincourt', 6, 'metro'),
  ('12', 'Abbesses', 7, 'metro'),
  ('12', 'Pigalle', 8, 'metro'),
  ('12', 'Saint-Georges', 9, 'metro'),
  ('12', 'Notre-Dame-de-Lorette', 10, 'metro')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. PARAMÈTRES GLOBAUX (singleton)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.parametres (id, confettis)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. CARTES DÉMO (pour mode visiteur)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.demo_cards (card_type, label, position, is_active)
VALUES
  ('task', 'Se brosser les dents', 0, true),
  ('task', 'S''habiller', 1, true),
  ('task', 'Prendre son petit-déjeuner', 2, true),
  ('reward', 'Jouer dehors', 0, true)
ON CONFLICT DO NOTHING;

-- Réactiver RLS
SET session_replication_role = DEFAULT;

-- ═══════════════════════════════════════════════════════════════
-- FIN DU SEED
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Seed completed successfully!';
  RAISE NOTICE '🎯 Demo cards and metro stations inserted';
END $$;
