-- Migration: Vues pour métriques agrégées de monitoring
-- Créé le: 2025-01-09
-- Description: Ajoute des vues SQL pour simplifier les requêtes de métriques dans le dashboard admin

-- Vue: Statistiques utilisateurs hebdomadaires
CREATE OR REPLACE VIEW public.weekly_user_stats AS
SELECT
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_users_7d,
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '7 days') AS active_users_7d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_users_30d
FROM auth.users
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.weekly_user_stats IS 'Statistiques utilisateurs agrégées (7 et 30 derniers jours)';

-- Vue: Statistiques abonnements
CREATE OR REPLACE VIEW public.subscription_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'active') AS active_subscriptions,
  COUNT(*) FILTER (WHERE status = 'canceled') AS canceled_subscriptions,
  COUNT(*) FILTER (WHERE status = 'past_due') AS past_due_subscriptions,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_subscriptions_7d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_subscriptions_30d
FROM public.abonnements;

COMMENT ON VIEW public.subscription_stats IS 'Statistiques abonnements agrégées';

-- Vue: Erreurs récentes (7 derniers jours)
CREATE OR REPLACE VIEW public.recent_errors AS
SELECT
  event_type,
  COUNT(*) AS error_count,
  MAX(timestamp) AS last_occurrence,
  jsonb_agg(DISTINCT details->>'error' ORDER BY details->>'error') FILTER (WHERE details->>'error' IS NOT NULL) AS error_messages
FROM public.subscription_logs
WHERE event_type LIKE '%error%'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY event_type;

COMMENT ON VIEW public.recent_errors IS 'Agrégation des erreurs des 7 derniers jours';

-- Vue: Métriques images hebdomadaires
CREATE OR REPLACE VIEW public.weekly_image_stats AS
SELECT
  COUNT(*) AS total_uploads,
  COUNT(*) FILTER (WHERE result = 'success') AS successful_uploads,
  COUNT(*) FILTER (WHERE result = 'error') AS failed_uploads,
  ROUND(AVG(compression_ratio) * 100, 2) AS avg_compression_ratio_pct,
  ROUND(AVG(conversion_ms), 0) AS avg_conversion_ms,
  ROUND(AVG(upload_ms), 0) AS avg_upload_ms,
  ROUND(SUM(original_size - compressed_size) / 1024.0 / 1024.0, 2) AS storage_saved_mb
FROM public.image_metrics
WHERE created_at >= NOW() - INTERVAL '7 days';

COMMENT ON VIEW public.weekly_image_stats IS 'Statistiques images des 7 derniers jours';

-- Vue: Santé système (score basé sur taux d'erreurs)
CREATE OR REPLACE VIEW public.system_health AS
SELECT
  -- Score de santé (0-100) basé sur le taux d'erreurs
  ROUND(
    100 - (
      COALESCE(
        (
          SELECT COUNT(*)::float
          FROM public.subscription_logs
          WHERE event_type LIKE '%error%'
            AND timestamp >= NOW() - INTERVAL '24 hours'
        ) / NULLIF(
          (
            SELECT COUNT(*)::float
            FROM public.subscription_logs
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
          ), 0
        ) * 100,
        0
      )
    ),
    2
  ) AS health_score_24h,

  -- Nombre total d'événements (dernières 24h)
  (
    SELECT COUNT(*)
    FROM public.subscription_logs
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
  ) AS total_events_24h,

  -- Nombre d'erreurs (dernières 24h)
  (
    SELECT COUNT(*)
    FROM public.subscription_logs
    WHERE event_type LIKE '%error%'
      AND timestamp >= NOW() - INTERVAL '24 hours'
  ) AS total_errors_24h,

  -- Dernière erreur
  (
    SELECT jsonb_build_object(
      'type', event_type,
      'timestamp', timestamp,
      'details', details
    )
    FROM public.subscription_logs
    WHERE event_type LIKE '%error%'
    ORDER BY timestamp DESC
    LIMIT 1
  ) AS last_error;

COMMENT ON VIEW public.system_health IS 'Métriques de santé système (dernières 24h)';

-- Fonction RPC: Récupérer toutes les métriques du dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'users', (SELECT row_to_json(weekly_user_stats.*) FROM weekly_user_stats),
    'subscriptions', (SELECT row_to_json(subscription_stats.*) FROM subscription_stats),
    'images', (SELECT row_to_json(weekly_image_stats.*) FROM weekly_image_stats),
    'health', (SELECT row_to_json(system_health.*) FROM system_health),
    'recent_errors', (SELECT jsonb_agg(row_to_json(recent_errors.*)) FROM recent_errors)
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_metrics() IS 'Récupère toutes les métriques du dashboard en une seule requête';

-- Grant permissions pour les admins
GRANT SELECT ON public.weekly_user_stats TO authenticated;
GRANT SELECT ON public.subscription_stats TO authenticated;
GRANT SELECT ON public.recent_errors TO authenticated;
GRANT SELECT ON public.weekly_image_stats TO authenticated;
GRANT SELECT ON public.system_health TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO authenticated;

-- RLS : Seuls les admins peuvent voir ces vues
ALTER VIEW public.weekly_user_stats SET (security_invoker = on);
ALTER VIEW public.subscription_stats SET (security_invoker = on);
ALTER VIEW public.recent_errors SET (security_invoker = on);
ALTER VIEW public.weekly_image_stats SET (security_invoker = on);
ALTER VIEW public.system_health SET (security_invoker = on);

-- Note: Les vues héritent des RLS policies des tables sous-jacentes
-- Les admins ont déjà accès via les policies existantes
