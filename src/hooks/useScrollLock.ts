import { useEffect } from 'react'
import type { RefObject } from 'react'

let activeScrollLocks = 0
let previousBodyOverflow = ''

interface UseScrollLockOptions {
  /** Activer/désactiver le lock scroll (généralement isOpen) */
  isActive: boolean
  /** Ref du conteneur pour auto-focus */
  containerRef?: RefObject<HTMLElement | null>
  /** Sélecteur CSS pour élément à focus (défaut: dernier bouton footer) */
  focusSelector?: string
}

/**
 * Hook personnalisé pour verrouiller le scroll du body et gérer le focus initial
 * - Lock overflow:hidden sur body quand actif
 * - Auto-focus sur élément spécifié (défaut: dernier bouton footer)
 * - Restore overflow quand inactif ou au démontage
 * - Supporte plusieurs locks imbriqués sans restaurer trop tôt
 */
export function useScrollLock({
  isActive,
  containerRef,
  focusSelector = '.modal__footer button:last-of-type',
}: UseScrollLockOptions) {
  useEffect(() => {
    if (!isActive) return

    if (activeScrollLocks === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    activeScrollLocks += 1

    if (containerRef) {
      const targetElement = containerRef.current?.querySelector(focusSelector)
      if (targetElement instanceof HTMLElement) {
        targetElement.focus()
      } else {
        // Fallback : focus sur le conteneur lui-même
        containerRef.current?.focus()
      }
    }

    return () => {
      activeScrollLocks = Math.max(0, activeScrollLocks - 1)

      if (activeScrollLocks === 0) {
        document.body.style.overflow = previousBodyOverflow
      }
    }
  }, [isActive, containerRef, focusSelector])
}
