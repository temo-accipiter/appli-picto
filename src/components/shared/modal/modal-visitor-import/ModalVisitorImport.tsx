'use client'

/**
 * ModalVisitorImport.tsx — Modal d'import séquences Visitor → Supabase.
 *
 * ⚠️ UI/UX TSA (WCAG 2.2 AA)
 * - Design sobre, tokens Sass uniquement (pas de valeurs hardcodées)
 * - Animations douces (max 0.3s ease, respect prefers-reduced-motion)
 * - Bouton "Plus tard" parfaitement fonctionnel (liberté utilisateur)
 * - Surface secondary pour fond
 * - Contraste minimum 4.5:1
 * - Focus visible
 *
 * ⚠️ ATOMICITÉ
 * - Import unique via RPC (pas de boucle for)
 * - Pas de cleanup IndexedDB si erreur réseau
 * - Feedback clair succès/erreur
 */

import { useState } from 'react'
import Modal from '../Modal'
import { useVisitorImport } from '@/hooks/useVisitorImport'
import { useReducedMotion } from '@/hooks'
import './ModalVisitorImport.scss'

interface ModalVisitorImportProps {
  /** Modal ouverte/fermée */
  isOpen: boolean

  /** Callback fermeture modal */
  onClose: () => void

  /** Callback succès import (optionnel, pour refresh UI parente) */
  onImportSuccess?: () => void
}

export default function ModalVisitorImport({
  isOpen,
  onClose,
  onImportSuccess,
}: ModalVisitorImportProps) {
  const { importing, error, result, importSequences, reset } =
    useVisitorImport()
  const _reducedMotion = useReducedMotion()

  const [showSuccess, setShowSuccess] = useState(false)

  const handleImport = async () => {
    try {
      await importSequences()

      // Succès : afficher feedback
      setShowSuccess(true)

      // Callback optionnel (refresh UI parente)
      if (onImportSuccess) {
        onImportSuccess()
      }

      // Fermer modal après 2s (sans animation brusque)
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      // Erreur déjà gérée par le hook (stockée dans `error`)
      console.error('Erreur import séquences:', err)
    }
  }

  const handleClose = () => {
    // Reset état avant fermeture
    reset()
    setShowSuccess(false)
    onClose()
  }

  const handleLater = () => {
    // Bouton "Plus tard" : fermer sans importer (liberté utilisateur)
    handleClose()
  }

  // États UI
  const isImporting = importing
  const hasError = !!error
  const hasSuccess = showSuccess && result !== null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importer mes données"
      size="medium"
      closeOnOverlay={!isImporting} // Bloquer fermeture overlay pendant import
      closeOnEscape={!isImporting} // Bloquer Escape pendant import
      showCloseButton={!isImporting} // Masquer croix pendant import
      className="modal-visitor-import"
    >
      <div className="modal-visitor-import__content">
        {/* État initial : proposition import */}
        {!isImporting && !hasSuccess && !hasError && (
          <>
            <p className="modal-visitor-import__description">
              Nous avons détecté des séquences créées avant votre inscription.
            </p>
            <p className="modal-visitor-import__description">
              Souhaitez-vous les importer dans votre compte ?
            </p>
          </>
        )}

        {/* État import en cours */}
        {isImporting && (
          <div className="modal-visitor-import__loading">
            <div
              className="modal-visitor-import__spinner"
              role="status"
              aria-live="polite"
            >
              <span className="sr-only">Import en cours...</span>
            </div>
            <p className="modal-visitor-import__loading-text">
              Import en cours, veuillez patienter...
            </p>
          </div>
        )}

        {/* État succès */}
        {hasSuccess && result && (
          <div className="modal-visitor-import__success" role="alert">
            <div className="modal-visitor-import__success-icon">✓</div>
            <p className="modal-visitor-import__success-text">
              Import réussi !
            </p>
            <p className="modal-visitor-import__success-details">
              {result.imported_count > 0 && (
                <span>
                  {result.imported_count} séquence
                  {result.imported_count > 1 ? 's' : ''} importée
                  {result.imported_count > 1 ? 's' : ''}
                </span>
              )}
              {result.skipped_count > 0 && (
                <span>
                  {result.imported_count > 0 && ' • '}
                  {result.skipped_count} déjà existante
                  {result.skipped_count > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        )}

        {/* État erreur */}
        {hasError && (
          <div className="modal-visitor-import__error" role="alert">
            <div className="modal-visitor-import__error-icon">⚠</div>
            <p className="modal-visitor-import__error-text">
              Une erreur est survenue
            </p>
            <p className="modal-visitor-import__error-details">{error}</p>
          </div>
        )}
      </div>

      {/* Actions (boutons) */}
      <div className="modal-visitor-import__actions">
        {!isImporting && !hasSuccess && (
          <>
            <button
              type="button"
              onClick={handleLater}
              className="modal-visitor-import__button modal-visitor-import__button--secondary"
              disabled={isImporting}
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="modal-visitor-import__button modal-visitor-import__button--primary"
              disabled={isImporting}
              autoFocus
            >
              Importer mes données
            </button>
          </>
        )}

        {hasError && (
          <>
            <button
              type="button"
              onClick={handleClose}
              className="modal-visitor-import__button modal-visitor-import__button--secondary"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="modal-visitor-import__button modal-visitor-import__button--primary"
              autoFocus
            >
              Réessayer
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
