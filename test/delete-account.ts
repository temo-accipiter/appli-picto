// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async req => {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 })

  const body = await req.text()
  const sig = req.headers.get('Stripe-Signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('❌ Invalid signature', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Admin client (service_role) pour bypasser RLS
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const user_id = (session.metadata?.user_id as string) ?? null
        const subscriptionId = session.subscription as string | null
        const customerId = session.customer as string | null
        const priceId =
          (session.line_items?.data?.[0]?.price?.id as string) ||
          (session.metadata?.price_id as string) ||
          null

        if (!user_id) break

        await supabase.from('abonnements').upsert(
          {
            user_id,
            stripe_customer: customerId ?? undefined,
            stripe_subscription: subscriptionId ?? undefined,
            status: 'active', // sera sur-écrit par l’event subscription.created/updated
            price_id: priceId ?? undefined,
            raw_data: session as unknown as Record<string, unknown>,
          },
          { onConflict: 'user_id' }
        )
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const user_id = (sub.metadata?.user_id as string) ?? null

        // Si pas de metadata (cas d’un sub modifié dans Stripe), on tente via le customer mapping
        let resolvedUserId = user_id
        if (!resolvedUserId && typeof sub.customer === 'string') {
          const { data } = await supabase
            .from('abonnements')
            .select('user_id')
            .eq('stripe_customer', sub.customer)
            .maybeSingle()
          resolvedUserId = data?.user_id ?? null
        }
        if (!resolvedUserId) break

        await supabase.from('abonnements').upsert(
          {
            user_id: resolvedUserId,
            stripe_customer:
              typeof sub.customer === 'string' ? sub.customer : undefined,
            stripe_subscription: sub.id,
            status: sub.status,
            plan: sub.items.data[0]?.price?.nickname ?? null,
            price_id: sub.items.data[0]?.price?.id ?? null,
            start_date: new Date(sub.start_date * 1000).toISOString(),
            current_period_start: new Date(
              sub.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              sub.current_period_end * 1000
            ).toISOString(),
            cancel_at: sub.cancel_at
              ? new Date(sub.cancel_at * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            raw_data: sub as unknown as Record<string, unknown>,
          },
          { onConflict: 'user_id' }
        )
        break
      }

      default:
        // ignore
        break
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('Webhook handler error:', e)
    return new Response('Server error', { status: 500 })
  }
})
