// src/analytics/routePageViews.ts
import { hasConsent } from '@/utils/consent'

const GA_ID = (import.meta.env.VITE_GA4_ID || '').trim()
const isValidGA = (id: string): boolean => /^G-[A-Z0-9]{6,}$/.test(id)

let lastHref: string | null = null
let debounce: ReturnType<typeof setTimeout> | null = null
let fetchPatched = false
const sentForHref = new Set<string>() // anti-doublons auto-événements

// Map Price → plan (complète ici si tu ajoutes d'autres offres)
const PRICE_MAP: Record<string, string> = {
  [(import.meta.env.VITE_STRIPE_PRICE_ID || '').trim()]: 'monthly_basic',
  // 'price_ABCDEF...': 'monthly_pro',
}

const priceIdToPlanName = (priceId: string | undefined): string | undefined => {
  const k = (priceId || '').trim()
  return PRICE_MAP[k] || (k ? `price:${k.slice(0, 6)}…` : undefined)
}

const isReady = (): boolean =>
  isValidGA(GA_ID) &&
  hasConsent('analytics') &&
  typeof window.gtag === 'function'

function sendPageView(): void {
  if (!isReady()) return
  const href = location.href
  if (href === lastHref) return
  lastHref = href

  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: href,
    page_referrer: document.referrer || '',
  })
}

function sendAutoEvents(): void {
  if (!isReady()) return
  const href = location.href
  if (sentForHref.has(href)) return
  const path = location.pathname
  const search = location.search

  // Vue pricing/abonnement
  if (/(^|\/)(abonnement|pricing)(\/|$)/i.test(path)) {
    window.gtag('event', 'view_pricing', {
      page_location: href,
      page_title: document.title,
      engagement_time_msec: 1,
    })
  }

  // Succès checkout (patterns courants)
  if (/success/i.test(path) || /checkout=success|session_id=/.test(search)) {
    window.gtag('event', 'subscription_success', {
      page_location: href,
      page_title: document.title,
      engagement_time_msec: 1,
    })
  }

  sentForHref.add(href)
}

function onRouteChange(): void {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    sendPageView()
    sendAutoEvents()
  }, 60)
}

function patchHistory(): void {
  if ((window as any).__routePV_patched) return
  ;(window as any).__routePV_patched = true
  lastHref = location.href

  const _push = history.pushState
  const _replace = history.replaceState
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    _push.apply(this, args)
    onRouteChange()
  }
  history.replaceState = function (
    ...args: Parameters<typeof history.replaceState>
  ) {
    _replace.apply(this, args)
    onRouteChange()
  }
  addEventListener('popstate', onRouteChange)
  addEventListener('hashchange', onRouteChange)
}

function patchFetchForCheckout(): void {
  if (fetchPatched || typeof window.fetch !== 'function') return
  fetchPatched = true
  const orig = window.fetch
  window.fetch = async (...args: Parameters<typeof window.fetch>) => {
    const [input, init] = args
    const url = typeof input === 'string' ? input : (input as Request)?.url || ''
    const method = (init?.method || 'GET').toUpperCase()
    const res = await orig(...args)

    try {
      // Détecte POST → create-checkout-session (Edge Function)
      if (
        method === 'POST' &&
        /create-checkout-session/i.test(url) &&
        res?.ok &&
        isReady()
      ) {
        let priceId: string | undefined
        try {
          if (typeof init?.body === 'string') {
            const j = JSON.parse(init.body)
            priceId = j.priceId || j.price_id || j.price
          } else if (init?.body instanceof FormData) {
            priceId =
              init.body.get('priceId') ||
              init.body.get('price_id') ||
              init.body.get('price') ||
              undefined
          }
        } catch {
          // Ignore parsing errors
        }
        const planName = priceIdToPlanName(priceId)

        window.gtag('event', 'start_checkout', {
          page_location: location.href,
          page_title: document.title,
          payment_type: 'stripe_checkout',
          currency: 'EUR',
          ...(planName ? { plan_name: planName } : null),
        })
      }
    } catch {
      /* silencieux */
    }

    return res
  }
}

interface ConsentChangedEvent extends CustomEvent {
  detail?: {
    choices?: {
      analytics?: boolean
    }
  }
}

function boot(): void {
  patchHistory()
  patchFetchForCheckout()
  // Le 1er page_view est déjà envoyé à l'init GA4 → ici seulement auto-événements initiaux
  sendAutoEvents()
  addEventListener('consent:changed', (e: Event) => {
    const event = e as ConsentChangedEvent
    if (event?.detail?.choices?.analytics) {
      setTimeout(() => {
        sendPageView()
        sendAutoEvents()
      }, 120)
    }
  })
}

if (typeof window !== 'undefined') boot()
