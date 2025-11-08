/**
 * Configuration i18n - internationalisation
 *
 * Rôle :
 *   Initialise i18next pour la gestion des traductions dans l'application React.
 *   • Charge dynamiquement les fichiers JSON de traduction via le backend HTTP.
 *   • Déclare les langues supportées (français, anglais) et la langue de repli.
 *   • Définit le namespace par défaut et les options de chargement.
 *   • Intègre i18next à React via initReactI18next.
 *   • Détecte et sauvegarde la langue préférée de l'utilisateur.
 *
 * Usage :
 *   Importer ce fichier au tout début de l'application (ex. dans main.tsx) :
 *     import '@/config/i18n/i18n'
 *
 * Fichiers JSON attendus :
 *   public/locales/fr/common.json
 *   public/locales/en/common.json
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'

type SupportedLanguage = 'fr' | 'en'

// Détection de la langue préférée (localStorage > navigateur > fallback)
const getInitialLanguage = (): SupportedLanguage => {
  // 1. Vérifier le localStorage
  const savedLang = localStorage.getItem('lang')
  if (savedLang && ['fr', 'en'].includes(savedLang)) {
    return savedLang as SupportedLanguage
  }

  // 2. Détecter la langue du navigateur
  const browserLang = navigator.language.split('-')[0]
  if (['fr', 'en'].includes(browserLang)) {
    return browserLang as SupportedLanguage
  }

  // 3. Fallback sur le français
  return 'fr'
}

i18n
  // on charge seulement les fichiers JSON de la langue active
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: getInitialLanguage(),
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    ns: ['common'],
    defaultNS: 'common',
    backend: {
      // place tes JSON dans public/locales/fr/common.json, /en/common.json
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    react: {
      // on passe par Suspense si besoin, ici disable pour plus de contrôle
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false, // React échappe déjà les valeurs
    },
    // Debugging en dev (optionnel)
    debug: import.meta.env.DEV && import.meta.env.VITE_I18N_DEBUG === 'true',
  })

// Initialiser l'attribut lang au chargement
const initialLang = getInitialLanguage()
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang
}

// Sauvegarder la langue choisie dans le localStorage
i18n.on('languageChanged', (lng: string) => {
  localStorage.setItem('lang', lng)
  // Mettre à jour l'attribut lang de la page pour l'accessibilité et le calendrier
  document.documentElement.lang = lng
})

export default i18n
