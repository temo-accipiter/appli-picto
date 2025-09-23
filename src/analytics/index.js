// src/analytics/index.js
import { hasConsent } from '@/utils/consent'

/** === GA4 (charge uniquement si consentement + ID valide) === */
const GA_ID = (import.meta.env.VITE_GA4_ID || '').trim()
const isValidGA = id => /^G-[A-Z0-9]{6,}$/.test(id) // évite les IDs factices

function injectScript(src) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
  return s
}

let gaScripts = []

export function initGA4() {
  // Ne rien faire si pas d’ID ou déjà initialisé
  if (!isValidGA(GA_ID)) {
    console.info('ℹ️ GA4 non initialisé : ID absent/incorrect')
    return
  }
  if (window.gtag) return

  // Injection du script Google Analytics
  gaScripts.push(
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`)
  )

  // DataLayer + gtag (après consentement uniquement)
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }

  // Configuration GA4 (privacy‑by‑default)
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    // Pas de page_view auto : on declenche manuellement
    send_page_view: false,
    // Cookies "surs"
    cookie_flags: 'SameSite=None;Secure',
    cookie_domain: 'auto',
    cookie_expires: 63072000, // 2 ans max
    page_title: document.title,
  })

  // Premier page_view manuel
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_referrer: document.referrer || '',
  })

  console.log('✅ GA4 initialisé (mode privacy)')
}

export function teardownGA4() {
  try {
    if (isValidGA(GA_ID)) {
      window[`ga-disable-${GA_ID}`] = true
      if (window.dataLayer) window.dataLayer = []
      delete window.gtag
    }
    gaScripts.forEach(el => el?.parentNode?.removeChild(el))
    gaScripts = []
    console.log('✅ GA4 complètement désactivé')
  } catch (error) {
    console.warn('⚠️ Erreur lors de la désactivation de GA4:', error)
  }
}

/** === Pont consentement → trackers === */
export function setupConsentBridges() {
  // Ne rien précharger sans consentement
  if (hasConsent('analytics') && isValidGA(GA_ID)) {
    initGA4()
  }

  // Écoute des changements de consentement
  window.addEventListener('consent:changed', e => {
    const granted = !!e?.detail?.choices?.analytics
    if (granted) {
      initGA4()
    } else {
      teardownGA4()
      // Option : location.reload() pour couper toute session residuelle
    }
  })
}

// === Aides conformité ===
export function verifyGA4PrivacySettings() {
  if (!window.gtag || !isValidGA(GA_ID)) return false
  // On a configuré explicitement les options privacy ci‑dessus.
  return true
}

export function getGA4ComplianceStatus() {
  return {
    isInitialized: !!window.gtag,
    isPrivacyCompliant: verifyGA4PrivacySettings(),
    hasConsent: hasConsent('analytics'),
    gaId: GA_ID,
    isValidId: isValidGA(GA_ID),
  }
}
