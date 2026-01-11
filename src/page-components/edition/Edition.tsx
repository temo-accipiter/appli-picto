'use client'

// src/pages/edition/Edition.tsx
import {
  Button,
  RecompensesEdition,
  Separator,
  TachesEdition,
} from '@/components'
import ImageQuotaIndicator from '@/components/shared/image-quota-indicator/ImageQuotaIndicator'
import { useToast } from '@/contexts'
import {
  useAuth,
  useCategories,
  useI18n,
  useRBAC,
  useRecompenses,
  useTachesEdition,
} from '@/hooks'
import type { Tache, Recompense } from '@/types/global'
import { modernUploadImage } from '@/utils/storage/modernUploadImage'
import { supabase } from '@/utils/supabaseClient'
import { ChevronDown, Gift, ListChecks } from 'lucide-react'
import React, { lazy, Suspense, useEffect, useState } from 'react'
import './Edition.scss'

// Lazy load des modales (affichées conditionnellement)
const ModalCategory = lazy(() =>
  import('@/components').then(m => ({ default: m.ModalCategory }))
)
const ModalConfirm = lazy(() =>
  import('@/components').then(m => ({ default: m.ModalConfirm }))
)
const ModalQuota = lazy(() =>
  import('@/components').then(m => ({ default: m.ModalQuota }))
)

type ContentType = 'task' | 'reward' | 'category'
type QuotaPeriod = 'total' | 'monthly'

interface QuotaModalContent {
  contentType: ContentType
  currentUsage: number
  limit: number
  period: QuotaPeriod
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
  const [showRecompenses, setShowRecompenses] = useState(
    () => sessionStorage.getItem('showRecompenses') === 'true'
  )

  useEffect(() => {
    sessionStorage.setItem('showRecompenses', String(showRecompenses))
  }, [showRecompenses])

  const triggerReload = () => {
    console.log('🔄 triggerReload appelé, reload:', reload, '→', reload + 1)
    setReload(r => r + 1)
  }

  const { categories, addCategory, deleteCategory } = useCategories(reload)
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

        imagePath = uploadResult.path || ''
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
        ...(categorie && { categorie }),
        aujourdhui: false,
        fait: false,
        position: 0,
        ...(imagePath && { imagepath: imagePath }),
        user_id: user.id,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any)

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

  // Wrappers pour adapter les signatures de callback aux interfaces attendues
  const handleToggleAujourdhui = (
    id: string | number,
    currentState: boolean | number | undefined
  ) => {
    toggleAujourdhui(String(id), !!currentState)
  }

  const handleDeleteCategory = async (
    value: string | number
  ): Promise<void> => {
    await deleteCategory(String(value))
  }

  const handleShowQuotaModal = async (type: string): Promise<boolean> => {
    return handleQuotaCheck(type as ContentType)
  }

  const handleToggleSelectRecompense = (
    id: string | number,
    currentSelected: boolean
  ) => {
    toggleSelectRecompense(String(id), currentSelected)
  }

  const handleUpdateRewardLabel = async (
    id: string | number,
    label: string
  ): Promise<{ error?: Error }> => {
    updateRewardLabel(String(id), label)
    return {}
  }

  const handleUpdateCategorie = (id: string | number, categorie: string) => {
    updateCategorie(String(id), categorie || null)
  }

  return (
    <div className="page-edition">
      {/* WCAG 2.4.6 - Structure sémantique avec h1 */}
      <h1 className="sr-only">{t('edition.title')}</h1>

      <div className="edition-sections">
        <Separator />

        <div className="taches-edition">
          {!isAdmin && (
            <div className="quota-indicators">
              <ImageQuotaIndicator assetType="task_image" size="small" />
            </div>
          )}
          <TachesEdition
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items={visibleTaches as any}
            categories={categories}
            onToggleAujourdhui={handleToggleAujourdhui}
            resetEdition={resetEdition}
            onSubmitTask={handleSubmitTask}
            onAddCategory={handleAddCategoryWithQuota}
            onDeleteCategory={handleDeleteCategory}
            filterCategory={filterCategory}
            onChangeFilterCategory={setFilterCategory}
            filterDone={filterDone}
            onChangeFilterDone={setFilterDone}
            onShowQuotaModal={handleShowQuotaModal}
            onUpdateLabel={(id, label) => {
              updateTaskLabel(String(id), label)
              show(t('edition.taskRenamed'), 'success')
            }}
            onUpdateCategorie={handleUpdateCategorie}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onDelete={t => setTacheASupprimer(t as any)}
          />
        </div>

        <Separator />

        <Button
          label={
            <span className="button-label">
              <Gift className="button-icon" size={18} aria-hidden="true" />
              {t('rewards.title')}
              <ChevronDown
                className={`chevron ${showRecompenses ? 'open' : ''}`}
                size={16}
                aria-hidden="true"
              />
            </span>
          }
          onClick={() => setShowRecompenses(prev => !prev)}
          aria-expanded={showRecompenses}
        />
        {showRecompenses && (
          <div className="recompenses-edition">
            {!isAdmin && (
              <div className="quota-indicators">
                <ImageQuotaIndicator assetType="reward_image" size="small" />
              </div>
            )}
            <RecompensesEdition
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              items={recompenses as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onDelete={r => setRecompenseASupprimer(r as any)}
              onToggleSelect={handleToggleSelectRecompense}
              onSubmitReward={handleSubmitReward}
              onShowQuotaModal={handleShowQuotaModal}
              onLabelChange={handleUpdateRewardLabel}
            />
          </div>
        )}
      </div>

      <Suspense fallback={null}>
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
          ❗ {t('edition.confirmDeleteTask')} &quot;{tacheASupprimer?.label}
          &quot; ?
        </ModalConfirm>
      </Suspense>

      <Suspense fallback={null}>
        <ModalCategory
          isOpen={manageCatOpen}
          onClose={() => setManageCatOpen(false)}
          categories={categories}
          onDeleteCategory={value => setCatASupprimer(String(value))}
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
      </Suspense>

      <Suspense fallback={null}>
        <ModalQuota
          isOpen={quotaModalOpen}
          onClose={() => setQuotaModalOpen(false)}
          contentType={quotaModalContent.contentType}
          currentUsage={quotaModalContent.currentUsage}
          limit={quotaModalContent.limit}
          period={quotaModalContent.period}
        />
      </Suspense>
    </div>
  )
}
