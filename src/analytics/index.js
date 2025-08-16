// src/analytics/index.js
import { hasConsent } from '@/utils/consent'

/** === GA4 (charge uniquement si consentement + ID valide) === */
const GA_ID = (import.meta.env.VITE_GA4_ID || '').trim()
const isValidGA = id => /^G-[A-Z0-9]{6,}$/.test(id) // évite 'G-XXXXXXX'

function injectScript(src) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
  return s
}

let gaScripts = []

export function initGA4() {
  if (!isValidGA(GA_ID) || window.gtag) return
  gaScripts.push(
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`)
  )
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { anonymize_ip: true })
}

export function teardownGA4() {
  try {
    if (isValidGA(GA_ID)) window[`ga-disable-${GA_ID}`] = true
    gaScripts.forEach(el => el?.parentNode?.removeChild(el))
    gaScripts = []
  } catch {}
}

/** === Matomo (si utilisé) === */
let matomoLoaded = false
export function initMatomo({ url, siteId } = {}) {
  if (matomoLoaded || !url || !siteId) return
  window._paq = window._paq || []
  window._paq.push(['trackPageView'])
  window._paq.push(['enableLinkTracking'])
  ;(function () {
    const u = url.endsWith('/') ? url : url + '/'
    window._paq.push(['setTrackerUrl', u + 'matomo.php'])
    window._paq.push(['setSiteId', siteId])
    const d = document,
      g = d.createElement('script'),
      s = d.getElementsByTagName('script')[0]
    g.async = true
    g.src = u + 'matomo.js'
    s.parentNode.insertBefore(g, s)
  })()
  matomoLoaded = true
}
export function teardownMatomo() {
  const scripts = [...document.querySelectorAll('script[src*="matomo.js"]')]
  scripts.forEach(s => s.parentNode?.removeChild(s))
}

/** === Pont consentement → trackers === */
export function setupConsentBridges() {
  // ⚠️ NE PAS précharger GA4 sans consentement
  // On ne fait rien au premier rendu, sauf si un consentement existe déjà ET un ID valide est présent
  if (hasConsent('analytics') && isValidGA(GA_ID)) {
    initGA4()
    // initMatomo({ url: 'https://matomo.example.com', siteId: '1' })
  }

  // Quand le consentement change
  window.addEventListener('consent:changed', e => {
    const granted = !!e?.detail?.choices?.analytics
    if (granted) {
      initGA4()
      // initMatomo({ url: 'https://matomo.example.com', siteId: '1' })
    } else {
      teardownGA4()
      teardownMatomo()
      // Option: location.reload() pour couper toute session résiduelle
    }
  })
}
