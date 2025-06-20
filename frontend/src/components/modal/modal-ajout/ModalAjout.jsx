import PropTypes from 'prop-types'
import { Modal } from '@/components'
import ItemForm from '@/components/forms/ItemForm'

export default function ModalAjout({
  isOpen,
  onClose,
  includeCategory = false,
  categories = [],
  onSubmit,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} actions={[]}>
      <ItemForm
        includeCategory={includeCategory}
        categories={categories}
        onSubmit={onSubmit}
      />
    </Modal>
  )
}

ModalAjout.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  includeCategory: PropTypes.bool,
  categories: PropTypes.array,
  onSubmit: PropTypes.func.isRequired,
}
