import React from 'react'
import { useI18n } from '@/hooks'
import './Select.scss'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'onChange' | 'value'
  > {
  id: string
  label?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options?: SelectOption[]
  error?: string
  placeholder?: string
}

export default function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  error = '',
  placeholder,
  ...rest
}: SelectProps) {
  const { t } = useI18n()
  const defaultPlaceholder = placeholder || `— ${t('actions.select')} —`

  return (
    <div className="select-field">
      {label && (
        <label htmlFor={id} className="select-field__label">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`select-field__select${error ? ' select-field__select--error' : ''}`}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      >
        <option value="">{defaultPlaceholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="select-field__error">
          {error}
        </p>
      )}
    </div>
  )
}
