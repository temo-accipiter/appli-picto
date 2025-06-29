import PropTypes from 'prop-types'
import { BaseCard } from '@/components'
import './EditionCard.scss'

export default function CardEdition(props) {
  return (
    <BaseCard
      editable
      {...props}
      className={`card-edition ${props.className || ''}`}
    />
  )
}

CardEdition.propTypes = {
  image: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  checked: PropTypes.bool.isRequired,
  onToggleCheck: PropTypes.func.isRequired,
  categorie: PropTypes.string,
  onCategorieChange: PropTypes.func,
  categorieOptions: PropTypes.array,
  labelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  className: PropTypes.string,
  onBlur: PropTypes.func,
}
