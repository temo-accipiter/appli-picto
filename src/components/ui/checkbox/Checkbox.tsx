'use client'

import type { InputHTMLAttributes, ChangeEvent } from 'react'
import { forwardRef } from 'react'
import { Check } from 'lucide-react'
import './Checkbox.scss'

type CheckboxSize = 'sm' | 'md'

interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'checked' | 'type' | 'size'
  > {
  id: string
  label?: string
  checked: boolean
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  error?: string
  className?: string
  size?: CheckboxSize
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id,
      label,
      checked,
      onChange,
      error = '',
      className = '',
      size = 'md',
      ...rest
    },
    ref
  ) => {
    return (
      <div className={`checkbox-field checkbox-field--${size} ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className="checkbox-field__input"
          checked={checked}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        {checked && (
          <span className="checkbox-field__checkmark" aria-hidden="true">
            <Check size={16} strokeWidth={3} />
          </span>
        )}
        {label && (
          <label htmlFor={id} className="checkbox-field__label">
            {label}
          </label>
        )}
        {error && (
          <p id={`${id}-error`} className="checkbox-field__error">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
