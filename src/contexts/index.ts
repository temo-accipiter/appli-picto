// src/contexts/index.ts
export { AuthContext, AuthProvider } from './AuthContext'
export { DisplayContext, DisplayProvider, useDisplay } from './DisplayContext'
export { ToastContext, ToastProvider, useToast } from './ToastContext'
export { LoadingContext, LoadingProvider, useLoading } from './LoadingContext'

// ⚠️ STUB TEMPORAIRE pour S2+ (Admin + Metrics)
export {
  PermissionsContext,
  PermissionsProvider,
  usePermissions,
} from './PermissionsContext.stub'
