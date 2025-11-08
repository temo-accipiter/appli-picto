// src/types/contexts.d.ts
// Types pour les contextes React

import type { User } from '@supabase/supabase-js'
import type { Role, QuotaInfo, QuotaType } from './global'

// Re-export types needed by hooks
export type { Role, QuotaInfo, QuotaType } from './global'

// ─────────────────────────────────────────────────────────────────
// AuthContext
// ─────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null
  authReady: boolean
  loading: boolean
  error: Error | null
  signOut: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────────
// PermissionsContext
// ─────────────────────────────────────────────────────────────────

export interface PermissionsContextValue {
  ready: boolean
  loading: boolean
  role: Role
  isUnknown: boolean
  isVisitor: boolean
  isAdmin: boolean
  permissions: Record<string, boolean>
  error: Error | null
  can: (featureName: string) => boolean
  canAll: (featureNames: string[]) => boolean
  canAny: (featureNames: string[]) => boolean
  reload: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────────
// ToastContext
// ─────────────────────────────────────────────────────────────────

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  duration?: number
}

export interface ToastContextValue {
  show: (message: string, type?: ToastType, options?: ToastOptions) => void
  hide: () => void
}

// ─────────────────────────────────────────────────────────────────
// LoadingContext
// ─────────────────────────────────────────────────────────────────

export interface LoadingContextValue {
  isLoading: boolean
  loadingMessage: string
  setLoading: (loading: boolean, message?: string) => void
  startLoading: (message?: string) => void
  stopLoading: () => void
  setLoadingMessage: (message: string) => void
}

// ─────────────────────────────────────────────────────────────────
// DisplayContext
// ─────────────────────────────────────────────────────────────────

export interface DisplayContextValue {
  showTrain: boolean
  setShowTrain: (show: boolean) => void
  showAutre: boolean
  setShowAutre: (show: boolean) => void
  showRecompense: boolean
  setShowRecompense: (show: boolean) => void
  loading: boolean
  isVisitor: boolean
}

// ─────────────────────────────────────────────────────────────────
// RBAC (useRBAC hook)
// ─────────────────────────────────────────────────────────────────

export interface RBACValue extends PermissionsContextValue {
  isFree: boolean
  isSubscriber: boolean
  quotas: Record<string, { limit: number; period: string }>
  usage: Record<string, number>
  canCreate: (contentType: QuotaType) => boolean
  canCreateTask: () => boolean
  canCreateReward: () => boolean
  canCreateCategory: () => boolean
  getQuotaInfo: (contentType: QuotaType) => QuotaInfo | null
  getMonthlyQuotaInfo: (contentType: QuotaType) => QuotaInfo | null
  refreshQuotas: () => void
}
