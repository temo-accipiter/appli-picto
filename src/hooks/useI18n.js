/**
 * Hook : useI18n
 *
 * Rôle :
 *   Hook personnalisé pour l'internationalisation basé sur react-i18next.
 *   • Fournit la fonction de traduction t() avec support des clés imbriquées
 *   • Expose la langue actuelle et la fonction de changement de langue
 *   • Vérifie si les traductions sont prêtes (évite les clés non traduites)
 *
 * Hooks & bibliothèques utilisés :
 *   • useTranslation (react-i18next) – hook de base pour i18n
 *
 * Retourne :
 *   {
 *     t: Function - Fonction de traduction (ex: t('nav.login'))
 *     language: string - Langue actuelle ('fr' | 'en')
 *     changeLanguage: Function - Changer de langue
 *     isReady: boolean - Traductions chargées
 *   }
 *
 * Usage :
 *   const { t, language, changeLanguage } = useI18n()
 *   return <h1>{t('app.welcome')}</h1>
 */

import { useTranslation } from 'react-i18next'

export function useI18n() {
  const { t, i18n, ready } = useTranslation()

  return {
    // Fonction de traduction
    t,

    // Langue actuelle
    language: i18n.language,

    // Changer de langue (avec sauvegarde auto dans localStorage via i18n.js)
    changeLanguage: lng => i18n.changeLanguage(lng),

    // Indique si les traductions sont chargées
    isReady: ready,

    // Liste des langues supportées
    languages: ['fr', 'en'],
  }
}
