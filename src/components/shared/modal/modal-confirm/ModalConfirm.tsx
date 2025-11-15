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
  cancelLabel?: string
  children: ReactNode
}

export default function ModalConfirm({
  isOpen,
  onClose,
  onConfirm,
  confirmLabel,
  cancelLabel,
  children,
}: ModalConfirmProps) {
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
        },
      ]}
    >
      <div className="modal__message">
        {typeof children === 'string' ? <p>{children}</p> : children}
      </div>
    </Modal>
  )
}
