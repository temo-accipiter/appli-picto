'use client'

/**
 * Hook useReducedMotion - Détecte la préférence utilisateur pour mouvement réduit
 * WCAG 2.1.3 - prefers-reduced-motion media query support
 *
 * Retourne `true` si l'utilisateur a activé "prefers-reduced-motion: reduce"
 * Utiliser pour désactiver les animations complexes sur demande
 */

import { useEffect, useState } from 'react'

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Vérifier la préférence système au montage
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    // Écouter les changements de préférence
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}
