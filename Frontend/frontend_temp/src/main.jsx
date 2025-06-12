// src/main.jsx
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
import '@/i18n/i18n' // 🌍 Initialisation i18n :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
import '@/styles/main.scss' // 🎨 Styles globaux

// Lazy-loaded pages
const Tableau = lazy(() => import('@/pages/tableau/Tableau'))
const Edition = lazy(() => import('@/pages/edition/Edition'))
const NotFound = lazy(() => import('@/pages/notfound/NotFound'))

// Définition des routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '', element: <Tableau /> },
      { path: 'edition', element: <Edition /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

// Rendu de l’application avec Suspense pour l’indicateur de chargement
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div>Chargement…</div>}>
      <RouterProvider router={router} />
    </Suspense>
  </React.StrictMode>
)
