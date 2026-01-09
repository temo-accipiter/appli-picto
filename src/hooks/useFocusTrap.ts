import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Hook personnalisé pour créer un focus trap dans un conteneur
 * Empêche le focus de sortir du conteneur avec Tab/Shift+Tab
 *
 * @param containerRef - Ref du conteneur (ex: modal, drawer)
 * @param isActive - État actif du focus trap (généralement isOpen)
 *
 * @example
 * const modalRef = useRef<HTMLDivElement>(null)
 * useFocusTrap(modalRef, isOpen)
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive) return

    const handleTab = (e: KeyboardEvent) => {
      // Uniquement pour Tab
      if (e.key !== 'Tab') return

      // Sélectionner tous les éléments focusables dans le conteneur
      const focusable = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusable || focusable.length === 0) return

      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement

      // Shift+Tab sur premier élément → focus sur dernier
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
      // Tab sur dernier élément → focus sur premier
      else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isActive, containerRef])
}
