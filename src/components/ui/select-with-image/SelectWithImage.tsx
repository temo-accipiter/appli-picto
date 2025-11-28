'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/hooks'
import './SelectWithImage.scss'

export interface SelectWithImageOption {
  value: string | number
  label: string
  image?: string // URL de l'image (optionnel)
  imageAlt?: string // Alt text pour l'image
}

interface SelectWithImageProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value'> {
  id: string
  label?: string
  value: string | number
  onChange: (value: string | number) => void
  options?: SelectWithImageOption[]
  error?: string
  placeholder?: string
  disabled?: boolean
}

export const SelectWithImage = React.forwardRef<
  HTMLDivElement,
  SelectWithImageProps
>(
  (
    {
      id,
      label,
      value,
      onChange,
      options = [],
      error = '',
      placeholder,
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const { t } = useI18n()
    const [isOpen, setIsOpen] = useState(false)
    const detailsRef = useRef<HTMLDetailsElement>(null)
    const defaultPlaceholder = placeholder || `— ${t('actions.select')} —`

    // Fermer le dropdown quand on clique dehors
    useEffect(() => {
      if (!isOpen) return

      const handleClickOutside = (event: MouseEvent) => {
        if (
          detailsRef.current &&
          !detailsRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false)
        }
      }

      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }, [isOpen])

    // Trouve l'option sélectionnée
    const selectedOption = options.find(opt => opt.value === value)

    const handleSelect = (optionValue: string | number) => {
      onChange(optionValue)
      setIsOpen(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          setIsOpen(!isOpen)
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setIsOpen(true)
          break
      }
    }

    return (
      <div ref={ref} className="select-with-image" {...rest}>
        {label && (
          <label htmlFor={id} className="select-with-image__label">
            {label}
          </label>
        )}

        <details
          ref={detailsRef}
          className={`select-with-image__details${error ? ' select-with-image__details--error' : ''}`}
          open={isOpen}
          onToggle={e => setIsOpen(e.currentTarget.open)}
        >
          <summary
            id={id}
            role="button"
            className="select-with-image__summary"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-disabled={disabled}
            onKeyDown={handleKeyDown}
          >
            {selectedOption ? (
              <div className="select-with-image__selected">
                {selectedOption.image && (
                  <img
                    src={selectedOption.image}
                    alt={selectedOption.imageAlt || selectedOption.label}
                    className="select-with-image__selected-image"
                  />
                )}
                <span className="select-with-image__selected-label">
                  {selectedOption.label}
                </span>
              </div>
            ) : (
              <span className="select-with-image__placeholder">
                {defaultPlaceholder}
              </span>
            )}
            <span className="select-with-image__chevron" aria-hidden="true">
              ▼
            </span>
          </summary>

          <ul className="select-with-image__options" role="listbox">
            {options.map(option => (
              <li
                key={option.value}
                className={`select-with-image__option${value === option.value ? ' select-with-image__option--selected' : ''}`}
                role="option"
                aria-selected={value === option.value}
              >
                <button
                  type="button"
                  className="select-with-image__option-button"
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSelect(option.value)
                    }
                  }}
                >
                  {option.image && (
                    <img
                      src={option.image}
                      alt={option.imageAlt || option.label}
                      className="select-with-image__option-image"
                    />
                  )}
                  <span className="select-with-image__option-label">
                    {option.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>

        {error && (
          <p
            id={`${id}-error`}
            className="select-with-image__error"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

SelectWithImage.displayName = 'SelectWithImage'
