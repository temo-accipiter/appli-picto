import PropTypes from 'prop-types'
import { BaseCard } from '@/components'
import './CardRecompense.scss'

export default function CardRecompense(props) {
  return (
    <BaseCard
      editable
      {...props}
      className={`card-recompense ${props.className || ''}`}
      categorieOptions={[]} // pas de select
    />
  )
}

CardRecompense.propTypes = {
  image: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  checked: PropTypes.bool.isRequired,
  onToggleCheck: PropTypes.func.isRequired,
  labelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  className: PropTypes.string,
  onBlur: PropTypes.func,
}
