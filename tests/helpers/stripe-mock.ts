/**
 * 💳 Helpers de mock Stripe pour tests unitaires
 *
 * Fournit des mocks et fixtures pour tester l'intégration Stripe
 * sans faire d'appels réels à l'API.
 */

import { vi } from 'vitest'
import type Stripe from 'stripe'

/**
 * Mock d'un Customer Stripe
 */
export const mockStripeCustomer: Stripe.Customer = {
  id: 'cus_test_123456789',
  object: 'customer',
  address: null,
  balance: 0,
  created: Math.floor(Date.now() / 1000),
  currency: 'eur',
  default_source: null,
  delinquent: false,
  description: 'Test customer for appli-picto',
  discount: null,
  email: 'test@appli-picto.test',
  invoice_prefix: 'TEST',
  invoice_settings: {
    custom_fields: null,
    default_payment_method: null,
    footer: null,
    rendering_options: null,
  },
  livemode: false,
  metadata: {
    user_id: '11111111-1111-1111-1111-111111111111',
  },
  name: 'Test User',
  phone: null,
  preferred_locales: ['fr-FR'],
  shipping: null,
  tax_exempt: 'none',
  test_clock: null,
}

/**
 * Mock d'une Subscription Stripe active
 */
export const mockStripeSubscriptionActive: Stripe.Subscription = {
  id: 'sub_test_123456789',
  object: 'subscription',
  application: null,
  application_fee_percent: null,
  automatic_tax: { enabled: false },
  billing_cycle_anchor: Math.floor(Date.now() / 1000),
  billing_thresholds: null,
  cancel_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  cancellation_details: null,
  collection_method: 'charge_automatically',
  created: Math.floor(Date.now() / 1000),
  currency: 'eur',
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // +30 jours
  current_period_start: Math.floor(Date.now() / 1000),
  customer: 'cus_test_123456789',
  days_until_due: null,
  default_payment_method: null,
  default_source: null,
  default_tax_rates: [],
  description: null,
  discount: null,
  ended_at: null,
  items: {
    object: 'list',
    data: [],
    has_more: false,
    url: '/v1/subscription_items?subscription=sub_test_123456789',
  },
  latest_invoice: null,
  livemode: false,
  metadata: {
    user_id: '11111111-1111-1111-1111-111111111111',
  },
  next_pending_invoice_item_invoice: null,
  on_behalf_of: null,
  pause_collection: null,
  payment_settings: {
    payment_method_options: null,
    payment_method_types: null,
    save_default_payment_method: 'off',
  },
  pending_invoice_item_interval: null,
  pending_setup_intent: null,
  pending_update: null,
  plan: null,
  quantity: 1,
  schedule: null,
  start_date: Math.floor(Date.now() / 1000),
  status: 'active',
  test_clock: null,
  transfer_data: null,
  trial_end: null,
  trial_settings: {
    end_behavior: { missing_payment_method: 'create_invoice' },
  },
  trial_start: null,
}

/**
 * Mock d'une Subscription Stripe annulée
 */
export const mockStripeSubscriptionCanceled: Stripe.Subscription = {
  ...mockStripeSubscriptionActive,
  id: 'sub_test_canceled',
  status: 'canceled',
  canceled_at: Math.floor(Date.now() / 1000),
  ended_at: Math.floor(Date.now() / 1000),
}

/**
 * Mock d'une Checkout Session
 */
export const mockStripeCheckoutSession: Stripe.Checkout.Session = {
  id: 'cs_test_123456789',
  object: 'checkout.session',
  after_expiration: null,
  allow_promotion_codes: true,
  amount_subtotal: 990,
  amount_total: 990,
  automatic_tax: { enabled: false, status: null },
  billing_address_collection: null,
  cancel_url: 'http://localhost:5173/abonnement?canceled=true',
  client_reference_id: null,
  client_secret: null,
  consent: null,
  consent_collection: null,
  created: Math.floor(Date.now() / 1000),
  currency: 'eur',
  currency_conversion: null,
  custom_fields: [],
  custom_text: {
    after_submit: null,
    shipping_address: null,
    submit: null,
    terms_of_service_acceptance: null,
  },
  customer: 'cus_test_123456789',
  customer_creation: 'always',
  customer_details: null,
  customer_email: 'test@appli-picto.test',
  expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // +24h
  invoice: null,
  invoice_creation: null,
  livemode: false,
  locale: 'fr',
  metadata: {
    user_id: '11111111-1111-1111-1111-111111111111',
  },
  mode: 'subscription',
  payment_intent: null,
  payment_link: null,
  payment_method_collection: 'always',
  payment_method_configuration_details: null,
  payment_method_options: null,
  payment_method_types: ['card'],
  payment_status: 'paid',
  phone_number_collection: { enabled: false },
  recovered_from: null,
  setup_intent: null,
  shipping_address_collection: null,
  shipping_cost: null,
  shipping_details: null,
  shipping_options: [],
  status: 'complete',
  submit_type: null,
  subscription: 'sub_test_123456789',
  success_url: 'http://localhost:5173/abonnement?success=true',
  total_details: {
    amount_discount: 0,
    amount_shipping: 0,
    amount_tax: 0,
  },
  ui_mode: 'hosted',
  url: 'https://checkout.stripe.com/c/pay/cs_test_123456789',
}

/**
 * Mock d'un Price Stripe
 */
export const mockStripePrice: Stripe.Price = {
  id: 'price_test_123456789',
  object: 'price',
  active: true,
  billing_scheme: 'per_unit',
  created: Math.floor(Date.now() / 1000),
  currency: 'eur',
  custom_unit_amount: null,
  livemode: false,
  lookup_key: null,
  metadata: {},
  nickname: 'Abonnement Mensuel Appli-Picto',
  product: 'prod_test_appli_picto',
  recurring: {
    aggregate_usage: null,
    interval: 'month',
    interval_count: 1,
    trial_period_days: null,
    usage_type: 'licensed',
  },
  tax_behavior: 'unspecified',
  tiers_mode: null,
  transform_quantity: null,
  type: 'recurring',
  unit_amount: 990,
  unit_amount_decimal: '990',
}

/**
 * Mock d'un Product Stripe
 */
export const mockStripeProduct: Stripe.Product = {
  id: 'prod_test_appli_picto',
  object: 'product',
  active: true,
  attributes: [],
  created: Math.floor(Date.now() / 1000),
  default_price: 'price_test_123456789',
  description: 'Abonnement premium Appli-Picto',
  images: [],
  livemode: false,
  metadata: {},
  name: 'Appli-Picto Premium',
  package_dimensions: null,
  shippable: null,
  statement_descriptor: null,
  tax_code: null,
  type: 'service',
  unit_label: null,
  updated: Math.floor(Date.now() / 1000),
  url: null,
}

/**
 * Mock d'un événement webhook Stripe
 */
export function createMockStripeWebhookEvent<T extends Stripe.Event.Type>(
  type: T,
  data: Stripe.Event.Data
): Stripe.Event {
  return {
    id: `evt_test_${Math.random().toString(36).substring(7)}`,
    object: 'event',
    api_version: '2024-11-20.acacia',
    created: Math.floor(Date.now() / 1000),
    data,
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
  }
}

/**
 * Créer un mock de customer.subscription.created
 */
export const mockWebhookSubscriptionCreated = createMockStripeWebhookEvent(
  'customer.subscription.created',
  {
    object: mockStripeSubscriptionActive,
    previous_attributes: undefined,
  }
)

/**
 * Créer un mock de customer.subscription.updated
 */
export const mockWebhookSubscriptionUpdated = createMockStripeWebhookEvent(
  'customer.subscription.updated',
  {
    object: mockStripeSubscriptionActive,
    previous_attributes: {
      status: 'trialing',
    },
  }
)

/**
 * Créer un mock de customer.subscription.deleted
 */
export const mockWebhookSubscriptionDeleted = createMockStripeWebhookEvent(
  'customer.subscription.deleted',
  {
    object: mockStripeSubscriptionCanceled,
    previous_attributes: undefined,
  }
)

/**
 * Créer un mock de checkout.session.completed
 */
export const mockWebhookCheckoutCompleted = createMockStripeWebhookEvent(
  'checkout.session.completed',
  {
    object: mockStripeCheckoutSession,
    previous_attributes: undefined,
  }
)

/**
 * Helper pour mocker l'API Stripe dans les tests
 *
 * @example
 * const stripeMock = mockStripeAPI()
 * stripeMock.checkout.sessions.create.mockResolvedValue(mockStripeCheckoutSession)
 */
export function mockStripeAPI() {
  return {
    customers: {
      create: vi.fn().mockResolvedValue(mockStripeCustomer),
      retrieve: vi.fn().mockResolvedValue(mockStripeCustomer),
      update: vi.fn().mockResolvedValue(mockStripeCustomer),
      del: vi
        .fn()
        .mockResolvedValue({ id: mockStripeCustomer.id, deleted: true }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue(mockStripeSubscriptionActive),
      retrieve: vi.fn().mockResolvedValue(mockStripeSubscriptionActive),
      update: vi.fn().mockResolvedValue(mockStripeSubscriptionActive),
      cancel: vi.fn().mockResolvedValue(mockStripeSubscriptionCanceled),
      list: vi.fn().mockResolvedValue({
        object: 'list',
        data: [mockStripeSubscriptionActive],
        has_more: false,
        url: '/v1/subscriptions',
      }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue(mockStripeCheckoutSession),
        retrieve: vi.fn().mockResolvedValue(mockStripeCheckoutSession),
      },
    },
    prices: {
      retrieve: vi.fn().mockResolvedValue(mockStripePrice),
      list: vi.fn().mockResolvedValue({
        object: 'list',
        data: [mockStripePrice],
        has_more: false,
        url: '/v1/prices',
      }),
    },
    products: {
      retrieve: vi.fn().mockResolvedValue(mockStripeProduct),
      list: vi.fn().mockResolvedValue({
        object: 'list',
        data: [mockStripeProduct],
        has_more: false,
        url: '/v1/products',
      }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue(mockWebhookCheckoutCompleted),
    },
  }
}
