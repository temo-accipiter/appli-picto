// Gestion centralisée du consentement cookies (CNIL)
// - Stockage local (preuve : timestamp, version, choix)
// - Événements pour réagir aux changements (ex: initialiser GA4 après consentement)
// - Log optionnel côté serveur si table "consentements" existe

const CONSENT_KEY = 'cookie_consent_v1'
const CONSENT_VERSION = 1

export function defaultChoices() {
  return {
    necessary: true, // toujours actif
    analytics: false,
    marketing: false,
  }
}

export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.v !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function hasConsent(category) {
  const current = getConsent()
  if (!current) return false
  return !!current.choices?.[category]
}

export function saveConsent(choices, mode = 'custom', extra = {}) {
  const payload = {
    v: CONSENT_VERSION,
    ts: new Date().toISOString(),
    mode, // 'accept_all' | 'refuse_all' | 'custom'
    choices: {
      necessary: true,
      analytics: !!choices.analytics,
      marketing: !!choices.marketing,
    },
    ...extra, // { user_id, ua, ... } si voulu
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(payload))

  // expose global simple
  window.__consent = payload

  // notifie l'app
  window.dispatchEvent(new CustomEvent('consent:changed', { detail: payload }))
  return payload
}

// Callback qui s'exécute dès que la catégorie a le consentement
export function onConsent(category, cb) {
  if (hasConsent(category)) {
    try {
      cb()
    } catch {}
    return () => {}
  }
  const handler = e => {
    if (e?.detail?.choices?.[category]) {
      try {
        cb()
      } catch {}
      window.removeEventListener('consent:changed', handler)
    }
  }
  window.addEventListener('consent:changed', handler)
  return () => window.removeEventListener('consent:changed', handler)
}

// (Optionnel) journal côté serveur si disponible
export async function tryLogServerConsent(supabase, record) {
  if (!supabase) return
  try {
    await supabase.from('consentements').insert(record)
  } catch {
    // silencieux: si la table n'existe pas, on ignore
  }
}
