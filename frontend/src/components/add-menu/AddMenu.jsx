import PropTypes from 'prop-types'
import './AddMenu.scss'

export default function AddMenu({
  onOpenTask,
  onOpenReward,
  onOpenCategories,
}) {
  const handleChange = (e) => {
    const { value } = e.target
    if (value === 'task') onOpenTask?.()
    if (value === 'reward') onOpenReward?.()
    if (value === 'categories') onOpenCategories?.()
    e.target.selectedIndex = 0
  }

  return (
    <select className="add-menu" onChange={handleChange} defaultValue="">
      <option value="" disabled>
        Ajout
      </option>
      <option value="task">Ajouter une tâche</option>
      <option value="reward">Ajouter une récompense</option>
      <option value="categories">Gérer les catégories</option>
    </select>
  )
}

AddMenu.propTypes = {
  onOpenTask: PropTypes.func.isRequired,
  onOpenReward: PropTypes.func.isRequired,
  onOpenCategories: PropTypes.func.isRequired,
}
