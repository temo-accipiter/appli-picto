-- Migration: Seed roles and role_quotas tables
-- Description: Populate roles (visitor, free, abonne, admin, staff) and their quotas

-- ====================
-- 1. INSERT ROLES
-- ====================

INSERT INTO public.roles (id, name, display_name, description, priority, is_active, created_at, updated_at)
VALUES
  -- Visitor (non-authenticated users, demo mode)
  (gen_random_uuid(), 'visitor', 'Visiteur', 'Utilisateur non connecté en mode démo', 0, true, now(), now()),

  -- Free (authenticated users without subscription)
  (gen_random_uuid(), 'free', 'Gratuit', 'Utilisateur gratuit avec quotas limités', 10, true, now(), now()),

  -- Abonné (paid subscribers)
  (gen_random_uuid(), 'abonne', 'Abonné', 'Abonné payant avec quotas étendus', 20, true, now(), now()),

  -- Admin (administrators, unlimited access)
  (gen_random_uuid(), 'admin', 'Administrateur', 'Administrateur avec accès illimité', 100, true, now(), now()),

  -- Staff (support team, future use)
  (gen_random_uuid(), 'staff', 'Staff', 'Équipe de support', 90, true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- ====================
-- 2. INSERT ROLE_QUOTAS
-- ====================

-- Get role IDs for quota assignments
DO $$
DECLARE
  v_visitor_id uuid;
  v_free_id uuid;
  v_abonne_id uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO v_visitor_id FROM public.roles WHERE name = 'visitor';
  SELECT id INTO v_free_id FROM public.roles WHERE name = 'free';
  SELECT id INTO v_abonne_id FROM public.roles WHERE name = 'abonne';

  -- Check if quotas already exist (idempotent migration)
  IF NOT EXISTS (SELECT 1 FROM public.role_quotas WHERE role_id = v_free_id) THEN
    
    -- ====================
    -- VISITOR QUOTAS (demo mode)
    -- ====================
    -- 3 predefined tasks only, no rewards, no categories, no images
    INSERT INTO public.role_quotas (role_id, quota_type, quota_limit, quota_period)
    VALUES
      (v_visitor_id, 'max_tasks', 3, 'total'),
      (v_visitor_id, 'max_rewards', 0, 'total'),
      (v_visitor_id, 'max_categories', 0, 'total'),
      (v_visitor_id, 'max_task_images', 0, 'total'),
      (v_visitor_id, 'max_reward_images', 0, 'total'),
      (v_visitor_id, 'max_total_images', 0, 'total');

    -- ====================
    -- FREE QUOTAS
    -- ====================
    -- Limited quotas: 5 tasks/month, 2 rewards/month, 2 categories, 5 task images, 2 reward images
    INSERT INTO public.role_quotas (role_id, quota_type, quota_limit, quota_period)
    VALUES
      (v_free_id, 'max_tasks', 5, 'monthly'),
      (v_free_id, 'max_rewards', 2, 'monthly'),
      (v_free_id, 'max_categories', 2, 'total'),
      (v_free_id, 'max_task_images', 5, 'total'),
      (v_free_id, 'max_reward_images', 2, 'total'),
      (v_free_id, 'max_total_images', 7, 'total'),
      (v_free_id, 'max_image_size', 102400, 'total'),  -- 100KB per image
      (v_free_id, 'max_total_images_size', 716800, 'total');  -- 700KB total (7 images * 100KB)

    -- ====================
    -- ABONNÉ QUOTAS
    -- ====================
    -- Full quotas: 40 tasks, 10 rewards, 50 categories, 40 task images, 10 reward images
    INSERT INTO public.role_quotas (role_id, quota_type, quota_limit, quota_period)
    VALUES
      (v_abonne_id, 'max_tasks', 40, 'total'),
      (v_abonne_id, 'max_rewards', 10, 'total'),
      (v_abonne_id, 'max_categories', 50, 'total'),
      (v_abonne_id, 'max_task_images', 40, 'total'),
      (v_abonne_id, 'max_reward_images', 10, 'total'),
      (v_abonne_id, 'max_total_images', 50, 'total'),
      (v_abonne_id, 'max_image_size', 102400, 'total'),  -- 100KB per image
      (v_abonne_id, 'max_total_images_size', 5120000, 'total');  -- 5MB total (50 images * 100KB)

  END IF;

END $$;

-- Note: Admin and Staff roles don't need quotas (unlimited by default in application logic)
