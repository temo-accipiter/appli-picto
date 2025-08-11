import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-08-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function toIso(sec?: number | null) {
  return sec ? new Date(sec * 1000).toISOString() : null
}

function extractFieldsFromSub(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0]
  const price = item?.price
  const plan =
    price?.nickname ??
    (typeof price?.product === 'string' ? price.product : null) ??
    null

  return {
    stripe_customer:
      typeof sub.customer === 'string'
        ? sub.customer
        : ((sub.customer as any)?.id ?? null),
    stripe_subscription_id: sub.id,
    status: sub.status ?? null,
    plan,
    price_id: price?.id ?? null,
    start_date: toIso(sub.start_date),
    end_date: toIso((sub as any)?.ended_at ?? null),
    current_period_start: toIso(sub.current_period_start),
    current_period_end: toIso(sub.current_period_end),
    cancel_at: toIso(sub.cancel_at ?? null),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    latest_invoice:
      typeof sub.latest_invoice === 'string'
        ? sub.latest_invoice
        : ((sub.latest_invoice as any)?.id ?? null),
    raw_data: sub as unknown as Record<string, unknown>, // JSON brut complet
  }
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err: any) {
    console.error('❌ Signature Stripe invalide :', err.message)
    return new Response('Invalid signature', { status: 400 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service Role → bypass RLS
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const user_id =
          (session.metadata as any)?.supabase_user_id ??
          session.client_reference_id ??
          null

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as any)?.id

        if (user_id && subscriptionId) {
          let sub: Stripe.Subscription | null = null
          try {
            sub = await stripe.subscriptions.retrieve(subscriptionId)
          } catch (e) {
            console.warn('⚠️ Impossible de récupérer l’abonnement Stripe :', e)
          }

          if (sub) {
            const fields = extractFieldsFromSub(sub)
            await admin.from('abonnements').upsert(
              {
                user_id,
                ...fields,
                last_event_id: event.id,
              },
              { onConflict: 'stripe_subscription_id' }
            )
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const user_id = (sub.metadata as any)?.supabase_user_id ?? null

        if (user_id) {
          const fields = extractFieldsFromSub(sub)
          await admin.from('abonnements').upsert(
            {
              user_id,
              ...fields,
              last_event_id: event.id,
            },
            { onConflict: 'stripe_subscription_id' }
          )
        }
        break
      }

      default:
        console.log('ℹ️ Événement Stripe ignoré :', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('⚠️ Erreur webhook Stripe :', err)
    return new Response(JSON.stringify({ error: 'handler failure' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
