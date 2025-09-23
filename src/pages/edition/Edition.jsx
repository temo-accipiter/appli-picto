// src/pages/edition/Edition.jsx
import {
  Button,
  Checkbox,
  ModalCategory,
  ModalConfirm,
  ModalQuota,
  RecompensesEdition,
  Separator,
  TachesEdition,
} from '@/components'
import { FeatureGate } from '@/components/shared/feature-gate/FeatureGate'
import ImageQuotaIndicator from '@/components/shared/ImageQuotaIndicator'
import { useDisplay, useToast } from '@/contexts'
import {
  useAuth,
  useCategories,
  useParametres,
  useQuotas,
  useRecompenses,
  useTachesEdition,
} from '@/hooks'
import {
  checkImageQuota,
  uploadImageWithQuota,
} from '@/services/imageUploadService'
import { supabase } from '@/utils'
import { ChevronDown, Gift, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import './Edition.scss'

export default function Edition() {
  const { show } = useToast()
  const { user } = useAuth()

  // 👉 On s'appuie sur le hook (pas de re-requêtage « direct DB » ici)
  const {
    canCreateTask,
    canCreateReward,
    canCreateCategory,
    getQuotaInfo,
    getMonthlyQuotaInfo,
    refreshQuotas,
  } = useQuotas()

  // États modaux quotas
  const [quotaModalOpen, setQuotaModalOpen] = useState(false)
  const [quotaModalContent, setQuotaModalContent] = useState({
    contentType: 'task',
    currentUsage: 0,
    limit: 0,
    period: 'total',
  })

  // États pour les quotas d'images
  const [imageQuotaModalOpen, setImageQuotaModalOpen] = useState(false)
  const [imageQuotaContent, setImageQuotaContent] = useState({
    assetType: 'task_image',
    currentUsage: 0,
    limit: 0,
    reason: '',
  })

  // Vérification des quotas d'images
  const handleImageQuotaCheck = async assetType => {
    if (!user?.id) return true

    try {
      const quotaResult = await checkImageQuota(user.id, assetType)

      if (!quotaResult.canUpload) {
        setImageQuotaContent({
          assetType,
          currentUsage:
            quotaResult.stats?.[
              assetType === 'task_image' ? 'task_images' : 'reward_images'
            ] || 0,
          limit:
            quotaResult.quotas?.[
              `max_${assetType.replace('_image', '_images')}`
            ] || 0,
          reason: quotaResult.reason,
        })
        setImageQuotaModalOpen(true)
        return false
      }
      return true
    } catch (error) {
      console.error('Erreur vérification quota image:', error)
      show("Erreur lors de la vérification des quotas d'images", 'error')
      return false
    }
  }

  // Vérification locale (sans refaire des selects) + ouverture modal si bloqué
  const handleQuotaCheck = async contentType => {
    const allowed =
      contentType === 'task'
        ? canCreateTask()
        : contentType === 'reward'
          ? canCreateReward()
          : contentType === 'category'
            ? canCreateCategory()
            : true

    if (allowed) return true

    const total = getQuotaInfo(contentType)
    const monthly = getMonthlyQuotaInfo(contentType)

    if (total && total.current >= total.limit) {
      setQuotaModalContent({
        contentType,
        currentUsage: total.current,
        limit: total.limit,
        period: 'total',
      })
      setQuotaModalOpen(true)
      return false
    }
    if (monthly && monthly.current >= monthly.limit) {
      setQuotaModalContent({
        contentType,
        currentUsage: monthly.current,
        limit: monthly.limit,
        period: 'monthly',
      })
      setQuotaModalOpen(true)
      return false
    }
    return false
  }

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

    // Vérif quota côté bouton via handleQuotaCheck dans TachesEdition
    let imagePath = ''
    if (image) {
      // Vérifier les quotas d'images avant upload
      const canUploadImage = await handleImageQuotaCheck('task_image')
      if (!canUploadImage) return

      try {
        const uploadResult = await uploadImageWithQuota(
          image,
          'task_image',
          user.id
        )
        imagePath = uploadResult.filePath
      } catch (error) {
        show(`Erreur lors de l'upload de l'image: ${error.message}`, 'error')
        return
      }
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

    // Rafraîchir les quotas sans dépendre de window
    setTimeout(() => {
      refreshQuotas()
    }, 100)
  }

  const handleSubmitReward = async ({ label, image }) => {
    if (!image) {
      show('Image manquante.', 'error')
      return
    }

    if (!user?.id) {
      show('Erreur utilisateur : veuillez vous reconnecter.', 'error')
      return
    }

    // Vérifier les quotas d'images avant upload
    const canUploadImage = await handleImageQuotaCheck('reward_image')
    if (!canUploadImage) return

    try {
      const uploadResult = await uploadImageWithQuota(
        image,
        'reward_image',
        user.id
      )

      // Utiliser l'ancien système pour créer la récompense mais avec le nouveau chemin d'image
      await createRecompense({ label, image: uploadResult.filePath })
      handleRecompenseAjoutee()
      show('Récompense ajoutée', 'success')
      setTimeout(() => {
        refreshQuotas()
      }, 100)
    } catch (error) {
      show(`Erreur lors de l'upload de l'image: ${error.message}`, 'error')
    }
  }

  // Ajouter une catégorie avec vérif quota (sans re-requête DB)
  const handleAddCategoryWithQuota = async (_e, categoryLabel = null) => {
    const allowed = canCreateCategory()
    if (!allowed) {
      await handleQuotaCheck('category')
      return
    }

    const labelToUse = (categoryLabel ?? newCatLabel ?? '')
      .trim()
      .replace(/\s+/g, ' ')
    if (!labelToUse) return

    const slug = labelToUse.toLowerCase().replace(/ /g, '-')
    await addCategory({ value: slug, label: labelToUse })
    setNewCatLabel('')
    triggerReload()
    setTimeout(() => {
      refreshQuotas()
    }, 100)
  }

  const handleRemoveCategory = async value => {
    await deleteCategory(value)
    triggerReload()
    setTimeout(() => {
      refreshQuotas()
    }, 300)
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
        <FeatureGate feature="trainprogressbar">
          <Checkbox
            id="train-toggle"
            className="train-checkbox"
            label="🚆 Afficher le train"
            checked={showTrain}
            onChange={e => setShowTrain(e.target.checked)}
          />
        </FeatureGate>
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
            <div className="quota-indicators">
              <ImageQuotaIndicator assetType="task_image" size="small" />
            </div>
            <TachesEdition
              items={visibleTaches}
              categories={categories}
              onToggleAujourdhui={toggleAujourdhui}
              resetEdition={resetEdition}
              onSubmitTask={handleSubmitTask}
              onAddCategory={handleAddCategoryWithQuota}
              onDeleteCategory={deleteCategory}
              filterCategory={filterCategory}
              onChangeFilterCategory={setFilterCategory}
              filterDone={filterDone}
              onChangeFilterDone={setFilterDone}
              onShowQuotaModal={handleQuotaCheck}
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
            <div className="quota-indicators">
              <ImageQuotaIndicator assetType="reward_image" size="small" />
            </div>
            <RecompensesEdition
              items={recompenses}
              onDelete={r => setRecompenseASupprimer(r)}
              onToggleSelect={toggleSelectRecompense}
              onSubmitReward={handleSubmitReward}
              onShowQuotaModal={handleQuotaCheck}
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
          setTimeout(() => {
            refreshQuotas()
          }, 300)
        }}
      >
        ❗ Supprimer la récompense &quot;{recompenseASupprimer?.label}&quot; ?
      </ModalConfirm>

      <ModalConfirm
        isOpen={!!tacheASupprimer}
        onClose={() => setTacheASupprimer(null)}
        confirmLabel="Supprimer"
        onConfirm={() => {
          deleteTache(tacheASupprimer)
          show('Tâche supprimée', 'error')
          setTacheASupprimer(null)
          setTimeout(() => {
            refreshQuotas()
          }, 300)
        }}
      >
        ❗ Supprimer la tâche &quot;{tacheASupprimer?.label}&quot; ?
      </ModalConfirm>

      <ModalCategory
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories}
        onDeleteCategory={value => setCatASupprimer(value)}
        onAddCategory={handleAddCategoryWithQuota}
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
          ❗ Supprimer la catégorie &quot;
          {categories.find(c => c.value === catASupprimer)?.label}&quot; ?
          <br />
          Les tâches associées seront réattribuées à &quot;Pas de
          catégorie&quot;.
        </>
      </ModalConfirm>

      <ModalQuota
        isOpen={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        contentType={quotaModalContent.contentType}
        currentUsage={quotaModalContent.currentUsage}
        limit={quotaModalContent.limit}
        period={quotaModalContent.period}
      />

      {/* Modal pour quotas d'images */}
      <ModalQuota
        isOpen={imageQuotaModalOpen}
        onClose={() => setImageQuotaModalOpen(false)}
        contentType={
          imageQuotaContent.assetType === 'task_image' ? 'task' : 'reward'
        }
        currentUsage={imageQuotaContent.currentUsage}
        limit={imageQuotaContent.limit}
        period="total"
      />
    </div>
  )
}
