'use client'

import { Modal } from '@/components'
import { useI18n } from '@/hooks'
import './ModalQuota.scss'

type ContentType = 'task' | 'reward' | 'category'
type Period = 'total' | 'monthly'

interface ModalQuotaProps {
  isOpen: boolean
  onClose: () => void
  contentType: ContentType
  currentUsage: number
  limit: number
  period?: Period
}

export default function ModalQuota({
  isOpen,
  onClose,
  contentType,
  currentUsage,
  limit,
  period = 'total',
}: ModalQuotaProps) {
  const { t } = useI18n()

  // Mapping des types de contenu vers les clés de traduction
  const typeMap: Record<ContentType, string> = {
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
      <div className="modal__message modal-quota">
        <p className="modal-quota__usage">
          <strong>
            {currentUsage} / {limit} {label} {periodLabel}
          </strong>
        </p>

        {contextMessage && (
          <p className="modal-quota__context">{contextMessage}</p>
        )}

        <p className="modal-quota__message">
          {t('quota.quotaExceededMessage')}
        </p>

        <p className="modal-quota__cta">{t('quota.upgradeToUnlock')}</p>

        {period === 'monthly' && percentage >= 100 && (
          <div className="modal-quota__hint">
            💡 <strong>Astuce :</strong> Votre quota mensuel se réinitialisera
            automatiquement le 1er du mois prochain. Ou passez à Premium pour
            supprimer les limites !
          </div>
        )}
      </div>
    </Modal>
  )
}
