'use client'

// src/components/modal/Modal.tsx
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { Button, ButtonClose } from '@/components'
import './Modal.scss'

type ButtonVariant = 'primary' | 'secondary' | 'default' | 'danger'
type ModalSize = 'small' | 'medium' | 'large'

interface ModalAction {
  label: string
  onClick: () => void
  variant?: ButtonVariant
  disabled?: boolean
  autoFocus?: boolean
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  actions?: ModalAction[]
  className?: string
  size?: ModalSize
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions = [],
  className = '',
  size = 'medium',
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const modalRoot = useRef<HTMLElement | null>(null)

  // Initialize portal root on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      modalRoot.current = document.body
    }
  }, [])

  // Gérer Échap et Entrée
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        const active = document.activeElement
        if (
          modalRef.current?.contains(active) &&
          active instanceof HTMLButtonElement
        ) {
          e.preventDefault()
          active.click()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose, closeOnEscape])

  // Lock scroll & focus par défaut sur le dernier bouton d'action
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // on cible le dernier bouton dans .modal__footer
      const lastBtn = modalRef.current?.querySelector(
        '.modal__footer button:last-of-type'
      )
      if (lastBtn instanceof HTMLElement) {
        lastBtn.focus()
      } else {
        // fallback : focus sur la boîte
        modalRef.current?.focus()
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus-trap Tab / Shift+Tab
  useEffect(() => {
    if (!isOpen) return
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return

      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen || !modalRoot.current) return null

  const sizeClass = size !== 'medium' ? `modal--${size}` : ''
  const modalClasses = `modal ${sizeClass} ${className}`.trim()

  const content = (
    <div
      className="modal-overlay"
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={e => e.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
      >
        {/* Header avec titre et close button */}
        <div className="modal__header">
          {title && (
            <h2 className="modal__title" id="modal-title">
              {title}
            </h2>
          )}
          {showCloseButton && <ButtonClose onClick={onClose} size="modal" />}
        </div>

        {/* Contenu principal */}
        <div className="modal__content">{children}</div>

        {/* Footer avec actions */}
        {actions.length > 0 && (
          <footer className="modal__footer">
            {/* Bouton Annuler par défaut à gauche */}
            <Button label="Annuler" onClick={onClose} variant="secondary" />
            {/* Autres actions */}
            {actions.map((act, i) => (
              <Button
                key={i}
                label={act.label}
                onClick={act.onClick}
                {...(act.variant !== undefined && { variant: act.variant })}
                {...(act.disabled !== undefined && { disabled: act.disabled })}
              />
            ))}
          </footer>
        )}
      </div>
    </div>
  )

  return createPortal(content, modalRoot.current)
}
