// src/pages/edition/Edition.tsx
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
import ImageQuotaIndicator from '@/components/shared/image-quota-indicator/ImageQuotaIndicator'
import { useDisplay, useToast } from '@/contexts'
import {
  useAuth,
  useCategories,
  useI18n,
  useParametres,
  useRBAC,
  useRecompenses,
  useTachesEdition,
} from '@/hooks'
import type { Tache, Recompense } from '@/types/global'
import { modernUploadImage } from '@/utils/storage/modernUploadImage'
import { supabase } from '@/utils/supabaseClient'
import { ChevronDown, Gift, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import './Edition.scss'

type ContentType = 'task' | 'reward' | 'category'
type QuotaPeriod = 'total' | 'monthly'
type AssetType = 'task_image' | 'reward_image'

interface QuotaModalContent {
  contentType: ContentType
  currentUsage: number
  limit: number
  period: QuotaPeriod
}

interface ImageQuotaContent {
  assetType: AssetType
  currentUsage: number
  limit: number
  reason: string
}

interface TaskSubmitParams {
  label: string
  categorie?: string
  image?: File
}

interface RewardSubmitParams {
  label: string
  image?: File
}

export default function Edition() {
  const { t } = useI18n()
  const { show } = useToast()
  const { user } = useAuth()

  // 👉 Hook RBAC unifié (Phase 2)
  const {
    canCreateTask,
    canCreateReward,
    canCreateCategory,
    getQuotaInfo,
    getMonthlyQuotaInfo,
    refreshQuotas,
    isAdmin,
  } = useRBAC()

  // États modaux quotas
  const [quotaModalOpen, setQuotaModalOpen] = useState(false)
  const [quotaModalContent, setQuotaModalContent] = useState<QuotaModalContent>(
    {
      contentType: 'task',
      currentUsage: 0,
      limit: 0,
      period: 'total',
    }
  )

  // États pour les quotas d'images
  const [imageQuotaModalOpen, setImageQuotaModalOpen] = useState(false)
  const [_imageQuotaContent, _setImageQuotaContent] =
    useState<ImageQuotaContent>({
      assetType: 'task_image',
      currentUsage: 0,
      limit: 0,
      reason: '',
    })

  // Note: Vérification des quotas d'images maintenant gérée automatiquement
  // dans modernUploadImage() via check_image_quota() RPC

  // Vérification locale (sans refaire des selects) + ouverture modal si bloqué
  const handleQuotaCheck = async (
    contentType: ContentType
  ): Promise<boolean> => {
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
  const [catASupprimer, setCatASupprimer] = useState<string | null>(null)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [recompenseASupprimer, setRecompenseASupprimer] =
    useState<Recompense | null>(null)
  const [tacheASupprimer, setTacheASupprimer] = useState<Tache | null>(null)
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
    sessionStorage.setItem('showTaches', String(showTaches))
  }, [showTaches])

  useEffect(() => {
    sessionStorage.setItem('showRecompenses', String(showRecompenses))
  }, [showRecompenses])

  const triggerReload = () => {
    console.log('🔄 triggerReload appelé, reload:', reload, '→', reload + 1)
    setReload(r => r + 1)
  }

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

  const handleSubmitTask = async ({
    label,
    categorie,
    image,
  }: TaskSubmitParams) => {
    if (!user?.id) {
      show(t('edition.errorUser'), 'error')
      return
    }

    // Vérif quota côté bouton via handleQuotaCheck dans TachesEdition
    let imagePath = ''
    if (image) {
      try {
        // 🆕 Utiliser le nouveau pipeline moderne (quota check inclus)
        const uploadResult = await modernUploadImage(image, {
          userId: user.id,
          assetType: 'task_image',
          prefix: 'taches',
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        imagePath = uploadResult.path
      } catch (error) {
        show(
          `${t('edition.errorImageUpload')}: ${(error as Error).message}`,
          'error'
        )
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
      console.error('❌ Erreur insertion tâche:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      })
      show(t('edition.errorTaskCreation'), 'error')
      return
    }

    console.log('✅ Tâche créée en BDD, déclenchement reload...')
    handleTacheAjoutee()
    show(t('edition.taskAdded'), 'success')

    // Rafraîchir les quotas sans dépendre de window
    setTimeout(() => {
      refreshQuotas()
    }, 100)
  }

  const handleSubmitReward = async ({ label, image }: RewardSubmitParams) => {
    if (!image) {
      show(t('edition.imageMissing'), 'error')
      return
    }

    if (!user?.id) {
      show(t('edition.errorUser'), 'error')
      return
    }

    try {
      // 🆕 Utiliser le nouveau pipeline moderne (quota check inclus)
      const uploadResult = await modernUploadImage(image, {
        userId: user.id,
        assetType: 'reward_image',
        prefix: 'recompenses',
      })

      if (uploadResult.error) {
        throw uploadResult.error
      }

      // Créer la récompense avec le chemin d'image uploadé
      await createRecompense({ label, imagepath: uploadResult.path })
      handleRecompenseAjoutee()
      show(t('edition.rewardAdded'), 'success')
      setTimeout(() => {
        refreshQuotas()
      }, 100)
    } catch (error) {
      show(
        `${t('edition.errorImageUpload')}: ${(error as Error).message}`,
        'error'
      )
    }
  }

  // Ajouter une catégorie avec vérif quota (sans re-requête DB)
  const handleAddCategoryWithQuota = async (
    _e: React.FormEvent,
    categoryLabel: string | null = null
  ) => {
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

  const handleRemoveCategory = async (value: string) => {
    await deleteCategory(value)
    triggerReload()
    setTimeout(() => {
      refreshQuotas()
    }, 300)
  }

  const toggleSelectRecompense = (id: string, sel: boolean) =>
    sel ? deselectAll() : selectRecompense(id)

  const visibleTaches = taches.filter(t => {
    const catMatch =
      filterCategory === 'all' || (t.categorie || 'none') === filterCategory
    const doneMatch = !filterDone || !!t.aujourdhui
    return catMatch && doneMatch
  })

  const {
    showTrain,
    setShowTrain,
    showRecompense,
    setShowRecompense,
    showTimeTimer,
    setShowTimeTimer,
  } = useDisplay()

  return (
    <div className="page-edition">
      <div className="edition-buttons">
        {parametres && (
          <Checkbox
            id="confettis"
            className="confettis-checkbox"
            label={
              parametres.confettis
                ? t('edition.confettiEnabled')
                : t('edition.confettiDisabled')
            }
            checked={!!parametres.confettis}
            onChange={e => updateParametres({ confettis: e.target.checked })}
          />
        )}
        <FeatureGate feature="trainprogressbar">
          <Checkbox
            id="train-toggle"
            className="train-checkbox"
            label={t('edition.showTrain')}
            checked={showTrain}
            onChange={e => setShowTrain(e.target.checked)}
          />
        </FeatureGate>
        <Checkbox
          id="recompense-toggle"
          className="recompense-checkbox"
          label={t('edition.showReward')}
          checked={showRecompense}
          onChange={e => setShowRecompense(e.target.checked)}
        />
        <Checkbox
          id="time-timer-toggle"
          className="time-timer-checkbox"
          label={
            showTimeTimer
              ? t('edition.showTimeTimer')
              : t('edition.hideTimeTimer')
          }
          checked={showTimeTimer}
          onChange={e => setShowTimeTimer(e.target.checked)}
        />
        {parametres && (
          <Checkbox
            id="toasts-toggle"
            className="toasts-checkbox"
            label={
              (parametres.toasts_enabled ?? true)
                ? t('edition.toastsEnabled')
                : t('edition.toastsDisabled')
            }
            checked={parametres.toasts_enabled ?? true}
            onChange={async e => {
              console.log('🔧 Toggle toasts:', e.target.checked)
              const result = await updateParametres({
                toasts_enabled: e.target.checked,
              })
              console.log('✅ Résultat updateParametres:', result)
              if (!result.ok) {
                console.error(
                  '❌ Erreur mise à jour toasts_enabled:',
                  result.error
                )
                show(t('errors.generic'), 'error')
              }
            }}
          />
        )}
      </div>

      <div className="edition-sections">
        <Button
          label={
            <span className="button-label">
              <ListChecks className="button-icon" size={18} />
              {t('tasks.title')}
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
            {!isAdmin && (
              <div className="quota-indicators">
                <ImageQuotaIndicator assetType="task_image" size="small" />
              </div>
            )}
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
                show(t('edition.taskRenamed'), 'success')
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
              {t('rewards.title')}
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
            {!isAdmin && (
              <div className="quota-indicators">
                <ImageQuotaIndicator assetType="reward_image" size="small" />
              </div>
            )}
            <RecompensesEdition
              items={recompenses}
              onDelete={r => setRecompenseASupprimer(r)}
              onToggleSelect={toggleSelectRecompense}
              onSubmitReward={handleSubmitReward}
              onShowQuotaModal={handleQuotaCheck}
              onLabelChange={(id, label) => {
                updateRewardLabel(id, label)
                show(t('edition.rewardModified'), 'success')
              }}
            />
          </div>
        )}
      </div>

      <ModalConfirm
        isOpen={!!recompenseASupprimer}
        onClose={() => setRecompenseASupprimer(null)}
        confirmLabel={t('edition.confirmDeleteReward')}
        onConfirm={() => {
          if (recompenseASupprimer) {
            deleteRecompense(recompenseASupprimer.id)
            show(t('edition.rewardDeleted'), 'error')
            setRecompenseASupprimer(null)
            setTimeout(() => {
              refreshQuotas()
            }, 300)
          }
        }}
      >
        ❗ {t('edition.confirmDeleteReward')} &quot;
        {recompenseASupprimer?.label}&quot; ?
      </ModalConfirm>

      <ModalConfirm
        isOpen={!!tacheASupprimer}
        onClose={() => setTacheASupprimer(null)}
        confirmLabel={t('edition.confirmDeleteTask')}
        onConfirm={() => {
          if (tacheASupprimer) {
            deleteTache(tacheASupprimer)
            show(t('edition.taskDeleted'), 'error')
            setTacheASupprimer(null)
            setTimeout(() => {
              refreshQuotas()
            }, 300)
          }
        }}
      >
        ❗ {t('edition.confirmDeleteTask')} &quot;{tacheASupprimer?.label}&quot;
        ?
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
        confirmLabel={t('edition.confirmDeleteCategory')}
        onConfirm={() => {
          if (catASupprimer) {
            handleRemoveCategory(catASupprimer)
          }
        }}
      >
        <>
          ❗ {t('edition.confirmDeleteCategory')} &quot;
          {categories.find(c => c.value === catASupprimer)?.label}&quot; ?
          <br />
          {t('edition.categoryDeleteWarning')}
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
          _imageQuotaContent.assetType === 'task_image' ? 'task' : 'reward'
        }
        currentUsage={_imageQuotaContent.currentUsage}
        limit={_imageQuotaContent.limit}
        period="total"
      />
    </div>
  )
}
