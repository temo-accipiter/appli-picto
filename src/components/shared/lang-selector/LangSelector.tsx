'use client'

/**
 * Composant : LangSelector
 *
 * Rôle :
 *   Permet de basculer entre le français et l'anglais via i18next.
 *   • Affiche deux boutons 🇫🇷 et 🇬🇧
 *   • Met à jour la langue actuelle et la stocke en localStorage
 *
 * Hooks & bibliothèques utilisés :
 *   • useTranslation (react-i18next) – accès à l'objet i18n
 *
 * Props :
 *   (aucune)
 */

import { useTranslation } from 'react-i18next'
import './LangSelector.scss'

export default function LangSelector() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language // Langue actuelle (ex: 'fr')

  // 🔁 Fonction pour changer de langue
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang) // Mise à jour via i18next
    localStorage.setItem('lang', lang) // Sauvegarde dans le localStorage
  }

  return (
    <div
      className="lang-selector"
      role="group"
      aria-label="Sélecteur de langue"
    >
      {/* 🇫🇷 Bouton pour le français */}
      <button
        className={currentLang === 'fr' ? 'active' : ''}
        onClick={() => changeLanguage('fr')}
        aria-label="Passer le site en français"
      >
        🇫🇷
      </button>

      {/* 🇬🇧 Bouton pour l'anglais */}
      <button
        className={currentLang === 'en' ? 'active' : ''}
        onClick={() => changeLanguage('en')}
        aria-label="Switch site to English"
      >
        🇬🇧
      </button>
    </div>
  )
}
