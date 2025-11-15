'use client'

// src/components/ui/upload-progress/UploadProgress.tsx
// Indicateur progression upload TSA-friendly (couleurs pastel, animations douces)

import './UploadProgress.scss'

type UploadStep =
  | 'validation'
  | 'heic_conversion'
  | 'compression'
  | 'hash'
  | 'deduplication'
  | 'quota'
  | 'upload'
  | 'upload_retry'
  | 'database'
  | 'complete'

interface UploadProgressProps {
  progress?: number
  message?: string
  step?: UploadStep
}

/**
 * Indicateur progression upload avec feedback TSA-friendly
 *
 * @param progress - Progression 0-100
 * @param message - Message contextuel (ex: "Conversion HEIC...", "Upload...")
 * @param step - Étape actuelle (validation, heic_conversion, compression, etc.)
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
}: UploadProgressProps) {
  const progressPercent = Math.min(Math.max(progress, 0), 100)

  // Messages par défaut selon l'étape (si message non fourni)
  const defaultMessages: Record<UploadStep, string> = {
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
