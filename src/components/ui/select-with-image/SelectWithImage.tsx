'use client'

import React from 'react'
import * as Select from '@radix-ui/react-select'
import { useI18n } from '@/hooks'
import './SelectWithImage.scss'

export interface SelectWithImageOption {
  value: string | number
  label: string
  image?: string // URL de l'image (optionnel)
  imageAlt?: string // Alt text pour l'image
}

interface SelectWithImageProps {
  id: string
  label?: string
  value: string | number
  onChange: (value: string | number) => void
  options?: SelectWithImageOption[]
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  name?: string
}

export const SelectWithImage = React.forwardRef<
  HTMLButtonElement,
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
      required = false,
      name,
    },
    ref
  ) => {
    const { t } = useI18n()
    const defaultPlaceholder = placeholder || `— ${t('actions.select')} —`

    // Trouve l'option sélectionnée
    const selectedOption = options.find(
      opt => String(opt.value) === String(value)
    )

    return (
      <div className="select-with-image">
        {label && (
          <label htmlFor={id} className="select-with-image__label">
            {label}
            {required && (
              <span className="select-with-image__required"> *</span>
            )}
          </label>
        )}

        <Select.Root
          value={String(value)}
          onValueChange={val => {
            // Convertir en nombre si la valeur originale était un nombre
            const option = options.find(opt => String(opt.value) === val)
            if (option) {
              onChange(option.value)
            }
          }}
          disabled={disabled}
          name={name ?? ''}
          required={required}
        >
          <Select.Trigger
            ref={ref}
            id={id}
            className={`select-with-image__trigger${error ? ' select-with-image__trigger--error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            <Select.Value asChild>
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
            </Select.Value>
            <Select.Icon className="select-with-image__icon" aria-hidden="true">
              ▼
            </Select.Icon>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content
              className="select-with-image__content"
              position="popper"
              sideOffset={4}
              align="start"
            >
              <Select.Viewport className="select-with-image__viewport">
                {options.map(option => (
                  <Select.Item
                    key={option.value}
                    value={String(option.value)}
                    className="select-with-image__item"
                  >
                    <Select.ItemText asChild>
                      <div className="select-with-image__item-content">
                        {option.image && (
                          <img
                            src={option.image}
                            alt={option.imageAlt || option.label}
                            className="select-with-image__item-image"
                          />
                        )}
                        <span className="select-with-image__item-label">
                          {option.label}
                        </span>
                      </div>
                    </Select.ItemText>
                    <Select.ItemIndicator className="select-with-image__indicator">
                      ✓
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

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
