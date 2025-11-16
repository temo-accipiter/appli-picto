// supabase/functions/create-checkout-session/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.2'

interface CheckoutPayload {
  price_id?: string
  success_url?: string
  cancel_url?: string
  portal_return_url?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
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

function isAllowedHost(url: string) {
  const allow = Deno.env.get('ALLOWED_RETURN_HOSTS')

  // Autoriser localhost en développement
  try {
    const host = new URL(url).host.toLowerCase()
    if (host === 'localhost' || host.includes('localhost')) {
      return true
    }
  } catch (e) {
    console.error('❌ Error parsing URL in isAllowedHost:', e)
    return false
  }

  if (!allow) {
    return true
  }

  const hosts = allow
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(Boolean)

  try {
    const host = new URL(url).host.toLowerCase()
    return hosts.includes(host)
  } catch (e) {
    console.error('❌ Error parsing URL in isAllowedHost:', e)
    return false
  }
}

async function logSubscriptionEvent(
  admin: ReturnType<typeof createClient>,
  eventType: string,
  userId: string | null,
  details: Record<string, unknown>
) {
  try {
    await admin.from('subscription_logs').insert({
      user_id: userId,
      event_type: eventType,
      details,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('logSubscriptionEvent failed:', e)
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { ...corsHeaders, Allow: 'POST, OPTIONS' },
    })

  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing env vars')
    return json({ error: 'Missing env vars' }, 500)
  }

  let payload: CheckoutPayload
  try {
    payload = (await req.json()) as CheckoutPayload
  } catch {
    console.error('❌ Invalid JSON body')
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { price_id, success_url, cancel_url, portal_return_url } = payload || {}

  if (!price_id || !success_url || !cancel_url) {
    console.error('❌ Missing required parameters')
    return json({ error: 'Missing required parameters' }, 400)
  }

  const PRICE_RE = /^price_[a-zA-Z0-9]+$/
  if (typeof price_id !== 'string' || !PRICE_RE.test(price_id)) {
    console.error('❌ Invalid price_id:', price_id)
    return json({ error: 'Invalid price_id' }, 400)
  }

  if (!isValidUrl(success_url) || !isValidUrl(cancel_url)) {
    console.error('❌ Invalid URLs')
    return json({ error: 'Invalid URLs' }, 400)
  }

  if (!isAllowedHost(success_url) || !isAllowedHost(cancel_url)) {
    console.error('❌ Unallowed return URL host')
    return json({ error: 'Unallowed return URL host' }, 400)
  }

  const billingReturnUrl = portal_return_url || success_url
  if (!isValidUrl(billingReturnUrl) || !isAllowedHost(billingReturnUrl)) {
    console.error('❌ Invalid or unallowed portal_return_url')
    return json({ error: 'Invalid or unallowed portal_return_url' }, 400)
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      console.error('❌ Unauthorized:', authErr)
      return json({ error: 'Unauthorized' }, 401)
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
      return json({ error: 'Service configuration error' }, 500)
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' as const })

    const { data: existing } = await supabase
      .from('abonnements')
      .select('status, stripe_customer')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (existing) {
      let customerId = existing.stripe_customer as string | undefined

      if (!customerId && user.email) {
        try {
          const res = await stripe.customers.search({
            query: `email:'${user.email.replace(/'/g, "\\'")}'`,
            limit: 1,
          })
          if (res.data?.[0]?.id) {
            customerId = res.data[0].id
            await admin
              .from('abonnements')
              .upsert(
                { user_id: user.id, stripe_customer: customerId },
                { onConflict: 'user_id' }
              )
          }
        } catch (e) {
          console.error('❌ Error searching customer in Stripe:', e)
        }
      }

      if (!customerId) {
        console.error('❌ No Stripe customer found for this user')
        return json({ error: 'No Stripe customer found for this user' }, 404)
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: billingReturnUrl,
      })

      queueMicrotask(() =>
        logSubscriptionEvent(admin, 'billing_portal.redirect', user.id, {
          price_id,
          return_url: billingReturnUrl,
        })
      )

      return json({ url: portal.url, portal: true })
    }

    let customerId: string | undefined
    const { data: abo } = await supabase
      .from('abonnements')
      .select('stripe_customer')
      .eq('user_id', user.id)
      .maybeSingle()
    if (abo?.stripe_customer) customerId = abo.stripe_customer as string

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      ...(customerId
        ? { customer: customerId }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
    })

    queueMicrotask(() =>
      logSubscriptionEvent(admin, 'checkout.session.created', user.id, {
        price_id,
        session_id: session.id,
        has_customer: Boolean(customerId),
      })
    )

    return json({ url: session.url, portal: false })
  } catch (e: unknown) {
    console.error('❌ create-checkout-session error:', e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    return json({ error: errorMessage }, 500)
  }
})
