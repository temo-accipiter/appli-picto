-- Migration : Fonction RPC check_image_quota() pour vérification quotas
-- Date : 2025-10-24
-- Auteur : Claude Code
-- Objectif : Vérifier quotas AVANT upload (tâches, récompenses, taille totale)

-- ═══════════════════════════════════════════════════════════════════════════
-- FONCTION : check_image_quota()
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_image_quota(
  p_user_id UUID,
  p_asset_type TEXT,
  p_file_size BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_name TEXT;
  v_current_count INTEGER;
  v_max_tasks INTEGER;
  v_max_rewards INTEGER;
  v_total_storage BIGINT;
  v_max_storage BIGINT := 100 * 1024 * 1024; -- 100 Mo par défaut
  v_reason TEXT;
BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- 1️⃣ VÉRIFICATION PERMISSION (self ou admin)
  -- ─────────────────────────────────────────────────────────────
  PERFORM public.assert_self_or_admin(p_user_id);

  -- ─────────────────────────────────────────────────────────────
  -- 2️⃣ RÉCUPÉRER RÔLE UTILISATEUR
  -- ─────────────────────────────────────────────────────────────
  SELECT r.name INTO v_role_name
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = true
  ORDER BY r.priority DESC
  LIMIT 1;

  -- Admin → aucune limite
  IF v_role_name = 'admin' THEN
    RETURN jsonb_build_object(
      'can_upload', true,
      'reason', 'admin_unlimited'
    );
  END IF;

  -- Fallback rôle si non trouvé
  IF v_role_name IS NULL THEN
    v_role_name := 'free';
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 3️⃣ RÉCUPÉRER QUOTAS SELON RÔLE
  -- ─────────────────────────────────────────────────────────────
  -- Free : 5 tâches, 2 récompenses
  -- Abonné : 40 tâches, 10 récompenses
  IF v_role_name = 'abonne' THEN
    v_max_tasks := 40;
    v_max_rewards := 10;
    v_max_storage := 500 * 1024 * 1024; -- 500 Mo
  ELSE
    -- Free
    v_max_tasks := 5;
    v_max_rewards := 2;
    v_max_storage := 50 * 1024 * 1024; -- 50 Mo
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 4️⃣ VÉRIFICATION QUOTA IMAGES (task_image ou reward_image)
  -- ─────────────────────────────────────────────────────────────
  IF p_asset_type = 'task_image' THEN
    -- Compter tâches actuelles (user_assets actifs)
    SELECT COUNT(*) INTO v_current_count
    FROM public.user_assets
    WHERE user_id = p_user_id
      AND asset_type = 'task_image'
      AND deleted_at IS NULL;

    IF v_current_count >= v_max_tasks THEN
      v_reason := 'task_image_limit_reached';
      RETURN jsonb_build_object(
        'can_upload', false,
        'reason', v_reason,
        'current', v_current_count,
        'max', v_max_tasks
      );
    END IF;

  ELSIF p_asset_type = 'reward_image' THEN
    -- Compter récompenses actuelles
    SELECT COUNT(*) INTO v_current_count
    FROM public.user_assets
    WHERE user_id = p_user_id
      AND asset_type = 'reward_image'
      AND deleted_at IS NULL;

    IF v_current_count >= v_max_rewards THEN
      v_reason := 'reward_image_limit_reached';
      RETURN jsonb_build_object(
        'can_upload', false,
        'reason', v_reason,
        'current', v_current_count,
        'max', v_max_rewards
      );
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 5️⃣ VÉRIFICATION QUOTA STORAGE TOTAL
  -- ─────────────────────────────────────────────────────────────
  SELECT COALESCE(SUM(file_size), 0) INTO v_total_storage
  FROM public.user_assets
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  IF (v_total_storage + p_file_size) > v_max_storage THEN
    v_reason := 'total_storage_limit_reached';
    RETURN jsonb_build_object(
      'can_upload', false,
      'reason', v_reason,
      'current_storage_mb', ROUND(v_total_storage / 1048576.0, 2),
      'max_storage_mb', ROUND(v_max_storage / 1048576.0, 2)
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 6️⃣ VÉRIFICATION TAILLE FICHIER (10 Mo max)
  -- ─────────────────────────────────────────────────────────────
  IF p_file_size > (10 * 1024 * 1024) THEN
    v_reason := 'image_too_large';
    RETURN jsonb_build_object(
      'can_upload', false,
      'reason', v_reason,
      'file_size_mb', ROUND(p_file_size / 1048576.0, 2),
      'max_file_size_mb', 10
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 7️⃣ AUTORISÉ ✅
  -- ─────────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'can_upload', true,
    'reason', 'quota_ok',
    'role', v_role_name
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.check_image_quota(UUID, TEXT, BIGINT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTAIRE DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION public.check_image_quota(UUID, TEXT, BIGINT) IS
  'Vérifie quotas AVANT upload image (tâches, récompenses, storage total). '
  'Paramètres : user_id, asset_type (task_image|reward_image), file_size (bytes). '
  'Retourne {can_upload: bool, reason: string, current?, max?}.';

-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Migration add_check_image_quota appliquée avec succès';
  RAISE NOTICE '📦 Fonction RPC : check_image_quota(user_id, asset_type, file_size)';
  RAISE NOTICE '🎯 Usage : Appeler AVANT upload pour vérifier quotas';
  RAISE NOTICE '📊 Quotas Free : 5 tâches, 2 récompenses, 50 Mo';
  RAISE NOTICE '📊 Quotas Abonné : 40 tâches, 10 récompenses, 500 Mo';
END $$;
