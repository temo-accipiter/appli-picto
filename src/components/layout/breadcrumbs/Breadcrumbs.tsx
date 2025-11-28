'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/hooks'
import { ChevronRight } from 'lucide-react'
import './Breadcrumbs.scss'

/**
 * Breadcrumbs - Fil d'Ariane pour navigation
 *
 * Affichage:
 * - Seulement sur les routes (protected) qui en ont besoin
 * - Format: Home > Édition > Ajouter une tâche
 *
 * Accessibilité WCAG 2.2 AA:
 * - nav role avec aria-label
 * - <ol> for breadcrumb list
 * - aria-current="page" sur l'item actif
 * - Keyboard navigable (Tab)
 *
 * TSA-friendly:
 * - Rassure l'enfant sur sa localisation
 * - Lien Home toujours accessible
 * - Séparation visuelle claire (chevrons)
 */

interface BreadcrumbItem {
  label: string
  path: string
  current?: boolean
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const { t } = useI18n()

  // Extraire les segments de la route
  const segments = pathname.split('/').filter(Boolean)

  // Ne pas afficher sur le tableau (route racine) ni sur les routes sans segments
  if (segments.length === 0 || pathname === '/tableau') {
    return null
  }

  // Construire le fil d'Ariane basé sur la route
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: t('nav.tableau'),
        path: '/tableau',
      },
    ]

    // Route: /edition/[id] ou /edition
    if (segments[0] === 'edition') {
      breadcrumbs.push({
        label: t('nav.edition'),
        path: '/edition',
      })

      // Si on a un segment après edition (ex: /edition/123)
      if (segments[1]) {
        breadcrumbs.push({
          label: t('actions.edit'),
          path: `/${segments.join('/')}`,
          current: true,
        })
      } else {
        breadcrumbs[breadcrumbs.length - 1].current = true
      }

      return breadcrumbs
    }

    // Route: /profil
    if (segments[0] === 'profil') {
      breadcrumbs.push({
        label: t('nav.profil'),
        path: '/profil',
        current: true,
      })
      return breadcrumbs
    }

    // Route: /abonnement
    if (segments[0] === 'abonnement') {
      breadcrumbs.push({
        label: t('nav.abonnement'),
        path: '/abonnement',
        current: true,
      })
      return breadcrumbs
    }

    // Route: /admin ou /admin/permissions
    if (segments[0] === 'admin') {
      breadcrumbs.push({
        label: t('nav.admin'),
        path: '/admin',
      })

      if (segments[1] === 'permissions') {
        breadcrumbs.push({
          label: t('nav.permissions'),
          path: '/admin/permissions',
          current: true,
        })
      } else {
        breadcrumbs[breadcrumbs.length - 1].current = true
      }

      return breadcrumbs
    }

    return breadcrumbs
  }

  const breadcrumbs = buildBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav
      className="breadcrumbs"
      aria-label={t('nav.breadcrumbs')}
      role="navigation"
    >
      <ol className="breadcrumbs__list">
        {breadcrumbs.map((item, index) => (
          <li key={item.path} className="breadcrumbs__item">
            {item.current ? (
              <span
                className="breadcrumbs__link breadcrumbs__link--current"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <>
                <Link href={item.path} className="breadcrumbs__link">
                  {item.label}
                </Link>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight
                    size={16}
                    className="breadcrumbs__separator"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
