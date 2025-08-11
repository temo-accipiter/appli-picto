// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidUrl(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

// Optionnel: allowlist des hosts de retour (ENV: ALLOWED_RETURN_HOSTS="monapp.com,localhost:5173")
function isAllowedHost(url: string) {
  const allow = Deno.env.get('ALLOWED_RETURN_HOSTS')
  if (!allow) return true
  const hosts = allow
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(Boolean)
  try {
    const host = new URL(url).host.toLowerCase()
    return hosts.includes(host)
  } catch {
    return false
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { ...corsHeaders, Allow: 'POST, OPTIONS' },
    })
  }

  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  const DEFAULT_RETURN_URL = Deno.env.get('DEFAULT_PORTAL_RETURN_URL') ?? ''
  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: 'Missing env vars' }, 500)
  }

  // Corps JSON optionnel: { return_url?: string }
  let payload: any = {}
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      payload = await req.json()
    }
  } catch {
    // ignore → payload restera vide
  }

  const requestedReturnUrl: string | undefined = payload?.return_url
  const return_url = requestedReturnUrl || DEFAULT_RETURN_URL
  if (!return_url || !isValidUrl(return_url) || !isAllowedHost(return_url)) {
    return json({ error: 'Invalid or unallowed return_url' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  })
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' })

  // 1) Cherche le customer Stripe depuis ta table
  let customerId: string | undefined
  const { data: abo } = await supabase
    .from('abonnements')
    .select('stripe_customer')
    .eq('user_id', user.id)
    .maybeSingle()
  if (abo?.stripe_customer) customerId = abo.stripe_customer

  // 2) Fallback: chercher par email côté Stripe (utile si ancien compte)
  if (!customerId && user.email) {
    try {
      const res = await stripe.customers.search({
        // Stripe Search (active par défaut en général)
        query: `email:'${user.email.replace(/'/g, "\\'")}'`,
        limit: 1,
      })
      if (res.data?.[0]?.id) {
        customerId = res.data[0].id
        // Optionnel: sauvegarder pour la suite
        await supabase
          .from('abonnements')
          .upsert(
            { user_id: user.id, stripe_customer: customerId },
            { onConflict: 'user_id' }
          )
      }
    } catch (_e) {
      // ignore
    }
  }

  if (!customerId) {
    return json({ error: 'No Stripe customer found for this user' }, 404)
  }

  // 3) Crée la session portail
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url,
  })

  return json({ url: portal.url })
})
