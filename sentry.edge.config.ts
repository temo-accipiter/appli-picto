// This file configures the initialization of Sentry for edge features (middleware, edge routes, etc.)
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const SENTRY_RELEASE = process.env.NEXT_PUBLIC_APP_VERSION

// Only initialize Sentry if DSN is configured
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Environment
    environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',

    // Release tracking (only if defined)
    ...(SENTRY_RELEASE && { release: SENTRY_RELEASE }),
  })
}
