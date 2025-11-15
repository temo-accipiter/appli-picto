'use client'

import { Modal, ItemForm } from '@/components'
import type { Categorie } from '@/types/global'

export interface ItemFormData {
  label: string
  categorie: string
  image: File
}

interface ModalAjoutProps {
  isOpen: boolean
  onClose: () => void
  includeCategory?: boolean
  categories?: Categorie[]
  onSubmit: (data: ItemFormData) => void
}

export default function ModalAjout({
  isOpen,
  onClose,
  includeCategory = false,
  categories = [],
  onSubmit,
}: ModalAjoutProps) {
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
