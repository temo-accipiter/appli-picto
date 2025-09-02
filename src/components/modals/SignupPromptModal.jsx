import { Button, Modal } from '@/components'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Star, Users, X, Zap } from 'lucide-react'
import PropTypes from 'prop-types'
import { useState } from 'react'
import './SignupPromptModal.scss'

/**
 * Modal de conversion réutilisable pour rediriger vers signup
 * S'affiche quand un visiteur tente d'utiliser une fonctionnalité premium
 */
export const SignupPromptModal = ({
  isOpen,
  onClose,
  title = 'Débloquez toutes les fonctionnalités !',
  message = "Créez votre compte et profitez d'une semaine d'essai gratuite",
  trigger = 'feature_restriction', // feature_restriction, line_change, unlimited_tasks
  showFeatures = true,
}) => {
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

  // Messages personnalisés selon le contexte
  const getContextMessage = () => {
    switch (trigger) {
      case 'line_change':
        return 'Changez de ligne de transport et personnalisez votre expérience !'
      case 'unlimited_tasks':
        return 'Créez autant de tâches que vous voulez et organisez votre vie !'
      case 'feature_restriction':
      default:
        return message
    }
  }

  const features = [
    {
      icon: <Zap size={20} />,
      title: 'Tâches illimitées',
      description: 'Créez autant de tâches que vous voulez',
    },
    {
      icon: <Users size={20} />,
      title: 'Personnalisation complète',
      description: 'Changez de ligne, ajoutez des images',
    },
    {
      icon: <Star size={20} />,
      title: 'Récompenses avancées',
      description: 'Accédez à toutes les récompenses',
    },
    {
      icon: <CheckCircle size={20} />,
      title: 'Synchronisation',
      description: 'Vos données partout, tout le temps',
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
              <h2 className="modal-title">{title}</h2>
              <button
                className="close-button"
                onClick={handleClose}
                aria-label="Fermer la modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Message contextuel */}
            <div className="modal-message">
              <p>{getContextMessage()}</p>
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
                Commencer gratuitement
              </Button>

              <button className="maybe-later-button" onClick={handleClose}>
                Peut-être plus tard
              </button>
            </div>

            {/* Trial info */}
            <div className="trial-info">
              <p>
                <strong>1 semaine d'essai gratuite</strong> • Annulez à tout
                moment
              </p>
            </div>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  )
}

SignupPromptModal.propTypes = {
  /** État d'ouverture de la modal */
  isOpen: PropTypes.bool.isRequired,
  /** Callback de fermeture */
  onClose: PropTypes.func.isRequired,
  /** Titre personnalisé de la modal */
  title: PropTypes.string,
  /** Message personnalisé */
  message: PropTypes.string,
  /** Contexte de déclenchement pour personnaliser le message */
  trigger: PropTypes.oneOf([
    'feature_restriction',
    'line_change',
    'unlimited_tasks',
  ]),
  /** Afficher la liste des fonctionnalités */
  showFeatures: PropTypes.bool,
}
