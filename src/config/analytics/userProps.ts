// src/analytics/userProps.ts
// Définit des user_properties GA4 (uid hashé + tier + plan) après consentement & auth.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/utils/supabaseClient'
import { hasConsent } from '@/utils/consent'
import type { User } from '@supabase/supabase-js'

const GA_ID = (import.meta.env.VITE_GA4_ID || '').trim()
const GA_SALT = (import.meta.env.VITE_GA_SALT || 'dev-salt-change-me').trim()
const isValidGA = (id: string): boolean => /^G-[A-Z0-9]{6,}$/.test(id)
const isReady = (): boolean =>
  isValidGA(GA_ID) &&
  hasConsent('analytics') &&
  typeof window.gtag === 'function'

// Map Price → plan (garde en phase avec routePageViews.ts)
const PRICE_MAP: Record<string, string> = {
  [(import.meta.env.VITE_STRIPE_PRICE_ID || '').trim()]: 'monthly_basic',
  // 'price_ABCDEF...': 'monthly_pro',
}

const priceIdToPlanName = (priceId: string | undefined): string | undefined => {
  const k = (priceId || '').trim()
  return PRICE_MAP[k] || (k ? `price:${k.slice(0, 6)}…` : undefined)
}

async function sha256Hex(input: string): Promise<string> {
  try {
    const enc = new TextEncoder().encode(`${input}:${GA_SALT}`)
    const hash = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return btoa(unescape(encodeURIComponent(`${input}:${GA_SALT}`))).replace(
      /=+$/,
      ''
    )
  }
}

async function getSessionUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession()
  return data?.session?.user || null
}

interface PlanInfo {
  status: string
  plan?: string | undefined
}

async function getUserPlan(userId: string): Promise<PlanInfo | null> {
  // Table: abonnements(user_id, status, price_id, plan)
  const { data, error } = await supabase
    .from('abonnements')
    .select('status, price_id, plan')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return null
  const status = data?.status || 'free'
  const plan = data?.plan || priceIdToPlanName(data?.price_id)
  return { status, plan }
}

interface UserProperties {
  uid_hash?: string
  customer_tier: string
  plan_name?: string
}

async function setUserProperties(props: UserProperties): Promise<void> {
  if (!isReady()) return
  if (typeof window.gtag !== 'function') return
  window.gtag('set', 'user_properties', props)
}

export async function refreshGAUserProperties(): Promise<boolean> {
  try {
    if (!isReady()) return false

    const user = await getSessionUser()
    if (!user) {
      await setUserProperties({
        uid_hash: undefined,
        customer_tier: 'anon',
        plan_name: undefined,
      })
      return true
    }

    const uidHash = await sha256Hex(user.id) // jamais de PII brut
    const planInfo = await getUserPlan(user.id)
    const tier =
      planInfo?.status === 'active' ? 'paid' : planInfo?.status || 'free'

    await setUserProperties({
      uid_hash: uidHash,
      customer_tier: tier, // free | trialing | paid | canceled…
      plan_name: planInfo?.plan,
    })
    return true
  } catch {
    return false
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
  // Consentement obtenu → pousse les user_properties
  window.addEventListener('consent:changed', (e: Event) => {
    const event = e as ConsentChangedEvent
    if (event?.detail?.choices?.analytics)
      setTimeout(refreshGAUserProperties, 120)
  })
  // Changement d'auth → maj des user_properties
  try {
    supabase.auth.onAuthStateChange(() => {
      if (hasConsent('analytics')) refreshGAUserProperties()
    })
  } catch {
    // Ignore errors
  }
  // Helpers debug
  ;(window as any).gaUserProps = {
    refresh: refreshGAUserProperties,
    testHash: (s: string) => sha256Hex(s),
  }
}

if (typeof window !== 'undefined') boot()
