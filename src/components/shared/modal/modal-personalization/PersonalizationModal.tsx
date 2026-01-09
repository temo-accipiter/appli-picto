'use client'

import { Button, Modal } from '@/components'
import { useI18n } from '@/hooks'
import { useRouter } from 'next/navigation'
import './PersonalizationModal.scss'

interface PersonalizationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PersonalizationModal({
  isOpen,
  onClose,
}: PersonalizationModalProps) {
  const { t } = useI18n()
  const router = useRouter()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('personalizationModal.title')}
      className="personalization-modal"
    >
      <div className="personalization-content">
        <div className="personalization-icon" aria-hidden="true">
          🎯
        </div>

        <h3>{t('personalizationModal.subtitle')}</h3>

        <div className="features-list">
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">
              ✏️
            </span>
            <span>{t('personalizationModal.feature1')}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">
              🖼️
            </span>
            <span>{t('personalizationModal.feature2')}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">
              📊
            </span>
            <span>{t('personalizationModal.feature3')}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">
              🎉
            </span>
            <span>{t('personalizationModal.feature4')}</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon" aria-hidden="true">
              ⚙️
            </span>
            <span>{t('personalizationModal.feature5')}</span>
          </div>
        </div>

        <div className="personalization-actions">
          <Button
            label={t('personalizationModal.createAccount')}
            onClick={() => router.push('/signup')}
            className="primary-button"
          />
          <Button
            label={t('personalizationModal.login')}
            onClick={() => router.push('/login')}
            className="secondary-button"
          />
        </div>

        <p className="personalization-note">{t('personalizationModal.note')}</p>
      </div>
    </Modal>
  )
}
