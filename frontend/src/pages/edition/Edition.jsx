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
import {
  useTachesEdition,
  useRecompenses,
  useParametres,
  useCategories,
} from '@/hooks'
import {
  Button,
  Select,
  Checkbox,
  ModalConfirm,
  ModalCategory,
  ModalAjout,
  Input,
  TachesEdition,
  RecompensesEdition,
} from '@/components'
import { addRecompense } from '@/utils'
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
        <Button
          label="➕ Ajouter une tâche"
          variant="primary"
          onClick={() => setModalTacheOpen(true)}
        />
        <Button
          label="🏱 Ajouter une récompense"
          variant="primary"
          onClick={() => setModalRecompenseOpen(true)}
        />
        <Button
          label="⚙️ Gérer catégories"
          variant="secondary"
          onClick={() => setManageCatOpen(true)}
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
            checked={parametres?.confettis}
            onChange={(e) => updateParametres({ confettis: e.target.checked })}
          />
        )}

        <Button
          label="♻️ Réinitialiser"
          variant="reset"
          onClick={() => setShowConfirmReset(true)}
        />
      </div>

      <TachesEdition
        items={visibleTaches}
        categories={categories}
        onToggleAujourdhui={toggleAujourdhui}
        onUpdateLabel={updateLabel}
        onUpdateCategorie={updateCategorie}
        onDelete={(t) => setTacheASupprimer(t)}
      />

      <RecompensesEdition
        items={recompenses}
        onDelete={(r) => setRecompenseASupprimer(r)}
        onToggleSelect={toggleSelectRecompense}
      />

      {/* Modals */}
      <ModalConfirm
        isOpen={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        onConfirm={() => {
          resetEdition()
          setShowConfirmReset(false)
        }}
      >
        ❗ Es-tu sûr de vouloir tout réinitialiser ?
      </ModalConfirm>

      <ModalConfirm
        isOpen={!!recompenseASupprimer}
        onClose={() => setRecompenseASupprimer(null)}
        confirmLabel="Supprimer"
        onConfirm={() => {
          deleteRecompense(recompenseASupprimer.id)
          setRecompenseASupprimer(null)
        }}
      >
        ❗ Supprimer la récompense “{recompenseASupprimer?.label}” ?
      </ModalConfirm>

      <ModalConfirm
        isOpen={!!tacheASupprimer}
        onClose={() => setTacheASupprimer(null)}
        confirmLabel="Supprimer"
        onConfirm={() => {
          deleteTache(tacheASupprimer.id)
          setTacheASupprimer(null)
        }}
      >
        ❗ Supprimer la tâche “{tacheASupprimer?.label}” ?
      </ModalConfirm>

      <ModalAjout
        isOpen={modalTacheOpen}
        onClose={() => setModalTacheOpen(false)}
        includeCategory
        categories={categories}
        onSubmit={handleSubmitTask}
      />

      <ModalAjout
        isOpen={modalRecompenseOpen}
        onClose={() => setModalRecompenseOpen(false)}
        includeCategory={false}
        onSubmit={handleSubmitReward}
      />

      <ModalCategory
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories}
        onDeleteCategory={(value) => setCatASupprimer(value)}
        onAddCategory={handleAddCategory}
        newCategory={newCatLabel}
        onChangeNewCategory={setNewCatLabel}
      />

      <ModalConfirm
        isOpen={!!catASupprimer}
        onClose={() => setCatASupprimer(null)}
        confirmLabel="Supprimer"
        onConfirm={() => handleRemoveCategory(catASupprimer)}
      >
        <>
          ❗ Supprimer la catégorie “
          {categories.find((c) => c.value === catASupprimer)?.label}” ?
          <br />
          Les tâches associées seront réattribuées à “Pas de catégorie”.
        </>
      </ModalConfirm>
    </div>
  )
}
