import PropTypes from 'prop-types'
import './Separator.scss'

export default function Separator({ className = '' }) {
  return <div className={`separator ${className}`} role="separator" />
}

Separator.propTypes = {
  className: PropTypes.string, // si tu veux passer des classes supplémentaires
}
