import { ReactNode } from 'react'
import './Button.scss'

type ButtonVariant = 'primary' | 'secondary' | 'default' | 'danger'
type ButtonType = 'button' | 'submit' | 'reset'

interface ButtonProps {
  onClick?: () => void
  label?: string | ReactNode
  children?: ReactNode
  variant?: ButtonVariant
  disabled?: boolean
  type?: ButtonType
  className?: string
  'aria-expanded'?: boolean
}

export default function Button({
  onClick,
  label,
  children,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
  'aria-expanded': ariaExpanded,
}: ButtonProps) {
  const content = children ?? label
  return (
    <button
      type={type}
      className={`btn btn--${variant} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-expanded={ariaExpanded}
    >
      <span className="btn__text">{content}</span>
    </button>
  )
}
