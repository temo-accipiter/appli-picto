import { Modal } from '@/components'
import { useI18n } from '@/hooks'
import PropTypes from 'prop-types'

export default function ModalQuota({
  isOpen,
  onClose,
  contentType,
  currentUsage,
  limit,
  period = 'total', // 'total' | 'monthly'
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

  // Calculer le pourcentage
  const percentage = limit > 0 ? Math.round((currentUsage / limit) * 100) : 0

  // Message selon la période
  const periodLabel = period === 'monthly' ? 'ce mois-ci' : 'au total'

  // Message contextuel selon le niveau d'utilisation
  const getContextMessage = () => {
    if (percentage >= 100) {
      return period === 'monthly'
        ? `Vous avez utilisé toutes vos ${label} pour ce mois. Le quota se réinitialisera le mois prochain.`
        : `Vous avez utilisé toutes vos ${label} disponibles dans votre forfait gratuit.`
    }
    if (percentage >= 90) {
      return `Attention : vous approchez de la limite (${percentage}% utilisé).`
    }
    if (percentage >= 80) {
      return `Vous avez utilisé ${percentage}% de votre quota de ${label} ${periodLabel}.`
    }
    return null
  }

  const contextMessage = getContextMessage()

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
        <p>
          <strong>
            {currentUsage} / {limit} {label} {periodLabel}
          </strong>
        </p>

        {contextMessage && (
          <p style={{ marginTop: '1rem', color: 'var(--muted-foreground)' }}>
            {contextMessage}
          </p>
        )}

        <p style={{ marginTop: '1rem' }}>{t('quota.quotaExceededMessage')}</p>

        <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>
          {t('quota.upgradeToUnlock')}
        </p>

        {period === 'monthly' && percentage >= 100 && (
          <p
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          >
            💡 <strong>Astuce :</strong> Votre quota mensuel se réinitialisera
            automatiquement le 1er du mois prochain. Ou passez à Premium pour
            supprimer les limites !
          </p>
        )}
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
