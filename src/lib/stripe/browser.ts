// src/stripe/browser.ts
import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

// Charge Stripe côté navigateur avec la clé publique
export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
    )
  }
  return stripePromise
}
