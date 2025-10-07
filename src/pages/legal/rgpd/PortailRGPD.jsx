import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './PortailRGPD.scss'

import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/hooks'
import { useToast } from '@/contexts'
import { exportUserDataZip } from '@/utils/rgpdExport'

export default function PortailRGPD() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { show: showToast } = useToast()
  const [downloading, setDownloading] = useState(false)

  const handleExport = async () => {
    if (!user) {
      showToast('Veuillez vous connecter pour exporter vos données.', 'error')
      return
    }
    try {
      setDownloading(true)
      await exportUserDataZip(supabase, user)
      showToast('Export RGPD généré ✅', 'success')
    } catch (e) {
      console.error(e)
      showToast("Erreur lors de l'export RGPD", 'error')
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
        <h1>Portail RGPD</h1>
        <p className="rgpd-portal__subtitle">
          Téléchargez vos données, gérez vos consentements et retrouvez les
          actions de rectification/suppression dans votre profil.
        </p>
      </header>

      <div className="rgpd-portal__grid">
        {/* Export des données */}
        <section className="rgpd-card" aria-labelledby="rgpd-export-title">
          <h2 id="rgpd-export-title">Télécharger mes données</h2>
          <p>
            Obtenez un fichier ZIP contenant toutes vos données (export.json) et
            des liens signés temporaires pour vos images privées.
          </p>
          <button
            className="btn"
            onClick={handleExport}
            disabled={downloading}
            aria-busy={downloading ? 'true' : 'false'}
          >
            {downloading ? 'Préparation…' : 'Télécharger'}
          </button>
        </section>

        {/* Rectifier → Profil */}
        <section className="rgpd-card" aria-labelledby="rgpd-rectify-title">
          <h2 id="rgpd-rectify-title">Rectifier mes données</h2>
          <p>
            Modifiez vos informations personnelles (pseudo, email, etc.)
            directement dans votre profil.
          </p>
          <button
            className="btn"
            onClick={() => navigate('/profil')}
            aria-label="Ouvrir la page Profil pour rectifier mes données"
          >
            Ouvrir mon profil
          </button>
        </section>

        {/* Supprimer → Profil */}
        <section className="rgpd-card" aria-labelledby="rgpd-delete-title">
          <h2 id="rgpd-delete-title">Supprimer mon compte</h2>
          <p>
            Supprimez définitivement votre compte et l’ensemble des données
            associées depuis votre profil (confirmation requise).
          </p>
          <button
            className="btn btn-danger"
            onClick={() => navigate('/profil')}
            aria-label="Ouvrir la page Profil pour supprimer mon compte"
          >
            Ouvrir mon profil
          </button>
        </section>

        {/* Consentements cookies */}
        <section className="rgpd-card" aria-labelledby="rgpd-consents-title">
          <h2 id="rgpd-consents-title">Gérer mes consentements</h2>
          <p>
            Choisissez vos préférences de cookies (Accepter / Refuser /
            Paramétrer). Vous pourrez revenir sur votre choix à tout moment.
          </p>
          <button
            className="btn"
            onClick={openCookiePreferences}
            aria-label="Ouvrir le centre de préférences cookies"
          >
            Ouvrir les préférences cookies
          </button>
        </section>
      </div>
    </div>
  )
}
