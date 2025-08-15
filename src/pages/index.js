import { lazy } from 'react'

export const Tableau = lazy(() => import('./tableau/Tableau'))
export const Edition = lazy(() => import('./edition/Edition'))
export const Login = lazy(() => import('./login/Login'))
export const Signup = lazy(() => import('./signup/Signup'))
export const Profil = lazy(() => import('./profil/Profil'))
export const Abonnement = lazy(() => import('./abonnement/Abonnement'))
export const Logs = lazy(() => import('./admin/logs/Logs'))
export const ResetPassword = lazy(
  () => import('./reset-password/ResetPassword')
)
export const ForgotPassword = lazy(
  () => import('./forgot-password/ForgotPassword')
)
export const NotFound = lazy(() => import('./not-found/NotFound'))
// Pages légales
export const MentionsLegales = lazy(() => import('./legal/MentionsLegales'))
export const CGU = lazy(() => import('./legal/CGU'))
export const PolitiqueConfidentialite = lazy(
  () => import('./legal/PolitiqueConfidentialite')
)
export const PolitiqueCookies = lazy(() => import('./legal/PolitiqueCookies'))
export const CGV = lazy(() => import('./legal/CGV'))
export const Accessibilite = lazy(() => import('./legal/Accessibilite'))
export const PortailRGPD = lazy(() => import('./legal/rgpd/PortailRGPD'))
