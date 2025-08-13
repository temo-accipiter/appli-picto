// supabase/functions/delete-account/index.ts
// ✅ Suppression de compte robuste : vérif Turnstile serveur, auth JWT, purge Storage & DB, annulation Stripe (optionnelle)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1'

// --- Utils CORS -------------------------------------------------------------
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
    Vary: 'Origin',
    'Content-Type': 'application/json',
  }
}

// --- Turnstile server-side check -------------------------------------------
async function verifyTurnstile(req: Request, token?: string) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY') || ''
  if (!secret) return { ok: true, detail: { reason: 'no_secret_dev_bypass' } }
  if (!token) return { ok: false, detail: { reason: 'missing_token' } }

  const remoteip =
    req.headers.get('CF-Connecting-IP') ||
    req.headers.get('X-Forwarded-For') ||
    ''

  const form = new URLSearchParams()
  form.append('secret', secret)
  form.append('response', token)
  if (remoteip) form.append('remoteip', remoteip)

  const r = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: form,
    }
  )
  const data = await r.json().catch(() => ({}))
  const ok = !!data?.success
  // 👇 log utile côté Dashboard
  console.log('turnstile_verify', { ok, 'error-codes': data['error-codes'] })
  return { ok, detail: data }
}
// --- Storage helpers --------------------------------------------------------
async function removeAllInPrefix(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string
) {
  const { data, error } = await admin.storage
    .from(bucket)
    .list(prefix, { limit: 1000 })
  if (error) {
    console.warn(`storage list error ${bucket}/${prefix}`, error.message)
    return
  }
  if (!data || data.length === 0) return
  const paths = data.map((f: any) => `${prefix}/${f.name}`)
  const { error: remErr } = await admin.storage.from(bucket).remove(paths)
  if (remErr)
    console.warn(`storage remove error ${bucket}/${prefix}`, remErr.message)
}

// --- Stripe (optionnel) -----------------------------------------------------
async function cancelStripeIfAny(
  admin: ReturnType<typeof createClient>,
  userId: string
) {
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || ''
  if (!STRIPE_SECRET_KEY) return

  // On tente de récupérer un éventuel id d’abonnement
  const { data: sub } = await admin
    .from('abonnements')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const subscriptionId = sub?.stripe_subscription_id
  if (!subscriptionId) {
    // Pas d’ID → on fait rien (évite de lister côté Stripe pour garder le code simple & sûr)
    return
  }

  try {
    const resp = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ cancel_at_period_end: 'true' }),
      }
    )
    if (!resp.ok) {
      const t = await resp.text()
      console.warn('Stripe cancel failed:', t)
    }
  } catch (e) {
    console.warn('Stripe cancel exception:', e)
  }
}

// --- Main handler -----------------------------------------------------------
Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(req),
    })
  }

  const headers = corsHeaders(req)

  try {
    // 1) Vérif Turnstile
    const body = await req.json().catch(() => ({}))
    const turnstileToken: string | undefined = body?.turnstile
    const { ok: captchaOk, detail } = await verifyTurnstile(req, turnstileToken)
    if (!captchaOk) {
      return new Response(JSON.stringify({ error: 'captcha_failed', detail }), {
        status: 400,
        headers,
      })
    }

    // 2) Vérif JWT utilisateur (⚠️ laisse "Verify JWT with legacy secret" sur OFF dans l’UI)
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const admin = createClient(url, serviceKey)

    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'no_token' }), {
        status: 401,
        headers,
      })
    }
    const { data: userRes, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers,
      })
    }
    const userId = userRes.user.id

    // 3) (Optionnel) Annulation Stripe
    await cancelStripeIfAny(admin, userId)

    // 4) Purge Storage (idempotent)
    await Promise.allSettled([
      removeAllInPrefix(admin, 'images', `${userId}/taches`),
      removeAllInPrefix(admin, 'images', `${userId}/recompenses`),
      removeAllInPrefix(admin, 'avatars', `${userId}`),
    ])

    // 5) Purge DB (idempotent) – tes tables
    await Promise.allSettled([
      admin.from('taches').delete().eq('user_id', userId),
      admin.from('categories').delete().eq('user_id', userId),
      admin.from('parametres').delete().eq('user_id', userId),
      admin.from('recompenses').delete().eq('user_id', userId),
      admin.from('abonnements').delete().eq('user_id', userId),
      admin.from('profiles').delete().eq('id', userId),
    ])

    // 6) Suppression de l’utilisateur Auth (service role = bypass RLS)
    await admin.auth.admin.deleteUser(userId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    })
  } catch (e) {
    console.error('delete-account error', e)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: corsHeaders(req),
    })
  }
})
