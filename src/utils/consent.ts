// src/utils/consent.ts
// CNIL compliance – cookies and trackers management
// - Local storage with proof (timestamp, version, choices)
// - Automatic expiration (6 months max)
// - Server-side proof (Supabase Edge Function / consents table)
/* eslint-disable @typescript-eslint/no-explicit-any */
// - Compatibility with existing code (events)

const CONSENT_KEY = 'cookie_consent_v2'
const CONSENT_VERSION = '1.0.0'
const EXPIRY_DAYS = 180 // 6 months

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing'

export interface ConsentChoices {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export interface ConsentRecord {
  version: string
  ts: string
  mode: string
  choices: ConsentChoices
  [key: string]: any // Allow extra properties
}

export interface ConsentStatus {
  hasConsent: boolean
  isExpired: boolean
  daysUntilExpiry: number
  choices: ConsentChoices
  mode: string | null
  timestamp: string | null
}

export interface ConsentChangedEventDetail {
  version?: string
  ts?: string
  mode?: string
  choices: ConsentChoices
  [key: string]: any
}

export function defaultChoices(): ConsentChoices {
  return {
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function isExpired(ts: string): boolean {
  const saved = new Date(ts)
  const now = new Date()
  const diff = (now.getTime() - saved.getTime()) / (1000 * 60 * 60 * 24)
  return diff > EXPIRY_DAYS
}

export function getConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentRecord
    if (parsed?.version !== CONSENT_VERSION) return null
    if (!parsed.ts || isExpired(parsed.ts)) return null
    return parsed
  } catch {
    return null
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  const current = getConsent()
  if (!current) return false

  // Necessary cookies are always allowed
  if (category === 'necessary') return true

  return !!current.choices?.[category]
}

export function saveConsent(
  choices: Partial<ConsentChoices>,
  mode: string = 'custom',
  extra: Record<string, any> = {}
): ConsentRecord {
  const payload: ConsentRecord = {
    version: CONSENT_VERSION,
    ts: nowIso(),
    mode,
    choices: {
      necessary: true, // Always true
      analytics: !!choices.analytics,
      marketing: !!choices.marketing,
    },
    ...extra,
  }

  localStorage.setItem(CONSENT_KEY, JSON.stringify(payload))
  ;(window as any).__consent = payload

  // Trigger consent change event
  window.dispatchEvent(new CustomEvent('consent:changed', { detail: payload }))

  return payload
}

type ConsentCallback = () => void

export function onConsent(
  category: ConsentCategory,
  cb: ConsentCallback
): () => void {
  if (hasConsent(category)) {
    try {
      cb()
    } catch {
      // Gestion silencieuse des erreurs de callback
    }
    return () => {}
  }

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<ConsentChangedEventDetail>
    if (customEvent?.detail?.choices?.[category]) {
      try {
        cb()
      } catch {
        // Silent callback error handling
      }
      window.removeEventListener('consent:changed', handler)
    }
  }
  window.addEventListener('consent:changed', handler)
  return () => window.removeEventListener('consent:changed', handler)
}

export async function tryLogServerConsent(
  record: Partial<ConsentRecord>
): Promise<void> {
  try {
    const base = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
    if (!base) {
      console.warn('❌ Supabase Functions URL not configured')
      return
    }

    const url = `${base}/log-consent`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    if (import.meta.env.DEV) {
      console.log('✅ Consent logged server-side:', result)
    }
  } catch (err) {
    // En dev, si l'edge function n'est pas démarrée (503), on log discrètement
    if (import.meta.env.DEV && (err as Error).message?.includes('503')) {
      console.debug(
        'ℹ️ Edge function log-consent non disponible (normal en dev local)'
      )
    } else {
      console.warn('❌ Failed to log consent server-side:', err)
    }
    // Don't block the user if logging fails
  }
}

// Function to revoke consent
export function revokeConsent(): boolean {
  try {
    const previous = getConsent()
    localStorage.removeItem(CONSENT_KEY)
    delete (window as any).__consent

    // Trigger events
    window.dispatchEvent(new CustomEvent('consent:revoked'))
    window.dispatchEvent(
      new CustomEvent('consent:changed', {
        detail: {
          choices: { necessary: true, analytics: false, marketing: false },
        },
      })
    )

    // Log server-side (if Functions URL is configured)
    tryLogServerConsent({
      ...(previous || {}),
      action: 'revoke',
      ts: nowIso(),
    })

    return true
  } catch (err) {
    console.error('❌ Error revoking consent:', err)
    return false
  }
}

// Function to check if consent has expired
export function isConsentExpired(): boolean {
  const consent = getConsent()
  if (!consent) return true
  return isExpired(consent.ts)
}

// Function to get detailed consent status
export function getConsentStatus(): ConsentStatus {
  const consent = getConsent()
  if (!consent) {
    return {
      hasConsent: false,
      isExpired: false,
      daysUntilExpiry: 0,
      choices: defaultChoices(),
      mode: null,
      timestamp: null,
    }
  }

  const now = new Date()
  const consentDate = new Date(consent.ts)
  const daysUntilExpiry = Math.ceil(
    (EXPIRY_DAYS * 24 * 60 * 60 * 1000 -
      (now.getTime() - consentDate.getTime())) /
      (24 * 60 * 60 * 1000)
  )

  return {
    hasConsent: true,
    isExpired: isExpired(consent.ts),
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    choices: consent.choices,
    mode: consent.mode,
    timestamp: consent.ts,
  }
}

// --- Backward compatibility (events used elsewhere) ---
if (typeof window !== 'undefined') {
  addEventListener('open-cookie-preferences', () => {
    dispatchEvent(new CustomEvent('cookie-preferences:open'))
  })
}
