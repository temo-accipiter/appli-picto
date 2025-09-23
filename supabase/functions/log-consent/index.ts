// supabase/functions/log-consent/index.ts
// 🔒 Edge Function pour journaliser les consentements CNIL

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'

// --- Utils ------------------------------------------------------------------
function getAllowedOrigin(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = (Deno.env.get('ALLOWED_RETURN_HOSTS') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (allowed.length === 0) return '*'
  return allowed.includes(origin) ? origin : allowed[0]
}

function corsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// Hash SHA-256 (IP + salt)
async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// --- Handler ----------------------------------------------------------------
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const body = await req.json().catch(() => {})

    const {
      version,
      mode,
      choices,
      action,
      ts,
      user_id,
      ua,
      locale,
      app_version,
      origin: bodyOrigin,
    } = body || {}

    // Validation des données obligatoires
    if (!version || !mode || !choices) {
      return new Response('Missing required fields', {
        status: 400,
        headers: corsHeaders(req),
      })
    }

    // S'assurer que version n'est jamais null
    const safeVersion = version || '1.0.0'

    // Validation stricte des colonnes obligatoires
    if (!mode || !choices || !safeVersion) {
      console.error('❌ Validation failed:', {
        mode,
        choices,
        version: safeVersion,
      })
      return new Response('Invalid data: missing required fields', {
        status: 400,
        headers: corsHeaders(req),
      })
    }

    // Validation du mode
    const validModes = ['accept_all', 'refuse_all', 'custom']
    if (!validModes.includes(mode)) {
      return new Response('Invalid mode', {
        status: 400,
        headers: corsHeaders(req),
      })
    }

    // Validation de l'action selon la contrainte CHECK
    const validActions = [
      'first_load',
      'update',
      'withdraw',
      'restore',
      'revoke',
    ]
    const safeAction = action && validActions.includes(action) ? action : null

    // Init Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Collecte infos IP
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      ''
    const salt = Deno.env.get('CONSENT_IP_SALT') || 'default-salt'
    const ip_hash = ip ? await sha256Hex(ip + ':' + salt) : null

    // Validation de ip_hash selon la contrainte CHECK (32-128 caractères)
    const safeIpHash =
      ip_hash && ip_hash.length >= 32 && ip_hash.length <= 128 ? ip_hash : null

    const country = req.headers.get('cf-ipcountry') || null
    const origin = bodyOrigin || req.headers.get('origin') || null

    // Préparation des données pour insertion (seulement les colonnes nécessaires)
    const consentData = {
      // Colonnes obligatoires
      type_consentement: 'cookie_banner',
      mode: mode,
      choices: choices,
      version: safeVersion,
      // Colonnes optionnelles - action doit respecter la contrainte CHECK
      action: safeAction, // Action validée
      ts_client: ts ? new Date(ts).toISOString() : null,
      user_id: user_id || null,
      ua: ua || null,
      locale: locale || null,
      app_version: app_version || null,
      ip_hash: safeIpHash,
      origin: origin || null,
      donnees: JSON.stringify(choices),
    }

    // Debug: log des données avant insertion
    console.log('🔍 Données à insérer:', JSON.stringify(consentData, null, 2))

    // Insert en base dans la table consentements
    const { error } = await supabase.from('consentements').insert(consentData)

    if (error) {
      console.error('❌ Insert error:', error)
      return new Response('Insert failed', {
        status: 500,
        headers: corsHeaders(req),
      })
    }

    console.log('✅ Consentement enregistré:', {
      mode,
      user_id: user_id || 'anonymous',
      timestamp: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Consentement enregistré avec succès',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('❌ Unhandled error:', err)
    return new Response('Bad Request', {
      status: 400,
      headers: corsHeaders(req),
    })
  }
})
