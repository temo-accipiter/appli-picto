import useAdminBankCards from '@/hooks/useAdminBankCards'
import { useMemo, useState } from 'react'

// Type local — correspond aux props bankCards reçues par Edition depuis page.tsx
interface RawBankCard {
  id: string
  name: string
  image_url: string
  published: boolean
}

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface UseAdminBankCardActionsOptions {
  isAdmin: boolean
  rawBankCards: RawBankCard[]
  refreshBankCards: () => void
  show: (message: string, type?: ToastType) => void
}

/**
 * Encapsule toute la logique admin des cartes de banque extraite d'Edition.tsx :
 * - 4 états de modales (création, renommage, suppression, publication)
 * - Mapping rawBankCards → bankCardsForDisplay
 * - 8 handlers (handle* + confirm*)
 *
 * Dépendances externes : isAdmin, rawBankCards, refreshBankCards, show
 * Hook interne : useAdminBankCards (CRUD Supabase)
 */
export function useAdminBankCardActions({
  isAdmin,
  rawBankCards,
  refreshBankCards,
  show,
}: UseAdminBankCardActionsOptions) {
  // ── États modales admin ───────────────────────────────────────────────────
  const [showCreateBankCardModal, setShowCreateBankCardModal] = useState(false)
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

  // ── Hook CRUD admin (toujours appelé — règle React hooks) ─────────────────
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

  // ── Mapping pour affichage (sans catégories) ──────────────────────────────
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

  // ── Handlers création ─────────────────────────────────────────────────────

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

  // ── Handlers renommage ────────────────────────────────────────────────────

  // Ouvre modal de confirmation avant modification
  const handleUpdateBankCardName = async (
    id: string,
    newName: string
  ): Promise<{ error: Error | null }> => {
    if (!isAdmin || !updateBankCardName) {
      show('Action réservée aux administrateurs', 'error')
      return { error: new Error('Action réservée aux administrateurs') }
    }

    const card = rawBankCards.find(c => c.id === id)
    if (!card) return { error: new Error('Carte introuvable') }

    setBankCardToRename({ id, oldName: card.name, newName })
    return { error: null }
  }

  // Exécute le renommage après confirmation
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

  // ── Handlers suppression ──────────────────────────────────────────────────

  // Ouvre modal de confirmation avant suppression
  const handleDeleteBankCard = async (id: string, name: string) => {
    if (!isAdmin || !deleteBankCard) {
      show('Action réservée aux administrateurs', 'error')
      return
    }
    setBankCardToDelete({ id, name })
  }

  // Exécute la suppression après confirmation
  const confirmDeleteBankCard = async () => {
    if (!bankCardToDelete || !deleteBankCard) return

    const { id } = bankCardToDelete
    const { error } = await deleteBankCard(id)

    if (error) {
      console.error('[Edition] Erreur suppression carte banque:', error)

      // ✅ Traduction erreur DB en message utilisateur (wording contractuel)
      const errorMsg = error.message || ''

      if (
        errorMsg.includes('still referenced') ||
        errorMsg.includes('active_sessions')
      ) {
        show('Cette carte est utilisée et ne peut pas être supprimée.', 'error')
      } else {
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

  // ── Handlers publication ──────────────────────────────────────────────────

  // Ouvre modal de confirmation avant basculement published
  const handleUpdateBankCardPublished = async (
    id: string,
    newPublished: boolean
  ) => {
    if (!isAdmin || !updateBankCardPublished) {
      show('Action réservée aux administrateurs', 'error')
      return
    }

    const card = rawBankCards.find(c => c.id === id)
    if (!card) return

    setBankCardToTogglePublish({ id, name: card.name, newPublished })
  }

  // Exécute le basculement après confirmation
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

  return {
    // Données d'affichage
    bankCardsForDisplay,
    // États modales (pour conditions JSX)
    showCreateBankCardModal,
    bankCardToRename,
    bankCardToDelete,
    bankCardToTogglePublish,
    // Setters (pour onClose des modales)
    setShowCreateBankCardModal,
    setBankCardToRename,
    setBankCardToDelete,
    setBankCardToTogglePublish,
    // Handlers pour props CardsEdition (admin)
    handleCreateBankCard,
    handleUpdateBankCardName,
    handleDeleteBankCard,
    handleUpdateBankCardPublished,
    // Handlers pour callbacks des modales
    handleBankCardCreated,
    confirmUpdateBankCardName,
    confirmDeleteBankCard,
    confirmUpdateBankCardPublished,
  }
}

export default useAdminBankCardActions
