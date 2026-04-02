'use client'

import { Modal, ItemForm } from '@/components'
import type { ItemFormData } from '@/components/shared/forms/ItemForm'
import type { Categorie } from '@/types/global'
import type { AssetType } from '@/utils/storage/modernUploadImage'

export type { ItemFormData }

interface ModalAjoutProps {
  isOpen: boolean
  onClose: () => void
  includeCategory?: boolean
  categories?: Categorie[]
  onSubmit: (data: ItemFormData) => void
  assetType?: AssetType // conservé pour compatibilité appelants
  prefix?: string // conservé pour compatibilité appelants
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
        categories={(categories ?? []).map(c => ({
          value: c.id,
          label: c.name,
        }))}
        onSubmit={onSubmit}
      />
    </Modal>
  )
}
