'use client'

import ErrorBoundary from '@/components/shared/error-boundary/ErrorBoundary'
import WebVitals from '@/components/shared/web-vitals/WebVitals'
import { AuthProvider } from '@/contexts/AuthContext'
import { PermissionsProvider } from '@/contexts/PermissionsContext'
import { DisplayProvider } from '@/contexts/DisplayContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { ToastProvider } from '@/contexts/ToastContext'
import InitializationLoader from '@/components/shared/initialization-loader/InitializationLoader'
import { Suspense } from 'react'
import Loader from '@/components/ui/loader/Loader'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <WebVitals />
      <AuthProvider>
        <PermissionsProvider>
          <DisplayProvider>
            <LoadingProvider>
              <ToastProvider>
                <InitializationLoader>
                  <Suspense fallback={<Loader />}>
                    {children}
                  </Suspense>
                </InitializationLoader>
              </ToastProvider>
            </LoadingProvider>
          </DisplayProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
