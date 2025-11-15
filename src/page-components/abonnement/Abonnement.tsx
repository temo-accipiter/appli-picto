'use client'

// src/pages/abonnement/Abonnement.tsx
import { Button, FloatingPencil } from '@/components'
import { useToast } from '@/contexts'
import { useAuth, useSubscriptionStatus } from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Abonnement.scss'

interface SubscriptionLog {
  id: string
  timestamp: string
  event_type: string
  details: Record<string, unknown> | null
}

interface CheckoutResponse {
  portal?: boolean
  url?: string
}

export default function Abonnement() {
  const { user } = useAuth()
  const { isActive, subscription, loading, daysUntilExpiry, statusDisplay } =
    useSubscriptionStatus()
  const { show: showToast } = useToast()
  const navigate = useNavigate()

  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [userLogs, setUserLogs] = useState<SubscriptionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Rediriger si pas d'abonnement actif
  useEffect(() => {
    if (!loading && !isActive) {
      showToast("Vous n'avez pas d'abonnement actif", 'info')
      navigate('/profil')
    }
  }, [isActive, loading, navigate, showToast])

  // Charger l'historique des logs de l'utilisateur
  useEffect(() => {
    if (!user?.id) return

    const loadUserLogs = async () => {
      setLogsLoading(true)
      try {
        const { data, error } = await supabase
          .from('subscription_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(20)

        if (error) throw error
        setUserLogs((data as SubscriptionLog[]) || [])
      } catch (error) {
        console.error('Erreur chargement logs utilisateur:', error)
        // Ne pas afficher d'erreur à l'utilisateur, c'est optionnel
      } finally {
        setLogsLoading(false)
      }
    }

    loadUserLogs()
  }, [user?.id])

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
      const priceId = import.meta.env.VITE_STRIPE_PRICE_ID

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non défini'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/\./g, ' → ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
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
            <p className="status-details">
              {subscription?.plan && `Plan : ${subscription.plan}`}
              {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
                <span className="expiry-warning">
                  · Expire dans {daysUntilExpiry} jour
                  {daysUntilExpiry > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Détails de l'abonnement */}
      {subscription && (
        <div className="abonnement-details">
          <h3>Détails de l&apos;abonnement</h3>
          <div className="details-grid">
            <div className="detail-item">
              <label>Date de début :</label>
              <span>{formatDate(subscription.start_date)}</span>
            </div>
            <div className="detail-item">
              <label>Période actuelle :</label>
              <span>
                Du {formatDate(subscription.current_period_start)}
                au {formatDate(subscription.current_period_end)}
              </span>
            </div>
            {subscription.cancel_at && (
              <div className="detail-item">
                <label>Annulation prévue :</label>
                <span>{formatDate(subscription.cancel_at)}</span>
              </div>
            )}
            {subscription.price_id && (
              <div className="detail-item">
                <label>ID du prix :</label>
                <span className="price-id">{subscription.price_id}</span>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Historique des événements */}
      <div className="abonnement-history">
        <h3>Historique des événements</h3>

        {logsLoading ? (
          <p className="history-loading">Chargement de l&apos;historique...</p>
        ) : userLogs.length > 0 ? (
          <div className="history-list">
            {userLogs.map(log => (
              <div key={log.id} className="history-item">
                <div className="history-header">
                  <span className="history-event">
                    {formatEventType(log.event_type)}
                  </span>
                  <span className="history-timestamp">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="history-details">
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-history">Aucun événement enregistré</p>
        )}
      </div>

      {/* Retour au profil */}
      <div className="abonnement-footer">
        <Button
          onClick={() => navigate('/profil')}
          label="← Retour au profil"
          variant="secondary"
        />
      </div>
    </div>
  )
}
