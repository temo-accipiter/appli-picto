import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware Next.js pour la protection des routes authentifiées
 *
 * Routes protégées :
 * - /profil
 * - /edition
 * - /abonnement
 * - /admin/*
 */
export function middleware(request: NextRequest) {
  // Récupérer les cookies Supabase pour vérifier l'auth
  const supabaseAuthToken = request.cookies.get('sb-access-token')
  const supabaseRefreshToken = request.cookies.get('sb-refresh-token')

  // Alternative: chercher dans les cookies avec le pattern sb-*-auth-token
  const allCookies = request.cookies.getAll()
  const hasSupabaseAuth = allCookies.some(
    cookie => cookie.name.includes('sb-') && cookie.name.includes('auth-token')
  )

  const isAuthenticated = !!(
    supabaseAuthToken ||
    supabaseRefreshToken ||
    hasSupabaseAuth
  )

  // Si non authentifié, rediriger vers /login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    // Stocker l'URL d'origine pour redirection après login
    loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

/**
 * Configuration du matcher : routes à protéger
 */
export const config = {
  matcher: [
    '/profil/:path*',
    '/edition/:path*',
    '/abonnement/:path*',
    '/admin/:path*',
  ],
}
