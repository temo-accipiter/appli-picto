// src/utils/consent.js
// Gestion CNIL – cookies et traceurs
// - stockage local avec preuve (horodatage, version, choix)
// - expiration automatique (6 mois max)
// - preuve côté serveur (Supabase Edge Function / table consents)
// - compatibilité avec ton code existant (événements)

const CONSENT_KEY = 'cookie_consent_v2'
const CONSENT_VERSION = '1.0.0'
const EXPIRY_DAYS = 180 // 6 mois

export function defaultChoices() {
  return {
    necessary: true, // Toujours true, ne peut pas être désactivé
    analytics: false,
    marketing: false,
  }
}

function nowIso() {
  return new Date().toISOString()
}

function isExpired(ts) {
  const saved = new Date(ts)
  const now = new Date()
  const diff = (now - saved) / (1000 * 60 * 60 * 24)
  return diff > EXPIRY_DAYS
}

export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== CONSENT_VERSION) return null
    if (!parsed.ts || isExpired(parsed.ts)) return null
    return parsed
  } catch {
    return null
  }
}

export function hasConsent(category) {
  const current = getConsent()
  if (!current) return false

  // Les cookies nécessaires sont toujours autorisés
  if (category === 'necessary') return true

  return !!current.choices?.[category]
}

export function saveConsent(choices, mode = 'custom', extra = {}) {
  const payload = {
    version: CONSENT_VERSION,
    ts: nowIso(),
    mode,
    choices: {
      necessary: true, // Toujours true
      analytics: !!choices.analytics,
      marketing: !!choices.marketing,
    },
    ...extra,
  }

  localStorage.setItem(CONSENT_KEY, JSON.stringify(payload))
  window.__consent = payload

  // Déclencher l'événement de changement de consentement
  window.dispatchEvent(new CustomEvent('consent:changed', { detail: payload }))

  return payload
}

export function onConsent(category, cb) {
  if (hasConsent(category)) {
    try {
      cb()
    } catch {
      // Gestion silencieuse des erreurs de callback
    }
    return () => {}
  }

  const handler = e => {
    if (e?.detail?.choices?.[category]) {
      try {
        cb()
      } catch {
        // Gestion silencieuse des erreurs de callback
      }
      window.removeEventListener('consent:changed', handler)
    }
  }
  window.addEventListener('consent:changed', handler)
  return () => window.removeEventListener('consent:changed', handler)
}

export async function tryLogServerConsent(record) {
  try {
    const base = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
    if (!base) {
      console.warn('❌ URL Supabase Functions non configurée')
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
      console.log('✅ Consentement loggé côté serveur:', result)
    }
  } catch (err) {
    console.warn('❌ Échec log consentement côté serveur:', err)
    // Ne pas bloquer l'utilisateur si le logging échoue
  }
}

// Fonction pour retirer le consentement
export function revokeConsent() {
  try {
    const previous = getConsent()
    localStorage.removeItem(CONSENT_KEY)
    delete window.__consent

    // Déclencher les événements
    window.dispatchEvent(new CustomEvent('consent:revoked'))
    window.dispatchEvent(
      new CustomEvent('consent:changed', {
        detail: {
          choices: { necessary: true, analytics: false, marketing: false },
        },
      })
    )

    // Journal côté serveur (si l’URL Functions est configurée)
    tryLogServerConsent({
      ...(previous || {}),
      action: 'revoke',
      ts: nowIso(),
    })

    return true
  } catch (err) {
    console.error('❌ Erreur lors du retrait du consentement:', err)
    return false
  }
}

// Fonction pour vérifier si le consentement a expiré
export function isConsentExpired() {
  const consent = getConsent()
  if (!consent) return true
  return isExpired(consent.ts)
}

// Fonction pour obtenir le statut détaillé du consentement
export function getConsentStatus() {
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
    (EXPIRY_DAYS * 24 * 60 * 60 * 1000 - (now - consentDate)) /
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

// --- Compatibilité rétro (événements utilisés ailleurs) ---
if (typeof window !== 'undefined') {
  addEventListener('open-cookie-preferences', () => {
    dispatchEvent(new CustomEvent('cookie-preferences:open'))
  })
}
