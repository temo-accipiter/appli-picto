import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-08-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async req => {
  const sig = req.headers.get('Stripe-Signature') ?? ''
  const body = await req.text()
  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('❌ Signature invalide :', err.message)
    return new Response('Invalid signature', { status: 400 })
  }

  console.log('📩 Event reçu :', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const subscriptionId = session.subscription as string
    const customerId = session.customer as string
    const userId = session.metadata?.user_id

    if (!userId) {
      console.error('❌ user_id manquant dans metadata')
      return new Response('Missing user_id', { status: 400 })
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      if (!subscription.items.data.length) {
        console.error('❌ Aucun item dans la souscription')
        return new Response('Subscription has no items', { status: 400 })
      }

      const { error } = await supabase.from('abonnements').insert([
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: subscription.items.data[0].price.nickname ?? 'default',
          status: subscription.status,
          start_date: new Date(subscription.start_date * 1000).toISOString(),
          end_date: subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : null,
          latest_invoice: subscription.latest_invoice?.toString() ?? '',
          raw_data: subscription, // ← en jsonb de préférence
        },
      ])

      if (error) {
        console.error('❌ Erreur insertion Supabase :', error)
        return new Response('Database error', { status: 500 })
      }

      console.log('✅ Abonnement enregistré avec succès')
      return new Response('OK', { status: 200 })
    } catch (err) {
      console.error('❌ Erreur récupération abonnement :', err.message)
      return new Response('Erreur Stripe', { status: 500 })
    }
  }

  return new Response('Événement ignoré', { status: 200 })
})
