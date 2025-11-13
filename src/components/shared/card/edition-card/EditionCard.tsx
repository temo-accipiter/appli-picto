import { memo, ReactNode } from 'react'
import { BaseCard } from '@/components'
import './EditionCard.scss'

interface CategoryOption {
  value: string | number
  label: string
}

interface EditionCardProps {
  image?: string
  label: string
  onLabelChange?: (newLabel: string) => void
  onDelete?: () => void
  checked: boolean
  onToggleCheck: () => void
  categorie?: string
  onCategorieChange?: (newCategorie: string) => void
  categorieOptions?: CategoryOption[]
  labelId: string | number
  className?: string
  onBlur?: (val: string) => void
  imageComponent?: ReactNode
  editable?: boolean
}

const CardEdition = memo(function CardEdition(props: EditionCardProps) {
  return (
    <BaseCard
      editable
      {...props}
      className={`card-edition ${props.className || ''}`}
    />
  )
})

CardEdition.displayName = 'CardEdition'

export default CardEdition
