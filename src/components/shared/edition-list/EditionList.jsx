import PropTypes from 'prop-types'
import { useI18n } from '@/hooks'
import './EditionList.scss'

export default function EditionList({
  title,
  children,
  items,
  renderCard,
  emptyLabel,
}) {
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

EditionList.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
  items: PropTypes.array.isRequired,
  renderCard: PropTypes.func.isRequired,
  emptyLabel: PropTypes.string,
}
