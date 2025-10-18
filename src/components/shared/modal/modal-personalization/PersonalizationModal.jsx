import { Button, Modal } from '@/components'
import PropTypes from 'prop-types'
import './PersonalizationModal.scss'

export default function PersonalizationModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎨 Personnalisez votre expérience !"
      className="personalization-modal"
    >
      <div className="personalization-content">
        <div className="personalization-icon">🎯</div>

        <h3>Créez votre compte pour débloquer toutes les fonctionnalités</h3>

        <div className="features-list">
          <div className="feature-item">
            <span className="feature-icon">✏️</span>
            <span>Créez vos propres cartes de tâches et récompenses</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🖼️</span>
            <span>Uploadez vos propres images</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span>Suivez vos progrès personnalisés</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎉</span>
            <span>Accédez à toutes les animations et confettis</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚙️</span>
            <span>Personnalisez l&apos;affichage selon vos préférences</span>
          </div>
        </div>

        <div className="personalization-actions">
          <Button
            label="Créer mon compte"
            onClick={() => {
              // Rediriger vers la page d'inscription
              window.location.href = '/signup'
            }}
            className="primary-button"
          />
          <Button
            label="Se connecter"
            onClick={() => {
              // Rediriger vers la page de connexion
              window.location.href = '/login'
            }}
            className="secondary-button"
          />
        </div>

        <p className="personalization-note">
          C&apos;est gratuit et ne prend que 2 minutes ! 🚀
        </p>
      </div>
    </Modal>
  )
}

PersonalizationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}
