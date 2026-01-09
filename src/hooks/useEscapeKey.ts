import { useEffect } from 'react'
import type { RefObject } from 'react'

interface UseEscapeKeyOptions {
  /** Activer/désactiver le hook (généralement isOpen) */
  isActive: boolean
  /** Callback appelé lors de Escape */
  onEscape?: () => void
  /** Activer gestion de Escape (défaut: true) */
  enableEscape?: boolean
  /** Ref optionnelle du conteneur pour Enter sur boutons */
  containerRef?: RefObject<HTMLElement | null>
}

/**
 * Hook personnalisé pour gérer les touches Escape et Enter
 * - Escape : ferme le composant (modal, drawer, etc.)
 * - Enter : déclenche click sur bouton actif dans le conteneur
 *
 * @param options - Options de configuration du hook
 *
 * @example
 * useEscapeKey({
 *   isActive: isOpen,
 *   onEscape: onClose,
 *   enableEscape: true,
 *   containerRef: modalRef
 * })
 */
export function useEscapeKey({
  isActive,
  onEscape,
  enableEscape = true,
  containerRef,
}: UseEscapeKeyOptions) {
  useEffect(() => {
    if (!isActive) return

    const handleKey = (e: KeyboardEvent) => {
      // Gestion Escape
      if (e.key === 'Escape' && enableEscape && onEscape) {
        e.preventDefault()
        onEscape()
      }
      // Gestion Enter sur boutons dans le conteneur
      else if (e.key === 'Enter' && containerRef) {
        const active = document.activeElement
        if (
          containerRef.current?.contains(active) &&
          active instanceof HTMLButtonElement
        ) {
          e.preventDefault()
          active.click()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isActive, onEscape, enableEscape, containerRef])
}
