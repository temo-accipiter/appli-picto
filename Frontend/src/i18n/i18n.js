/**
 * Configuration i18n - internationalisation
 *
 * Rôle :
 *   Initialise i18next pour la gestion des traductions dans l’application React.
 *   • Charge dynamiquement les fichiers JSON de traduction via le backend HTTP.
 *   • Déclare les langues supportées (français, anglais) et la langue de repli.
 *   • Définit le namespace par défaut et les options de chargement.
 *   • Intègre i18next à React via initReactI18next.
 *
 * Usage :
 *   Importer ce fichier au tout début de l’application (ex. dans main.jsx) :
 *     import './i18n/i18n'
 *
 * Fichiers JSON attendus :
 *   public/locales/fr/common.json
 *   public/locales/en/common.json
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'

i18n
  // on charge seulement les fichiers JSON de la langue active
  .use(Backend)
  .use(initReactI18next)
  .init({
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
  })

export default i18n
