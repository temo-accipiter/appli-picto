// src/stripe/types.ts
import Stripe from 'stripe'

export type StripeCustomer = Stripe.Customer
export type StripeSubscription = Stripe.Subscription
export type StripePrice = Stripe.Price
export type StripeProduct = Stripe.Product

// Complète si tu en utilises d'autres
export type StripeEventType =
  | 'checkout.session.completed'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
