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
export { default as useCategories } from './useCategories'
export { default as useIsVisitor } from './useIsVisitor'
export { useCategoryValidation } from './useCategoryValidation'
export { default as useDebounce } from './useDebounce'
export { default as useDemoCards } from './useDemoCards'
export { useDragAnimation } from './useDragAnimation'
export { useEscapeKey } from './useEscapeKey'
export { useFocusTrap } from './useFocusTrap'
export { useReducedMotion } from './useReducedMotion'
export { useScrollLock } from './useScrollLock'
export { useAudioContext } from './useAudioContext'
export { useTimerPreferences } from './useTimerPreferences'
export { useTimerSvgPath, getNumberPosition } from './useTimerSvgPath'
export { useCheckout } from './useCheckout'
export { useDbPseudo } from './useDbPseudo'
// ⛔ LEGACY — STABILIZATION PATCH avant S4
// Ces hooks référencent des tables supprimées du nouveau schéma DB (taches, recompenses).
// Les fichiers hooks sont conservés mais non exportés pour éviter toute réintroduction accidentelle.
// Réactivation : S4 (useTimelines/useSlots), S5 (useSessions), S12 (useMetrics).
//
// export { useMetrics } from './useMetrics'
// export { default as useFallbackData } from './useFallbackData'
// export { default as useRecompenses } from './useRecompenses'
// export { default as useTaches } from './useTaches'
// export { default as useTachesDnd } from './useTachesDnd'
// export { default as useTachesEdition } from './useTachesEdition'

export { useI18n } from './useI18n'
// S11 — Plateforme (account_preferences)
export { default as useAccountPreferences } from './useAccountPreferences'
export { default as useParametres } from './useParametres' // ⚠️ LEGACY — Remplacé par useAccountPreferences (S11)
export { default as useRBAC } from './useRBAC' // ⚠️ Quota logic deferred to S2+
export { default as useStations } from './useStations'
export { default as useSubscriptionStatus } from './useSubscriptionStatus'

// Re-export hooks from contexts
export { useLoading, useToast, usePermissions } from '@/contexts' // ⚠️ usePermissions stub for S2+
