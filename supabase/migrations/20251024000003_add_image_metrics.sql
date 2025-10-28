-- Migration : Table image_metrics pour monitoring uploads
-- Date : 2025-10-24
-- Auteur : Claude Code
-- Objectif : Tracker métriques uploads (compression ratio, performance, erreurs)

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLE image_metrics
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.image_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('task_image', 'reward_image')),

  -- ─────────────────────────────────────────────────────────────
  -- Métriques compression
  -- ─────────────────────────────────────────────────────────────
  original_size BIGINT NOT NULL CHECK (original_size >= 0),
  compressed_size BIGINT NOT NULL CHECK (compressed_size >= 0),

  -- Ratio compression calculé automatiquement (colonne GENERATED)
  compression_ratio NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN original_size > 0 THEN
        ROUND((1 - (compressed_size::numeric / original_size::numeric)) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- ─────────────────────────────────────────────────────────────
  -- Performance (millisecondes)
  -- ─────────────────────────────────────────────────────────────
  conversion_ms INTEGER CHECK (conversion_ms >= 0),
  upload_ms INTEGER CHECK (upload_ms >= 0),

  -- ─────────────────────────────────────────────────────────────
  -- Résultat upload
  -- ─────────────────────────────────────────────────────────────
  result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'fallback_original')),
  error_message TEXT,

  -- ─────────────────────────────────────────────────────────────
  -- Contexte technique
  -- ─────────────────────────────────────────────────────────────
  mime_type_original TEXT,
  mime_type_final TEXT,
  conversion_method TEXT CHECK (
    conversion_method IN (
      'client_webp',
      'heic_to_jpeg_then_webp',
      'heic_to_jpeg_only',
      'none',
      'svg_unchanged',
      'fallback_original'
    )
  ),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. INDEX POUR ANALYTICS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_image_metrics_user
  ON public.image_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_image_metrics_result
  ON public.image_metrics(result);

CREATE INDEX IF NOT EXISTS idx_image_metrics_date
  ON public.image_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_metrics_asset_type
  ON public.image_metrics(asset_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.image_metrics ENABLE ROW LEVEL SECURITY;

-- Politique : Users voient leurs propres metrics
CREATE POLICY "Users can view own metrics"
  ON public.image_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : Users peuvent insérer leurs propres metrics
CREATE POLICY "Users can insert own metrics"
  ON public.image_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : Admins voient toutes les metrics
CREATE POLICY "Admins can view all metrics"
  ON public.image_metrics
  FOR SELECT
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT ON public.image_metrics TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. COMMENTAIRES DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.image_metrics IS
  'Métriques uploads images : compression ratio, performance, erreurs (analytics).';

COMMENT ON COLUMN public.image_metrics.compression_ratio IS
  'Ratio compression en % (calculé automatiquement). Ex: 75.50 = 75.5% de réduction.';

COMMENT ON COLUMN public.image_metrics.conversion_method IS
  'Méthode conversion utilisée : client_webp (direct), heic_to_jpeg_then_webp (iPhone), etc.';

COMMENT ON COLUMN public.image_metrics.result IS
  'Résultat upload : success (réussi), failed (échoué), fallback_original (original accepté).';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. FONCTION RPC : get_image_analytics_summary() (ADMIN ONLY)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_image_analytics_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- Admins uniquement
  -- ─────────────────────────────────────────────────────────────
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admins only' USING ERRCODE = '42501';
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- Statistiques globales (7 derniers jours)
  -- ─────────────────────────────────────────────────────────────
  RETURN (
    SELECT jsonb_build_object(
      'period_days', 7,
      'total_uploads', COUNT(*),
      'success_count', COUNT(*) FILTER (WHERE result = 'success'),
      'failed_count', COUNT(*) FILTER (WHERE result = 'failed'),
      'fallback_count', COUNT(*) FILTER (WHERE result = 'fallback_original'),
      'avg_compression_ratio', ROUND(AVG(compression_ratio), 2),
      'avg_conversion_ms', ROUND(AVG(conversion_ms), 0),
      'avg_upload_ms', ROUND(AVG(upload_ms), 0),
      'total_storage_saved_mb', ROUND(SUM(original_size - compressed_size) / 1048576.0, 2),
      'webp_conversions', COUNT(*) FILTER (WHERE conversion_method = 'client_webp'),
      'heic_conversions', COUNT(*) FILTER (WHERE conversion_method LIKE 'heic%')
    )
    FROM public.image_metrics
    WHERE created_at > NOW() - INTERVAL '7 days'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_image_analytics_summary() TO authenticated;

COMMENT ON FUNCTION public.get_image_analytics_summary IS
  'Statistiques uploads 7 derniers jours (admins uniquement). '
  'Retourne métriques globales : uploads totaux, taux succès, compression moyenne, etc.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. VÉRIFICATION MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Migration add_image_metrics appliquée avec succès';
  RAISE NOTICE '📊 Table créée : image_metrics (compression ratio, performance, erreurs)';
  RAISE NOTICE '🔍 Index créés : user, result, date, asset_type';
  RAISE NOTICE '🔒 RLS activée : users voient leurs metrics, admins voient tout';
  RAISE NOTICE '📈 Fonction analytics : get_image_analytics_summary() (admins)';
END $$;
