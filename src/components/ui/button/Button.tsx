'use client'

import { ReactNode, forwardRef } from 'react'
import './Button.scss'

type ButtonVariant = 'primary' | 'secondary' | 'default' | 'danger'
type ButtonType = 'button' | 'submit' | 'reset'

interface ButtonProps {
  onClick?: () => void
  label?: string | ReactNode
  children?: ReactNode
  variant?: ButtonVariant
  disabled?: boolean
  isLoading?: boolean
  type?: ButtonType
  className?: string
  'aria-expanded'?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      onClick,
      label,
      children,
      variant = 'primary',
      disabled = false,
      isLoading = false,
      type = 'button',
      className = '',
      'aria-expanded': ariaExpanded,
    },
    ref
  ) => {
    const content = children ?? label
    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        type={type}
        className={`btn btn--${variant}${isLoading ? ' btn--loading' : ''} ${className}`.trim()}
        onClick={onClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-expanded={ariaExpanded}
        aria-busy={isLoading}
      >
        {isLoading && (
          <span className="btn__spinner" aria-hidden="true">
            <span className="btn__spinner-dot" />
            <span className="btn__spinner-dot" />
            <span className="btn__spinner-dot" />
          </span>
        )}
        <span className="btn__text">{content}</span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
