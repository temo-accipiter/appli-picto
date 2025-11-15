'use client'

import { ReactNode } from 'react'
import { useI18n } from '@/hooks'
import './EditionList.scss'

interface EditionListProps<T> {
  title?: string
  children?: ReactNode
  items: T[]
  renderCard: (item: T, index: number) => ReactNode
  emptyLabel?: string
}

export default function EditionList<T>({
  title,
  children,
  items,
  renderCard,
  emptyLabel,
}: EditionListProps<T>) {
  const { t } = useI18n()
  const defaultEmptyLabel = emptyLabel || t('editionList.noItems')
  return (
    <div className="edition-list">
      {title && <h2 className="edition-list__title">{title}</h2>}

      <div className="edition-list__actions">{children}</div>

      <div className="edition-list__grid">
        {items.length === 0 ? (
          <div className="edition-list__empty" role="status" aria-live="polite">
            💤 {defaultEmptyLabel}
          </div>
        ) : (
          items.map(renderCard)
        )}
      </div>
    </div>
  )
}
