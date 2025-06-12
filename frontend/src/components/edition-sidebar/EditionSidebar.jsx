import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import Button from '@/components/button/Button'
import './EditionSidebar.scss'

export default function EditionSidebar({ onAddTask }) {
  return (
    <aside className="edition-sidebar">
      <h2 className="edition-sidebar__title">Édition</h2>
      <Button
        label="➕ Ajouter une tâche"
        variant="primary"
        onClick={onAddTask}
      />
      <Link className="edition-sidebar__link" to="/">
        ← Retour au Tableau
      </Link>
    </aside>
  )
}

EditionSidebar.propTypes = {
  onAddTask: PropTypes.func.isRequired,
}
