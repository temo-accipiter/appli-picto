import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Layout, Loader, ProtectedRoute } from '@/components'
import { ToastProvider, DisplayProvider, AuthProvider } from '@/contexts'
import { supabase } from '@/utils'
import '@/i18n/i18n'
import '@/styles/main.scss'

// ✅ Redirection automatique vers reset-password si lien reçu par mail
if (
  typeof window !== 'undefined' &&
  window.location.hash.includes('type=recovery')
) {
  const hash = window.location.hash
  const redirectTo = '/reset-password' + hash
  window.history.replaceState({}, '', redirectTo)
}

// ✅ Déconnexion forcée après confirmation e-mail
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
  Tableau,
  Edition,
  Login,
  Signup,
  Profil,
  Abonnement,
  Logs,
  ResetPassword,
  ForgotPassword,
  NotFound,
  MentionsLegales,
  CGU,
  CGV,
  PolitiqueConfidentialite,
  PolitiqueCookies,
  Accessibilite,
  PortailRGPD,
} from '@/pages'

// Définition des routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/tableau" replace /> },
      { path: 'tableau', element: <Tableau /> },
      {
        path: 'edition',
        element: (
          <ProtectedRoute>
            <Edition />
          </ProtectedRoute>
        ),
      },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'profil', element: <Profil /> },
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
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: '*', element: <NotFound /> },
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
    ],
  },
])

// 💡 Initialisation React
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<Loader />}>
          <DisplayProvider>
            <RouterProvider router={router} />
          </DisplayProvider>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
)
