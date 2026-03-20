'use client'

// src/page-components/admin/bank-cards/BankCardItem.tsx
/**
 * Item individuel d'une Carte de Banque (Admin)
 *
 * Affichage :
 * - Image de la carte
 * - Nom
 * - Badge statut published
 * - Toggle published (switch)
 * - Bouton delete
 *
 * UX TSA :
 * - Cibles tactiles ≥ 44px
 * - Focus visible
 * - Animations douces (max 0.3s)
 * - Feedback clair (hover, active states)
 */

import { useState } from 'react'
import type { AdminBankCard } from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import './BankCardItem.scss'

interface BankCardItemProps {
  card: AdminBankCard
  onTogglePublished: (id: string, currentPublished: boolean) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
}

export default function BankCardItem({
  card,
  onTogglePublished,
  onDelete,
}: BankCardItemProps) {
  const [isTogglingPublished, setIsTogglingPublished] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Image URL publique (bucket bank-images public=true)
  const imageUrl = card.image_url
    ? supabase.storage.from('bank-images').getPublicUrl(card.image_url).data
        .publicUrl
    : null

  // Toggle published
  const handleToggle = async () => {
    setIsTogglingPublished(true)
    await onTogglePublished(card.id, card.published)
    setIsTogglingPublished(false)
  }

  // Delete
  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(card.id, card.name)
    // Ne pas reset isDeleting : l'item va disparaître si succès
  }

  const isLoading = isTogglingPublished || isDeleting

  return (
    <div
      className={`bank-card-item ${isLoading ? 'bank-card-item--loading' : ''}`}
    >
      {/* Image */}
      <div className="bank-card-item__image">
        {imageUrl ? (
          <img src={imageUrl} alt={card.name} loading="lazy" />
        ) : (
          <div className="placeholder-image">📷</div>
        )}
      </div>

      {/* Infos */}
      <div className="bank-card-item__content">
        <h4 className="card-name">{card.name}</h4>

        {/* Badge statut */}
        <div className="card-status">
          <span
            className={`status-badge ${card.published ? 'status-badge--published' : 'status-badge--unpublished'}`}
          >
            {card.published ? '✓ Publiée' : '✕ Dépubliée'}
          </span>
        </div>

        {/* Actions */}
        <div className="card-actions">
          {/* Toggle published */}
          <label className="toggle-published">
            <input
              type="checkbox"
              checked={card.published}
              onChange={handleToggle}
              disabled={isLoading}
              aria-label={`${card.published ? 'Dépublier' : 'Publier'} la carte ${card.name}`}
            />
            <span className="toggle-slider" />
            <span className="toggle-label">
              {card.published ? 'Dépublier' : 'Publier'}
            </span>
          </label>

          {/* Delete button */}
          <button
            type="button"
            className="delete-button"
            onClick={handleDelete}
            disabled={isLoading}
            aria-label={`Supprimer la carte ${card.name}`}
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>

      {/* Loader overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <span className="loader" />
        </div>
      )}
    </div>
  )
}
