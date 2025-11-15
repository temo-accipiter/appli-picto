'use client'

/**
 * WebVitals - Tracking des Core Web Vitals
 *
 * Mesure et envoie les métriques de performance critiques :
 * - LCP (Largest Contentful Paint) : temps de chargement du plus grand élément visible
 * - FID (First Input Delay) : temps de réponse à la première interaction
 * - CLS (Cumulative Layout Shift) : stabilité visuelle de la page
 * - FCP (First Contentful Paint) : temps avant le premier rendu
 * - TTFB (Time to First Byte) : temps de réponse du serveur
 * - INP (Interaction to Next Paint) : latence des interactions (remplace FID)
 *
 * Les métriques sont envoyées à :
 * - Google Analytics 4 (si configuré)
 * - Sentry (si configuré avec performance monitoring)
 * - Console (en dev)
 */

import { useEffect } from 'react'
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

/**
 * Seuils de performance Google (Good / Needs Improvement / Poor)
 * @see https://web.dev/vitals/
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // ms
  FID: { good: 100, poor: 300 }, // ms
  INP: { good: 200, poor: 500 }, // ms
  CLS: { good: 0.1, poor: 0.25 }, // score
  FCP: { good: 1800, poor: 3000 }, // ms
  TTFB: { good: 800, poor: 1800 }, // ms
}

/**
 * Détermine le rating d'une métrique (good/needs-improvement/poor)
 */
const getRating = (metric: Metric): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds = THRESHOLDS[metric.name as keyof typeof THRESHOLDS]
  if (!thresholds) return 'good'

  if (metric.value <= thresholds.good) return 'good'
  if (metric.value <= thresholds.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * Envoie une métrique à Google Analytics 4
 */
const sendToGA4 = (metric: Metric): void => {
  if (!window.gtag || !import.meta.env.VITE_GA4_ID) return

  const rating = getRating(metric)

  window.gtag('event', metric.name, {
    value: Math.round(
      metric.name === 'CLS' ? metric.value * 1000 : metric.value
    ),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: rating,
    // Custom dimensions
    page_path: window.location.pathname,
    navigation_type: metric.navigationType,
  })

  if (import.meta.env.DEV) {
    console.log(`📊 ${metric.name}: ${metric.value.toFixed(2)} (${rating})`, {
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    })
  }
}

/**
 * Envoie une métrique à Sentry (si performance monitoring activé)
 */
const sendToSentry = (metric: Metric): void => {
  if (!import.meta.env.VITE_SENTRY_DSN) return

  import('@/config/sentry')
    .then(({ Sentry }) => {
      // Capturer la métrique comme événement au lieu de transaction
      // startTransaction a été remplacé par startSpan dans Sentry v8+
      Sentry.captureMessage(`web-vitals-${metric.name}`, {
        level: 'info',
        contexts: {
          'web-vital': {
            name: metric.name,
            value: metric.value,
            unit: metric.name === 'CLS' ? '' : 'millisecond',
            rating: getRating(metric),
            navigation_type: metric.navigationType,
          },
        },
      })
    })
    .catch(() => {
      // Sentry non disponible
    })
}

/**
 * Handler commun pour toutes les métriques
 */
const handleMetric = (metric: Metric): void => {
  // Envoyer à GA4
  sendToGA4(metric)

  // Envoyer à Sentry
  sendToSentry(metric)

  // Log en développement
  if (import.meta.env.DEV) {
    const rating = getRating(metric)
    const emoji =
      rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌'
    console.log(`${emoji} Core Web Vital: ${metric.name}`, {
      value: metric.value.toFixed(2),
      rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    })
  }
}

/**
 * Hook React pour initialiser le tracking des Core Web Vitals
 */
export const useWebVitals = (): void => {
  useEffect(() => {
    // LCP (Largest Contentful Paint)
    onLCP(handleMetric)

    // INP (Interaction to Next Paint) - Remplace FID
    onINP(handleMetric)

    // CLS (Cumulative Layout Shift)
    onCLS(handleMetric)

    // FCP (First Contentful Paint)
    onFCP(handleMetric)

    // TTFB (Time to First Byte)
    onTTFB(handleMetric)

    if (import.meta.env.DEV) {
      console.log('📊 Core Web Vitals tracking activé')
    }
  }, [])
}

/**
 * Composant WebVitals
 * À monter une seule fois dans l'app (généralement dans main.tsx)
 *
 * @example
 * <WebVitals />
 */
export default function WebVitals(): null {
  useWebVitals()
  return null
}
