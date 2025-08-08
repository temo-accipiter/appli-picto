// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.2'

// 🔹 CORS pour appels depuis ton front
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // ✅ Réponse aux pré-requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ Variables d’environnement requises
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: 'Missing env vars' }, 500)
    }

    // ✅ Lecture des paramètres envoyés par le front
    const { price_id, success_url, cancel_url } = await req.json()

    // ✅ Connexion Supabase avec clé publique (respect RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    // ✅ Auth utilisateur
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-08-16',
    })

    // ✅ Recherche si un stripe_customer existe déjà
    let customerId: string | undefined
    const { data: abo } = await supabase
      .from('abonnements')
      .select('stripe_customer')
      .eq('user_id', user.id)
      .maybeSingle()
    if (abo?.stripe_customer) customerId = abo.stripe_customer

    // ✅ Création de la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      // Utiliser un customer existant sinon email
      ...(customerId
        ? { customer: customerId }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    })

    // ✅ Retour de l’URL vers Stripe Checkout
    return json({ url: session.url })
  } catch (e: any) {
    console.error('create-checkout-session error:', e)
    return json({ error: e?.message || String(e) }, 500)
  }
})

// Helper JSON + CORS
function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
