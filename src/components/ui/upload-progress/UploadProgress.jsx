// src/components/ui/upload-progress/UploadProgress.jsx
// Indicateur progression upload TSA-friendly (couleurs pastel, animations douces)

import PropTypes from 'prop-types'
import './UploadProgress.scss'

/**
 * Indicateur progression upload avec feedback TSA-friendly
 *
 * @param {number} progress - Progression 0-100
 * @param {string} message - Message contextuel (ex: "Conversion HEIC...", "Upload...")
 * @param {string} step - Étape actuelle (validation, heic_conversion, compression, etc.)
 *
 * @example
 * <UploadProgress
 *   progress={75}
 *   message="Optimisation..."
 *   step="compression"
 * />
 */
export default function UploadProgress({
  progress = 0,
  message = 'Envoi en cours...',
  step = 'upload',
}) {
  const progressPercent = Math.min(Math.max(progress, 0), 100)

  // Messages par défaut selon l'étape (si message non fourni)
  const defaultMessages = {
    validation: 'Vérification...',
    heic_conversion: 'Conversion iPhone...',
    compression: 'Optimisation...',
    hash: 'Vérification doublons...',
    deduplication: 'Vérification doublons...',
    quota: 'Vérification quota...',
    upload: 'Envoi...',
    upload_retry: 'Connexion lente, réessai...',
    database: 'Finalisation...',
    complete: 'Terminé !',
  }

  const displayMessage = message || defaultMessages[step] || 'Traitement...'

  return (
    <div
      className="upload-progress"
      role="status"
      aria-live="polite"
      aria-busy={progressPercent < 100}
    >
      <div className="upload-progress__bar" aria-hidden="true">
        <div
          className="upload-progress__fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="upload-progress__message">{displayMessage}</p>
      <span
        className="upload-progress__percent"
        aria-label={`Progression: ${Math.round(progressPercent)} pourcent`}
      >
        {Math.round(progressPercent)}%
      </span>
    </div>
  )
}

UploadProgress.propTypes = {
  progress: PropTypes.number,
  message: PropTypes.string,
  step: PropTypes.string,
}
