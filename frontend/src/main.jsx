// src/main.jsx
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Layout from '@/components/layout/Layout'
import '@/i18n/i18n' // 🌍 Initialisation i18n
import '@/styles/main.scss' // 🎨 Styles globaux

// Lazy-loaded pages
const Tableau = lazy(() => import('@/pages/tableau/Tableau'))
const Edition = lazy(() => import('@/pages/edition/Edition'))
const NotFound = lazy(() => import('@/pages/notfound/NotFound'))

// Définition des routes
function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Tableau />} />
          <Route path="edition" element={<Edition />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

// Rendu de l’application avec Suspense pour l’indicateur de chargement
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div>Chargement…</div>}>
      <AppRoutes />
    </Suspense>
  </React.StrictMode>
)
