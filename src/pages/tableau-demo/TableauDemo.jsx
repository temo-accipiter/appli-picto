import { FeatureGate, SignupPromptModal } from '@/components'
import { usePermissions } from '@/contexts'
import { useDemoData } from '@/hooks/useDemoData'
import Tableau from '@/pages/tableau/Tableau'
import { useEffect, useState } from 'react'
import './TableauDemo.scss'

/**
 * Page TableauDemo - Version démo pour les visiteurs
 * Réutilise le composant Tableau avec des restrictions et des modals de conversion
 */
export default function TableauDemo() {
  const { can, isVisitor } = usePermissions()
  const { demoTaches, demoRecompenses } = useDemoData()

  // États pour les modals
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false)
  const [signupModalTrigger, setSignupModalTrigger] = useState(
    'feature_restriction'
  )

  // Intercepter les changements de ligne pour ouvrir la modal
  useEffect(() => {
    const handleLineChange = event => {
      // Détecter si c'est un changement de ligne dans le select
      if (
        event.target.tagName === 'SELECT' &&
        event.target.name === 'line-select'
      ) {
        event.preventDefault()
        event.stopPropagation()

        setSignupModalTrigger('line_change')
        setShowSignupModal(true)

        // Remettre la valeur par défaut
        event.target.value = '1'
      }
    }

    // Écouter tous les événements change
    document.addEventListener('change', handleLineChange, true)

    return () => {
      document.removeEventListener('change', handleLineChange, true)
    }
  }, [])

  // Intercepter les clics sur les boutons premium
  useEffect(() => {
    const handlePremiumClick = event => {
      // Détecter les clics sur les boutons d'édition, suppression, etc.
      const target = event.target.closest('button, .editable, .delete-button')
      if (target && !can('edit_tasks')) {
        event.preventDefault()
        event.stopPropagation()

        setSignupModalTrigger('unlimited_tasks')
        setShowSignupModal(true)
      }
    }

    document.addEventListener('click', handlePremiumClick, true)

    return () => {
      document.removeEventListener('click', handlePremiumClick, true)
    }
  }, [can])

  // Écouter l'événement d'ouverture de la modal de personnalisation
  useEffect(() => {
    const handleOpenPersonalizeModal = () => {
      setShowPersonalizeModal(true)
    }

    window.addEventListener('openPersonalizeModal', handleOpenPersonalizeModal)

    return () => {
      window.removeEventListener(
        'openPersonalizeModal',
        handleOpenPersonalizeModal
      )
    }
  }, [])

  return (
    <div className="tableau-demo-page">
      {/* Contenu principal - réutilise Tableau avec restrictions */}
      <div className="demo-content">
        <FeatureGate feature="view_demo">
          <Tableau
            isDemo={true}
            onLineChange={trigger => {
              setSignupModalTrigger(trigger)
              setShowSignupModal(true)
            }}
          />
        </FeatureGate>
      </div>

      {/* Modal de conversion */}
      <SignupPromptModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        trigger={signupModalTrigger}
        title="Débloquez cette fonctionnalité !"
        message="Créez votre compte pour accéder à toutes les fonctionnalités premium"
      />

      {/* Modal de personnalisation */}
      <SignupPromptModal
        isOpen={showPersonalizeModal}
        onClose={() => setShowPersonalizeModal(false)}
        trigger="personalization"
        title="Personnalisez votre expérience !"
        message="Créez votre compte pour personnaliser complètement votre tableau de bord"
        showFeatures={true}
      />
    </div>
  )
}
