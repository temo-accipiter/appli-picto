import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.2'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

// @ts-expect-error - Deno ESM import type compatibility
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-08-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function toIso(sec?: number | null) {
  return sec ? new Date(sec * 1000).toISOString() : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFieldsFromSub(sub: any) {
  const item = sub.items?.data?.[0]
  const price = item?.price
  const plan =
    price?.nickname ??
    (typeof price?.product === 'string' ? price.product : null) ??
    null

  const customer =
    typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null)

  const endedAt =
    'ended_at' in sub && typeof sub.ended_at === 'number' ? sub.ended_at : null

  const latestInvoice =
    typeof sub.latest_invoice === 'string'
      ? sub.latest_invoice
      : (sub.latest_invoice?.id ?? null)

  return {
    stripe_customer: customer,
    stripe_subscription_id: sub.id,
    status: sub.status ?? null,
    plan,
    price_id: price?.id ?? null,
    start_date: toIso(sub.start_date),
    end_date: toIso(endedAt),
    current_period_start: toIso(sub.current_period_start),
    current_period_end: toIso(sub.current_period_end),
    cancel_at: toIso(sub.cancel_at ?? null),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    latest_invoice: latestInvoice,
    raw_data: sub as unknown as Record<string, unknown>,
  }
}

// 🔹 petit helper de log (fire-and-forget pour ne pas bloquer le webhook)
async function logSubscriptionEvent(
  admin: any, // eslint-disable-line @typescript-eslint/no-explicit-any
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

// ✅ PHASE 2: Vérifier idempotence (empêcher double-traitement d'un même event)
async function isEventAlreadyProcessed(
  admin: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  subscriptionId: string,
  eventId: string
): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from('abonnements')
      .select('last_event_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (error || !data) {
      // Pas d'abonnement existant = event pas encore traité
      return false
    }

    // Si last_event_id correspond à l'event actuel = déjà traité
    return data.last_event_id === eventId
  } catch (e) {
    console.warn('isEventAlreadyProcessed failed:', e)
    // En cas d'erreur, on suppose que l'event n'a pas été traité
    return false
  }
}

serve(async req => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })

  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('❌ Signature Stripe invalide :', errorMessage)
    return json(
      { error: 'invalid signature', timestamp: new Date().toISOString() },
      400
    )
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = event.data.object as any

        const user_id =
          session.metadata?.supabase_user_id ??
          session.client_reference_id ??
          null

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription?.id ?? null)

        // log réception
        queueMicrotask(() =>
          logSubscriptionEvent(
            admin,
            'webhook.checkout.session.completed',
            user_id,
            {
              stripe_event_id: event.id,
              session_id: session.id,
              subscription_id: subscriptionId ?? null,
            }
          )
        )

        if (user_id && subscriptionId) {
          // ✅ PHASE 2: Vérifier idempotence avant traitement
          const alreadyProcessed = await isEventAlreadyProcessed(
            admin,
            subscriptionId,
            event.id
          )

          if (alreadyProcessed) {
            console.log(
              `ℹ️ Event ${event.id} déjà traité pour subscription ${subscriptionId}, skipping`
            )
            return json(
              { received: true, event_id: event.id, skipped: true },
              200
            )
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let sub: any = null
          try {
            sub = await stripe.subscriptions.retrieve(subscriptionId)
          } catch (e) {
            console.warn("Impossible de récupérer l'abonnement Stripe:", e)
          }

          if (sub) {
            const fields = extractFieldsFromSub(sub)
            const { error } = await admin.from('abonnements').upsert(
              {
                user_id,
                ...fields,
                last_event_id: event.id,
              },
              { onConflict: 'stripe_subscription_id' }
            )
            if (error) throw error

            // log succès upsert
            queueMicrotask(() =>
              logSubscriptionEvent(admin, 'subscription.upserted', user_id, {
                stripe_event_id: event.id,
                stripe_subscription_id: sub.id,
                status: sub.status,
              })
            )
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any
        const user_id = sub.metadata?.supabase_user_id ?? null

        queueMicrotask(() =>
          logSubscriptionEvent(admin, `webhook.${event.type}`, user_id, {
            stripe_event_id: event.id,
            stripe_subscription_id: sub.id,
            status: sub.status,
          })
        )

        if (user_id) {
          // ✅ PHASE 2: Vérifier idempotence avant traitement
          const alreadyProcessed = await isEventAlreadyProcessed(
            admin,
            sub.id,
            event.id
          )

          if (alreadyProcessed) {
            console.log(
              `ℹ️ Event ${event.id} déjà traité pour subscription ${sub.id}, skipping`
            )
            return json(
              { received: true, event_id: event.id, skipped: true },
              200
            )
          }

          const fields = extractFieldsFromSub(sub)
          const { error } = await admin.from('abonnements').upsert(
            {
              user_id,
              ...fields,
              last_event_id: event.id,
            },
            { onConflict: 'stripe_subscription_id' }
          )
          if (error) throw error
        }
        break
      }

      default:
        console.log('ℹ️ Événement Stripe ignoré :', event.type)
    }

    return json({ received: true, event_id: event.id }, 200)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('⚠️ Erreur webhook Stripe :', {
      message: errorMessage,
      event_id: event.id,
      type: event.type,
    })

    // log erreur
    queueMicrotask(() =>
      logSubscriptionEvent(admin, 'webhook.error', null, {
        stripe_event_id: event.id,
        type: event.type,
        error: String(err),
      })
    )

    return json(
      {
        error: 'handler failure',
        timestamp: new Date().toISOString(),
        event_id: event.id,
        type: event.type,
      },
      500
    )
  }
})
