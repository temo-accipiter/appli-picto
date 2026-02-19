'use client'

// src/components/shared/execution-only-banner/ExecutionOnlyBanner.tsx — S9
//
// Bandeau persistant signalant le mode exécution-uniquement (§9 — Downgrade).
//
// ⚠️ RÈGLES CONTRAT §9 + §6.1 catégorie #8
// - NON modal, NON bloquant
// - Visible EXCLUSIVEMENT en Contexte Édition (jamais en Tableau — §6.2)
// - L'exécution (sessions, validations) reste autorisée
//
// ⚠️ RÈGLES TSA / WCAG 2.2 AA
// - Discret visuellement (ne surcharge pas l'interface adulte)
// - Non agressif : pas de clignotement, animation douce (≤ 0.3s)
// - Message court, compréhensible pour adulte
// - Lien "Passer à Premium" : cible tactile ≥ 44px

import Link from 'next/link'
import './ExecutionOnlyBanner.scss'

/**
 * Bandeau persistant signalant le mode exécution-uniquement en Contexte Édition.
 *
 * S'affiche uniquement quand le composant parent décide de le rendre
 * (quand `isExecutionOnly === true`).
 *
 * ⚠️ JAMAIS afficher en Contexte Tableau (§6.2 — invariant TSA).
 *
 * @example
 * ```tsx
 * // Dans EditionTimeline uniquement
 * const { isExecutionOnly } = useExecutionOnly()
 * {isExecutionOnly && <ExecutionOnlyBanner />}
 * ```
 */
export default function ExecutionOnlyBanner() {
  return (
    <div
      className="execution-only-banner"
      role="status"
      aria-live="polite"
      aria-label="Mode exécution uniquement"
    >
      <span className="execution-only-banner__icon" aria-hidden="true">
        🔒
      </span>
      <span className="execution-only-banner__message">
        Mode exécution uniquement — les modifications de structure sont désactivées.{' '}
        <Link
          href="/profil#abonnement"
          className="execution-only-banner__link"
          aria-label="Passer à Premium pour réactiver l'édition de structure"
        >
          Passer à Premium
        </Link>
      </span>
    </div>
  )
}
