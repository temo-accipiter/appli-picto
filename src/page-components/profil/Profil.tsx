'use client'

// src/page-components/profil/Profil.tsx
import {
  Button,
  ChildProfileSelector,
  DeleteAccountModal,
  LangSelector,
  Modal,
  ThemeToggle,
} from '@/components'
import { ChildProfileManager } from '@/components/features/child-profile'
import DeviceList from '@/components/features/profil/device-list/DeviceList'
import { useToast } from '@/contexts'
import {
  useAuth,
  useI18n,
  useAccountStatus,
  useChildProfiles,
  useDevices,
} from '@/hooks'
import useDeviceRegistration from '@/hooks/useDeviceRegistration'
import { supabase } from '@/utils'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Turnstile from 'react-turnstile'
import i18n from '@/config/i18n/i18n'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  FileText,
  LogOut,
  Settings,
  Smartphone,
  Users,
} from 'lucide-react'
import './Profil.scss'

type ActiveModal = 'preferences' | 'children' | 'devices' | 'rgpd' | null

export default function Profil() {
  const { t } = useI18n()
  const {
    isSubscriber: isActive,
    statusDisplay,
    loading,
    isAdmin,
  } = useAccountStatus()

  const { user, signOut } = useAuth()
  const { show: showToast } = useToast()
  const router = useRouter()

  // Compteurs dynamiques pour les sous-textes des cartes
  const { profiles: childProfiles } = useChildProfiles()
  const { devices } = useDevices()

  // ── S10 : Enregistrement device ────────────────────────────────────────────
  const { deviceId, registrationError } = useDeviceRegistration()
  const quotaToastShown = useRef(false)
  useEffect(() => {
    if (registrationError === 'quota' && !quotaToastShown.current) {
      quotaToastShown.current = true
      showToast(t('quota.devicesLimit'), 'warning')
    }
  }, [registrationError, showToast, t])

  // ── États modals ────────────────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  // Références sur les boutons déclencheurs (restitution du focus à la fermeture)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // ── États zone dangereuse ───────────────────────────────────────────────────
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false)
  const [showResetSection, setShowResetSection] = useState(false)
  const [captchaTokenReset, setCaptchaTokenReset] = useState<string | null>(
    null
  )
  const [captchaKey, setCaptchaKey] = useState(0)

  // ── État suppression compte ─────────────────────────────────────────────────
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)

  // Fermeture modal avec restitution du focus sur le déclencheur
  const closeModal = () => {
    const current = activeModal
    setActiveModal(null)
    requestAnimationFrame(() => {
      if (current) triggerRefs.current[current]?.focus()
    })
  }

  const resetPassword = async () => {
    if (!user) return
    try {
      if (!captchaTokenReset) {
        showToast(t('profil.validateCaptcha'), 'error')
        return
      }
      if (!user?.email) return
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(
        user.email || '',
        { redirectTo, captchaToken: captchaTokenReset }
      )
      if (error) throw error
      showToast(t('profil.resetEmailSent'), 'success')
    } catch (err) {
      const errorMessage = (err as Error)?.message || ''
      if (errorMessage.includes('you can only request this after')) {
        showToast(t('errors.resetPasswordRateLimit'), 'error')
      } else {
        showToast(errorMessage || t('errors.generic'), 'error')
      }
    } finally {
      setCaptchaTokenReset(null)
      setCaptchaKey(k => k + 1)
      setShowResetSection(false)
    }
  }

  const handleDeleteAccount = async (turnstileToken: string) => {
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { turnstile: turnstileToken },
    })
    if (error) {
      showToast(t('profil.accountDeleteError'), 'error')
    } else {
      showToast(t('profil.accountDeleted'), 'success')
      await signOut()
      router.push('/signup')
    }
  }

  const handleSignOut = () => {
    router.push('/login')
    void signOut()
  }

  const handleToggleDangerZone = () => {
    setDangerZoneOpen(o => !o)
    if (dangerZoneOpen) {
      setShowResetSection(false)
      setCaptchaTokenReset(null)
    }
  }

  const handleCancelReset = () => {
    setShowResetSection(false)
    setCaptchaTokenReset(null)
    setCaptchaKey(k => k + 1)
  }

  const childCount = childProfiles?.length ?? 0
  const deviceCount = devices?.length ?? 0

  if (!user) {
    return (
      <div className="profil-page">
        <h1>{t('profil.myProfile')}</h1>
        <p>{t('profil.loading')}</p>
      </div>
    )
  }

  return (
    <div className="profil-page">
      {/* ── EN-TÊTE UTILISATEUR ──────────────────────────────────────────── */}
      <header className="profil-header">
        <div className="profil-header__info">
          <h1 className="profil-header__name">{t('profil.myProfile')}</h1>
          <p className="profil-header__email">{user.email}</p>
          <div className="profil-header__badges">
            {!loading &&
              (isActive ? (
                <span className="profil-badge profil-badge--success">
                  {t('subscription.subscriberLabel')}
                </span>
              ) : (
                <span className="profil-badge profil-badge--neutral">
                  Gratuit
                </span>
              ))}
            {isAdmin && (
              <span className="profil-badge profil-badge--info">Admin</span>
            )}
          </div>
        </div>
      </header>

      {/* ── CARTES NAVIGABLES ─────────────────────────────────────────────── */}
      <nav className="profil-nav" aria-label="Sections du profil">
        {/* 1. Préférences d'affichage */}
        <button
          ref={el => {
            triggerRefs.current['preferences'] = el
          }}
          className="profil-nav-card"
          onClick={() => setActiveModal('preferences')}
          aria-label="Préférences d'affichage — Thème, langue"
        >
          <span
            className="profil-nav-card__icon-wrap profil-nav-card__icon-wrap--purple"
            aria-hidden="true"
          >
            <Settings size={20} />
          </span>
          <div className="profil-nav-card__body">
            <span className="profil-nav-card__title">
              {t('profile.displayPreferences')}
            </span>
            <span className="profil-nav-card__sub">
              {t('profile.themeLanguageSub')}
            </span>
          </div>
          <ChevronRight
            className="profil-nav-card__chevron"
            size={18}
            aria-hidden="true"
          />
        </button>

        {/* 2. Profils enfants */}
        <button
          ref={el => {
            triggerRefs.current['children'] = el
          }}
          className="profil-nav-card"
          onClick={() => setActiveModal('children')}
          aria-label={t('profile.childProfilesLabel', { count: childCount })}
        >
          <span
            className="profil-nav-card__icon-wrap profil-nav-card__icon-wrap--green"
            aria-hidden="true"
          >
            <Users size={20} />
          </span>
          <div className="profil-nav-card__body">
            <span className="profil-nav-card__title">
              {t('profile.childProfiles')}
            </span>
            <span className="profil-nav-card__sub">
              {childCount} profil{childCount !== 1 ? 's' : ''}
            </span>
          </div>
          <ChevronRight
            className="profil-nav-card__chevron"
            size={18}
            aria-hidden="true"
          />
        </button>

        {/* 3. Mes appareils */}
        <button
          ref={el => {
            triggerRefs.current['devices'] = el
          }}
          className="profil-nav-card"
          onClick={() => setActiveModal('devices')}
          aria-label={`Mes appareils — ${deviceCount} appareil${deviceCount !== 1 ? 's' : ''} connecté${deviceCount !== 1 ? 's' : ''}`}
        >
          <span
            className="profil-nav-card__icon-wrap profil-nav-card__icon-wrap--orange"
            aria-hidden="true"
          >
            <Smartphone size={20} />
          </span>
          <div className="profil-nav-card__body">
            <span className="profil-nav-card__title">
              {t('profile.myDevices')}
            </span>
            <span className="profil-nav-card__sub">
              {deviceCount} appareil{deviceCount !== 1 ? 's' : ''} connecté
              {deviceCount !== 1 ? 's' : ''}
            </span>
          </div>
          <ChevronRight
            className="profil-nav-card__chevron"
            size={18}
            aria-hidden="true"
          />
        </button>

        {/* 4. Abonnement (non-admins uniquement) */}
        {!isAdmin && (
          <button
            className="profil-nav-card"
            onClick={() => router.push('/abonnement')}
            aria-label={`Abonnement — ${isActive ? statusDisplay.label : 'Aucun abonnement actif'}`}
          >
            <span
              className="profil-nav-card__icon-wrap profil-nav-card__icon-wrap--yellow"
              aria-hidden="true"
            >
              <CreditCard size={20} />
            </span>
            <div className="profil-nav-card__body">
              <span className="profil-nav-card__title">Abonnement</span>
              <span className="profil-nav-card__sub">
                {loading
                  ? '...'
                  : isActive
                    ? statusDisplay.label
                    : 'Aucun abonnement actif'}
              </span>
            </div>
            <ChevronRight
              className="profil-nav-card__chevron"
              size={18}
              aria-hidden="true"
            />
          </button>
        )}

        {/* 5. RGPD et mentions légales */}
        <button
          ref={el => {
            triggerRefs.current['rgpd'] = el
          }}
          className="profil-nav-card"
          onClick={() => setActiveModal('rgpd')}
          aria-label="RGPD et mentions légales — Données, cookies, CGU"
        >
          <span
            className="profil-nav-card__icon-wrap profil-nav-card__icon-wrap--gray"
            aria-hidden="true"
          >
            <FileText size={20} />
          </span>
          <div className="profil-nav-card__body">
            <span className="profil-nav-card__title">
              RGPD et mentions légales
            </span>
            <span className="profil-nav-card__sub">Données, cookies, CGU</span>
          </div>
          <ChevronRight
            className="profil-nav-card__chevron"
            size={18}
            aria-hidden="true"
          />
        </button>
      </nav>

      {/* ── DÉCONNEXION ───────────────────────────────────────────────────── */}
      <button
        className="profil-signout"
        onClick={handleSignOut}
        aria-label="Se déconnecter du compte"
      >
        <LogOut size={20} className="profil-signout__icon" aria-hidden="true" />
        <span>Déconnexion</span>
      </button>

      {/* ── ZONE DANGEREUSE (DÉPLIABLE) ───────────────────────────────────── */}
      <section className="profil-danger-zone" aria-label="Zone dangereuse">
        <button
          className="profil-danger-zone__header"
          onClick={handleToggleDangerZone}
          aria-expanded={dangerZoneOpen}
          aria-controls="danger-zone-content"
        >
          <AlertTriangle
            size={20}
            className="profil-danger-zone__icon"
            aria-hidden="true"
          />
          <span className="profil-danger-zone__label">Zone dangereuse</span>
          {dangerZoneOpen ? (
            <ChevronUp size={18} aria-hidden="true" />
          ) : (
            <ChevronDown size={18} aria-hidden="true" />
          )}
        </button>

        <div
          id="danger-zone-content"
          className={`profil-danger-zone__content${dangerZoneOpen ? ' profil-danger-zone__content--open' : ''}`}
          aria-hidden={!dangerZoneOpen}
        >
          <p className="profil-danger-zone__desc" id="danger-zone-desc">
            Actions irréversibles, à utiliser avec précaution.
          </p>

          {/* Réinitialiser le mot de passe */}
          <div className="profil-danger-zone__action">
            {!showResetSection ? (
              <Button
                type="button"
                label="Réinitialiser le mot de passe"
                onClick={() => setShowResetSection(true)}
                variant="secondary"
                className="profil-danger-zone__btn"
              />
            ) : (
              <div className="profil-danger-zone__reset-section">
                <p className="profil-danger-zone__reset-hint">
                  Résolvez le captcha pour recevoir un lien par e-mail.
                </p>
                <Turnstile
                  key={captchaKey}
                  sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                  onSuccess={token => setCaptchaTokenReset(token)}
                  onExpire={() => setCaptchaTokenReset(null)}
                  theme="light"
                  language={i18n.language}
                />
                <Button
                  type="button"
                  label={t('profil.resetPassword')}
                  onClick={resetPassword}
                  variant="secondary"
                  disabled={!captchaTokenReset}
                  className="profil-danger-zone__btn"
                />
                <button
                  className="profil-danger-zone__cancel-link"
                  onClick={handleCancelReset}
                >
                  Annuler
                </button>
              </div>
            )}
          </div>

          {/* Supprimer le compte */}
          <div className="profil-danger-zone__action">
            <Button
              type="button"
              label={t('profil.deleteAccount')}
              onClick={() => setDeleteAccountOpen(true)}
              variant="danger"
              className="profil-danger-zone__btn"
              aria-describedby="danger-zone-desc"
            />
          </div>
        </div>
      </section>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}

      {/* Modal : Préférences d'affichage */}
      <Modal
        isOpen={activeModal === 'preferences'}
        onClose={closeModal}
        title="Préférences d'affichage"
        size="small"
      >
        <div className="profil-modal-preferences">
          <LangSelector />
          <ThemeToggle />
        </div>
      </Modal>

      {/* Modal : Profils enfants */}
      <Modal
        isOpen={activeModal === 'children'}
        onClose={closeModal}
        title="Profils enfants"
        size="large"
      >
        <div className="profil-modal-children">
          <ChildProfileSelector
            showCreateButton={true}
            showProfilesList={false}
          />
          <ChildProfileManager />
        </div>
      </Modal>

      {/* Modal : Mes appareils */}
      <Modal
        isOpen={activeModal === 'devices'}
        onClose={closeModal}
        title="Mes appareils"
        size="large"
      >
        <div className="profil-modal-devices">
          <p className="profil-modal-devices__desc">
            Gérez les appareils autorisés à accéder à votre compte. La
            révocation d&apos;un appareil est immédiate et non réversible.
          </p>
          <DeviceList currentDeviceId={deviceId} />
        </div>
      </Modal>

      {/* Modal : RGPD et mentions légales */}
      <Modal
        isOpen={activeModal === 'rgpd'}
        onClose={closeModal}
        title="RGPD et mentions légales"
        size="medium"
      >
        <nav className="profil-modal-rgpd" aria-label="Liens légaux">
          <button
            className="profil-modal-rgpd__link"
            onClick={() => {
              closeModal()
              router.push('/legal/cgu')
            }}
          >
            {t('nav.cgu')}
          </button>
          <button
            className="profil-modal-rgpd__link"
            onClick={() => {
              closeModal()
              router.push('/legal/cgv')
            }}
          >
            {t('nav.cgv')}
          </button>
          <button
            className="profil-modal-rgpd__link"
            onClick={() => {
              closeModal()
              router.push('/legal/politique-confidentialite')
            }}
          >
            {t('legal.privacy')}
          </button>
          <button
            className="profil-modal-rgpd__link"
            onClick={() => {
              closeModal()
              router.push('/legal/politique-cookies')
            }}
          >
            {t('nav.cookies')}
          </button>
          <button
            className="profil-modal-rgpd__link"
            onClick={() => {
              closeModal()
              router.push('/legal/mentions-legales')
            }}
          >
            {t('nav.mentions')}
          </button>
          <button
            className="profil-modal-rgpd__link"
            onClick={() => {
              closeModal()
              router.push('/legal/politique-confidentialite#accessibilite')
            }}
          >
            {t('legal.accessibility')}
          </button>
          <button
            className="profil-modal-rgpd__link"
            onClick={() => {
              closeModal()
              router.push('/legal/rgpd')
            }}
          >
            {t('nav.rgpd')}
          </button>
          <button
            className="profil-modal-rgpd__link profil-modal-rgpd__link--action"
            onClick={() => {
              closeModal()
              window.dispatchEvent(new CustomEvent('open-cookie-preferences'))
            }}
          >
            {t('cookies.customize')}
          </button>
        </nav>
      </Modal>

      {/* Modal suppression de compte */}
      <DeleteAccountModal
        isOpen={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        onConfirm={handleDeleteAccount}
      />

    </div>
  )
}
