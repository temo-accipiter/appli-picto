import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

serve(async req => {
  // ✅ CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
      },
    })
  }

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || ''

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', detail: userError }),
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    const body = await req.json()

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-08-16',
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: body.price_id,
          quantity: 1,
        },
      ],
      success_url: `${body.success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancel_url,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    })
  } catch (err) {
    console.error('❌ Erreur create-checkout-session:', err)

    return new Response(
      JSON.stringify({ error: 'Erreur interne Stripe', detail: err.message }),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
