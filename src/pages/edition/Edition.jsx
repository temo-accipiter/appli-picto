/*
import { useState, useEffect } from 'react'
import { supabase } from '@/utils'
import { compressImageIfNeeded } from '@/utils'
import {
  useTachesEdition,
  useRecompenses,
  useParametres,
  useCategories,
  useAuth,
} from '@/hooks'
import {
  Button,
  Checkbox,
  ModalConfirm,
  ModalCategory,
  TachesEdition,
  RecompensesEdition,
  Separator,
} from '@/components'
import { useDisplay, useToast } from '@/contexts'
import { ChevronDown, ListChecks, Gift } from 'lucide-react'
import './Edition.scss'

export default function Edition() {
  const { show } = useToast()
  const { user } = useAuth()

  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [catASupprimer, setCatASupprimer] = useState(null)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [recompenseASupprimer, setRecompenseASupprimer] = useState(null)
  const [tacheASupprimer, setTacheASupprimer] = useState(null)
  const [reload, setReload] = useState(0)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDone, setFilterDone] = useState(false)
  const [showTaches, setShowTaches] = useState(
    () => sessionStorage.getItem('showTaches') === 'true'
  )
  const [showRecompenses, setShowRecompenses] = useState(
    () => sessionStorage.getItem('showRecompenses') === 'true'
  )

  useEffect(() => {
    sessionStorage.setItem('showTaches', showTaches)
  }, [showTaches])

  useEffect(() => {
    sessionStorage.setItem('showRecompenses', showRecompenses)
  }, [showRecompenses])

  const triggerReload = () => setReload(r => r + 1)

  const { categories, addCategory, deleteCategory } = useCategories(reload)
  const { parametres, updateParametres } = useParametres()
  const {
    taches,
    toggleAujourdhui,
    updateLabel: updateTaskLabel,
    updateCategorie,
    deleteTache,
    resetEdition,
  } = useTachesEdition(reload)
  const {
    recompenses,
    selectRecompense,
    deselectAll,
    deleteRecompense,
    updateLabel: updateRewardLabel,
    createRecompense,
  } = useRecompenses(reload)

  const handleTacheAjoutee = () => triggerReload()
  const handleRecompenseAjoutee = () => triggerReload()

  const handleSubmitTask = async ({ label, categorie, image }) => {
    if (!user?.id) {
      show('Erreur utilisateur : veuillez vous reconnecter.', 'error')
      return
    }

    let imagePath = ''
    if (image) {
      const compressed = await compressImageIfNeeded(image)
      const cleanName = image.name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9_.-]/g, '')
      const fileName = `${user.id}/taches/${Date.now()}-${cleanName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, compressed)

      if (uploadError) {
        show('Erreur lors de l’envoi de l’image.', 'error')
        return
      }

      imagePath = fileName
    }

    const { error: insertError } = await supabase.from('taches').insert([
      {
        label,
        categorie,
        aujourdhui: false,
        fait: false,
        position: 0,
        imagepath: imagePath,
        user_id: user.id,
      },
    ])

    if (insertError) {
      show('Erreur lors de la création de la tâche.', 'error')
      return
    }

    handleTacheAjoutee()
    show('Tâche ajoutée ✅', 'success')
  }

  const handleSubmitReward = async ({ label, image }) => {
    let imagePath = ''

    if (image) {
      const compressed = await compressImageIfNeeded(image)
      const cleanName = image.name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9_.-]/g, '')
      const fileName = `${user.id}/recompenses/${Date.now()}-${cleanName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, compressed)

      if (uploadError) {
        show('Erreur lors de l’envoi de l’image.', 'error')
        return
      }

      imagePath = fileName
    }

    await createRecompense({ label, image: imagePath })
    handleRecompenseAjoutee()
    show('Récompense ajoutée', 'success')
  }

  const handleAddCategory = async e => {
    e.preventDefault()
    const clean = newCatLabel.trim().replace(/\s+/g, ' ')
    if (!clean) return
    const slug = clean.toLowerCase().replace(/ /g, '-')
    await addCategory({ value: slug, label: clean })
    setNewCatLabel('')
    triggerReload()
    show('Catégorie ajoutée', 'success')
  }

  const handleRemoveCategory = async value => {
    await deleteCategory(value)
    triggerReload()
    setCatASupprimer(null)
    show('Catégorie supprimée', 'error')
  }

  const toggleSelectRecompense = (id, sel) =>
    sel ? deselectAll() : selectRecompense(id)

  const visibleTaches = taches.filter(t => {
    const catMatch =
      filterCategory === 'all' || (t.categorie || 'none') === filterCategory
    const doneMatch = !filterDone || !!t.aujourdhui
    return catMatch && doneMatch
  })

  const { showTrain, setShowTrain } = useDisplay()
  const { showRecompense, setShowRecompense } = useDisplay()

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
            onChange={e => updateParametres({ confettis: e.target.checked })}
          />
        )}
        <Checkbox
          id="train-toggle"
          className="train-checkbox"
          label="🚆 Afficher le train"
          checked={showTrain}
          onChange={e => setShowTrain(e.target.checked)}
        />
        <Checkbox
          id="recompense-toggle"
          className="recompense-checkbox"
          label="🎁 Afficher la récompense"
          checked={showRecompense}
          onChange={e => setShowRecompense(e.target.checked)}
        />
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
          onClick={() => setShowTaches(prev => !prev)}
        />
        {showTaches && (
          <div className="taches-edition">
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
                updateTaskLabel(id, label)
                show('Tâche renommée', 'success')
              }}
              onUpdateCategorie={updateCategorie}
              onDelete={t => setTacheASupprimer(t)}
            />
          </div>
        )}

        <Separator />

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
          onClick={() => setShowRecompenses(prev => !prev)}
        />
        {showRecompenses && (
          <div className="recompenses-edition">
            <RecompensesEdition
              items={recompenses}
              onDelete={r => setRecompenseASupprimer(r)}
              onToggleSelect={toggleSelectRecompense}
              onSubmitReward={handleSubmitReward}
              onLabelChange={(id, label) => {
                updateRewardLabel(id, label)
                show('Récompense modifiée', 'success')
              }}
            />
          </div>
        )}
      </div>

      <ModalConfirm
        isOpen={!!recompenseASupprimer}
        onClose={() => setRecompenseASupprimer(null)}
        confirmLabel="Supprimer"
        onConfirm={() => {
          deleteRecompense(recompenseASupprimer.id)
          show('Récompense supprimée', 'error')
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
          deleteTache(tacheASupprimer)
          show('Tâche supprimée', 'error')
          setTacheASupprimer(null)
        }}
      >
        ❗ Supprimer la tâche “{tacheASupprimer?.label}” ?
      </ModalConfirm>

      <ModalCategory
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories}
        onDeleteCategory={value => setCatASupprimer(value)}
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
          {categories.find(c => c.value === catASupprimer)?.label}” ?
          <br />
          Les tâches associées seront réattribuées à “Pas de catégorie”.
        </>
      </ModalConfirm>
    </div>
  )
}
*/
import {
  Button,
  Checkbox,
  ModalCategory,
  ModalConfirm,
  RecompensesEdition,
  Separator,
  TachesEdition,
} from '@/components'
import { useDisplay, useToast } from '@/contexts'
import {
  useAuth,
  useCategories,
  useParametres,
  useRecompenses,
  useTachesEdition,
} from '@/hooks'
import { compressImageIfNeeded, supabase } from '@/utils'
import { ChevronDown, Gift, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import './Edition.scss'

export default function Edition() {
  const { show } = useToast()
  const { user } = useAuth()

  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [catASupprimer, setCatASupprimer] = useState(null)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [recompenseASupprimer, setRecompenseASupprimer] = useState(null)
  const [tacheASupprimer, setTacheASupprimer] = useState(null)
  const [reload, setReload] = useState(0)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDone, setFilterDone] = useState(false)
  const [showTaches, setShowTaches] = useState(
    () => sessionStorage.getItem('showTaches') === 'true'
  )
  const [showRecompenses, setShowRecompenses] = useState(
    () => sessionStorage.getItem('showRecompenses') === 'true'
  )

  useEffect(() => {
    sessionStorage.setItem('showTaches', showTaches)
  }, [showTaches])

  useEffect(() => {
    sessionStorage.setItem('showRecompenses', showRecompenses)
  }, [showRecompenses])

  const triggerReload = () => setReload(r => r + 1)

  const { categories, addCategory, deleteCategory } = useCategories(reload)
  const { parametres, updateParametres } = useParametres()
  const {
    taches,
    toggleAujourdhui,
    updateLabel: updateTaskLabel,
    updateCategorie,
    deleteTache,
    resetEdition,
  } = useTachesEdition(reload)
  const {
    recompenses,
    selectRecompense,
    deselectAll,
    deleteRecompense,
    updateLabel: updateRewardLabel,
    createRecompense,
  } = useRecompenses(reload)

  const handleTacheAjoutee = () => triggerReload()
  const handleRecompenseAjoutee = () => triggerReload()

  const handleSubmitTask = async ({ label, categorie, image }) => {
    if (!user?.id) {
      show('Erreur utilisateur : veuillez vous reconnecter.', 'error')
      return
    }

    let imagePath = ''
    if (image) {
      const compressed = await compressImageIfNeeded(image)
      const cleanName = image.name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9_.-]/g, '')
      const fileName = `${user.id}/taches/${Date.now()}-${cleanName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, compressed)

      if (uploadError) {
        show('Erreur lors de l’envoi de l’image.', 'error')
        return
      }

      imagePath = fileName
    }

    const { error: insertError } = await supabase.from('taches').insert([
      {
        label,
        categorie,
        aujourdhui: false,
        fait: false,
        position: 0,
        imagepath: imagePath,
        user_id: user.id,
      },
    ])

    if (insertError) {
      show('Erreur lors de la création de la tâche.', 'error')
      return
    }

    handleTacheAjoutee()
    show('Tâche ajoutée ✅', 'success')
  }

  const handleSubmitReward = async ({ label, image }) => {
    if (image) {
      const compressed = await compressImageIfNeeded(image)

      if (!compressed) {
        show('Image trop lourde même après compression.', 'error')
        return
      }

      await createRecompense({ label, image: compressed })
      handleRecompenseAjoutee()
      show('Récompense ajoutée', 'success')
    } else {
      show('Image manquante.', 'error')
    }
  }

  const handleAddCategory = async e => {
    e.preventDefault()
    const clean = newCatLabel.trim().replace(/\s+/g, ' ')
    if (!clean) return
    const slug = clean.toLowerCase().replace(/ /g, '-')
    await addCategory({ value: slug, label: clean })
    setNewCatLabel('')
    triggerReload()
    show('Catégorie ajoutée', 'success')
  }

  const handleRemoveCategory = async value => {
    await deleteCategory(value)
    triggerReload()
    setCatASupprimer(null)
    show('Catégorie supprimée', 'error')
  }

  const toggleSelectRecompense = (id, sel) =>
    sel ? deselectAll() : selectRecompense(id)

  const visibleTaches = taches.filter(t => {
    const catMatch =
      filterCategory === 'all' || (t.categorie || 'none') === filterCategory
    const doneMatch = !filterDone || !!t.aujourdhui
    return catMatch && doneMatch
  })

  const { showTrain, setShowTrain } = useDisplay()
  const { showRecompense, setShowRecompense } = useDisplay()

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
            onChange={e => updateParametres({ confettis: e.target.checked })}
          />
        )}
        <Checkbox
          id="train-toggle"
          className="train-checkbox"
          label="🚆 Afficher le train"
          checked={showTrain}
          onChange={e => setShowTrain(e.target.checked)}
        />
        <Checkbox
          id="recompense-toggle"
          className="recompense-checkbox"
          label="🎁 Afficher la récompense"
          checked={showRecompense}
          onChange={e => setShowRecompense(e.target.checked)}
        />
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
          onClick={() => setShowTaches(prev => !prev)}
        />
        {showTaches && (
          <div className="taches-edition">
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
                updateTaskLabel(id, label)
                show('Tâche renommée', 'success')
              }}
              onUpdateCategorie={updateCategorie}
              onDelete={t => setTacheASupprimer(t)}
            />
          </div>
        )}

        <Separator />

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
          onClick={() => setShowRecompenses(prev => !prev)}
        />
        {showRecompenses && (
          <div className="recompenses-edition">
            <RecompensesEdition
              items={recompenses}
              onDelete={r => setRecompenseASupprimer(r)}
              onToggleSelect={toggleSelectRecompense}
              onSubmitReward={handleSubmitReward}
              onLabelChange={(id, label) => {
                updateRewardLabel(id, label)
                show('Récompense modifiée', 'success')
              }}
            />
          </div>
        )}
      </div>

      <ModalConfirm
        isOpen={!!recompenseASupprimer}
        onClose={() => setRecompenseASupprimer(null)}
        confirmLabel="Supprimer"
        onConfirm={() => {
          deleteRecompense(recompenseASupprimer.id)
          show('Récompense supprimée', 'error')
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
          deleteTache(tacheASupprimer)
          show('Tâche supprimée', 'error')
          setTacheASupprimer(null)
        }}
      >
        ❗ Supprimer la tâche “{tacheASupprimer?.label}” ?
      </ModalConfirm>

      <ModalCategory
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories}
        onDeleteCategory={value => setCatASupprimer(value)}
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
          {categories.find(c => c.value === catASupprimer)?.label}” ?
          <br />
          Les tâches associées seront réattribuées à “Pas de catégorie”.
        </>
      </ModalConfirm>
    </div>
  )
}
