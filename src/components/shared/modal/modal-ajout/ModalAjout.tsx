import { Modal, ItemForm } from '@/components'
import type { Categorie } from '@/types/global'

interface ModalAjoutProps {
  isOpen: boolean
  onClose: () => void
  includeCategory?: boolean
  categories?: Categorie[]
  onSubmit: (data: string) => void
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
