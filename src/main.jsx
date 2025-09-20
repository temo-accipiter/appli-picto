// src/main.jsx
import { Layout, Loader, ProtectedRoute } from '@/components'
import {
    AuthProvider,
    DisplayProvider,
    PermissionsProvider,
    ToastProvider,
} from '@/contexts'
import '@/i18n/i18n'
import '@/styles/main.scss'
import { supabase } from '@/utils'
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// ⬇️ Pont consentement ↔ trackers (charge GA4 uniquement si analytics=true)
import { setupConsentBridges } from '@/analytics'
import '@/analytics/routePageViews'
import '@/analytics/userProps'

// Initialisation des ponts consentement
if (typeof window !== 'undefined') {
  setupConsentBridges()
  // Helpers de test dans la console (check GA4, etc.)
  window.testLegalCompliance = {
    testConfig: async () => {
      const { testLegalConfiguration } = await import('@/utils/testLegalConfig')
      return testLegalConfiguration()
    },
    testRGPD: async () => {
      const { testRGPDCompliance } = await import('@/utils/testLegalConfig')
      return testRGPDCompliance()
    },
    checkGA4: async () => {
      const { getGA4ComplianceStatus } = await import('@/analytics')
      return getGA4ComplianceStatus()
    },
    testDocuments: async () => {
      const { testDocumentPlaceholders } = await import(
        '@/utils/testLegalConfig'
      )
      const {
        MENTIONS_LEGALES_MD,
        CGU_MD,
        CGV_MD,
        POLITIQUE_CONFIDENTIALITE_MD,
        POLITIQUE_COOKIES_MD,
      } = await import('@/assets')
      const docs = [
        { name: 'Mentions légales', content: MENTIONS_LEGALES_MD },
        { name: 'CGU', content: CGU_MD },
        { name: 'CGV', content: CGV_MD },
        {
          name: 'Politique de confidentialité',
          content: POLITIQUE_CONFIDENTIALITE_MD,
        },
        { name: 'Politique de cookies', content: POLITIQUE_COOKIES_MD },
      ]
      return docs.map(d => ({
        name: d.name,
        result: testDocumentPlaceholders(d.content, d.name),
      }))
    },
    help: () => {
      console.log(`
🧪 FONCTIONS : testLegalCompliance.testConfig() / testRGPD() / checkGA4() / testDocuments()
`)
    },
  }
  window.env = {
    GA4_ID: import.meta.env.VITE_GA4_ID,
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    APP_ENV: import.meta.env.VITE_APP_ENV,
    APP_URL: import.meta.env.VITE_APP_URL,
  }
  if (import.meta.env.DEV) {
    console.log('🧪 testLegalCompliance.help() • 🌍 env')
  }
}

// Redirections/cleanups auth
if (
  typeof window !== 'undefined' &&
  window.location.hash.includes('type=recovery')
) {
  const hash = window.location.hash
  const redirectTo = '/reset-password' + hash
  window.history.replaceState({}, '', redirectTo)
}
if (
  typeof window !== 'undefined' &&
  window.location.pathname === '/login' &&
  window.location.hash.includes('access_token')
) {
  console.warn('🔐 Suppression session automatique après confirmation email')
  supabase.auth.signOut().then(() => {
    const cleanUrl = `${window.location.origin}/login`
    window.location.replace(cleanUrl)
  })
}

// Pages lazy-loaded
import {
    Abonnement,
    Accessibilite,
    AdminPermissions,
    CGU,
    CGV,
    Edition,
    ForgotPassword,
    HomeRedirect,
    Login,
    Logs,
    MentionsLegales,
    NotFound,
    PolitiqueConfidentialite,
    PolitiqueCookies,
    PortailRGPD,
    Profil,
    ResetPassword,
    Signup,
    Tableau,
} from '@/pages'

// ✅ Routes : on place aussi login/signup/forgot/reset SOUS Layout
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />, // Layout rend Footer + CookieBanner + CookiePreferences
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'tableau', element: <Tableau /> },
      {
        path: 'edition',
        element: (
          <ProtectedRoute>
            <Edition />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profil',
        element: (
          <ProtectedRoute>
            <Profil />
          </ProtectedRoute>
        ),
      },
      {
        path: 'abonnement',
        element: (
          <ProtectedRoute>
            <Abonnement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/logs',
        element: (
          <ProtectedRoute>
            <Logs />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/permissions',
        element: (
          <ProtectedRoute>
            <AdminPermissions />
          </ProtectedRoute>
        ),
      },

      // 🔽 Déplacées ici pour afficher la bannière sur /login & co
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },

      // Pages légales (conformes aux liens du Footer)
      { path: 'mentions-legales', element: <MentionsLegales /> },
      { path: 'cgu', element: <CGU /> },
      { path: 'cgv', element: <CGV /> },
      {
        path: 'politique-confidentialite',
        element: <PolitiqueConfidentialite />,
      },
      { path: 'politique-cookies', element: <PolitiqueCookies /> },
      { path: 'accessibilite', element: <Accessibilite /> },
      { path: 'rgpd', element: <PortailRGPD /> },

      { path: '*', element: <NotFound /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PermissionsProvider>
        <DisplayProvider>
          <ToastProvider>
            <Suspense fallback={<Loader />}>
              <RouterProvider router={router} />
            </Suspense>
          </ToastProvider>
        </DisplayProvider>
      </PermissionsProvider>
    </AuthProvider>
  </React.StrictMode>
)
