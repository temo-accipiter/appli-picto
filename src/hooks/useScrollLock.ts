import { useEffect } from 'react'
import type { RefObject } from 'react'

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
 * - Restore overflow quand inactif
 *
 * @param options - Options de configuration du hook
 *
 * @example
 * const modalRef = useRef<HTMLDivElement>(null)
 * useScrollLock({
 *   isActive: isOpen,
 *   containerRef: modalRef,
 *   focusSelector: '.modal__footer button:last-of-type'
 * })
 */
export function useScrollLock({
  isActive,
  containerRef,
  focusSelector = '.modal__footer button:last-of-type',
}: UseScrollLockOptions) {
  useEffect(() => {
    if (isActive) {
      // Lock scroll
      document.body.style.overflow = 'hidden'

      // Auto-focus sur élément spécifié
      if (containerRef) {
        const targetElement = containerRef.current?.querySelector(focusSelector)
        if (targetElement instanceof HTMLElement) {
          targetElement.focus()
        } else {
          // Fallback : focus sur le conteneur lui-même
          containerRef.current?.focus()
        }
      }
    } else {
      // Restore scroll
      document.body.style.overflow = ''
    }
  }, [isActive, containerRef, focusSelector])
}
