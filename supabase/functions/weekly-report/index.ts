/**
 * Edge Function: weekly-report
 *
 * Génère et envoie un rapport hebdomadaire des métriques clés :
 * - Nouveaux utilisateurs
 * - Abonnements actifs/annulés
 * - Erreurs webhook / images
 * - Quotas utilisés
 * - Performances système
 * - Core Web Vitals (si collectées)
 *
 * Envoi via email (SendGrid) à la liste d'admin
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface WeeklyStats {
  period: {
    start: string
    end: string
  }
  users: {
    total: number
    new: number
    active: number
  }
  subscriptions: {
    active: number
    new: number
    cancelled: number
  }
  errors: {
    webhooks: number
    images: number
  }
  images: {
    total: number
    compressed: number
    avgCompressionRatio: number
    storageSaved: number
  }
}

/**
 * Récupère les statistiques utilisateurs
 */
async function getUserStats(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  weekStart: Date
): Promise<WeeklyStats['users']> {
  // Total utilisateurs
  const { count: total } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  // Nouveaux utilisateurs cette semaine
  const { count: newUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart.toISOString())

  // Utilisateurs actifs (ayant créé au moins une tâche cette semaine)
  const { data: activeTasks } = await supabase
    .from('taches')
    .select('user_id')
    .gte('created_at', weekStart.toISOString())

  const activeUsers = new Set(activeTasks?.map(t => t.user_id) || []).size

  return {
    total: total || 0,
    new: newUsers || 0,
    active: activeUsers,
  }
}

/**
 * Récupère les statistiques d'abonnements
 */
async function getSubscriptionStats(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  weekStart: Date
): Promise<WeeklyStats['subscriptions']> {
  // Abonnements actifs
  const { count: active } = await supabase
    .from('abonnements')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Nouveaux abonnements cette semaine
  const { count: newSubs } = await supabase
    .from('subscription_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'subscription.upserted')
    .gte('timestamp', weekStart.toISOString())

  // Abonnements annulés cette semaine
  const { count: cancelled } = await supabase
    .from('subscription_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'webhook.customer.subscription.deleted')
    .gte('timestamp', weekStart.toISOString())

  return {
    active: active || 0,
    new: newSubs || 0,
    cancelled: cancelled || 0,
  }
}

/**
 * Récupère les statistiques d'erreurs
 */
async function getErrorStats(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  weekStart: Date
): Promise<WeeklyStats['errors']> {
  // Erreurs webhook
  const { count: webhooks } = await supabase
    .from('subscription_logs')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'webhook.error')
    .gte('timestamp', weekStart.toISOString())

  // Erreurs images
  const { count: images } = await supabase
    .from('image_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('result', 'error')
    .gte('created_at', weekStart.toISOString())

  return {
    webhooks: webhooks || 0,
    images: images || 0,
  }
}

/**
 * Récupère les statistiques d'images
 */
async function getImageStats(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  weekStart: Date
): Promise<WeeklyStats['images']> {
  const { data: metrics } = await supabase
    .from('image_metrics')
    .select('*')
    .eq('result', 'success')
    .gte('created_at', weekStart.toISOString())

  if (!metrics || metrics.length === 0) {
    return {
      total: 0,
      compressed: 0,
      avgCompressionRatio: 0,
      storageSaved: 0,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metricsTyped = metrics as any[]
  const compressed = metricsTyped.filter(m => m.compression_ratio > 0).length
  const avgRatio =
    metricsTyped.reduce((sum, m) => sum + (m.compression_ratio || 0), 0) /
    metricsTyped.length
  const storageSaved =
    metricsTyped.reduce(
      (sum, m) => sum + ((m.original_size || 0) - (m.compressed_size || 0)),
      0
    ) /
    (1024 * 1024) // Convert to MB

  return {
    total: metrics.length,
    compressed,
    avgCompressionRatio: avgRatio * 100,
    storageSaved: Math.round(storageSaved * 100) / 100,
  }
}

/**
 * Génère le contenu HTML du rapport
 */
function generateReportHTML(stats: WeeklyStats): string {
  const { period, users, subscriptions, errors, images } = stats

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #6B4FBB; border-bottom: 3px solid #6B4FBB; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; border-left: 4px solid #6B4FBB; padding-left: 15px; }
    .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .metric-title { font-weight: bold; color: #6B4FBB; font-size: 14px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #333; margin: 5px 0; }
    .metric-subtitle { color: #666; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .good { color: #10b981; }
    .warning { color: #f59e0b; }
    .error { color: #ef4444; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>📊 Rapport Hebdomadaire Appli-Picto</h1>
  <p><strong>Période:</strong> ${new Date(period.start).toLocaleDateString('fr-FR')} - ${new Date(period.end).toLocaleDateString('fr-FR')}</p>

  <h2>👥 Utilisateurs</h2>
  <div class="grid">
    <div class="metric">
      <div class="metric-title">Total Utilisateurs</div>
      <div class="metric-value">${users.total}</div>
    </div>
    <div class="metric">
      <div class="metric-title">Nouveaux cette semaine</div>
      <div class="metric-value ${users.new > 0 ? 'good' : ''}">${users.new}</div>
    </div>
    <div class="metric">
      <div class="metric-title">Actifs cette semaine</div>
      <div class="metric-value">${users.active}</div>
      <div class="metric-subtitle">${users.total > 0 ? Math.round((users.active / users.total) * 100) : 0}% du total</div>
    </div>
  </div>

  <h2>💳 Abonnements</h2>
  <div class="grid">
    <div class="metric">
      <div class="metric-title">Abonnements Actifs</div>
      <div class="metric-value good">${subscriptions.active}</div>
    </div>
    <div class="metric">
      <div class="metric-title">Nouveaux</div>
      <div class="metric-value ${subscriptions.new > 0 ? 'good' : ''}">${subscriptions.new}</div>
    </div>
    <div class="metric">
      <div class="metric-title">Annulés</div>
      <div class="metric-value ${subscriptions.cancelled > 0 ? 'warning' : ''}">${subscriptions.cancelled}</div>
    </div>
  </div>

  <h2>🖼️ Images</h2>
  <div class="grid">
    <div class="metric">
      <div class="metric-title">Uploads cette semaine</div>
      <div class="metric-value">${images.total}</div>
    </div>
    <div class="metric">
      <div class="metric-title">Taux de compression</div>
      <div class="metric-value">${Math.round(images.avgCompressionRatio)}%</div>
      <div class="metric-subtitle">${images.compressed} images compressées</div>
    </div>
    <div class="metric">
      <div class="metric-title">Stockage économisé</div>
      <div class="metric-value good">${images.storageSaved} MB</div>
    </div>
  </div>

  <h2>⚠️ Erreurs</h2>
  <div class="grid">
    <div class="metric">
      <div class="metric-title">Erreurs Webhooks</div>
      <div class="metric-value ${errors.webhooks > 0 ? 'error' : 'good'}">${errors.webhooks}</div>
    </div>
    <div class="metric">
      <div class="metric-title">Erreurs Images</div>
      <div class="metric-value ${errors.images > 0 ? 'warning' : 'good'}">${errors.images}</div>
    </div>
  </div>

  <div class="footer">
    <p>Ce rapport est généré automatiquement chaque semaine.</p>
    <p>Pour plus de détails, consultez le dashboard admin: <a href="https://appli-picto.fr/admin/logs">https://appli-picto.fr/admin/logs</a></p>
  </div>
</body>
</html>
  `
}

/**
 * Envoie le rapport par email
 */
async function sendReport(
  stats: WeeklyStats,
  recipients: string[]
): Promise<void> {
  const sendgridKey = Deno.env.get('SENDGRID_API_KEY')
  const fromEmail =
    Deno.env.get('REPORT_FROM_EMAIL') || 'reports@appli-picto.fr'

  if (!sendgridKey) {
    throw new Error('SENDGRID_API_KEY non configuré')
  }

  const htmlContent = generateReportHTML(stats)
  const startDate = new Date(stats.period.start).toLocaleDateString('fr-FR')
  const endDate = new Date(stats.period.end).toLocaleDateString('fr-FR')

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendgridKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: recipients.map(email => ({ to: [{ email }] })),
      from: { email: fromEmail, name: 'Appli-Picto Reports' },
      subject: `📊 Rapport hebdomadaire Appli-Picto (${startDate} - ${endDate})`,
      content: [
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Erreur SendGrid: ${error}`)
  }

  console.log(`✅ Rapport envoyé à ${recipients.length} destinataire(s)`)
}

serve(async req => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Période: 7 derniers jours
    const weekEnd = new Date()
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    console.log(`📊 Génération du rapport hebdomadaire...`)
    console.log(
      `Période: ${weekStart.toISOString()} - ${weekEnd.toISOString()}`
    )

    // Récupérer toutes les stats en parallèle
    const [users, subscriptions, errors, images] = await Promise.all([
      getUserStats(supabase, weekStart),
      getSubscriptionStats(supabase, weekStart),
      getErrorStats(supabase, weekStart),
      getImageStats(supabase, weekStart),
    ])

    const stats: WeeklyStats = {
      period: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      users,
      subscriptions,
      errors,
      images,
    }

    // Recipients (depuis env ou body)
    let recipients: string[] = []
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        recipients = body.recipients || []
      } catch {
        // Ignore
      }
    }

    // Fallback sur env
    if (recipients.length === 0) {
      const defaultRecipients = Deno.env.get('REPORT_RECIPIENTS')
      if (defaultRecipients) {
        recipients = defaultRecipients.split(',').map(e => e.trim())
      }
    }

    // Envoyer le rapport si destinataires configurés
    if (recipients.length > 0) {
      await sendReport(stats, recipients)
    } else {
      console.warn('⚠️ Aucun destinataire configuré, rapport non envoyé')
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        recipients: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Erreur dans weekly-report:', error)

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
