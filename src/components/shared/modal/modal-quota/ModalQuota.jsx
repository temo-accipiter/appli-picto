import { Modal } from '@/components'
import { useI18n } from '@/hooks'
import PropTypes from 'prop-types'

export default function ModalQuota({
  isOpen,
  onClose,
  contentType,
  currentUsage: _currentUsage,
  limit,
  period: _period = 'total', // 'total' | 'monthly'
}) {
  const { t } = useI18n()

  // Mapping des types de contenu vers les clés de traduction
  const typeMap = {
    task: 'tasks',
    reward: 'rewards',
    category: 'categories',
  }

  const translationKey = typeMap[contentType]
  const label = t(`quota.${translationKey}`)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('quota.quotaExceededTitle')}
      actions={[
        {
          label: t('actions.understand'),
          onClick: onClose,
          variant: 'primary',
        },
      ]}
    >
      <div className="modal__message">
        <p>{t('quota.quotaExceededMessage')}</p>
        <p>{t('quota.upgradeToUnlock')}</p>
        <p>
          <strong>
            {t('quota.limit')}: {limit} {label}
          </strong>
        </p>
      </div>
    </Modal>
  )
}

ModalQuota.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  contentType: PropTypes.oneOf(['task', 'reward', 'category']).isRequired,
  currentUsage: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
  period: PropTypes.oneOf(['total', 'monthly']),
}
