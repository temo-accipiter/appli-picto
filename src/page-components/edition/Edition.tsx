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
  useAccountStatus, // 🆕 Détection admin
} from '@/hooks'
import type { Session } from '@/hooks'
import useAdminBankCards from '@/hooks/useAdminBankCards' // CRUD complet (admin uniquement)
import type { Timeline, Slot } from '@/hooks'
import { getCategoryDisplayLabel } from '@/utils/categories/getCategoryDisplayLabel'
import deleteImageIfAny from '@/utils/storage/deleteImageIfAny'
import type { CardFormData, CardItem } from '@/types/cards'
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
// 🆕 Modal création carte banque (admin uniquement)
const CreateBankCardModal = lazy(() =>
  import('@/components').then(m => ({ default: m.CreateBankCardModal }))
)
const ModalQuota = lazy(() =>
  import('@/components').then(m => ({ default: m.ModalQuota }))
)

// Limite stock cartes personnelles (Subscriber)
// Doit rester en sync avec quota_cards_stock_limit(subscriber) en DB
const CARD_STOCK_LIMIT = 50

interface EditionProps {
  timeline: Timeline | null
  slots: Slot[]
  updateSlot: (
    id: string,
    updates: { card_id?: string | null; tokens?: number | null }
  ) => Promise<{ error: Error | null }>
  /** Rafraîchir les slots depuis la DB (TICKET #3 : Sync UI post-suppression carte) */
  refreshSlots: () => void
  /** Cartes de banque (source unique depuis page parent) */
  bankCards: Array<{
    id: string
    name: string
    image_url: string
    published: boolean
  }>
  /** Rafraîchir les cartes de banque depuis la DB */
  refreshBankCards: () => void
  /** Session active (source unique depuis page.tsx — évite désynchronisation après reset) */
  session: Session | null
}

export default function Edition({
  timeline,
  slots,
  updateSlot,
  refreshSlots,
  bankCards: rawBankCards,
  refreshBankCards,
  session,
}: EditionProps) {
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
  // 🆕 Modal création carte banque (admin uniquement)
  const [showCreateBankCardModal, setShowCreateBankCardModal] = useState(false)
  // Guard quota : affiché si limite stock atteinte avant ouverture modal création
  const [showCardQuotaModal, setShowCardQuotaModal] = useState(false)
  // 🆕 Modals confirmation actions cartes banque (admin uniquement)
  const [bankCardToRename, setBankCardToRename] = useState<{
    id: string
    oldName: string
    newName: string
  } | null>(null)
  const [bankCardToDelete, setBankCardToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [bankCardToTogglePublish, setBankCardToTogglePublish] = useState<{
    id: string
    name: string
    newPublished: boolean
  } | null>(null)

  // ── Enfant actif : rechargement stable quand l'enfant change (S2) ────────────
  const { activeChildId, isVisitor } = useChildProfile()
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
    setReload(r => r + 1)
  }

  const { categories, addCategory, deleteCategory } = useCategories(reload)
  const { cards, createCard, updateCard, updateCardCategory, deleteCard } =
    usePersonalCards()

  // 🆕 Statut admin + free (détection cosmétique)
  const { isAdmin, isFree } = useAccountStatus()

  // 🆕 Cartes banque : rawBankCards vient maintenant de la prop (source unique depuis page)
  // On charge les hooks uniquement pour obtenir les méthodes CRUD (admin)
  const adminBankCardsHook = useAdminBankCards()

  const {
    updateName: updateBankCardName,
    deleteCard: deleteBankCard,
    updatePublished: updateBankCardPublished,
  } = isAdmin
    ? adminBankCardsHook
    : {
        updateName: undefined,
        deleteCard: undefined,
        updatePublished: undefined,
      }

  // 🆕 Cartes banque pour affichage (mapping simple sans catégories)
  const bankCardsForDisplay = useMemo(
    () =>
      rawBankCards.map(bc => ({
        id: bc.id,
        name: bc.name,
        image_url: bc.image_url || '',
        published: bc.published,
      })),
    [rawBankCards]
  )

  // ── PHASE 1 : Timeline + Slots reçus en props (source unique partagée) ───
  // Suppression useTimelines/useSlots locaux → désync résolu
  // timeline, slots, updateSlot proviennent du parent page.tsx

  // ── Guards : offline + execution-only ────────────────────────────────────
  const { isOnline } = useOffline()
  const { isExecutionOnly } = useExecutionOnly()
  // session reçu en prop depuis page.tsx (source unique — évite désync après reset)

  // Checkbox disabled si offline ou execution-only
  const checkboxDisabled = !isOnline || isExecutionOnly

  // ✅ Transformation Category (DB) → Categorie (UI) + Déduplication
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>()
    return categories
      .map(cat => ({
        value: cat.id, // ✅ Utiliser id comme value (unique garanti)
        label: getCategoryDisplayLabel(cat),
      }))
      .filter(cat => {
        if (seen.has(cat.value as string)) return false
        seen.add(cat.value as string)
        return true
      })
  }, [categories])
  const systemCategoryId = useMemo(
    () => categories.find(cat => cat.is_system)?.id ?? null,
    [categories]
  )

  const handleCardAjoutee = () => triggerReload()

  // Guard proactif quota stock cartes (évite upload image inutile si limite atteinte)
  // Quota mensuel : non détectable proactivement → géré réactivement dans handleSubmitCard
  const handleShowCardQuotaModal = async (_type: string): Promise<boolean> => {
    if (cards.length >= CARD_STOCK_LIMIT) {
      setShowCardQuotaModal(true)
      return false
    }
    return true
  }

  const handleSubmitCard = async ({
    label,
    imagePath,
    cardId,
  }: CardFormData) => {
    if (!user?.id) {
      show(t('edition.errorUser'), 'error')
      return
    }

    // ✅ DB-first : INSERT avec cardId généré client-side
    const { error: insertError } = await createCard({
      id: cardId, // 🆕 Même ID que Storage
      name: label,
      image_url: imagePath, // Path: {accountId}/cards/{cardId}.jpg
    })

    if (insertError) {
      // 🗑️ Cleanup image orpheline si INSERT échoue
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
  const lockedCardIds = useMemo(() => {
    if (session?.state !== 'active_started') {
      return new Set<string>()
    }

    // Pendant active_started, verrouiller les checkboxes de TOUTES les cartes
    // présentes dans des slots étape (validés OU non validés).
    // Raison : retirer une carte d'une étape (card_id → NULL) pendant la session
    // laisse l'enfant face à un slot vide — expérience TSA désastreuse.
    // Les cartes non assignées (hors timeline) restent cochables (assignment autorisé).
    return new Set(
      slots
        .filter(slot => slot.kind === 'step' && slot.card_id !== null)
        .map(slot => slot.card_id as string)
    )
  }, [session?.state, slots])

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
    const effectiveCategoryId = categoryId || systemCategoryId || null
    if (!effectiveCategoryId) {
      show('Aucune catégorie disponible', 'error')
      return
    }

    // ✅ DB-first : UPSERT dans user_card_categories (mapping user ↔ card ↔ category)
    const { error } = await updateCardCategory(String(id), effectiveCategoryId)

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
    const { error } = await updateCard(String(id), { name: label })
    if (error) {
      show('Impossible de renommer la carte', 'error')
      return
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cards:changed', { detail: { cardId: String(id) } })
      )
    }
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

      if (lockedCardIds.has(cardId)) {
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
    [timeline, slots, updateSlot, show, lockedCardIds]
  )

  // 🆕 Handler création carte banque (admin uniquement)
  const handleCreateBankCard = () => {
    if (!isAdmin) {
      show('Action réservée aux administrateurs', 'error')
      return
    }
    setShowCreateBankCardModal(true)
  }

  const handleBankCardCreated = () => {
    setShowCreateBankCardModal(false)
    refreshBankCards()
    show('Carte de banque créée avec succès', 'success')
  }

  // 🆕 Handler édition nom carte banque (admin uniquement)
  // Ouvre modal de confirmation avant modification
  const handleUpdateBankCardName = async (
    id: string,
    newName: string
  ): Promise<{ error: Error | null }> => {
    if (!isAdmin || !updateBankCardName) {
      show('Action réservée aux administrateurs', 'error')
      return { error: new Error('Action réservée aux administrateurs') }
    }

    // Trouver le nom actuel de la carte
    const card = rawBankCards.find(c => c.id === id)
    if (!card) return { error: new Error('Carte introuvable') }

    // Ouvrir modal de confirmation (pas d'erreur à cette étape)
    setBankCardToRename({
      id,
      oldName: card.name,
      newName,
    })
    return { error: null }
  }

  // Handler de confirmation modification nom
  const confirmUpdateBankCardName = async () => {
    if (!bankCardToRename || !updateBankCardName) return

    const { id, newName } = bankCardToRename

    const { error } = await updateBankCardName(id, newName)

    if (error) {
      console.error('[Edition] Erreur update nom carte banque:', error)
      show('Impossible de modifier le nom de la carte', 'error')
      setBankCardToRename(null)
      return
    }

    // ✅ CRITIQUE : Refresh pour propager immédiatement aux slots timeline
    refreshBankCards()

    show('Nom de la carte modifié avec succès', 'success')
    setBankCardToRename(null)
  }

  // 🆕 Handler suppression carte banque (admin uniquement)
  // Ouvre modal de confirmation avant suppression
  const handleDeleteBankCard = async (id: string, name: string) => {
    if (!isAdmin || !deleteBankCard) {
      show('Action réservée aux administrateurs', 'error')
      return
    }

    // Ouvrir modal de confirmation
    setBankCardToDelete({ id, name })
  }

  // Handler de confirmation suppression
  const confirmDeleteBankCard = async () => {
    if (!bankCardToDelete || !deleteBankCard) return

    const { id } = bankCardToDelete

    const { error } = await deleteBankCard(id)

    if (error) {
      console.error('[Edition] Erreur suppression carte banque:', error)

      // ✅ Traduction erreur DB en message utilisateur (wording contractuel)
      const errorMsg = error.message || ''

      // Cas 1 : Carte référencée dans slots/sequences/categories
      if (
        errorMsg.includes('still referenced') ||
        errorMsg.includes('active_sessions')
      ) {
        show('Cette carte est utilisée et ne peut pas être supprimée.', 'error')
      } else {
        // Cas 2 : Erreur DB inconnue
        show('Impossible de supprimer cette carte.', 'error')
      }

      setBankCardToDelete(null)
      return
    }

    // ✅ CRITIQUE : Refresh pour propager immédiatement aux slots timeline
    refreshBankCards()

    show('Carte de banque supprimée avec succès', 'success')
    setBankCardToDelete(null)
  }

  // 🆕 Handler basculer statut published carte banque (admin uniquement)
  // Ouvre modal de confirmation avant basculement
  const handleUpdateBankCardPublished = async (
    id: string,
    newPublished: boolean
  ) => {
    if (!isAdmin || !updateBankCardPublished) {
      show('Action réservée aux administrateurs', 'error')
      return
    }

    // Trouver le nom de la carte
    const card = rawBankCards.find(c => c.id === id)
    if (!card) return

    // Ouvrir modal de confirmation
    setBankCardToTogglePublish({
      id,
      name: card.name,
      newPublished,
    })
  }

  // Handler de confirmation basculement published
  const confirmUpdateBankCardPublished = async () => {
    if (!bankCardToTogglePublish || !updateBankCardPublished) return

    const { id, newPublished } = bankCardToTogglePublish

    const { error } = await updateBankCardPublished(id, newPublished)

    if (error) {
      console.error('[Edition] Erreur update published carte banque:', error)
      show('Impossible de modifier le statut de publication', 'error')
      setBankCardToTogglePublish(null)
      return
    }

    // ✅ CRITIQUE : Refresh pour propager immédiatement aux slots timeline
    refreshBankCards()

    show(
      newPublished
        ? 'Carte publiée avec succès (visible par tous)'
        : 'Carte dépubliée avec succès (visible par admin uniquement)',
      'success'
    )
    setBankCardToTogglePublish(null)
  }

  return (
    <div className="page-edition">
      {/* WCAG 2.4.6 - Structure sémantique avec h1 */}
      <h1 className="sr-only">{t('edition.title')}</h1>

      <section className="edition-sections">
        <Separator />

        <section className="taches-edition" aria-label="Bibliothèque de cartes">
          {/* ✅ Nouveau système : Cards uniquement */}
          <CardsEdition
            items={visibleCards.map(c => ({
              id: c.id,
              name: c.name,
              image_url: c.image_url,
              ...(c.category_id != null ? { categorie: c.category_id } : {}), // ✅ Mapping category_id → categorie
            }))}
            categories={categories}
            onSubmitCard={handleSubmitCard}
            onShowQuotaModal={handleShowCardQuotaModal}
            onAddCategory={handleAddCategoryWithQuota}
            onDeleteCategory={handleDeleteCategory}
            filterCategory={filterCategory}
            onChangeFilterCategory={setFilterCategory}
            onUpdateLabel={handleUpdateLabel}
            onUpdateCategorie={handleUpdateCategorie}
            onDelete={c => setCardASupprimer(c)}
            isSubmittingCategory={isSubmittingCategory}
            systemCategoryId={systemCategoryId}
            timelineSlots={slots}
            onToggleCardInTimeline={handleToggleCardInTimeline}
            checkboxDisabled={checkboxDisabled}
            lockedCardIds={lockedCardIds}
            // 🆕 Props cartes banque (avec catégories hydratées)
            bankCards={bankCardsForDisplay.map(bc => ({
              id: bc.id,
              name: bc.name,
              image_url: bc.image_url,
              type: 'bank' as const,
              published: bc.published, // ✅ Statut réel de publication
            }))}
            {...(isAdmin
              ? {
                  onCreateBankCard: handleCreateBankCard,
                  onUpdateBankCardName: handleUpdateBankCardName,
                  onDeleteBankCard: handleDeleteBankCard,
                  onUpdateBankCardPublished: handleUpdateBankCardPublished,
                }
              : {})}
            isAdmin={isAdmin}
            isFree={isVisitor || isFree}
          />
        </section>
      </section>

      <Suspense fallback={null}>
        <ModalConfirm
          isOpen={!!cardASupprimer}
          onClose={() => setCardASupprimer(null)}
          confirmLabel={t('edition.confirmDeleteTask')}
          onConfirm={async () => {
            if (cardASupprimer) {
              const { error } = await deleteCard(String(cardASupprimer.id))
              if (!error) {
                // ✅ DB-first : ON DELETE SET NULL a vidé les slots concernés
                // Rafraîchir l'UI de la timeline pour refléter changements DB
                refreshSlots()
                show('Carte supprimée avec succès', 'success')
              } else {
                // ✅ DB-first : Afficher erreur DB (trigger RAISE EXCEPTION ou RLS)
                show(error.message || 'Erreur lors de la suppression', 'error')
              }
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

      {/* 🆕 Modal création carte banque (admin uniquement) */}
      <Suspense fallback={null}>
        {showCreateBankCardModal && (
          <CreateBankCardModal
            onClose={() => setShowCreateBankCardModal(false)}
            onSuccess={handleBankCardCreated}
            overlayClassName="modal-overlay--transparent"
          />
        )}
      </Suspense>

      {/* 🆕 Modal confirmation modification nom carte banque (admin uniquement) */}
      <Suspense fallback={null}>
        <ModalConfirm
          isOpen={!!bankCardToRename}
          onClose={() => setBankCardToRename(null)}
          confirmLabel="Modifier"
          onConfirm={confirmUpdateBankCardName}
        >
          <p>Confirmer la modification du nom de la carte de banque ?</p>
          <p>
            <strong>Ancien nom :</strong> &quot;{bankCardToRename?.oldName}
            &quot;
          </p>
          <p>
            <strong>Nouveau nom :</strong> &quot;{bankCardToRename?.newName}
            &quot;
          </p>
        </ModalConfirm>
      </Suspense>

      {/* 🆕 Modal confirmation suppression carte banque (admin uniquement) */}
      <Suspense fallback={null}>
        <ModalConfirm
          isOpen={!!bankCardToDelete}
          onClose={() => setBankCardToDelete(null)}
          confirmLabel="Supprimer"
          onConfirm={confirmDeleteBankCard}
        >
          <p>
            ❗ Confirmer la suppression de la carte de banque &quot;
            {bankCardToDelete?.name}&quot; ?
          </p>
          <p>
            <strong>Cette action est irréversible.</strong>
          </p>
          <p>
            La suppression peut échouer si la carte est utilisée dans des
            timelines existantes.
          </p>
        </ModalConfirm>
      </Suspense>

      {/* 🆕 Modal confirmation basculement statut published (admin uniquement) */}
      <Suspense fallback={null}>
        <ModalConfirm
          isOpen={!!bankCardToTogglePublish}
          onClose={() => setBankCardToTogglePublish(null)}
          confirmLabel="Confirmer"
          onConfirm={confirmUpdateBankCardPublished}
        >
          <p>
            Confirmer le changement de statut de publication de la carte &quot;
            {bankCardToTogglePublish?.name}&quot; ?
          </p>
          <p>
            {bankCardToTogglePublish?.newPublished ? (
              <>
                <strong>Publier la carte</strong> : Elle deviendra visible par
                tous les utilisateurs.
              </>
            ) : (
              <>
                <strong>Dépublier la carte</strong> : Elle ne sera visible que
                par les administrateurs.
              </>
            )}
          </p>
        </ModalConfirm>
      </Suspense>

      {/* Guard quota cartes : affiché avant ouverture modal création si limite stock atteinte */}
      <Suspense fallback={null}>
        <ModalQuota
          isOpen={showCardQuotaModal}
          onClose={() => setShowCardQuotaModal(false)}
          contentType="card"
          currentUsage={cards.length}
          limit={CARD_STOCK_LIMIT}
          period="total"
        />
      </Suspense>
    </div>
  )
}
