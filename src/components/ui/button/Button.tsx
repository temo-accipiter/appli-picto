import './Button.scss'

type ButtonVariant = 'primary' | 'secondary' | 'default'
type ButtonType = 'button' | 'submit' | 'reset'

interface ButtonProps {
  onClick: () => void
  label: string
  variant?: ButtonVariant
  disabled?: boolean
  type?: ButtonType
}

export default function Button({
  onClick,
  label,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      <span className="btn__text">{label}</span>
    </button>
  )
}
