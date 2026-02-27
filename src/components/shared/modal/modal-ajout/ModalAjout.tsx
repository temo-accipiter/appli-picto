'use client'

import { Modal, ItemForm } from '@/components'
import type { Categorie } from '@/types/global'
import type { AssetType } from '@/utils/storage/modernUploadImage'

// ✅ Importer ItemFormData depuis ItemForm (source de vérité)
export type { ItemFormData } from '../forms/ItemForm'

interface ModalAjoutProps {
  isOpen: boolean
  onClose: () => void
  includeCategory?: boolean
  categories?: Categorie[]
  onSubmit: (data: import('../forms/ItemForm').ItemFormData) => void
  assetType?: AssetType // ✅ Type upload (task_image, reward_image, card_image)
  prefix?: string // ✅ Préfixe Storage (taches, recompenses, personal-images)
}

export default function ModalAjout({
  isOpen,
  onClose,
  includeCategory = false,
  categories = [],
  onSubmit,
  assetType = 'task_image', // Défaut pour rétro-compatibilité
  prefix = 'misc', // Défaut pour rétro-compatibilité
}: ModalAjoutProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} actions={[]}>
      <ItemForm
        includeCategory={includeCategory}
        categories={categories}
        onSubmit={onSubmit}
        assetType={assetType}
        prefix={prefix}
      />
    </Modal>
  )
}
