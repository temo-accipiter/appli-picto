'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import './PortailRGPD.scss'

import { supabase } from '@/utils/supabaseClient'
import { useAuth, useI18n } from '@/hooks'
import { useToast } from '@/contexts'
import { exportUserDataZip } from '@/utils/rgpdExport'

export default function PortailRGPD() {
  const router = useRouter()
  const { user } = useAuth()
  const { show: showToast } = useToast()
  const { t } = useI18n()
  const [downloading, setDownloading] = useState(false)

  const handleExport = async () => {
    if (!user) {
      showToast(t('rgpd.loginRequired'), 'error')
      return
    }
    try {
      setDownloading(true)
      await exportUserDataZip(supabase, user)
      showToast(t('rgpd.exportSuccess'), 'success')
    } catch (e) {
      console.error(e)
      showToast(t('rgpd.exportError'), 'error')
    } finally {
      setDownloading(false)
    }
  }

  const openCookiePreferences = () => {
    window.dispatchEvent(new CustomEvent('open-cookie-preferences'))
  }

  return (
    <div className="rgpd-portal">
      <header className="rgpd-portal__header">
        <h1>{t('rgpd.title')}</h1>
        <p className="rgpd-portal__subtitle">{t('rgpd.subtitle')}</p>
      </header>

      <div className="rgpd-portal__grid">
        {/* Export des données */}
        <section className="rgpd-card" aria-labelledby="rgpd-export-title">
          <h2 id="rgpd-export-title">{t('rgpd.exportTitle')}</h2>
          <p>{t('rgpd.exportDescription')}</p>
          <button
            className="btn"
            onClick={handleExport}
            disabled={downloading}
            aria-busy={downloading ? 'true' : 'false'}
          >
            {downloading ? t('rgpd.exportingButton') : t('rgpd.exportButton')}
          </button>
        </section>

        {/* Rectifier → Profil */}
        <section className="rgpd-card" aria-labelledby="rgpd-rectify-title">
          <h2 id="rgpd-rectify-title">{t('rgpd.rectifyTitle')}</h2>
          <p>{t('rgpd.rectifyDescription')}</p>
          <button
            className="btn"
            onClick={() => router.push('/profil')}
            aria-label={t('rgpd.rectifyAriaLabel')}
          >
            {t('rgpd.rectifyButton')}
          </button>
        </section>

        {/* Supprimer → Profil */}
        <section className="rgpd-card" aria-labelledby="rgpd-delete-title">
          <h2 id="rgpd-delete-title">{t('rgpd.deleteTitle')}</h2>
          <p>{t('rgpd.deleteDescription')}</p>
          <button
            className="btn btn-danger"
            onClick={() => router.push('/profil')}
            aria-label={t('rgpd.deleteAriaLabel')}
          >
            {t('rgpd.deleteButton')}
          </button>
        </section>

        {/* Consentements cookies */}
        <section className="rgpd-card" aria-labelledby="rgpd-consents-title">
          <h2 id="rgpd-consents-title">{t('rgpd.consentsTitle')}</h2>
          <p>{t('rgpd.consentsDescription')}</p>
          <button
            className="btn"
            onClick={openCookiePreferences}
            aria-label={t('rgpd.consentsAriaLabel')}
          >
            {t('rgpd.consentsButton')}
          </button>
        </section>
      </div>
    </div>
  )
}
