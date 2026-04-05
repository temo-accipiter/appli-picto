'use client'

// src/pages/abonnement/Abonnement.tsx
import { Button, FloatingPencil } from '@/components'
import { useToast } from '@/contexts'
import { useAuth, useAccountStatus } from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import './Abonnement.scss'

interface CheckoutResponse {
  portal?: boolean
  url?: string
}

export default function Abonnement() {
  const { user } = useAuth()
  const { isSubscriber: isActive, loading, statusDisplay } = useAccountStatus()
  const { show: showToast } = useToast()
  const router = useRouter()

  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Rediriger si pas d'abonnement actif
  useEffect(() => {
    if (!loading && !isActive) {
      showToast("Vous n'avez pas d'abonnement actif", 'info')
      router.push('/profil')
    }
  }, [isActive, loading, router, showToast])

  if (!user) {
    return (
      <div className="abonnement-page">
        <h1>Mon abonnement</h1>
        <p>Chargement en cours...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="abonnement-page">
        <h1>Mon abonnement</h1>
        <p>Chargement de l&apos;abonnement...</p>
      </div>
    )
  }

  if (!isActive) {
    return (
      <div className="abonnement-page">
        <h1>Mon abonnement</h1>
        <p>Redirection...</p>
      </div>
    )
  }

  const handleBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID

      const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
        'create-checkout-session',
        {
          body: {
            price_id: priceId,
            success_url: `${window.location.origin}/abonnement`,
            cancel_url: `${window.location.origin}/abonnement`,
          },
        }
      )

      if (error) {
        showToast(`Erreur : ${error.message}`, 'error')
        return
      }

      if (data?.portal && data?.url) {
        window.location.href = data.url
      } else {
        showToast(
          'Erreur lors de l&apos;ouverture du portail de facturation',
          'error'
        )
      }
    } catch (e) {
      console.error('Erreur portail facturation :', e)
      showToast("Erreur lors de l'ouverture du portail", 'error')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir annuler votre abonnement ? Il sera actif jusqu&apos;à la fin de la période en cours.'
      )
    ) {
      return
    }

    setCancelLoading(true)
    try {
      // Ici tu pourrais appeler une Edge Function pour annuler l'abonnement
      // Ou rediriger vers le portail Stripe avec une action spécifique
      showToast(
        'Pour annuler votre abonnement, veuillez utiliser le portail de facturation',
        'info'
      )
      handleBillingPortal()
    } catch (e) {
      console.error('Erreur annulation :', e)
      showToast("Erreur lors de l'annulation", 'error')
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <div className="abonnement-page">
      <h1>Mon abonnement</h1>

      <FloatingPencil className="floating-pencil--abonnement" />

      {/* Statut de l'abonnement */}
      <div className="abonnement-status">
        <div className="status-header">
          <span className={`status-icon ${statusDisplay.color}`}>
            {statusDisplay.icon}
          </span>
          <div className="status-info">
            <h2>Statut : {statusDisplay.label}</h2>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="abonnement-actions">
        <h3>Gérer mon abonnement</h3>

        <div className="action-buttons">
          <Button
            onClick={handleBillingPortal}
            label={portalLoading ? 'Ouverture...' : '🔧 Portail de facturation'}
            variant="primary"
            disabled={portalLoading}
          />

          <Button
            onClick={handleCancelSubscription}
            label={
              cancelLoading ? 'Traitement...' : '❌ Annuler l&apos;abonnement'
            }
            variant="danger"
            disabled={cancelLoading}
          />
        </div>

        <div className="action-info">
          <p>
            <strong>Portail de facturation :</strong> Gérez vos informations de
            paiement, consultez vos factures et modifiez votre abonnement.
          </p>
          <p>
            <strong>Annulation :</strong> Votre abonnement restera actif
            jusqu&apos;à la fin de la période en cours.
          </p>
        </div>
      </div>

      {/* Retour au profil */}
      <div className="abonnement-footer">
        <Button
          onClick={() => router.push('/profil')}
          label="← Retour au profil"
          variant="secondary"
        />
      </div>
    </div>
  )
}
