import { lazy } from 'react'

export const Tableau = lazy(() => import('./tableau/Tableau'))
export const Edition = lazy(() => import('./edition/Edition'))
export const Login = lazy(() => import('./login/Login'))
export const Signup = lazy(() => import('./signup/Signup'))
export const Profil = lazy(() => import('./profil/Profil'))
export const ResetPassword = lazy(
  () => import('./reset-password/ResetPassword')
)
export const ForgotPassword = lazy(
  () => import('./forgot-password/ForgotPassword')
)
export const NotFound = lazy(() => import('./not-found/NotFound'))
