// src/contexts/index.ts
export { AuthContext, AuthProvider } from './AuthContext'
export {
  ChildProfileContext,
  ChildProfileProvider,
  useChildProfile,
} from './ChildProfileContext'
export { DisplayContext, DisplayProvider, useDisplay } from './DisplayContext'
export { ToastContext, ToastProvider, useToast } from './ToastContext'
export { LoadingContext, LoadingProvider, useLoading } from './LoadingContext'
// S8 — Offline + Sync
export { OfflineContext, OfflineProvider, useOffline } from './OfflineContext'
