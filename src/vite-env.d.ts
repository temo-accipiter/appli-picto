/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // Stripe
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_STRIPE_PUBLIC_KEY: string
  readonly VITE_STRIPE_PRICE_ID: string

  // Analytics & Monitoring
  readonly VITE_GA4_ID?: string
  readonly VITE_SENTRY_DSN?: string

  // Cloudflare
  readonly VITE_TURNSTILE_SITE_KEY: string

  // Vite built-in
  readonly DEV: boolean
  readonly MODE: string
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
