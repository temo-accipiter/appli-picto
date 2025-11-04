-- Migration : Enrichissement table user_assets pour système moderne d'images
-- Date : 2025-10-24
-- Auteur : Claude Code
-- Objectif : Ajouter colonnes pour versioning, déduplication, dimensions, soft delete

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. AJOUT COLONNES MODERNES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.user_assets
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS sha256_hash TEXT,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

-- Note : Les colonnes cloudinary_* seront ajoutées en Phase B (Cloudinary)

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. INDEX POUR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════

-- Index hash SHA-256 (déduplication rapide)
CREATE INDEX IF NOT EXISTS idx_user_assets_sha256
  ON public.user_assets(sha256_hash)
  WHERE sha256_hash IS NOT NULL;

-- Index version (récupération versions)
CREATE INDEX IF NOT EXISTS idx_user_assets_version
  ON public.user_assets(user_id, asset_type, version);

-- Index soft delete (filtrage assets actifs)
CREATE INDEX IF NOT EXISTS idx_user_assets_deleted
  ON public.user_assets(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CONTRAINTE UNICITÉ HASH (DÉDUPLICATION)
-- ═══════════════════════════════════════════════════════════════════════════

-- Un même hash ne peut exister qu'une fois par utilisateur (évite uploads identiques)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_assets_unique_hash
  ON public.user_assets(user_id, sha256_hash)
  WHERE sha256_hash IS NOT NULL AND deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. COMMENTAIRES DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN public.user_assets.version IS
  'Version de l''image (incrémenté à chaque remplacement). Permet historique et rollback.';

COMMENT ON COLUMN public.user_assets.sha256_hash IS
  'Hash SHA-256 du fichier pour déduplication. Évite uploads identiques (économie storage).';

COMMENT ON COLUMN public.user_assets.width IS
  'Largeur image en pixels (extrait après upload). NULL si extraction échoue.';

COMMENT ON COLUMN public.user_assets.height IS
  'Hauteur image en pixels (extrait après upload). NULL si extraction échoue.';

COMMENT ON COLUMN public.user_assets.deleted_at IS
  'Soft delete timestamp. NULL = actif, NOT NULL = supprimé (conservé 90 jours).';

COMMENT ON COLUMN public.user_assets.migrated_at IS
  'Date migration vers nouveau système. NULL = ancien système, NOT NULL = migré.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VÉRIFICATION MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Afficher résumé colonnes ajoutées
DO $$
BEGIN
  RAISE NOTICE '✅ Migration enhance_user_assets appliquée avec succès';
  RAISE NOTICE '📊 Colonnes ajoutées : version, sha256_hash, width, height, deleted_at, migrated_at';
  RAISE NOTICE '🔍 Index créés : idx_user_assets_sha256, idx_user_assets_version, idx_user_assets_deleted';
  RAISE NOTICE '🔒 Contrainte unicité : idx_user_assets_unique_hash (user_id, sha256_hash)';
END $$;
