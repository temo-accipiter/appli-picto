import PropTypes from 'prop-types'
import './DeleteButton.scss'

export default function DeleteButton({
  onClick,
  title = 'Supprimer',
  icon = '✖',
}) {
  return (
    <button
      className="delete-button"
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  )
}

DeleteButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  title: PropTypes.string,
  icon: PropTypes.node,
}
