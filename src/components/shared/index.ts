// src/components/shared/index.ts
// Export centralisé de tous les composants partagés

// Composants de base (depuis ui/)
export { default as Button } from '../ui/button/Button'
export { default as Input } from '../ui/input/Input'
export { default as Modal } from './modal/Modal'
export { default as Separator } from './separator/Separator'

// Modals
export { default as ModalAjout } from './modal/modal-ajout/ModalAjout'
export { default as ModalConfirm } from './modal/modal-confirm/ModalConfirm'
export { default as ModalQuota } from './modal/modal-quota/ModalQuota'

// Composants de navigation
export { default as Layout } from './layout/Layout'
export { default as Navbar } from '../layout/navbar/Navbar'
export { default as PageTransition } from './page-transition/PageTransition'
export { default as ProtectedRoute } from './protected-route/ProtectedRoute'
export { default as InitializationLoader } from './initialization-loader/InitializationLoader'

// Composants de formulaire
export { default as ItemForm } from './forms/ItemForm'
export { default as InputWithValidation } from './input-with-validation/InputWithValidation'

// Composants d'interface
export { default as AvatarProfil } from './avatar-profil/AvatarProfil'
export { default as LangSelector } from './lang-selector/LangSelector'
export { default as SignedImage } from './signed-image/SignedImage'
export { default as ThemeToggle } from './theme-toggle/ThemeToggle'

// Composants de contenu (exports de cards)
export { default as BaseCard } from './card/base-card/BaseCard'
export { default as EditionCard } from './card/edition-card/EditionCard'
export { default as TableauCard } from './card/tableau-card/TableauCard'
export { default as EditionList } from './edition-list/EditionList'

// Composants utilitaires
export { default as ErrorBoundary } from './error-boundary/ErrorBoundary'
export { default as LegalConfigTester } from '../../tools/legal-config-tester/LegalConfigTester'

// Web Vitals
export { default as WebVitals } from './web-vitals/WebVitals'
