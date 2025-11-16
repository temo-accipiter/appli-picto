// supabase/functions/_shared/stripeClient.ts
// Client Stripe réutilisable dans toutes tes Edge Functions (Deno)
import Stripe from 'npm:stripe'

const apiVersion = '2024-06-20' as Stripe.LatestApiVersion

export function getStripe() {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY manquante dans les variables d’environnement'
    )
  }
  return new Stripe(key, { apiVersion })
}

export type { Stripe } from 'npm:stripe'
