import { useState } from 'react'
import {
  useTachesEdition,
  useRecompenses,
  useParametres,
  useCategories,
} from '@/hooks'
import {
  Button,
  Checkbox,
  ModalConfirm,
  ModalCategory,
  TachesEdition,
  RecompensesEdition,
} from '@/components'
import { addRecompense } from '@/utils'
import { useToast } from '@/contexts/ToastContext'
import { ChevronDown, ListChecks, Gift } from 'lucide-react'
import './Edition.scss'

export default function Edition() {
  const { show } = useToast()

  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [catASupprimer, setCatASupprimer] = useState(null)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [recompenseASupprimer, setRecompenseASupprimer] = useState(null)
  const [tacheASupprimer, setTacheASupprimer] = useState(null)
  const [reload, setReload] = useState(0)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDone, setFilterDone] = useState(false)
  const [showTaches, setShowTaches] = useState(false)
  const [showRecompenses, setShowRecompenses] = useState(false)

  const triggerReload = () => setReload((r) => r + 1)

  const { categories, addCategory, deleteCategory } = useCategories(reload)
  const { parametres, updateParametres } = useParametres()
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
    show('Tâche ajoutée', 'success') // ✅
  }

  const handleSubmitReward = async ({ label, image }) => {
    const form = new FormData()
    form.append('label', label)
    form.append('image', image)
    await addRecompense(form)
    handleRecompenseAjoutee()
    show('Récompense ajoutée', 'success') // ✅
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    const clean = newCatLabel.trim().replace(/\s+/g, ' ')
    if (!clean) return
    const slug = clean.toLowerCase().replace(/ /g, '-')
    await addCategory({ value: slug, label: clean })
    setNewCatLabel('')
    triggerReload()
    show('Catégorie ajoutée', 'success') // ✅
  }

  const handleRemoveCategory = async (value) => {
    await deleteCategory(value)
    triggerReload()
    setCatASupprimer(null)
    show('Catégorie supprimée', 'error') // ✅
  }

  const toggleSelectRecompense = (id, sel) =>
    sel ? deselectAll() : selectRecompense(id)

  const visibleTaches = taches.filter((t) => {
    const catMatch =
      filterCategory === 'all' || (t.categorie || 'none') === filterCategory
    const doneMatch = !filterDone || !!t.aujourdhui
    return catMatch && doneMatch
  })

  return (
    <div className="page-edition">
      <div className="edition-buttons">
        {parametres && (
          <Checkbox
            id="confettis"
            className="confettis-checkbox"
            label={
              parametres.confettis
                ? '🎉 Confettis activés'
                : '🎊 Confettis désactivés'
            }
            checked={!!parametres.confettis}
            onChange={(e) => updateParametres({ confettis: e.target.checked })}
          />
        )}
      </div>
      <div className="edition-sections">
        <Button
          label={
            <span className="button-label">
              <ListChecks className="button-icon" size={18} />
              Tâches
              <ChevronDown
                className={`chevron ${showTaches ? 'open' : ''}`}
                size={16}
              />
            </span>
          }
          onClick={() => setShowTaches((prev) => !prev)}
        />

        {showTaches && (
          <div className="taches-edition">
            {visibleTaches.length === 0 ? (
              <p className="taches-edition__message">
                Aucune tâche à afficher.
              </p>
            ) : (
              <TachesEdition
                items={visibleTaches}
                categories={categories}
                onToggleAujourdhui={toggleAujourdhui}
                resetEdition={resetEdition}
                onSubmitTask={handleSubmitTask}
                onAddCategory={addCategory}
                onDeleteCategory={deleteCategory}
                filterCategory={filterCategory}
                onChangeFilterCategory={setFilterCategory}
                filterDone={filterDone}
                onChangeFilterDone={setFilterDone}
                onUpdateLabel={(id, label) => {
                  updateLabel(id, label)
                  show('Tâche renommée', 'success') // ✅
                }}
                onUpdateCategorie={updateCategorie}
                onDelete={(t) => setTacheASupprimer(t)}
              />
            )}
          </div>
        )}

        <Button
          label={
            <span className="button-label">
              <Gift className="button-icon" size={18} />
              Récompenses
              <ChevronDown
                className={`chevron ${showRecompenses ? 'open' : ''}`}
                size={16}
              />
            </span>
          }
          onClick={() => setShowRecompenses((prev) => !prev)}
        />
        {showRecompenses && (
          <div className="recompenses-edition">
            {recompenses.length === 0 ? (
              <p className="recompenses-edition__message">
                Aucune récompense à afficher.
              </p>
            ) : (
              <RecompensesEdition
                items={recompenses}
                onDelete={(r) => setRecompenseASupprimer(r)}
                onToggleSelect={toggleSelectRecompense}
                onSubmitReward={handleSubmitReward}
              />
            )}
          </div>
        )}
      </div>

      <ModalConfirm
        isOpen={!!recompenseASupprimer}
        onClose={() => setRecompenseASupprimer(null)}
        confirmLabel="Supprimer"
        onConfirm={() => {
          deleteRecompense(recompenseASupprimer.id)
          show('Récompense supprimée', 'error') // ✅
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
          show('Tâche supprimée', 'error') // ✅
          setTacheASupprimer(null)
        }}
      >
        ❗ Supprimer la tâche “{tacheASupprimer?.label}” ?
      </ModalConfirm>

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
