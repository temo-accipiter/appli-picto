import { Modal, ItemForm } from '@/components'

interface CategoryOption {
  value: string | number
  label: string
}

interface ItemFormData {
  label: string
  categorie: string
  image: File
}

interface ModalAjoutProps {
  isOpen: boolean
  onClose: () => void
  includeCategory?: boolean
  categories?: CategoryOption[]
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
