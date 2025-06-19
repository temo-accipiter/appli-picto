import PropTypes from 'prop-types'
import Modal from '../Modal'

export default function ModalConfirm({
  isOpen,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  children,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        { label: cancelLabel, onClick: onClose },
        { label: confirmLabel, onClick: onConfirm, variant: 'primary' },
      ]}
    >
      {typeof children === 'string' ? <p>{children}</p> : children}
    </Modal>
  )
}

ModalConfirm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  children: PropTypes.node.isRequired,
}
