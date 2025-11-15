'use client'

import type { InputHTMLAttributes, ChangeEvent } from 'react'
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

export default function Checkbox({
  id,
  label,
  checked,
  onChange,
  error = '',
  className = '',
  size = 'md',
  ...rest
}: CheckboxProps) {
  return (
    <div className={`checkbox-field checkbox-field--${size} ${className}`}>
      <input
        type="checkbox"
        id={id}
        className="checkbox-field__input"
        checked={checked}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
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
