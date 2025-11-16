/**
 * Edge Function: monitoring-alerts
 *
 * Surveille les événements critiques et envoie des alertes :
 * - Erreurs critiques dans les logs (webhooks Stripe, images, etc.)
 * - Quotas dépassés de manière répétée
 * - Pics d'erreurs anormaux
 * - Métriques de santé système
 *
 * Peut être appelé :
 * - Via un cron job externe (ex: GitHub Actions, cron-job.org)
 * - Via un trigger Supabase (sur insertion dans subscription_logs)
 * - Manuellement via POST pour tester
 *
 * Envoie les alertes via :
 * - Slack webhook (configuré via SLACK_WEBHOOK_URL)
 * - Email (via SendGrid, configuré via SENDGRID_API_KEY)
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface AlertConfig {
  /** Nombre d'erreurs max avant alerte (dans la période) */
  errorThreshold: number
  /** Période de surveillance en minutes */
  periodMinutes: number
  /** Quota usage threshold (%) avant alerte */
  quotaThreshold: number
}

const DEFAULT_CONFIG: AlertConfig = {
  errorThreshold: 5, // 5 erreurs en X minutes
  periodMinutes: 60, // 1 heure
  quotaThreshold: 90, // 90% de quota utilisé
}

/**
 * Envoie une alerte via Slack webhook
 */
async function sendSlackAlert(
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL')
  if (!webhookUrl) {
    console.warn('⚠️ SLACK_WEBHOOK_URL non configuré - alerte Slack ignorée')
    return
  }

  try {
    const payload = {
      text: `🚨 *Alerte Appli-Picto*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🚨 *Alerte Appli-Picto*\n\n${message}`,
          },
        },
        ...(details
          ? [
              {
                type: 'section',
                fields: Object.entries(details).map(([key, value]) => ({
                  type: 'mrkdwn',
                  text: `*${key}:*\n${value}`,
                })),
              },
            ]
          : []),
      ],
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('❌ Erreur Slack webhook:', await response.text())
    } else {
      console.log('✅ Alerte Slack envoyée')
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi Slack:", error)
  }
}

/**
 * Envoie une alerte via email (SendGrid)
 */
async function sendEmailAlert(
  to: string,
  subject: string,
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  const sendgridKey = Deno.env.get('SENDGRID_API_KEY')
  const fromEmail = Deno.env.get('ALERT_FROM_EMAIL') || 'alerts@appli-picto.fr'

  if (!sendgridKey) {
    console.warn('⚠️ SENDGRID_API_KEY non configuré - alerte email ignorée')
    return
  }

  try {
    const htmlContent = `
      <h2>🚨 Alerte Appli-Picto</h2>
      <p>${message}</p>
      ${
        details
          ? `
        <h3>Détails:</h3>
        <ul>
          ${Object.entries(details)
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join('')}
        </ul>
      `
          : ''
      }
    `

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: 'Appli-Picto Monitoring' },
        subject,
        content: [
          { type: 'text/plain', value: message },
          { type: 'text/html', value: htmlContent },
        ],
      }),
    })

    if (!response.ok) {
      console.error('❌ Erreur SendGrid:', await response.text())
    } else {
      console.log('✅ Alerte email envoyée')
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi email:", error)
  }
}

/**
 * Vérifie les erreurs critiques récentes
 */
async function checkCriticalErrors(
  supabase: ReturnType<typeof createClient>,
  config: AlertConfig
): Promise<{
  hasAlert: boolean
  message?: string
  details?: Record<string, unknown>
}> {
  const since = new Date(
    Date.now() - config.periodMinutes * 60 * 1000
  ).toISOString()

  // Vérifier les erreurs dans subscription_logs
  const { data: errors, error } = await supabase
    .from('subscription_logs')
    .select('*')
    .eq('event_type', 'webhook.error')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('❌ Erreur lors de la vérification des logs:', error)
    return { hasAlert: false }
  }

  if (errors && errors.length >= config.errorThreshold) {
    return {
      hasAlert: true,
      message: `⚠️ ${errors.length} erreurs webhook détectées dans les ${config.periodMinutes} dernières minutes`,
      details: {
        "Nombre d'erreurs": errors.length,
        Période: `${config.periodMinutes} minutes`,
        'Dernière erreur': (errors[0]?.details as any)?.error || 'N/A',
      },
    }
  }

  return { hasAlert: false }
}

/**
 * Vérifie les quotas dépassés de manière répétée
 */
async function checkQuotaIssues(
  supabase: ReturnType<typeof createClient>,
  config: AlertConfig
): Promise<{
  hasAlert: boolean
  message?: string
  details?: Record<string, unknown>
}> {
  const since = new Date(
    Date.now() - config.periodMinutes * 60 * 1000
  ).toISOString()

  // Récupérer les utilisateurs avec quotas dépassés récemment
  // (on pourrait créer une table de logs de quotas dépassés)
  // Pour l'instant, on vérifie simplement le nombre d'échecs d'upload d'images

  const { data: imageErrors, error } = await supabase
    .from('image_metrics')
    .select('*')
    .eq('result', 'error')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '❌ Erreur lors de la vérification des métriques images:',
      error
    )
    return { hasAlert: false }
  }

  if (imageErrors && imageErrors.length >= config.errorThreshold) {
    return {
      hasAlert: true,
      message: `⚠️ ${imageErrors.length} erreurs d'upload d'images détectées`,
      details: {
        "Nombre d'erreurs": imageErrors.length,
        Période: `${config.periodMinutes} minutes`,
      },
    }
  }

  return { hasAlert: false }
}

/**
 * Vérifie la santé globale du système
 */
async function checkSystemHealth(
  supabase: ReturnType<typeof createClient>
): Promise<{
  hasAlert: boolean
  message?: string
  details?: Record<string, unknown>
}> {
  try {
    // Test de connectivité simple
    const { error } = await supabase
      .from('subscription_logs')
      .select('id')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = pas de résultats (normal)
      return {
        hasAlert: true,
        message: '❌ Problème de connectivité Supabase détecté',
        details: {
          'Code erreur': error.code,
          Message: error.message,
        },
      }
    }

    return { hasAlert: false }
  } catch (error) {
    return {
      hasAlert: true,
      message: '❌ Exception lors du health check',
      details: {
        Erreur: String(error),
      },
    }
  }
}

serve(async req => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Créer le client Supabase admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Configuration (peut être overridée via body)
    let config = DEFAULT_CONFIG

    if (req.method === 'POST') {
      try {
        const body: any = await req.json()
        if (body.config) {
          config = { ...DEFAULT_CONFIG, ...body.config }
        }
      } catch {
        // Ignore si pas de body ou body invalide
      }
    }

    console.log('🔍 Vérification des alertes...', config)

    // Vérifier toutes les conditions
    const [errorCheck, quotaCheck, healthCheck] = await Promise.all([
      checkCriticalErrors(supabase, config),
      checkQuotaIssues(supabase, config),
      checkSystemHealth(supabase),
    ])

    const alerts = [errorCheck, quotaCheck, healthCheck].filter(
      check => check.hasAlert
    )

    // Envoyer les alertes si nécessaire
    const alertEmail = Deno.env.get('ALERT_EMAIL') || 'admin@appli-picto.fr'

    for (const alert of alerts) {
      if (alert.message) {
        // Envoyer via Slack
        await sendSlackAlert(alert.message, alert.details)

        // Envoyer via email
        await sendEmailAlert(
          alertEmail,
          `🚨 Alerte Appli-Picto`,
          alert.message,
          alert.details
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts: alerts.length,
        checks: {
          errors: errorCheck.hasAlert,
          quotas: quotaCheck.hasAlert,
          health: healthCheck.hasAlert,
        },
        messages: alerts.map(a => a.message),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Erreur dans monitoring-alerts:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
