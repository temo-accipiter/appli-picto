import Image from 'next/image'
import './NavbarLogoIcon.scss'

/**
 * NavbarLogoIcon — Logo Appli-Picto avec auto-swap selon contexte
 *
 * Auto-swap CSS (sans JS, sans flash) :
 * - Mobile (< 1024px) + light  → logo-app-icon.svg (icône compacte)
 * - Desktop (≥ 1024px) + light → logo-principal.svg (logo horizontal complet)
 * - Dark mode (tous écrans)    → logo-dark.svg (texte adapté au fond sombre)
 *
 * ♿ alt="" : décoratif — le label accessible est sur le <Link> parent (aria-label)
 */
export default function NavbarLogoIcon() {
  return (
    <span className="navbar-logo-icon">
      <Image
        src="/brand/logo-app-icon.svg"
        alt=""
        width={72}
        height={16}
        className="navbar-logo-icon__app-icon"
        priority
      />
      <Image
        src="/brand/logo-principal.svg"
        alt=""
        width={130}
        height={14}
        className="navbar-logo-icon__principal"
        priority
      />
      <Image
        src="/brand/logo-dark.svg"
        alt=""
        width={130}
        height={14}
        className="navbar-logo-icon__dark"
        priority
      />
    </span>
  )
}
