'use client'

import React from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { useI18n } from '@/hooks'
import './Select.scss'

export interface SelectOption {
  value: string | number
  label: string
  image?: string // URL de l'image (optionnel)
  imageAlt?: string // Alt text pour l'image
}

export interface SelectProps {
  id: string
  label?: string
  value: string | number
  onChange: (value: string | number) => void
  options?: SelectOption[]
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  name?: string
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
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

    // Trouve l'option sélectionnée pour l'affichage dans le trigger
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

        <RadixSelect.Root
          value={String(value)}
          onValueChange={val => {
            // Reconvertit en nombre si la valeur originale était un nombre
            const option = options.find(opt => String(opt.value) === val)
            if (option) {
              onChange(option.value)
            }
          }}
          disabled={disabled}
          name={name ?? ''}
          required={required}
        >
          <RadixSelect.Trigger
            ref={ref}
            id={id}
            className={`select-with-image__trigger${error ? ' select-with-image__trigger--error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            <RadixSelect.Value asChild>
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
            </RadixSelect.Value>
            <RadixSelect.Icon
              className="select-with-image__icon"
              aria-hidden="true"
            >
              ▼
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content
              className="select-with-image__content"
              position="popper"
              sideOffset={4}
              align="start"
            >
              <RadixSelect.Viewport className="select-with-image__viewport">
                {options.map(option => (
                  <RadixSelect.Item
                    key={option.value}
                    value={String(option.value)}
                    className="select-with-image__item"
                  >
                    <RadixSelect.ItemText asChild>
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
                    </RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator className="select-with-image__indicator">
                      ✓
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>

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

Select.displayName = 'Select'

export default Select
