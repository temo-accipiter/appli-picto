// src/components/user-menu/UserMenu.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User, Crown } from 'lucide-react'
import { supabase } from '@/utils'
import { useAuth, useSubscriptionStatus } from '@/hooks'
import { ThemeToggle, LangSelector, SignedImage } from '@/components'
import { getDisplayPseudo } from '@/utils/getDisplayPseudo'
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

  // Récupère pseudo DB (pour que Profil et UserMenu aient la même logique)
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
    if (!error && data?.url) window.location.href = data.url
  }

  // ✅ Fermer si clic exactement sur le backdrop (extérieur)
  const handleBackdropMouseDown = e => {
    if (e.target === e.currentTarget) setOpen(false)
  }

  return (
    <>
      {/* Bouton avatar dans la navbar */}
      <button
        ref={btnRef}
        className="user-menu-trigger"
        aria-haspopup="dialog"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls="user-menu-dialog"
        onClick={() => setOpen(o => !o)}
        title="Mon compte"
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
          onMouseDown={handleBackdropMouseDown} // ⬅️ ferme au clic extérieur
        >
          <div
            id="user-menu-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu du compte"
            className="user-menu-dialog"
            onMouseDown={e => e.stopPropagation()} // ⬅️ ne pas fermer si on clique dans la boîte
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

            {/* Préférences */}
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
