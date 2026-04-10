'use client'

import { ComponentPropsWithoutRef, ReactNode, forwardRef } from 'react'
import './Button.scss'

type ButtonVariant = 'primary' | 'secondary' | 'default' | 'danger'

type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  label?: string | ReactNode
  children?: ReactNode
  variant?: ButtonVariant
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      label,
      children,
      variant = 'primary',
      disabled = false,
      isLoading = false,
      type = 'button',
      className = '',
      ...rest
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
        disabled={isDisabled}
        {...rest}
        aria-disabled={isDisabled}
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
