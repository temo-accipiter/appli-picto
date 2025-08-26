// src/components/user-menu/UserMenu.jsx
import { LangSelector, SignedImage, ThemeToggle } from '@/components'
import { useAuth, useSubscriptionStatus } from '@/hooks'
import { supabase } from '@/utils'
import { getDisplayPseudo } from '@/utils/getDisplayPseudo'
import { Crown, LogOut, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import './UserMenu.scss'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const { isActive, loading } = useSubscriptionStatus()
  const [open, setOpen] = useState(false)
  const [dbPseudo, setDbPseudo] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const dialogRef = useRef(null)
  const btnRef = useRef(null)

  // Ferme le menu sur changement de route
  useEffect(() => setOpen(false), [location.pathname])

  // Récupère pseudo DB
  useEffect(() => {
    let cancelled = false
    const fetchDbPseudo = async () => {
      if (!user?.id) return
      const { data, error } = await supabase
        .from('profiles')
        .select('pseudo')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancelled) setDbPseudo(data?.pseudo ?? '')
      if (error) console.warn('profiles.pseudo fetch:', error?.message)
    }
    fetchDbPseudo()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (!user) return null

  const displayPseudo = getDisplayPseudo(user, dbPseudo)
  const initials = displayPseudo?.[0]?.toUpperCase() || '🙂'
  const avatarPath = user?.user_metadata?.avatar || null

  const handleCheckout = async () => {
    const priceId = import.meta.env.VITE_STRIPE_PRICE_ID

    if (!priceId || !/^price_[a-zA-Z0-9]+$/.test(priceId)) {
      alert('⚠️ VITE_STRIPE_PRICE_ID est vide ou invalide (attendu: price_...)')
      return
    }

    try {
      // Appel direct via Supabase Functions (JWT auto)
      const { data, error } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            price_id: priceId,
            success_url: `${window.location.origin}/profil`,
            cancel_url: `${window.location.origin}/profil`,
          },
        }
      )

      if (error) {
        alert(`❌ Erreur Stripe : ${error.message || 'Inconnue'}`)
        return
      }
      if (data?.url) {
        window.location.href = data.url
        return
      }

      // Fallback via fetch brut pour lire toute la réponse
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price_id: priceId,
            success_url: `${window.location.origin}/profil`,
            cancel_url: `${window.location.origin}/profil`,
          }),
        }
      )

      const payload = await res.json().catch(() => ({}))
      if (payload?.url) {
        window.location.href = payload.url
        return
      }

      alert('❌ Réponse Stripe inattendue')
    } catch (e) {
      console.error('Erreur checkout:', e)
      alert('❌ Erreur lors de la redirection vers Stripe')
    }
  }

  const handleBackdropMouseDown = e => {
    if (e.target === e.currentTarget) setOpen(false)
  }

  return (
    <>
      <button
        ref={btnRef}
        className="user-menu-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Ouvrir le menu du compte"
      >
        {avatarPath ? (
          <SignedImage
            filePath={avatarPath}
            bucket="avatars"
            alt="Mon avatar"
            size={36}
          />
        ) : (
          <span className="avatar-circle" aria-hidden>
            {initials}
          </span>
        )}
        <span className="sr-only">Ouvrir le menu compte</span>
      </button>

      {open && (
        <div
          className="user-menu-backdrop"
          role="presentation"
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            id="user-menu-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu du compte"
            className="user-menu-dialog"
            onMouseDown={e => e.stopPropagation()}
          >
            <header className="user-menu-header">
              {avatarPath ? (
                <SignedImage
                  filePath={avatarPath}
                  bucket="avatars"
                  alt=""
                  size={44}
                />
              ) : (
                <span className="avatar-circle header" aria-hidden>
                  {initials}
                </span>
              )}
              <div className="user-infos">
                <strong>{displayPseudo}</strong>
                <small>{user.email}</small>
              </div>
            </header>

            <div className="user-menu-preferences" aria-label="Préférences">
              <LangSelector />
              <ThemeToggle />
            </div>

            <nav className="user-menu-list" aria-label="Liens du compte">
              <button
                className="user-menu-item"
                onClick={() => navigate('/profil')}
              >
                <User className="icon" aria-hidden />
                <span>Profil</span>
              </button>

              <button
                className="user-menu-item"
                onClick={
                  loading
                    ? undefined
                    : isActive
                      ? () => navigate('/abonnement') // Page dédiée à l'abonnement
                      : handleCheckout // Stripe Checkout
                }
                disabled={loading}
              >
                <Crown className="icon" aria-hidden />
                <span>
                  {loading
                    ? 'Vérification…'
                    : isActive
                      ? 'Gérer mon abonnement' // Redirige vers page dédiée
                      : "S'abonner"}{' '}
                  {/* Ouvre Stripe Checkout */}
                </span>
              </button>

              <button
                className="user-menu-item danger"
                onClick={async () => {
                  await signOut()
                  navigate('/login')
                }}
              >
                <LogOut className="icon" aria-hidden />
                <span>Se déconnecter</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
