'use client'

/**
 * Composant : I18nExample
 *
 * Rôle :
 *   Composant d'exemple montrant comment utiliser i18n dans l'application.
 *   • Démontre l'utilisation du hook useI18n()
 *   • Montre comment traduire des textes avec t()
 *   • Exemple de changement de langue
 *
 * Usage (pour référence) :
 *   import { useI18n } from '@/hooks'
 *
 *   const { t, language, changeLanguage } = useI18n()
 *
 *   // Traduire un texte
 *   <h1>{t('app.welcome')}</h1>
 *
 *   // Traduire avec clés imbriquées
 *   <button>{t('nav.login')}</button>
 *
 *   // Changer de langue
 *   <button onClick={() => changeLanguage('en')}>English</button>
 */

import { useI18n } from '@/hooks'
import './I18nExample.scss'

export default function I18nExample() {
  const { t, language, changeLanguage } = useI18n()

  return (
    <div className="i18n-example">
      <h1>{t('app.welcome')}</h1>

      <div className="language-info">
        <p>
          Langue actuelle : <strong>{language}</strong>
        </p>
      </div>

      <div className="examples">
        <h2>Exemples de traductions :</h2>

        <div className="example-section">
          <h3>Navigation</h3>
          <ul>
            <li>{t('nav.tableau')}</li>
            <li>{t('nav.edition')}</li>
            <li>{t('nav.profil')}</li>
          </ul>
        </div>

        <div className="example-section">
          <h3>Actions</h3>
          <ul>
            <li>{t('actions.add')}</li>
            <li>{t('actions.edit')}</li>
            <li>{t('actions.delete')}</li>
            <li>{t('actions.save')}</li>
          </ul>
        </div>

        <div className="example-section">
          <h3>Tâches</h3>
          <ul>
            <li>{t('tasks.title')}</li>
            <li>{t('tasks.add')}</li>
            <li>{t('tasks.done')}</li>
          </ul>
        </div>
      </div>

      <div className="language-switcher">
        <button
          onClick={() => changeLanguage('fr')}
          disabled={language === 'fr'}
          className={language === 'fr' ? 'active' : ''}
        >
          🇫🇷 Français
        </button>
        <button
          onClick={() => changeLanguage('en')}
          disabled={language === 'en'}
          className={language === 'en' ? 'active' : ''}
        >
          🇬🇧 English
        </button>
      </div>
    </div>
  )
}

// PropTypes pour le composant I18nExample
I18nExample.propTypes = {
  // Aucune prop pour ce composant
}
