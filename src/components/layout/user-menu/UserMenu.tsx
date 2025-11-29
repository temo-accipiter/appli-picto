'use client'

import { LangSelector, SignedImage, ThemeToggle } from '@/components'
import { usePermissions } from '@/contexts'
import {
  isAbortLike,
  useAuth,
  useI18n,
  useSubscriptionStatus,
  withAbortSafe,
} from '@/hooks'
import { supabase } from '@/utils/supabaseClient'
import { getDisplayPseudo } from '@/utils/getDisplayPseudo'
import {
  Crown,
  LogOut,
  Pencil,
  Shield,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import './UserMenu.scss'

interface CheckoutResponse {
  url?: string
}

export default function UserMenu() {
  const { user, signOut, authReady } = useAuth()
  const { isActive, loading } = useSubscriptionStatus()
  const { isAdmin } = usePermissions() // ⚠️ On ne bloque plus sur isUnknown
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false) // Sous-menu collapsible informations légales
  const [dbPseudo, setDbPseudo] = useState('')
  const [isMobile, setIsMobile] = useState(false) // Détection mobile pour sous-menu Informations
  const router = useRouter()
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const checkingOutRef = useRef(false) // évite double-clic sur checkout
  const menuItemsRef = useRef<HTMLButtonElement[]>([]) // WCAG 2.1.1 - Navigation clavier

  // Détection mobile (< 768px) pour afficher/masquer sous-menu Informations
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // ⚠️ Garde-fou: si tout reste en "chargement" > 3s, on débloque l'UI
  const [forceUnblock, setForceUnblock] = useState(false)
  useEffect(() => {
    if (!loading) {
      setForceUnblock(false)
      return
    }
    const t = setTimeout(() => setForceUnblock(true), 3000)
    return () => clearTimeout(t)
  }, [loading])

  // Ferme le menu sur changement de route
  useEffect(() => setOpen(false), [pathname])

  // WCAG 2.1.1 - Navigation clavier et gestion focus
  useEffect(() => {
    if (!open) return

    // Focus sur le premier élément du menu à l'ouverture
    const firstItem = menuItemsRef.current[0]
    if (firstItem) {
      firstItem.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = menuItemsRef.current.filter(Boolean)
      const currentIndex = items.findIndex(
        item => item === document.activeElement
      )

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          btnRef.current?.focus() // Retour focus sur le bouton
          break
        case 'ArrowDown':
          e.preventDefault()
          if (currentIndex < items.length - 1) {
            items[currentIndex + 1]?.focus()
          } else {
            items[0]?.focus() // Boucle vers le début
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (currentIndex > 0) {
            items[currentIndex - 1]?.focus()
          } else {
            items[items.length - 1]?.focus() // Boucle vers la fin
          }
          break
        case 'Home':
          e.preventDefault()
          items[0]?.focus()
          break
        case 'End':
          e.preventDefault()
          items[items.length - 1]?.focus()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Fermer quand on clique en dehors
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Récupère pseudo DB (safe Safari/Firefox)
  useEffect(() => {
    let cancelled = false
    const fetchDbPseudo = async () => {
      if (!user?.id) return
      const { data, error, aborted } = await withAbortSafe<{
        pseudo: string | null
      }>(
        supabase
          .from('profiles')
          .select('pseudo')
          .eq('id', user.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single() as any
      )
      if (cancelled) return
      if (aborted || (error && isAbortLike(error))) return
      if (error) {
        if (process.env.NODE_ENV === 'development')
          console.warn(
            'profiles.pseudo fetch:',
            String(error?.message ?? error)
          )
        return
      }
      setDbPseudo(data?.pseudo ?? '')
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
  // WCAG 1.1.1 - Alt personnalisé avec le pseudo
  const avatarAlt = displayPseudo
    ? `Avatar de ${displayPseudo}`
    : t('nav.profil')

  const handleCheckout = async () => {
    if (checkingOutRef.current) return
    checkingOutRef.current = true

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID

    if (!priceId || !/^price_[a-zA-Z0-9]+$/.test(priceId)) {
      alert('⚠️ VITE_STRIPE_PRICE_ID est vide ou invalide (attendu: price_...)')
      checkingOutRef.current = false
      return
    }

    try {
      // 1) Appel direct via Supabase Functions (JWT auto) — safe abort
      const { data, error, aborted } = await withAbortSafe(
        supabase.functions.invoke<CheckoutResponse>('create-checkout-session', {
          body: {
            price_id: priceId,
            success_url: `${window.location.origin}/profil`,
            cancel_url: `${window.location.origin}/profil`,
          },
        })
      )

      if (!(aborted || (error && isAbortLike(error)))) {
        if (error) {
          // on tente le fallback en dessous
        } else if (data?.url) {
          window.location.href = data.url
          return
        }
      }

      // 2) Fallback via fetch brut (utile si invoke renvoie une erreur générique)
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`,
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
      // pas d'exception "vivante" dans la console de Safari
      console.error('Erreur checkout:', String((e as Error)?.message ?? e))
      alert('❌ Erreur lors de la redirection vers Stripe')
    } finally {
      checkingOutRef.current = false
    }
  }

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setOpen(false)
  }

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
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
        aria-label={t('accessibility.openMenu')}
      >
        {avatarPath ? (
          <SignedImage
            filePath={avatarPath}
            bucket="avatars"
            alt={avatarAlt}
            size={36}
          />
        ) : (
          <span className="avatar-circle" aria-hidden>
            {initials}
          </span>
        )}
        <span className="sr-only">{t('accessibility.openMenu')}</span>
      </button>

      {open && (
        <div
          className="user-menu-backdrop"
          role="presentation"
          onMouseDown={handleBackdropMouseDown}
          onClick={handleBackdropClick}
        >
          <div
            id="user-menu-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.profil')}
            className={`user-menu-dialog ${
              isMobile &&
              (pathname === '/edition' ||
                pathname === '/profil' ||
                pathname.startsWith('/admin'))
                ? 'user-menu-dialog--elevated'
                : ''
            }`}
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
              </div>
            </header>

            <div
              className="user-menu-preferences"
              aria-label={t('settings.title')}
            >
              <LangSelector />
              <ThemeToggle />
            </div>

            <nav className="user-menu-list" aria-label={t('nav.profil')}>
              {/* Links contextuels sur desktop uniquement */}
              {!isMobile && (
                <>
                  {/* Sur tableau: afficher Edition + Profil */}
                  {pathname === '/tableau' && (
                    <>
                      <button
                        ref={el => {
                          if (el) menuItemsRef.current[0] = el
                        }}
                        className="user-menu-item"
                        onClick={() => router.push('/edition')}
                      >
                        <Pencil className="icon" aria-hidden />
                        <span>{t('nav.edition')}</span>
                      </button>
                      <button
                        ref={el => {
                          if (el) menuItemsRef.current[1] = el
                        }}
                        className="user-menu-item"
                        onClick={() => router.push('/profil')}
                      >
                        <User className="icon" aria-hidden />
                        <span>{t('nav.profil')}</span>
                      </button>
                    </>
                  )}

                  {/* Sur edition: afficher Profil */}
                  {pathname === '/edition' && (
                    <button
                      ref={el => {
                        if (el) menuItemsRef.current[0] = el
                      }}
                      className="user-menu-item"
                      onClick={() => router.push('/profil')}
                    >
                      <User className="icon" aria-hidden />
                      <span>{t('nav.profil')}</span>
                    </button>
                  )}

                  {/* Sur admin: afficher Profil */}
                  {pathname.startsWith('/admin') && (
                    <button
                      ref={el => {
                        if (el) menuItemsRef.current[0] = el
                      }}
                      className="user-menu-item"
                      onClick={() => router.push('/profil')}
                    >
                      <User className="icon" aria-hidden />
                      <span>{t('nav.profil')}</span>
                    </button>
                  )}
                </>
              )}

              {/* Links contextuels sur mobile uniquement */}
              {isMobile && (
                <>
                  {/* Sur tableau mobile: afficher Edition + Profil */}
                  {pathname === '/tableau' && (
                    <>
                      <button
                        ref={el => {
                          if (el) menuItemsRef.current[0] = el
                        }}
                        className="user-menu-item"
                        onClick={() => router.push('/edition')}
                      >
                        <Pencil className="icon" aria-hidden />
                        <span>{t('nav.edition')}</span>
                      </button>
                      <button
                        ref={el => {
                          if (el) menuItemsRef.current[1] = el
                        }}
                        className="user-menu-item"
                        onClick={() => router.push('/profil')}
                      >
                        <User className="icon" aria-hidden />
                        <span>{t('nav.profil')}</span>
                      </button>
                    </>
                  )}

                  {/* Sur edition mobile: afficher Profil */}
                  {pathname === '/edition' && (
                    <button
                      ref={el => {
                        if (el) menuItemsRef.current[0] = el
                      }}
                      className="user-menu-item"
                      onClick={() => router.push('/profil')}
                    >
                      <User className="icon" aria-hidden />
                      <span>{t('nav.profil')}</span>
                    </button>
                  )}

                  {/* Sur admin mobile: afficher Profil */}
                  {pathname.startsWith('/admin') && (
                    <button
                      ref={el => {
                        if (el) menuItemsRef.current[0] = el
                      }}
                      className="user-menu-item"
                      onClick={() => router.push('/profil')}
                    >
                      <User className="icon" aria-hidden />
                      <span>{t('nav.profil')}</span>
                    </button>
                  )}
                </>
              )}

              {/* Masquer le bouton d'abonnement pour les admins */}
              {!isAdmin && (
                <button
                  ref={el => {
                    if (el) {
                      let subsIndex = 0
                      if (isMobile) {
                        // Mobile: après les liens contextuels sur tableau
                        subsIndex = pathname === '/tableau' ? 2 : 0
                      } else {
                        // Desktop: après les liens contextuels
                        if (pathname === '/tableau') {
                          subsIndex = 2 // Edition + Profil + Subscription
                        } else {
                          subsIndex = 1 // Profil + Subscription
                        }
                      }
                      menuItemsRef.current[subsIndex] = el
                    }
                  }}
                  className="user-menu-item"
                  onClick={
                    (loading || !authReady) && !forceUnblock
                      ? undefined
                      : isActive
                        ? () => router.push('/abonnement')
                        : handleCheckout
                  }
                  disabled={(loading || !authReady) && !forceUnblock}
                >
                  <Crown className="icon" aria-hidden />
                  <span>
                    {(loading || !authReady) && !forceUnblock
                      ? t('subscription.status')
                      : isActive
                        ? t('subscription.manage')
                        : t('subscription.subscribe')}
                  </span>
                </button>
              )}

              {isAdmin && (
                <button
                  ref={el => {
                    if (el) {
                      let adminIndex = 0
                      if (isMobile) {
                        // Mobile: après les liens contextuels sur tableau
                        adminIndex = pathname === '/tableau' ? 2 : 0
                      } else {
                        // Desktop: après les liens contextuels
                        if (pathname === '/tableau') {
                          adminIndex = 2 // Edition + Profil + Admin
                        } else {
                          adminIndex = 1 // Profil + Admin
                        }
                      }
                      menuItemsRef.current[adminIndex] = el
                    }
                  }}
                  className="user-menu-item admin"
                  onClick={() => router.push('/admin/permissions')}
                >
                  <Shield className="icon" aria-hidden />
                  <span>{t('nav.admin')}</span>
                </button>
              )}

              {/* Separator before legal links - Mobile only */}
              {isMobile && <div className="user-menu-separator" />}

              {/* Collapsible Legal Links - Mobile only (desktop has footer) */}
              {isMobile && (
                <>
                  <button
                    className="user-menu-item legal"
                    ref={el => {
                      if (el) {
                        // Mobile legal button index
                        let legalIndex = 1 // Default: Subscription/Admin (0) + Legal (1)
                        if (pathname === '/tableau') {
                          legalIndex = 3 // Edition (0) + Profil (1) + Subscription/Admin (2) + Legal (3)
                        }
                        menuItemsRef.current[legalIndex] = el
                      }
                    }}
                    onClick={() => setLegalOpen(!legalOpen)}
                    aria-expanded={legalOpen}
                  >
                    <FileText className="icon" aria-hidden />
                    <span>{t('nav.legal')}</span>
                    {legalOpen ? (
                      <ChevronUp className="icon chevron" aria-hidden />
                    ) : (
                      <ChevronDown className="icon chevron" aria-hidden />
                    )}
                  </button>

                  {/* Sous-menu légal (collapsible) - All footer links */}
                  {legalOpen && (
                    <div className="user-menu-submenu">
                      <button
                        className="user-menu-item submenu-item"
                        onClick={() => router.push('/legal/mentions-legales')}
                      >
                        <span>{t('nav.mentions')}</span>
                      </button>
                      <button
                        className="user-menu-item submenu-item"
                        onClick={() => router.push('/legal/cgu')}
                      >
                        <span>{t('nav.cgu')}</span>
                      </button>
                      <button
                        className="user-menu-item submenu-item"
                        onClick={() => router.push('/legal/cgv')}
                      >
                        <span>{t('nav.cgv')}</span>
                      </button>
                      <button
                        className="user-menu-item submenu-item"
                        onClick={() =>
                          router.push('/legal/politique-confidentialite')
                        }
                      >
                        <span>{t('legal.privacy')}</span>
                      </button>
                      <button
                        className="user-menu-item submenu-item"
                        onClick={() => router.push('/legal/politique-cookies')}
                      >
                        <span>{t('nav.cookies')}</span>
                      </button>
                      <button
                        className="user-menu-item submenu-item"
                        onClick={() => {
                          setOpen(false)
                          window.dispatchEvent(
                            new CustomEvent('open-cookie-preferences')
                          )
                        }}
                      >
                        <span>{t('cookies.customize')}</span>
                      </button>
                      <button
                        className="user-menu-item submenu-item danger"
                        onClick={() => {
                          setOpen(false)
                          window.dispatchEvent(
                            new CustomEvent('reject-all-cookies')
                          )
                        }}
                      >
                        <span>{t('cookies.reject_all')}</span>
                      </button>
                      <button
                        className="user-menu-item submenu-item"
                        onClick={() => router.push('/legal/accessibilite')}
                      >
                        <span>{t('legal.accessibility')}</span>
                      </button>
                      <button
                        className="user-menu-item submenu-item"
                        onClick={() => router.push('/legal/rgpd')}
                      >
                        <span>{t('nav.rgpd')}</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              <button
                ref={el => {
                  if (el) {
                    let logoutIndex = 0
                    if (isMobile) {
                      // Mobile: calculate based on current page
                      if (pathname === '/tableau') {
                        logoutIndex = 4 // Edition (0) + Profil (1) + Subscription/Admin (2) + Legal (3) + Logout (4)
                      } else {
                        logoutIndex = 2 // Subscription/Admin (0) + Legal (1) + Logout (2)
                      }
                    } else {
                      // Desktop: calculate based on current page
                      if (pathname === '/tableau') {
                        logoutIndex = 3 // Edition (0) + Profil (1) + Subscription/Admin (2) + Logout (3)
                      } else {
                        logoutIndex = 2 // Profil (0) + Subscription/Admin (1) + Logout (2)
                      }
                    }
                    menuItemsRef.current[logoutIndex] = el
                  }
                }}
                className="user-menu-item danger"
                onClick={() => {
                  signOut().then(() => router.push('/login'))
                }}
              >
                <LogOut className="icon" aria-hidden />
                <span>{t('nav.logout')}</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
