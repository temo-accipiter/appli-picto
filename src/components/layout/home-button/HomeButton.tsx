'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'
import { useI18n } from '@/hooks'
import './HomeButton.scss'

/**
 * HomeButton - "Panic Button" pour retourner au tableau
 *
 * Affichage:
 * - Visible partout (public et protected routes)
 * - Icône home toujours cliquable
 * - Lien direct vers /tableau
 *
 * Accessibilité WCAG 2.2 AA:
 * - aria-label explicite
 * - title pour tooltip
 * - Min-height/width 44px pour touch target
 * - Focus ring visible
 *
 * TSA-friendly:
 * - "Bouton de sécurité" pour enfant anxieux
 * - Icône univoque (maison)
 * - Toujours accessible, même pendant les transitions
 */
export default function HomeButton() {
  const { t } = useI18n()

  return (
    <Link
      href="/tableau"
      className="home-button"
      aria-label={t('nav.tableau')}
      title={t('nav.tableau')}
    >
      <Home size={24} strokeWidth={2} aria-hidden="true" />
    </Link>
  )
}
