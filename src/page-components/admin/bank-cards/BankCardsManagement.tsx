'use client'

// src/page-components/admin/bank-cards/BankCardsManagement.tsx
/**
 * Gestion des Cartes de Banque (Admin uniquement)
 *
 * Règles DB-First strict :
 * - Hook useAdminBankCards() gère toutes les opérations CRUD
 * - RLS is_admin() enforced côté DB
 * - AdminRoute guard déjà appliqué (404 neutre pour non-admin)
 * - Pas de vérification d'autorisation côté frontend
 * - Toggle published : Boolean UPDATE direct
 * - Delete : Gestion propre du refus DB si carte référencée
 *
 * UX TSA :
 * - États loading/error/empty clairs
 * - Feedback immédiat (toast)
 * - Pas de surprises visuelles
 * - Mobile-first responsive
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminBankCards } from '@/hooks'
import { useToast } from '@/contexts'
import { Button, FloatingPencil } from '@/components'
import formatErr from '@/utils/logs/formatErr'
import CreateBankCardModal from './CreateBankCardModal'
import BankCardItem from './BankCardItem'
import './BankCardsManagement.scss'

export default function BankCardsManagement() {
  const router = useRouter()
  const { show: showToast } = useToast()

  // Hook admin bank cards (CRUD complet)
  const { cards, loading, error, updatePublished, deleteCard, refresh } =
    useAdminBankCards()

  // État modal création
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Toggle published status
  const handleTogglePublished = async (
    id: string,
    currentPublished: boolean
  ) => {
    const newPublished = !currentPublished
    const action = newPublished ? 'publiée' : 'dépubliée'

    try {
      const { error: updateError } = await updatePublished(id, newPublished)

      if (updateError) {
        console.error(
          `[BankCardsManagement] Erreur toggle published (${action}):`,
          formatErr(updateError)
        )
        showToast(
          `Impossible de ${newPublished ? 'publier' : 'dépublier'} la carte. Réessayez.`,
          'error'
        )
        return
      }

      showToast(`Carte ${action} avec succès`, 'success')
    } catch (err) {
      console.error(
        `[BankCardsManagement] Erreur inattendue toggle:`,
        formatErr(err)
      )
      showToast('Une erreur inattendue est survenue', 'error')
    }
  }

  // Supprimer carte (avec gestion refus DB si référencée)
  const handleDeleteCard = async (id: string, name: string) => {
    // Confirmation utilisateur
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la carte "${name}" ?\n\nCette action est irréversible.`
    )

    if (!confirmed) return

    try {
      const { error: deleteError } = await deleteCard(id)

      if (deleteError) {
        console.error(
          '[BankCardsManagement] Suppression refusée par la DB:',
          formatErr(deleteError)
        )

        // Message utilisateur (contractuel depuis trigger DB)
        const message = deleteError.message || 'Erreur lors de la suppression'
        showToast(message, 'error')
        return
      }

      showToast(`Carte "${name}" supprimée avec succès`, 'success')
    } catch (err) {
      console.error(
        '[BankCardsManagement] Erreur inattendue suppression:',
        formatErr(err)
      )
      showToast('Une erreur inattendue est survenue', 'error')
    }
  }

  // Callback succès création (ferme modal + refresh)
  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    refresh()
    showToast('Carte de banque créée avec succès', 'success')
  }

  // Statistiques
  const publishedCount = cards.filter(c => c.published).length
  const unpublishedCount = cards.filter(c => !c.published).length

  return (
    <div className="bank-cards-page">
      <h1>Gestion des Cartes de Banque</h1>

      <FloatingPencil className="floating-pencil--bank-cards" />

      {/* En-tête avec stats et bouton création */}
      <div className="bank-cards-header">
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">Total :</span>
            <span className="stat-value">{cards.length}</span>
          </div>
          <div className="stat-item stat-item--success">
            <span className="stat-label">Publiées :</span>
            <span className="stat-value">{publishedCount}</span>
          </div>
          <div className="stat-item stat-item--muted">
            <span className="stat-label">Dépubliées :</span>
            <span className="stat-value">{unpublishedCount}</span>
          </div>
        </div>

        <div className="actions">
          <Button
            onClick={() => setShowCreateModal(true)}
            label="+ Créer une carte"
            variant="primary"
            disabled={loading}
          />
          <Button
            onClick={refresh}
            label="🔄 Actualiser"
            variant="secondary"
            disabled={loading}
          />
        </div>
      </div>

      {/* Liste des cartes */}
      <div className="bank-cards-list">
        <h3>
          Catalogue global ({cards.length} carte{cards.length !== 1 ? 's' : ''})
        </h3>

        {/* États : loading / error / empty / data */}
        {loading && !error ? (
          <p className="state-message state-message--loading">
            Chargement des cartes...
          </p>
        ) : error ? (
          <div className="state-message state-message--error">
            <p>Une erreur est survenue lors du chargement des cartes.</p>
            <Button onClick={refresh} label="Réessayer" variant="secondary" />
          </div>
        ) : cards.length === 0 ? (
          <p className="state-message state-message--empty">
            Aucune carte de banque pour le moment.
            <br />
            Créez-en une pour commencer.
          </p>
        ) : (
          <div className="cards-grid">
            {cards.map(card => (
              <BankCardItem
                key={card.id}
                card={card}
                onTogglePublished={handleTogglePublished}
                onDelete={handleDeleteCard}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="bank-cards-footer">
        <Button
          onClick={() => router.push('/profil')}
          label="← Retour au profil"
          variant="secondary"
        />
      </div>

      {/* Modal création */}
      {showCreateModal && (
        <CreateBankCardModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}
