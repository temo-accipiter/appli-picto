'use client'

// PersonalizationModal — Contexte Édition UNIQUEMENT (adulte)
// ⚠️ JAMAIS afficher dans le Contexte Tableau (enfant)
// Contrat §6.4 — Wordings Visitor et Free

import { Button, Modal } from '@/components'
import { useRouter } from 'next/navigation'
import './PersonalizationModal.scss'

export type PersonalizationContext = 'visitor' | 'free'

interface PersonalizationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Contexte utilisateur : 'visitor' = non connecté, 'free' = compte gratuit */
  context: PersonalizationContext
}

// Wordings contractuels (§6.4)
const WORDINGS = {
  visitor: {
    title: 'Personnalise ton tableau',
    message:
      'Pour créer tes propres tâches et catégories, crée un compte et abonne-toi.',
    primaryLabel: 'Créer un compte',
    secondaryLabel: 'Plus tard',
  },
  free: {
    title: 'Fonctionnalité Premium',
    message:
      'Ton compte gratuit te permet de sauvegarder tes plannings. Pour créer tes propres tâches et catégories, passe à la version Premium.',
    primaryLabel: 'Passer Premium',
    secondaryLabel: 'Plus tard',
  },
} as const

export default function PersonalizationModal({
  isOpen,
  onClose,
  context,
}: PersonalizationModalProps) {
  const router = useRouter()
  const wording = WORDINGS[context]

  const handlePrimary = () => {
    if (context === 'visitor') {
      router.push('/signup')
    } else {
      // Free → redirection vers page abonnement (checkout Stripe)
      router.push('/profil#abonnement')
    }
    onClose()
  }

  const handleSecondary = () => {
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={wording.title}
      className="personalization-modal"
    >
      <div className="personalization-content">
        <p className="personalization-message">{wording.message}</p>

        <div className="personalization-actions">
          <Button
            label={wording.primaryLabel}
            onClick={handlePrimary}
            className="primary-button"
          />
          <Button
            label={wording.secondaryLabel}
            onClick={handleSecondary}
            className="secondary-button"
          />
        </div>
      </div>
    </Modal>
  )
}
