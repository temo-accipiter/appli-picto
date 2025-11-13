import { ReactNode } from 'react'
import './Button.scss'

type ButtonVariant = 'primary' | 'secondary' | 'default' | 'danger'
type ButtonType = 'button' | 'submit' | 'reset'

interface ButtonProps {
  onClick?: () => void
  label: string | ReactNode
  variant?: ButtonVariant
  disabled?: boolean
  type?: ButtonType
  'aria-expanded'?: boolean
}

export default function Button({
  onClick,
  label,
  variant = 'primary',
  disabled = false,
  type = 'button',
  'aria-expanded': ariaExpanded,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-expanded={ariaExpanded}
    >
      <span className="btn__text">{label}</span>
    </button>
  )
}
