// src/components/user-menu/UserMenu.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User, Crown } from 'lucide-react'
import { supabase } from '@/utils'
import { useAuth, useSubscriptionStatus } from '@/hooks'
import './UserMenu.scss'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const { isActive, loading } = useSubscriptionStatus()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dialogRef = useRef(null)
  const btnRef = useRef(null)

  // Fermer si on change de page
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Échapper/Click extérieur (a11y)
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && setOpen(false)
    const onClick = e => {
      if (!open) return
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const handleCheckout = async () => {
    // Même logique que SubscribeButton, inline pour éviter un composant en plus
    const { data, error } = await supabase.functions.invoke(
      'create-checkout-session',
      {
        body: {
          price_id: import.meta.env.VITE_STRIPE_PRICE_ID,
          success_url: `${window.location.origin}/profil`,
          cancel_url: `${window.location.origin}/profil`,
        },
      }
    )
    if (error) {
      console.error(error)
      return
    }
    if (data?.url) window.location.href = data.url
  }

  const initials =
    user?.user_metadata?.pseudo?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    '🙂'

  if (!user) return null

  return (
    <>
      <button
        ref={btnRef}
        className="user-menu-trigger"
        aria-haspopup="dialog"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls="user-menu-dialog"
        onClick={() => setOpen(o => !o)}
        title="Mon compte"
      >
        <span className="avatar-circle" aria-hidden>
          {initials}
        </span>
        <span className="sr-only">Ouvrir le menu compte</span>
      </button>

      {open && (
        <div className="user-menu-backdrop" role="presentation">
          <div
            id="user-menu-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu du compte"
            className="user-menu-dialog"
          >
            <header className="user-menu-header">
              <span className="avatar-circle header" aria-hidden>
                {initials}
              </span>
              <div className="user-infos">
                <strong>{user.user_metadata?.pseudo || 'Mon profil'}</strong>
                <small>{user.email}</small>
              </div>
            </header>

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
                      ? () => navigate('/profil')
                      : handleCheckout
                }
                disabled={loading}
              >
                <Crown className="icon" aria-hidden />
                <span>
                  {loading
                    ? 'Vérification…'
                    : isActive
                      ? 'Gérer mon abonnement'
                      : 'S’abonner'}
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
