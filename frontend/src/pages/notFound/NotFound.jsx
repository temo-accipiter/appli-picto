/**
 * Page : NotFound
 *
 * Rôle :
 *   Affiche la page 404 lorsqu’une route n’existe pas.
 *   • Message indiquant que la page est introuvable.
 *   • Lien de retour à l’accueil.
 *
 * Bibliothèques utilisées :
 *   • Link (react-router-dom) – navigation vers la page d’accueil
 *
 * Props :
 *   (aucune)
 */

import './NotFound.scss'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Oups ! La page que vous cherchez est introuvable.</p>
      <Link to="/tableau">Retour à l&apos;accueil</Link>
    </div>
  )
}
