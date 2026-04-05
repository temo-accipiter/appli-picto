export { isAbortLike, withAbortSafe } from './_net'

export { default as useAccountStatus } from './useAccountStatus'
export { default as useAuth } from './useAuth'
// S8 — Offline + Sync
export { useOnlineStatus } from './useOnlineStatus'
// S9 — Quotas + Feature Gating + Downgrade
export { default as useExecutionOnly } from './useExecutionOnly'
// S10 — Devices
export { default as useDevices } from './useDevices'
export type { Device } from './useDevices'
export { default as useDeviceRegistration } from './useDeviceRegistration'
// S3 — Cartes + Catégories (DB-first)
export { default as useBankCards } from './useBankCards'
export type { BankCard } from './useBankCards'
export { default as usePersonalCards } from './usePersonalCards'
export type { PersonalCard } from './usePersonalCards'
export { default as useChildProfiles } from './useChildProfiles'
export type { ChildProfile } from './useChildProfiles'
// S4 — Timelines + Slots (DB-first)
export { default as useTimelines } from './useTimelines'
export type { Timeline } from './useTimelines'
export { default as useSlots } from './useSlots'
export type { Slot, SlotKind } from './useSlots'
// S5 — Sessions + Validations (DB-first)
export { default as useSessions } from './useSessions'
export type { Session, SessionState } from './useSessions'
export { default as useSessionValidations } from './useSessionValidations'
export type { SessionValidation } from './useSessionValidations'
// S7 — Séquençage (DB-first)
export { default as useSequences } from './useSequences'
export type { Sequence } from './useSequences'
export { default as useSequenceSteps } from './useSequenceSteps'
export type { SequenceStep } from './useSequenceSteps'
// Ticket 3 — Visitor local-only séquençage
export { default as useSequencesLocal } from './useSequencesLocal'
export type { VisitorSequence } from './useSequencesLocal'
export { default as useSequenceStepsLocal } from './useSequenceStepsLocal'
export type { VisitorSequenceStep } from './useSequenceStepsLocal'
export { default as useSequencesWithVisitor } from './useSequencesWithVisitor'
export type { UnifiedSequence } from './useSequencesWithVisitor'
export { default as useSequenceStepsWithVisitor } from './useSequenceStepsWithVisitor'
export type { UnifiedSequenceStep } from './useSequenceStepsWithVisitor'
export { default as useCategories } from './useCategories'
export { default as useIsVisitor } from './useIsVisitor'
export { useCategoryValidation } from './useCategoryValidation'
export { default as useDebounce } from './useDebounce'
export { useDragAnimation } from './useDragAnimation'
export { useEscapeKey } from './useEscapeKey'
export { useFocusTrap } from './useFocusTrap'
export { useInlineConfirm } from './useInlineConfirm'
export { useEditionState } from './useEditionState'
export type {
  UseEditionStateOptions,
  UseEditionStateReturn,
} from './useEditionState'
export { useReducedMotion } from './useReducedMotion'
export { useScrollLock } from './useScrollLock'
export { useAudioContext } from './useAudioContext'
export { useTimerPreferences } from './useTimerPreferences'
export { useTimerSvgPath, getNumberPosition } from './useTimerSvgPath'
export { useCheckout } from './useCheckout'
export { useDbPseudo } from './useDbPseudo'
export { default as useRecompenses } from './useRecompenses'

export { useI18n } from './useI18n'
// S11 — Plateforme (account_preferences)
export { default as useAccountPreferences } from './useAccountPreferences'
// S12 — Administration (support info via admin_get_account_support_info)
export { default as useSubscriptionLogs } from './useSubscriptionLogs'
export type { SubscriptionLog, LogFilterType } from './useSubscriptionLogs'
export { default as useAdminSupportInfo } from './useAdminSupportInfo'
export type {
  AdminSupportAccountInfo,
  AdminSupportChildProfile,
} from './useAdminSupportInfo'
export { default as useAdminBankCards } from './useAdminBankCards'
export type { AdminBankCard } from './useAdminBankCards'
export { default as useStations } from './useStations'

// Re-export hooks from contexts
export { useLoading, useToast } from '@/contexts'
