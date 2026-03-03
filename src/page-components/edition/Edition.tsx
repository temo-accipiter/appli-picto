'use client'

// src/pages/edition/Edition.tsx
import { CardsEdition, Separator } from '@/components'
import { useToast } from '@/contexts'
import { useChildProfile } from '@/contexts/ChildProfileContext'
import { useOffline } from '@/contexts/OfflineContext'
import {
  useAuth,
  useCategories,
  useI18n,
  usePersonalCards,
  useExecutionOnly,
} from '@/hooks'
import type { Timeline, Slot } from '@/types/supabase'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './Edition.scss'

// Lazy load des modales (affichées conditionnellement)
const ModalCategory = lazy(() =>
  import('@/components').then(m => ({ default: m.ModalCategory }))
)
const ModalConfirm = lazy(() =>
  import('@/components').then(m => ({ default: m.ModalConfirm }))
)

interface CardFormData {
  label: string
  categorie?: string
  image: File
  imagePath: string // Path Storage uploadé: {accountId}/cards/{cardId}.jpg
  imageUrl?: string
  cardId: string // ID carte généré client-side (UUID v4)
}

interface CardItem {
  id: string
  name: string
  image_url?: string
  categorie?: string
}

interface EditionProps {
  timeline: Timeline | null
  slots: Slot[]
  updateSlot: (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => Promise<{ error: Error | null }>
}

export default function Edition({ timeline, slots, updateSlot }: EditionProps) {
  const { t } = useI18n()
  const { show } = useToast()
  const { user } = useAuth()

  // ✅ DB-first : Quota validation 100% server-side via RLS + triggers
  // Le client fait INSERT optimistic, serveur reject si quota dépassé

  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [catASupprimer, setCatASupprimer] = useState<string | null>(null)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [cardASupprimer, setCardASupprimer] = useState<CardItem | null>(null)
  const [reload, setReload] = useState(0)
  const [filterCategory, setFilterCategory] = useState('all')
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false)

  // ── Enfant actif : rechargement stable quand l'enfant change (S2) ────────────
  const { activeChildId } = useChildProfile()
  const prevChildIdRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (prevChildIdRef.current === undefined) {
      prevChildIdRef.current = activeChildId
      return
    }
    if (prevChildIdRef.current !== activeChildId) {
      prevChildIdRef.current = activeChildId
      setReload(r => r + 1)
    }
  }, [activeChildId])

  const triggerReload = () => {
    console.log('🔄 triggerReload appelé, reload:', reload, '→', reload + 1)
    setReload(r => r + 1)
  }

  const { categories, addCategory, deleteCategory } = useCategories(reload)
  const { cards, createCard, updateCard, updateCardCategory, deleteCard } =
    usePersonalCards()

  // ── PHASE 1 : Timeline + Slots reçus en props (source unique partagée) ───
  // Suppression useTimelines/useSlots locaux → désync résolu
  // timeline, slots, updateSlot proviennent du parent page.tsx

  // ── Guards : offline + execution-only ────────────────────────────────────
  const { isOnline } = useOffline()
  const { isExecutionOnly } = useExecutionOnly()

  // Checkbox disabled si offline ou execution-only
  const checkboxDisabled = !isOnline || isExecutionOnly

  // ✅ Transformation Category (DB) → Categorie (UI) + Déduplication
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>()
    return categories
      .map(cat => ({
        value: cat.id, // ✅ Utiliser id comme value (unique garanti)
        label: cat.name, // ✅ Nom de la catégorie
      }))
      .filter(cat => {
        if (seen.has(cat.value as string)) return false
        seen.add(cat.value as string)
        return true
      })
  }, [categories])

  const handleCardAjoutee = () => triggerReload()

  const handleSubmitCard = async ({
    label,
    imagePath,
    cardId,
  }: CardFormData) => {
    if (!user?.id) {
      show(t('edition.errorUser'), 'error')
      return
    }

    console.log('📝 [Edition] Création carte en DB...')
    console.log('   • Card ID:', cardId)
    console.log('   • Name:', label)
    console.log('   • Image path:', imagePath)

    // ✅ DB-first : INSERT avec cardId généré client-side
    const { error: insertError } = await createCard({
      id: cardId, // 🆕 Même ID que Storage
      name: label,
      image_url: imagePath, // Path: {accountId}/cards/{cardId}.jpg
    })

    if (insertError) {
      // 🗑️ Cleanup image orpheline si INSERT échoue
      console.log('🗑️ [Edition] INSERT failed, cleanup image:', imagePath)
      await deleteImageIfAny(imagePath, 'personal-images')

      // ✅ DB-first : Parser erreur quota/gating
      const errorMsg = insertError.message?.toLowerCase() ?? ''

      if (errorMsg.includes('stock')) {
        show('Tu as atteint la limite de 50 cartes.', 'error')
        return
      }

      if (errorMsg.includes('monthly')) {
        show('Tu as créé 100 cartes ce mois-ci. Limite atteinte.', 'error')
        return
      }

      if (
        errorMsg.includes('feature_unavailable') ||
        errorMsg.includes('feature')
      ) {
        show(
          'Fonctionnalité réservée aux abonnés. Passe Premium pour créer des cartes personnelles.',
          'error'
        )
        return
      }

      // Erreur générique
      console.error('❌ Erreur insertion carte:', {
        message: insertError.message,
      })
      show('Erreur lors de la création de la carte.', 'error')
      return
    }

    console.log('✅ Carte créée en BDD, déclenchement reload...')
    handleCardAjoutee()
    show('Carte créée avec succès !', 'success')
  }

  // ✅ DB-first : Ajout catégorie avec validation server-side
  const handleAddCategoryWithQuota = async (
    _e: React.FormEvent,
    categoryLabel: string | null = null
  ) => {
    const labelToUse = (categoryLabel ?? newCatLabel ?? '')
      .trim()
      .replace(/\s+/g, ' ')

    if (!labelToUse) return

    // ✅ Éviter double-submit pendant requête
    if (isSubmittingCategory) return

    setIsSubmittingCategory(true)

    try {
      // ✅ FIX : Passer string directement (pas d'objet {value, label})
      // La table categories.name attend le nom complet, pas un slug
      const { error: addError } = await addCategory(labelToUse)

      if (addError) {
        // L'erreur est déjà loggée + toast dans le hook
        // Pas besoin de re-show, juste arrêter l'exécution
        return
      }

      // ✅ Succès : Reset + reload + toast explicite
      setNewCatLabel('')
      triggerReload()
      show('Catégorie créée avec succès !', 'success')
    } catch (error) {
      // ✅ DB-first : RLS quota violation détectée server-side
      const errorMessage = (error as Error).message
      if (errorMessage?.includes('quota')) {
        show(t('quota.limitReached'), 'error')
      }
    } finally {
      setIsSubmittingCategory(false)
    }
  }

  const handleRemoveCategory = async (value: string) => {
    await deleteCategory(value)
    triggerReload()
  }

  const visibleCards = cards.filter(c => {
    const catMatch =
      filterCategory === 'all' || (c.category_id || 'none') === filterCategory
    return catMatch
  })

  // Wrappers pour adapter les signatures
  const handleDeleteCategory = async (
    value: string | number
  ): Promise<void> => {
    await deleteCategory(String(value))
  }

  const handleUpdateCategorie = async (
    id: string | number,
    categoryId: string
  ) => {
    // ✅ DB-first : UPSERT dans user_card_categories (mapping user ↔ card ↔ category)
    const { error } = await updateCardCategory(String(id), categoryId)

    if (error) {
      console.error('[Edition] Erreur update catégorie:', error)
      show('Impossible de modifier la catégorie', 'error')
      return
    }

    // ✅ Succès : Reload pour refetch les mappings
    triggerReload()
    show('Catégorie modifiée', 'success')
  }

  const handleUpdateLabel = async (id: string | number, label: string) => {
    await updateCard(String(id), { name: label })
  }

  /**
   * PHASE 1 : Handler checkbox bibliothèque.
   * - Si currentlyChecked=false : ajoute au premier slot étape vide (kind='step', card_id=null).
   * - Si currentlyChecked=true : retire de TOUS les slots.
   * - Guard offline/execution-only déjà géré par checkboxDisabled.
   */
  const handleToggleCardInTimeline = useCallback(
    async (cardId: string, currentlyChecked: boolean) => {
      // Guard : pas de timeline ou pas de slots
      if (!timeline || !slots) {
        show('Aucune timeline active', 'warning')
        return
      }

      if (currentlyChecked) {
        // Retirer la carte de TOUS les slots où elle est présente
        const slotsWithCard = slots.filter(s => s.card_id === cardId)

        if (slotsWithCard.length === 0) {
          // Edge case : checkbox checked mais pas de slot (désync)
          console.warn(
            '[Edition] Checkbox checked mais aucun slot trouvé pour card:',
            cardId
          )
          return
        }

        // Retirer de tous les slots (UPDATE card_id = null)
        for (const slot of slotsWithCard) {
          const { error } = await updateSlot(slot.id, { card_id: null })
          if (error) {
            console.error('[Edition] Erreur retrait carte:', error)
            show('Erreur lors du retrait de la carte', 'error')
            return
          }
        }

        show(`Carte retirée de ${slotsWithCard.length} slot(s)`, 'success')
      } else {
        // Ajouter au premier slot étape vide
        const stepSlots = slots
          .filter(s => s.kind === 'step')
          .sort((a, b) => a.position - b.position)

        const firstEmptyStepSlot = stepSlots.find(s => s.card_id === null)

        if (!firstEmptyStepSlot) {
          show('Aucune étape vide. Ajoute une étape.', 'warning')
          return
        }

        const { error } = await updateSlot(firstEmptyStepSlot.id, {
          card_id: cardId,
        })

        if (error) {
          console.error('[Edition] Erreur assignation carte:', error)
          show("Erreur lors de l'assignation de la carte", 'error')
          return
        }

        show("Carte ajoutée à l'étape", 'success')
      }
    },
    [timeline, slots, updateSlot, show]
  )

  return (
    <div className="page-edition">
      {/* WCAG 2.4.6 - Structure sémantique avec h1 */}
      <h1 className="sr-only">{t('edition.title')}</h1>

      <div className="edition-sections">
        <Separator />

        <div className="taches-edition">
          {/* ✅ Nouveau système : Cards uniquement */}
          <CardsEdition
            items={visibleCards.map(c => ({
              id: c.id,
              name: c.name,
              image_url: c.image_url,
              categorie: c.category_id, // ✅ Mapping category_id → categorie (prop attendue par CardsEdition)
            }))}
            categories={uniqueCategories}
            onSubmitCard={handleSubmitCard}
            onAddCategory={handleAddCategoryWithQuota}
            onDeleteCategory={handleDeleteCategory}
            filterCategory={filterCategory}
            onChangeFilterCategory={setFilterCategory}
            onUpdateLabel={handleUpdateLabel}
            onUpdateCategorie={handleUpdateCategorie}
            onDelete={c => setCardASupprimer(c)}
            isSubmittingCategory={isSubmittingCategory}
            timelineSlots={slots}
            onToggleCardInTimeline={handleToggleCardInTimeline}
            checkboxDisabled={checkboxDisabled}
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <ModalConfirm
          isOpen={!!cardASupprimer}
          onClose={() => setCardASupprimer(null)}
          confirmLabel={t('edition.confirmDeleteTask')}
          onConfirm={async () => {
            if (cardASupprimer) {
              await deleteCard(cardASupprimer.id)
              show('Carte supprimée', 'error')
              setCardASupprimer(null)
            }
          }}
        >
          ❗ Confirmer la suppression de &quot;{cardASupprimer?.name}&quot; ?
        </ModalConfirm>
      </Suspense>

      <Suspense fallback={null}>
        <ModalCategory
          isOpen={manageCatOpen}
          onClose={() => setManageCatOpen(false)}
          categories={uniqueCategories}
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
            {uniqueCategories.find(c => c.value === catASupprimer)?.label}
            &quot; ?
            <br />
            {t('edition.categoryDeleteWarning')}
          </>
        </ModalConfirm>
      </Suspense>

      {/* ✅ DB-first : Pas de modal quota côté client */}
    </div>
  )
}
