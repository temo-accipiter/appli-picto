-- Migration : Fonction RPC check_duplicate_image() pour déduplication
-- Date : 2025-10-24
-- Auteur : Claude Code
-- Objectif : Vérifier si un hash SHA-256 existe déjà avant upload (économie storage)

-- ═══════════════════════════════════════════════════════════════════════════
-- FONCTION : check_duplicate_image()
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_duplicate_image(
  p_user_id UUID,
  p_sha256_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- 1️⃣ VÉRIFICATION PERMISSION (self ou admin)
  -- ─────────────────────────────────────────────────────────────
  PERFORM public.assert_self_or_admin(p_user_id);

  -- ─────────────────────────────────────────────────────────────
  -- 2️⃣ RECHERCHE HASH EXISTANT (non supprimé)
  -- ─────────────────────────────────────────────────────────────
  SELECT id, file_path, width, height, version, asset_type
  INTO v_existing
  FROM public.user_assets
  WHERE user_id = p_user_id
    AND sha256_hash = p_sha256_hash
    AND deleted_at IS NULL -- Seulement assets actifs
  LIMIT 1;

  -- ─────────────────────────────────────────────────────────────
  -- 3️⃣ RÉSULTAT
  -- ─────────────────────────────────────────────────────────────
  IF v_existing.id IS NOT NULL THEN
    -- ✅ Hash existe déjà → retourner infos asset
    RETURN jsonb_build_object(
      'exists', true,
      'asset_id', v_existing.id,
      'file_path', v_existing.file_path,
      'width', v_existing.width,
      'height', v_existing.height,
      'version', v_existing.version,
      'asset_type', v_existing.asset_type
    );
  ELSE
    -- ❌ Hash nouveau → autoriser upload
    RETURN jsonb_build_object('exists', false);
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.check_duplicate_image(UUID, TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTAIRE DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION public.check_duplicate_image(UUID, TEXT) IS
  'Vérifie si un hash SHA-256 existe déjà pour un utilisateur (déduplication). '
  'Retourne {exists: true, asset_id, file_path, ...} si trouvé, sinon {exists: false}.';

-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Migration add_check_duplicate_image appliquée avec succès';
  RAISE NOTICE '📦 Fonction RPC : check_duplicate_image(user_id, sha256_hash)';
  RAISE NOTICE '🎯 Usage : Appeler AVANT upload pour vérifier duplication';
END $$;
