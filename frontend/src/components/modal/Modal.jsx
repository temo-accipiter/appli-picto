// src/components/modal/Modal.jsx
import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { Button } from '@/components'
import './Modal.scss'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions = [],
}) {
  const modalRef = useRef(null)

  // Gérer Échap et Entrée
  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        const active = document.activeElement
        if (modalRef.current.contains(active) && active.tagName === 'BUTTON') {
          e.preventDefault()
          active.click()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Lock scroll & focus par défaut sur "Confirmer" (dernier bouton d'action)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // on cible le bouton "Confirmer" : dernier bouton dans .modal__actions
      const confirmBtn = modalRef.current.querySelector(
        '.modal__actions button:last-of-type'
      )
      if (confirmBtn) {
        confirmBtn.focus()
      } else {
        // fallback : focus sur la boîte
        modalRef.current.focus()
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus-trap Tab / Shift+Tab
  useEffect(() => {
    if (!isOpen) return
    const handleTab = (e) => {
      if (e.key !== 'Tab') return

      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
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

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
      >
        {title && (
          <h2 className="modal__title" id="modal-title">
            {title}
          </h2>
        )}
        <div className="modal__content">{children}</div>
        {actions.length > 0 && (
          <footer className="modal__actions">
            {actions.map((act, i) => (
              <Button
                key={i}
                label={act.label}
                onClick={act.onClick}
                variant={act.variant}
              />
            ))}
          </footer>
        )}
        <button className="modal__close" aria-label="Fermer" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  )
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      variant: PropTypes.oneOf(['primary', 'secondary', 'reset']),
    })
  ),
}
