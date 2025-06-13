/**
 * Page : Édition
 *
 * Rôle :
 *   Gère l’édition des tâches et des récompenses.
 *   • Affiche deux listes contrôlées : tâches et récompenses.
 *   • Ouvre les modals d’ajout.
 *
 */

// src/components/Edition.jsx
import { useState } from 'react'
import ChecklistTachesEdition from '@/components/checklist/taches-edition/ChecklistTachesEdition'
import ChecklistRecompensesEdition from '@/components/checklist/recompenses-edition/ChecklistRecompensesEdition'
import useTachesEdition from '@/hooks/useTachesEdition'
import useRecompenses from '@/hooks/useRecompenses'
import useParametres from '@/hooks/useParametres'
import useCategories from '@/hooks/useCategories'
import Button from '@/components/button/Button'
import Select from '@/components/fields/select/Select'
import Checkbox from '@/components/fields/checkbox/Checkbox'
import Modal from '@/components/modal/Modal'
import Input from '@/components/fields/input/Input'
import ItemForm from '@/components/forms/ItemForm'
import { addRecompense } from '@/utils/api'
import DropdownAjout from '@/components/dropdownAjout/DropdownAjout'
import './Edition.scss'

export default function Edition() {
  // États modals & reload
  const [modalTacheOpen, setModalTacheOpen] = useState(false)
  const [modalRecompenseOpen, setModalRecompenseOpen] = useState(false)
  const [showConfirmReset, setShowConfirmReset] = useState(false)

  // Gestion catégories
  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [catASupprimer, setCatASupprimer] = useState(null)
  const [newCatLabel, setNewCatLabel] = useState('')

  // Suppression/sélection tâches & récompenses
  const [recompenseASupprimer, setRecompenseASupprimer] = useState(null)
  const [tacheASupprimer, setTacheASupprimer] = useState(null)

  const [reload, setReload] = useState(0)
  const triggerReload = () => setReload((r) => r + 1)

  // Filtres
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDone, setFilterDone] = useState(false)

  // Hooks métier
  const { categories, addCategory, deleteCategory } = useCategories(reload) // removed loadingCat
  const {
    parametres,
    updateParametres,
    loading: loadingParam,
  } = useParametres()
  const {
    taches,
    toggleAujourdhui,
    updateLabel,
    updateCategorie,
    deleteTache,
    resetEdition,
  } = useTachesEdition(reload)
  const { recompenses, selectRecompense, deselectAll, deleteRecompense } =
    useRecompenses(reload)

  // Actions
  const handleTacheAjoutee = () => triggerReload()
  const handleRecompenseAjoutee = () => triggerReload()

  const handleSubmitTask = async ({ label, categorie, image }) => {
    const form = new FormData()
    form.append('label', label)
    form.append('categorie', categorie)
    form.append('image', image)
    const res = await fetch('http://localhost:3001/taches', {
      method: 'POST',
      body: form,
    })
    if (!res.ok) throw new Error('Échec ajout tâche')
    await res.json()
    handleTacheAjoutee()
    setModalTacheOpen(false)
  }

  const handleSubmitReward = async ({ label, image }) => {
    const form = new FormData()
    form.append('label', label)
    form.append('image', image)
    await addRecompense(form)
    handleRecompenseAjoutee()
    setModalRecompenseOpen(false)
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    const clean = newCatLabel.trim().replace(/\s+/g, ' ')
    if (!clean) return
    const slug = clean.toLowerCase().replace(/ /g, '-')
    await addCategory({ value: slug, label: clean })
    setNewCatLabel('')
    triggerReload()
  }

  const handleRemoveCategory = async (value) => {
    await deleteCategory(value)
    triggerReload()
    setCatASupprimer(null)
  }

  const toggleSelectRecompense = (id, sel) =>
    sel ? deselectAll() : selectRecompense(id)

  // Filtrer les tâches
  const visibleTaches = taches.filter((t) => {
    const catMatch =
      filterCategory === 'all' || (t.categorie || 'none') === filterCategory
    const doneMatch = !filterDone || !!t.aujourdhui
    return catMatch && doneMatch
  })

  return (
    <div className="page-edition">
      <h1>🛠️ Édition</h1>

      <div className="edition-buttons">
        <DropdownAjout
          setModalTacheOpen={setModalTacheOpen}
          setModalRecompenseOpen={setModalRecompenseOpen}
          setManageCatOpen={setManageCatOpen}
        />

        <Select
          id="filter-category"
          label="Filtrer par catégorie"
          options={[{ value: 'all', label: 'Toutes' }, ...categories]}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        />

        <Checkbox
          id="filter-done"
          label="Tâches cochées seulement"
          checked={filterDone}
          onChange={(e) => setFilterDone(e.target.checked)}
        />

        {!loadingParam && (
          <Checkbox
            id="confettis"
            className="confettis-checkbox"
            label={
              parametres.confettis
                ? '🎉 Confettis activés'
                : '🎊 Confettis désactivés'
            }
            checked={parametres.confettis}
            onChange={(e) => updateParametres({ confettis: e.target.checked })}
          />
        )}

        <Button
          label="♻️ Réinitialiser"
          variant="reset"
          onClick={() => setShowConfirmReset(true)}
        />
      </div>

      <ChecklistTachesEdition
        items={visibleTaches}
        categories={categories}
        onToggleAujourdhui={toggleAujourdhui}
        onUpdateLabel={updateLabel}
        onUpdateCategorie={updateCategorie}
        onDelete={(t) => setTacheASupprimer(t)}
      />

      <ChecklistRecompensesEdition
        items={recompenses}
        onDelete={(r) => setRecompenseASupprimer(r)}
        onToggleSelect={toggleSelectRecompense}
      />

      {/* Modals */}
      <Modal
        isOpen={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        actions={[
          { label: 'Annuler', onClick: () => setShowConfirmReset(false) },
          {
            label: 'Confirmer',
            variant: 'primary',
            onClick: () => {
              resetEdition()
              setShowConfirmReset(false)
            },
          },
        ]}
      >
        <p>❗ Es-tu sûr de vouloir tout réinitialiser ?</p>
      </Modal>

      <Modal
        isOpen={!!recompenseASupprimer}
        onClose={() => setRecompenseASupprimer(null)}
        actions={[
          { label: 'Annuler', onClick: () => setRecompenseASupprimer(null) },
          {
            label: 'Supprimer',
            variant: 'primary',
            onClick: () => {
              deleteRecompense(recompenseASupprimer.id)
              setRecompenseASupprimer(null)
            },
          },
        ]}
      >
        <p>❗ Supprimer la récompense “{recompenseASupprimer?.label}” ?</p>
      </Modal>

      <Modal
        isOpen={!!tacheASupprimer}
        onClose={() => setTacheASupprimer(null)}
        actions={[
          { label: 'Annuler', onClick: () => setTacheASupprimer(null) },
          {
            label: 'Supprimer',
            variant: 'primary',
            onClick: () => {
              deleteTache(tacheASupprimer.id)
              setTacheASupprimer(null)
            },
          },
        ]}
      >
        <p>❗ Supprimer la tâche “{tacheASupprimer?.label}” ?</p>
      </Modal>

      <Modal
        isOpen={modalTacheOpen}
        onClose={() => setModalTacheOpen(false)}
        actions={[]}
      >
        <ItemForm
          includeCategory
          categories={categories}
          onSubmit={handleSubmitTask}
        />
      </Modal>

      <Modal
        isOpen={modalRecompenseOpen}
        onClose={() => setModalRecompenseOpen(false)}
        actions={[]}
      >
        <ItemForm includeCategory={false} onSubmit={handleSubmitReward} />
      </Modal>

      <Modal
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        title="Gérer les catégories"
        actions={[]}
      >
        <ul className="category-list">
          {categories
            .filter((c) => c.value !== 'none')
            .map((cat) => (
              <li key={cat.value} className="category-list__item">
                {cat.label}
                <button
                  className="category-list__delete-btn"
                  onClick={() => setCatASupprimer(cat.value)}
                  aria-label={`Supprimer la catégorie ${cat.label}`}
                >
                  🗑️
                </button>
              </li>
            ))}
        </ul>
        <form className="category-form" onSubmit={handleAddCategory}>
          <Input
            id="new-category"
            label="Nouvelle catégorie"
            value={newCatLabel}
            onChange={(e) => setNewCatLabel(e.target.value)}
          />
          <Button variant="primary" label="Ajouter" type="submit" />
        </form>
      </Modal>

      <Modal
        isOpen={!!catASupprimer}
        onClose={() => setCatASupprimer(null)}
        actions={[
          { label: 'Annuler', onClick: () => setCatASupprimer(null) },
          {
            label: 'Supprimer',
            variant: 'primary',
            onClick: () => handleRemoveCategory(catASupprimer),
          },
        ]}
      >
        <p>
          ❗ Supprimer la catégorie “
          {categories.find((c) => c.value === catASupprimer)?.label}” ?
          <br />
          Les tâches associées seront réattribuées à “Pas de catégorie”.
        </p>
      </Modal>
    </div>
  )
}
