import PropTypes from 'prop-types'
import './Button.scss'

export default function Button({
  onClick,
  label,
  variant = 'primary',
  disabled = false,
  type = 'button',
}) {
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

Button.propTypes = {
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'reset']),
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
}
