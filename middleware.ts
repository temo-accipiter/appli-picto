import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_request: NextRequest) {
  // 🚧 KILL SWITCH : ON COUPE LE VIGILE POUR L'AUDIT UX
  return NextResponse.next()

  /*
  --- TOUT CE CODE EST MIS EN COMMENTAIRE POUR ÉVITER L'ERREUR VERCEL ---
  
  const supabaseAuthToken = request.cookies.get('sb-access-token')
  const supabaseRefreshToken = request.cookies.get('sb-refresh-token')

  const allCookies = request.cookies.getAll()
  const hasSupabaseAuth = allCookies.some(
    cookie => cookie.name.includes('sb-') && cookie.name.includes('auth-token')
  )

  const isAuthenticated = !!(
    supabaseAuthToken ||
    supabaseRefreshToken ||
    hasSupabaseAuth
  )

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  */
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
