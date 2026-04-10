'use client'

import { ComponentPropsWithoutRef, forwardRef } from 'react'
import { X } from 'lucide-react'
import './ButtonClose.scss'

type ButtonCloseProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  ariaLabel?: string
  size?: 'small' | 'large' | 'modal'
}

const ButtonClose = forwardRef<HTMLButtonElement, ButtonCloseProps>(
  (
    { onClick, ariaLabel = 'Fermer', size = 'small', className = '', ...rest },
    ref
  ) => {
    const iconSize = size === 'large' ? 28 : size === 'modal' ? 20 : 20

    return (
      <button
        ref={ref}
        type="button"
        className={`button-close button-close--${size}${className ? ` ${className}` : ''}`}
        {...rest}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <X size={iconSize} strokeWidth={2} aria-hidden="true" />
      </button>
    )
  }
)

ButtonClose.displayName = 'ButtonClose'

export default ButtonClose
