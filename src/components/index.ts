// ========================================
// FEATURES - Domaines métier
// ========================================

// Taches
export { default as TachesDnd } from './features/taches/taches-dnd/TachesDnd'
export { default as TachesEdition } from './features/taches/taches-edition/TachesEdition'
export { default as TrainProgressBar } from './features/taches/train-progress-bar/TrainProgressBar'

// Time Timer
export { default as TimeTimer } from './features/time-timer/TimeTimer'

// Recompenses
export { default as RecompensesEdition } from './features/recompenses/recompenses-edition/RecompensesEdition'
export { default as SelectedRewardFloating } from './features/recompenses/selected-reward-floating/SelectedRewardFloating'

// Consent (cookies RGPD)
export { default as CookieBanner } from './features/consent/CookieBanner'
export { default as CookiePreferences } from './features/consent/CookiePreferences'

// Settings (compte utilisateur)
export { default as DeleteAccountGuard } from './features/settings/DeleteAccountGuard'
export { default as DeleteAccountModal } from './features/settings/DeleteAccountModal'

// Admin
export { default as AccountManagement } from './features/admin/AccountManagement'
export { default as QuotaManagement } from './features/admin/QuotaManagement'
export { default as ImageAnalytics } from './features/admin/ImageAnalytics'

// Subscription
export { default as SubscribeButton } from './features/subscription/subscribe-button/SubscribeButton'

// Legal
export { default as LegalMarkdown } from './features/legal/legal-markdown/LegalMarkdown'

// ========================================
// LAYOUT - Composants de structure
// ========================================

export { default as Footer } from './layout/footer/Footer'
export { default as Navbar } from './layout/navbar/Navbar'
export { default as SettingsMenu } from './layout/settings-menu/SettingsMenu'
export { default as UserMenu } from './layout/user-menu/UserMenu'

// ========================================
// SHARED - Composants réutilisables métier
// ========================================

export { default as AccountStatusBadge } from './shared/account-status-badge/AccountStatusBadge'
export { default as AvatarProfil } from './shared/avatar-profil/AvatarProfil'
export { default as BaseCard } from './shared/card/base-card/BaseCard'
export { default as EditionCard } from './shared/card/edition-card/EditionCard'
export { default as TableauCard } from './shared/card/tableau-card/TableauCard'
export { default as DemoSignedImage } from './shared/demo-signed-image/DemoSignedImage'
export { default as EditionList } from './shared/edition-list/EditionList'
export { default as ErrorBoundary } from './shared/error-boundary/ErrorBoundary'
export { default as ItemForm } from './shared/forms/ItemForm'
export { default as ImageQuotaIndicator } from './shared/image-quota-indicator/ImageQuotaIndicator'
export { default as InputWithValidation } from './shared/input-with-validation/InputWithValidation'
export { default as LangSelector } from './shared/lang-selector/LangSelector'
export { default as Layout } from './shared/layout/Layout'
export { default as PageTransition } from './shared/page-transition/PageTransition'
export { default as ProtectedRoute } from './shared/protected-route/ProtectedRoute'
export { default as InitializationLoader } from './shared/initialization-loader/InitializationLoader'
export { default as QuotaIndicator } from './shared/quota-indicator/QuotaIndicator'
export { default as Separator } from './shared/separator/Separator'
export { default as SignedImage } from './shared/signed-image/SignedImage'
export { default as ThemeToggle } from './shared/theme-toggle/ThemeToggle'
export { default as SearchInput } from './shared/search-input/SearchInput'
export { default as GlobalLoader } from './shared/global-loader/GlobalLoader'
export { default as WebVitals } from './shared/web-vitals/WebVitals'

// Feature Gates
export {
  FeatureGate,
  PremiumFeatureGate,
} from './shared/feature-gate/FeatureGate'

// Modals
export { default as Modal } from './shared/modal/Modal'
export { default as ModalAjout } from './shared/modal/modal-ajout/ModalAjout'
export { default as ModalCategory } from './shared/modal/modal-category/ModalCategory'
export { default as ModalConfirm } from './shared/modal/modal-confirm/ModalConfirm'
export { default as ModalQuota } from './shared/modal/modal-quota/ModalQuota'
export { default as ModalRecompense } from './shared/modal/modal-recompense/ModalRecompense'
export { default as PersonalizationModal } from './shared/modal/modal-personalization/PersonalizationModal'

// ========================================
// UI - Primitives UI pures
// ========================================

export { default as Button } from './ui/button/Button'
export { default as ButtonClose } from './ui/button/button-close/ButtonClose'
export { default as ButtonDelete } from './ui/button/button-delete/ButtonDelete'
export { default as Checkbox } from './ui/checkbox/Checkbox'
export { default as FloatingPencil } from './ui/floating-pencil/FloatingPencil'
export { default as ImagePreview } from './ui/image-preview/ImagePreview'
export { default as Input } from './ui/input/Input'
export { default as Loader } from './ui/loader/Loader'
export { default as PasswordChecklist } from './ui/password-checklist/PasswordChecklist'
export { default as Select } from './ui/select/Select'
export { default as Toast } from './ui/toast/Toast'
export { default as UploadProgress } from './ui/upload-progress/UploadProgress'
