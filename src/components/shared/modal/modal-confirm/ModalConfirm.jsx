// src/components/modal/modal-confirm/ModalConfirm.jsx
import PropTypes from 'prop-types'
import { Modal } from '@/components'
import { useI18n } from '@/hooks'

export default function ModalConfirm({
  isOpen,
  onClose,
  onConfirm,
  confirmLabel,
  cancelLabel,
  children,
}) {
  const { t } = useI18n()
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        { label: cancelLabel || t('actions.cancel'), onClick: onClose },
        {
          label: confirmLabel || t('actions.confirm'),
          onClick: () => {
            onClose()
            onConfirm()
          },
          variant: 'primary',
          autoFocus: true,
        },
      ]}
    >
      <div className="modal__message">
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
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
