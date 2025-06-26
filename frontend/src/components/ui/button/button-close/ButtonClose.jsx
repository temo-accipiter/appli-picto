import PropTypes from 'prop-types'
import './ButtonClose.scss'

export default function ButtonClose({ onClick, ariaLabel = 'Fermer' }) {
  return (
    <button className="button-close" onClick={onClick} aria-label={ariaLabel}>
      ×
    </button>
  )
}

ButtonClose.propTypes = {
  onClick: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
}
