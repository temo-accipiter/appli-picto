-- scripts/test-verify-metrics.sql
-- Script de vérification des métriques après upload test

-- 1. Vérifier dernière image uploadée dans user_assets
SELECT
  id,
  user_id,
  asset_type,
  file_path,
  mime_type,
  file_size,
  version,
  sha256_hash,
  width,
  height,
  created_at
FROM user_assets
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- 2. Vérifier métrique correspondante dans image_metrics
SELECT
  id,
  user_id,
  asset_type,
  original_size,
  compressed_size,
  compression_ratio,
  conversion_ms,
  upload_ms,
  result,
  mime_type_original,
  mime_type_final,
  conversion_method,
  created_at
FROM image_metrics
ORDER BY created_at DESC
LIMIT 1;

-- 3. Vérifier statistiques globales (ce que voit le dashboard admin)
SELECT check_image_quota(
  (SELECT id FROM auth.users WHERE email LIKE '%admin%' OR email LIKE '%test%' LIMIT 1),
  'task_image',
  20000
);

-- 4. Compter total images par type (pour vérifier quotas)
SELECT
  asset_type,
  COUNT(*) as total,
  SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as actives,
  SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as supprimees
FROM user_assets
GROUP BY asset_type;
