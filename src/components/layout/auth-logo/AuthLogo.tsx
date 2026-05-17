import Image from 'next/image'
import Link from 'next/link'
import './AuthLogo.scss'

/**
 * AuthLogo — Logo Appli-Picto cliquable pour les pages d'authentification
 *
 * Contexte : pages login, signup, forgot-password, reset-password.
 * Destination : /edition (accessible à tous, Visitor inclus).
 *
 * Swap dark mode CSS (sans JS, sans flash) :
 * - Light → logo-vertical.svg (symbole + texte empilés, fond clair)
 * - Dark  → logo-vertical-dark.svg (mêmes proportions, texte clair)
 *
 * ♿ alt="" : décoratif — le label accessible est sur le <Link> parent (aria-label)
 * ♿ Server Component : pas de 'use client' (aucun état, aucune interactivité JS)
 */
export default function AuthLogo() {
  return (
    <Link
      href="/edition"
      className="auth-logo"
      aria-label="Appli-Picto — aller à l'édition"
    >
      <Image
        src="/brand/logo-vertical.svg"
        alt=""
        width={228}
        height={122}
        className="auth-logo__image auth-logo__image--light"
        priority
      />
      <Image
        src="/brand/logo-vertical-dark.svg"
        alt=""
        width={228}
        height={122}
        className="auth-logo__image auth-logo__image--dark"
        priority
      />
    </Link>
  )
}
