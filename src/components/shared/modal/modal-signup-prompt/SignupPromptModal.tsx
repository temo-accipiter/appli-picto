import { Button, Modal } from '@/components'
import { useI18n } from '@/hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Star, Users, X, Zap } from 'lucide-react'
import { ReactNode, useState } from 'react'
import './SignupPromptModal.scss'

type TriggerType = 'feature_restriction' | 'line_change' | 'unlimited_tasks'

interface SignupPromptModalProps {
  /** État d'ouverture de la modal */
  isOpen: boolean
  /** Callback de fermeture */
  onClose: () => void
  /** Titre personnalisé de la modal */
  title?: string
  /** Message personnalisé */
  message?: string
  /** Contexte de déclenchement pour personnaliser le message */
  trigger?: TriggerType
  /** Afficher la liste des fonctionnalités */
  showFeatures?: boolean
}

interface Feature {
  icon: ReactNode
  title: string
  description: string
}

/**
 * Modal de conversion réutilisable pour rediriger vers signup
 * S'affiche quand un visiteur tente d'utiliser une fonctionnalité premium
 */
export const SignupPromptModal = ({
  isOpen,
  onClose,
  title,
  message,
  trigger: _trigger = 'feature_restriction',
  showFeatures = true,
}: SignupPromptModalProps) => {
  const { t } = useI18n()
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 200)
  }

  const handleSignup = () => {
    window.location.href = '/signup'
  }

  const defaultTitle = t('quota.upgradeToUnlock')
  const defaultMessage = t('demo.signupPrompt')

  const features: Feature[] = [
    {
      icon: <Zap size={20} />,
      title: t('tasks.allTasks'),
      description: t('tasks.noTasks'),
    },
    {
      icon: <Users size={20} />,
      title: t('settings.personalization'),
      description: t('settings.appearance'),
    },
    {
      icon: <Star size={20} />,
      title: t('rewards.title'),
      description: t('rewards.noRewards'),
    },
    {
      icon: <CheckCircle size={20} />,
      title: t('subscription.features'),
      description: t('app.welcome'),
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal isOpen={isOpen} onClose={handleClose}>
          <motion.div
            className={`signup-prompt-modal ${isClosing ? 'closing' : ''}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="modal-header">
              <h2 className="modal-title">{title || defaultTitle}</h2>
              <button
                className="close-button"
                onClick={handleClose}
                aria-label={t('modal.close')}
              >
                <X size={24} />
              </button>
            </div>

            {/* Message contextuel */}
            <div className="modal-message">
              <p>{message || defaultMessage}</p>
            </div>

            {/* Features list */}
            {showFeatures && (
              <div className="features-list">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="feature-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="feature-icon">{feature.icon}</div>
                    <div className="feature-content">
                      <h4 className="feature-title">{feature.title}</h4>
                      <p className="feature-description">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="modal-actions">
              <Button
                onClick={handleSignup}
                className="signup-button primary"
                size="large"
              >
                {t('demo.signupButton')}
              </Button>

              <button className="maybe-later-button" onClick={handleClose}>
                {t('demo.continueDemo')}
              </button>
            </div>

            {/* Trial info */}
            <div className="trial-info">
              <p>{t('subscription.features')}</p>
            </div>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  )
}
