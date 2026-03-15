'use client'

// src/components/modal/modal-confirm/ModalConfirm.tsx
import { ReactNode } from 'react'
import { Modal } from '@/components'
import { useI18n } from '@/hooks'

interface ModalConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  confirmLabel?: string
  confirmDisabled?: boolean
  closeOnConfirm?: boolean
  cancelLabel?: string
  children: ReactNode
}

export default function ModalConfirm({
  isOpen,
  onClose,
  onConfirm,
  confirmLabel,
  confirmDisabled = false,
  closeOnConfirm = true,
  cancelLabel: _cancelLabel,
  children,
}: ModalConfirmProps) {
  const { t } = useI18n()
  // Note: Bouton "Annuler" est maintenant ajouté automatiquement par Modal.tsx dans le footer
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        {
          label: confirmLabel || t('actions.confirm'),
          onClick: () => {
            if (closeOnConfirm) onClose()
            onConfirm()
          },
          variant: 'primary',
          disabled: confirmDisabled,
        },
      ]}
    >
      <div className="modal__message">
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
    </Modal>
  )
}
