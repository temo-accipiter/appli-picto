'use client'

import React, { forwardRef, useRef } from 'react'
import Button from '@/components/ui/button/Button'
import './InputFile.scss'

type InputFileProps = {
  /** Identifiant HTML — associé au aria-describedby du message d'erreur */
  id: string
  /** Texte visible du bouton déclencheur */
  label: string
  /** Filtre de types acceptés, ex: "image/*" */
  accept?: string
  /** Appelé avec le fichier sélectionné (ou null si annulation / reset) */
  onChange: (file: File | null) => void
  disabled?: boolean
  /** Message d'erreur affiché sous le bouton (role="alert") */
  error?: string
  /** Classe CSS appliquée sur le wrapper */
  className?: string
}

/**
 * Primitive InputFile — bouton déclencheur visible + input file natif masqué.
 *
 * Responsabilités de cette primitive :
 * - Masquer l'input natif (display: none)
 * - Déclencher l'ouverture du sélecteur de fichier au clic du bouton
 * - Extraire le fichier sélectionné et appeler onChange(file)
 * - Afficher un message d'erreur accessible si error est fourni
 *
 * Responsabilités du composant parent :
 * - Validation du type et de la taille
 * - Compression / conversion
 * - Upload vers le stockage
 * - Affichage de la preview
 *
 * La ref est forwardée vers l'<input> natif pour permettre la réinitialisation :
 *   ref.current.value = ''
 */
const InputFile = forwardRef<HTMLInputElement, InputFileProps>(
  (
    { id, label, accept, onChange, disabled = false, error, className = '' },
    externalRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null)

    // Merge des refs : interne (pour déclencher le click) + externe (pour reset)
    const setRef = (el: HTMLInputElement | null) => {
      ;(
        internalRef as React.MutableRefObject<HTMLInputElement | null>
      ).current = el
      if (typeof externalRef === 'function') {
        externalRef(el)
      } else if (externalRef) {
        ;(
          externalRef as React.MutableRefObject<HTMLInputElement | null>
        ).current = el
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.files?.[0] ?? null)
    }

    const wrapperClass = ['input-file', error && 'input-file--error', className]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={wrapperClass}>
        {/* Input natif masqué — déclenché programmatiquement via le bouton */}
        <input
          ref={setRef}
          id={id}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled}
          aria-describedby={error ? `${id}-error` : undefined}
          className="input-file__native"
        />
        <Button
          type="button"
          onClick={() => internalRef.current?.click()}
          disabled={disabled}
          variant="default"
          className="input-file__trigger"
        >
          {label}
        </Button>
        {error && (
          <p id={`${id}-error`} className="input-file__error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

InputFile.displayName = 'InputFile'
export default InputFile
