'use client'

/**
 * DeviceList — Liste et gestion des appareils du compte (Page Profil).
 *
 * ⚠️ RÈGLES DB-FIRST (S10 — §5.2.1)
 * - Révocation = UPDATE revoked_at (non-destructif, jamais DELETE)
 * - Confirmation 1-clic inline avant révocation (pas de modale)
 * - Erreur quota → message contractuel (§6.4) : « Nombre maximum d'appareils atteint. »
 *
 * ⚠️ RÈGLES TSA
 * - Interface simple, prévisible, sans surcharge cognitive
 * - Adulte uniquement — jamais en Contexte Tableau (§6.2)
 * - Cibles tactiles ≥ 44px
 * - Confirmation inline (TSA anti-choc : pas de modale surprise)
 */

import { useState } from 'react'
import useDevices from '@/hooks/useDevices'
import type { Device } from '@/hooks/useDevices'
import { useInlineConfirm } from '@/hooks'
import { Button } from '@/components'
import './DeviceList.scss'

/** Formatte une date ISO en date française lisible */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface DeviceListProps {
  /**
   * device_id (UUID localStorage) de l'appareil actuel —
   * pour l'identifier visuellement dans la liste.
   * null si non encore disponible (SSR / premier rendu).
   */
  currentDeviceId?: string | null
}

export default function DeviceList({ currentDeviceId }: DeviceListProps) {
  const { devices, loading, error, revokeDevice } = useDevices()

  // Confirmation inline 1-clic (TSA anti-surprise)
  const { requireConfirm, cancelConfirm, isConfirming } = useInlineConfirm()
  // Révocation en cours : ID du device en cours de traitement
  const [revokingId, setRevokingId] = useState<string | null>(null)
  // Message d'erreur de révocation (non technique)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  // ── État chargement ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="device-list device-list--loading"
        aria-busy="true"
        aria-label="Chargement des appareils"
      >
        <div className="device-list__dots" aria-hidden="true">
          <span className="device-list__dot" />
          <span className="device-list__dot" />
          <span className="device-list__dot" />
        </div>
        <span className="sr-only">Chargement des appareils en cours</span>
      </div>
    )
  }

  // ── Erreur de lecture ──────────────────────────────────────────────────────
  if (error) {
    return (
      <p className="device-list__error" role="alert">
        Impossible de charger les appareils. Réessaie plus tard.
      </p>
    )
  }

  // ── Liste vide ─────────────────────────────────────────────────────────────
  if (devices.length === 0) {
    return <p className="device-list__empty">Aucun appareil enregistré.</p>
  }

  const activeDevices = devices.filter(d => d.revoked_at === null)
  const revokedDevices = devices.filter(d => d.revoked_at !== null)

  /**
   * Gère la révocation d'un appareil — confirmation 1-clic inline.
   * Premier clic → affiche confirmation.
   * Deuxième clic → exécute la révocation.
   */
  const handleRevoke = async (device: Device) => {
    if (!isConfirming(device.id)) {
      requireConfirm(device.id)
      setRevokeError(null)
      return
    }

    // Deuxième clic → exécute
    cancelConfirm()
    setRevokingId(device.id)
    setRevokeError(null)

    const { error: err } = await revokeDevice(device.id)
    setRevokingId(null)

    if (err) {
      setRevokeError('Impossible de révoquer cet appareil. Réessaie.')
    }
  }

  /** Rendu d'un appareil individuel */
  const renderDevice = (device: Device, isActive: boolean) => {
    const isCurrent =
      currentDeviceId !== null &&
      currentDeviceId !== undefined &&
      device.device_id === currentDeviceId
    const isCurrentlyConfirming = isConfirming(device.id)
    const isRevoking = revokingId === device.id

    return (
      <li
        key={device.id}
        className={`device-list__item${isActive ? '' : ' device-list__item--revoked'}`}
        aria-label={[
          `Appareil enregistré le ${formatDate(device.created_at)}`,
          isCurrent ? '(appareil actuel)' : '',
          !isActive ? '— révoqué' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Informations de l'appareil */}
        <div className="device-list__item-info">
          <span className="device-list__item-icon" aria-hidden="true">
            {isActive ? '💻' : '🚫'}
          </span>

          <div className="device-list__item-details">
            <span className="device-list__item-date">
              Enregistré le {formatDate(device.created_at)}
            </span>
            {isCurrent && (
              <span className="device-list__item-current">Appareil actuel</span>
            )}
            {!isActive && device.revoked_at && (
              <span className="device-list__item-revoked-at">
                Révoqué le {formatDate(device.revoked_at)}
              </span>
            )}
          </div>

          <span
            className={`device-list__item-status${
              isActive
                ? ' device-list__item-status--active'
                : ' device-list__item-status--revoked'
            }`}
          >
            {isActive ? 'Actif' : 'Révoqué'}
          </span>
        </div>

        {/* Actions — uniquement pour les appareils actifs */}
        {isActive && (
          <div className="device-list__item-actions">
            <Button
              variant="danger"
              className={`device-list__revoke-btn${
                isCurrentlyConfirming ? ' device-list__revoke-btn--confirm' : ''
              }`}
              onClick={() => handleRevoke(device)}
              disabled={!!revokingId}
              isLoading={isRevoking}
              aria-label={
                isCurrentlyConfirming
                  ? 'Confirmer la révocation de cet appareil'
                  : 'Révoquer cet appareil'
              }
            >
              {isRevoking
                ? 'Révocation…'
                : isCurrentlyConfirming
                  ? 'Confirmer la révocation ?'
                  : 'Révoquer'}
            </Button>

            {/* Bouton annuler — visible uniquement pendant la confirmation */}
            {isCurrentlyConfirming && (
              <Button
                variant="default"
                className="device-list__cancel-btn"
                onClick={cancelConfirm}
                aria-label="Annuler la révocation"
              >
                Annuler
              </Button>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="device-list">
      {/* Erreur de révocation */}
      {revokeError && (
        <p className="device-list__error" role="alert">
          {revokeError}
        </p>
      )}

      {/* Section appareils actifs */}
      {activeDevices.length > 0 && (
        <section className="device-list__section">
          <h4 className="device-list__section-title">
            Appareils actifs{' '}
            <span className="device-list__count">({activeDevices.length})</span>
          </h4>
          <ul
            className="device-list__items"
            aria-label={`${activeDevices.length} appareil${activeDevices.length > 1 ? 's' : ''} actif${activeDevices.length > 1 ? 's' : ''}`}
          >
            {activeDevices.map(d => renderDevice(d, true))}
          </ul>
        </section>
      )}

      {/* Section appareils révoqués */}
      {revokedDevices.length > 0 && (
        <section className="device-list__section device-list__section--revoked">
          <h4 className="device-list__section-title">
            Appareils révoqués{' '}
            <span className="device-list__count">
              ({revokedDevices.length})
            </span>
          </h4>
          <ul
            className="device-list__items"
            aria-label={`${revokedDevices.length} appareil${revokedDevices.length > 1 ? 's' : ''} révoqué${revokedDevices.length > 1 ? 's' : ''}`}
          >
            {revokedDevices.map(d => renderDevice(d, false))}
          </ul>
        </section>
      )}
    </div>
  )
}
