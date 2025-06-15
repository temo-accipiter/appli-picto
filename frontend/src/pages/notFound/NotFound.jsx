import './NotFound.scss'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>Oups ! La page que vous cherchez est introuvable.</p>
      <Link to="/">Retour à l&apos;accueil</Link>
    </div>
  )
}
