'use client'

import {
  Button,
  EditionCard,
  ModalAjout,
  ModalCategory,
  ModalConfirm,
  Select,
  SignedImage,
  DndGrid,
} from '@/components'
import { useEditionState, useI18n } from '@/hooks'
import React, { useState } from 'react'
import type { Categorie } from '@/types/global'
import type { CardFormData, CardItem } from '@/types/cards'
import { ChevronDown } from 'lucide-react'
import './CardsEdition.scss'

// 🆕 Carte de banque (lecture seule, utilisable dans timeline)
interface BankCardItem {
  id: string
  name: string
  image_url?: string
  type: 'bank'
  published: boolean
}

interface CardsEditionProps {
  items: CardItem[]
  categories: Categorie[]
  onUpdateLabel: (id: string | number, label: string) => void
  onUpdateCategorie: (id: string | number, categorie: string) => void
  onDelete: (item: CardItem) => void
  onSubmitCard: (data: CardFormData) => void
  onAddCategory: (e: React.FormEvent, label: string) => Promise<void>
  onDeleteCategory: (value: string | number) => Promise<void>
  filterCategory: string
  onChangeFilterCategory: (value: string) => void
  onReorder?: (ids: (string | number)[]) => void
  onShowQuotaModal?: (type: string) => Promise<boolean>
  isSubmittingCategory?: boolean
  systemCategoryId?: string | null
  // ── PHASE 1 : Checkbox bibliothèque contrôlée par timeline ────────────────
  /**
   * Slots de la timeline active (pour calculer checked).
   * Si undefined, la checkbox est masquée (pas de timeline active).
   */
  timelineSlots?: Array<{
    id: string
    card_id: string | null
    kind: 'step' | 'reward'
    position: number
  }>
  /**
   * Handler checkbox : ajoute carte au premier slot étape vide ou retire de tous.
   * Fourni par Edition.tsx qui a accès à useSlots.
   */
  onToggleCardInTimeline?: (
    cardId: string,
    currentlyChecked: boolean
  ) => Promise<void>
  /**
   * Guards : checkbox disabled si offline/execution-only/session locked.
   */
  checkboxDisabled?: boolean
  /** Cartes verrouillées car déjà validées dans la session active. */
  lockedCardIds?: Set<string>
  // 🆕 ADMIN : Cartes banque (optionnel)
  /**
   * Cartes de banque (visible par tous, éditable uniquement par admin).
   * Si fourni, affiche deux sections : "Cartes banque" + "Mes cartes".
   */
  bankCards?: BankCardItem[]
  /**
   * Handler création carte banque (admin uniquement).
   * Si fourni, affiche le bouton "+ Créer carte de banque".
   */
  onCreateBankCard?: () => void
  /**
   * Handler édition nom carte banque (admin uniquement).
   */
  onUpdateBankCardName?: (
    id: string,
    name: string
  ) => Promise<{ error: Error | null }>
  /**
   * Handler suppression carte banque (admin uniquement).
   */
  onDeleteBankCard?: (id: string, name: string) => Promise<void>
  /**
   * Handler basculer statut published carte banque (admin uniquement).
   */
  onUpdateBankCardPublished?: (id: string, published: boolean) => Promise<void>
  /**
   * Indique si l'utilisateur est admin (pour afficher bouton création banque).
   */
  isAdmin?: boolean
  /**
   * Indique si l'utilisateur est Free (pour masquer création carte/catégorie).
   * Usage cosmétique uniquement (autorisation = DB via RLS).
   */
  isFree?: boolean
}

export default function CardsEdition({
  items,
  categories,
  onUpdateLabel,
  onUpdateCategorie,
  onDelete,
  onSubmitCard,
  onAddCategory,
  onDeleteCategory,
  filterCategory,
  onChangeFilterCategory,
  onReorder,
  onShowQuotaModal,
  isSubmittingCategory = false,
  systemCategoryId = null,
  timelineSlots,
  onToggleCardInTimeline,
  checkboxDisabled = false,
  lockedCardIds,
  // 🆕 Props cartes banque (optionnelles)
  bankCards,
  onCreateBankCard,
  onUpdateBankCardName,
  onDeleteBankCard,
  onUpdateBankCardPublished,
  isAdmin = false,
  isFree = false,
}: CardsEditionProps) {
  const [modalCardOpen, setModalCardOpen] = useState(false)
  const [manageCatOpen, setManageCatOpen] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [catASupprimer, setCatASupprimer] = useState<string | number | null>(
    null
  )
  const [showActions, setShowActions] = useState(false)
  // 🆕 État pour afficher/masquer la section cartes banque (collapsible)
  const [showBankCards, setShowBankCards] = useState(false)

  const { t } = useI18n()

  const {
    drafts,
    errors,
    successIds,
    handleChange,
    validateLabel,
    clearDraft,
    clearError,
    setError,
    triggerSuccess,
  } = useEditionState({
    validationErrorMessage: t('card.invalidName'),
    successDuration: 600,
  })

  const handleBlur = (id: string | number, value: string) => {
    const err = validateLabel(value)
    if (err) {
      setError(id, err)
      return
    }

    onUpdateLabel(id, value)
    clearDraft(id)
    clearError(id)
    triggerSuccess(id)
  }

  const handleAddCategory = async (
    e: React.FormEvent,
    categoryLabel: string | null = null
  ) => {
    e.preventDefault()

    const labelToUse = categoryLabel ?? newCatLabel
    const clean = labelToUse.trim().replace(/\s+/g, ' ')

    if (!clean) return

    await onAddCategory(e, clean)
    setNewCatLabel('')
  }

  const handleRemoveCategory = async (value: string | number) => {
    await onDeleteCategory(value)
    setCatASupprimer(null)
  }

  /**
   * PHASE 1 : Calculer si une carte est présente dans au moins un slot.
   * checked = true si card_id existe dans timelineSlots.
   */
  const isCardInTimeline = (cardId: string | number): boolean => {
    if (!timelineSlots) return false
    return timelineSlots.some(slot => slot.card_id === String(cardId))
  }

  /**
   * PHASE 1 : Handler checkbox — toggle carte dans timeline.
   */
  const handleToggleCheckbox = async (cardId: string | number) => {
    if (!onToggleCardInTimeline) return

    const currentlyChecked = isCardInTimeline(cardId)
    await onToggleCardInTimeline(String(cardId), currentlyChecked)
  }

  // ✅ Free : Affichage simplifié (uniquement cartes banque, sans édition)
  if (isFree) {
    return (
      <div className="checklist-edition">
        {/* Affichage simplifié : uniquement cartes banque (lecture seule) */}
        {bankCards && bankCards.length > 0 ? (
          <DndGrid
            items={bankCards}
            // 🔒 Cartes banque : pas de réorganisation (lecture seule)
            onReorder={() => {
              // No-op : cartes banque non réorganisables
            }}
            renderItem={(bankCard: BankCardItem) => (
              <EditionCard
                imageComponent={
                  <SignedImage
                    filePath={bankCard.image_url || ''}
                    bucket="bank-images"
                    alt={bankCard.name}
                    size={80}
                  />
                }
                labelId={bankCard.id}
                label={bankCard.name}
                // 🔒 Free : lecture seule (pas d'édition)
                editable={false}
                // ✅ Checkbox timeline active
                checked={isCardInTimeline(bankCard.id)}
                onToggleCheck={() => handleToggleCheckbox(bankCard.id)}
                disabled={checkboxDisabled}
                checkboxDisabled={lockedCardIds?.has(bankCard.id) ?? false}
              />
            )}
            columns={3}
            gap="medium"
            layout="custom"
            className="edition-section__grid"
            getItemId={(bankCard: BankCardItem) => bankCard.id}
          />
        ) : (
          <div
            className="edition-section__empty"
            role="status"
            aria-live="polite"
          >
            💤 Aucune carte de banque disponible
          </div>
        )}
      </div>
    )
  }

  // ✅ Subscriber/Admin : Affichage complet avec toutes les options d'édition
  return (
    <div className="checklist-edition">
      <Button
        label={
          <span className="button-label">
            ⚙️ Options d&apos;édition
            <ChevronDown
              className={`chevron ${showActions ? 'open' : ''}`}
              size={16}
              aria-hidden="true"
            />
          </span>
        }
        onClick={() => setShowActions(prev => !prev)}
        aria-expanded={showActions}
      />

      {showActions && (
        <div className="edition-section__actions">
          {/* ✅ Bouton création carte : masqué si Free (cosmétique) */}
          {!isFree && (
            <Button
              label="➕ Créer une carte"
              onClick={async () => {
                if (onShowQuotaModal) {
                  const canOpen = await onShowQuotaModal('card')
                  if (canOpen) {
                    setModalCardOpen(true)
                  }
                } else {
                  setModalCardOpen(true)
                }
              }}
            />
          )}
          {/* 🆕 Bouton création carte banque (admin uniquement) */}
          {isAdmin && onCreateBankCard && (
            <Button
              label="➕ Créer carte de banque"
              onClick={onCreateBankCard}
              variant="secondary"
            />
          )}
          {/* ✅ Bouton gestion catégories : masqué si Free (cosmétique) */}
          {!isFree && (
            <Button
              label={`⚙️ ${t('tasks.manageCategories')}`}
              onClick={() => setManageCatOpen(true)}
            />
          )}
          {/* ✅ Sélecteur filtre catégorie : masqué si Free (cosmétique) */}
          {!isFree && (
            <Select
              id="filter-category"
              label={t('tasks.filterByCategory')}
              options={[
                { value: 'all', label: t('tasks.all') },
                ...categories.map(c => ({ value: c.id, label: c.name })),
              ]}
              value={filterCategory}
              onChange={value => onChangeFilterCategory(String(value))}
            />
          )}
        </div>
      )}

      {/* 🆕 Affichage : deux sections si bankCards fourni, sinon une seule grille */}
      {bankCards && bankCards.length > 0 ? (
        <div className="cards-edition__library-sections">
          {/* Section 1 : Cartes banque (collapsible) */}
          <div className="cards-edition__library-group">
            <Button
              label={
                <span className="button-label">
                  Cartes banque ({bankCards.length})
                  <ChevronDown
                    className={`chevron ${showBankCards ? 'open' : ''}`}
                    size={16}
                    aria-hidden="true"
                  />
                </span>
              }
              onClick={() => setShowBankCards(prev => !prev)}
              aria-expanded={showBankCards}
              className="cards-edition__section-toggle"
            />
            {showBankCards &&
              (bankCards.length === 0 ? (
                <div
                  className="edition-section__empty"
                  role="status"
                  aria-live="polite"
                >
                  💤 Aucune carte de banque
                </div>
              ) : (
                <DndGrid
                  items={bankCards}
                  // 🔒 Cartes banque : pas de réorganisation (lecture seule)
                  onReorder={() => {
                    // No-op : cartes banque non réorganisables
                  }}
                  renderItem={(bankCard: BankCardItem) => {
                    // 🔒 SÉCURITÉ TSA : Verrouiller nom si carte publiée (éviter perturbation sessions actives)
                    const canEditBankCard =
                      isAdmin && !!onUpdateBankCardName && !bankCard.published
                    const canDeleteBankCard = isAdmin && !!onDeleteBankCard
                    const canTogglePublished =
                      isAdmin && !!onUpdateBankCardPublished

                    return (
                      <EditionCard
                        imageComponent={
                          <SignedImage
                            filePath={bankCard.image_url || ''}
                            bucket="bank-images"
                            alt={bankCard.name}
                            size={80}
                          />
                        }
                        labelId={bankCard.id}
                        label={drafts[bankCard.id] ?? bankCard.name}
                        editable={canEditBankCard}
                        // ✅ Diffusion conditionnelle (exactOptionalPropertyTypes)
                        {...(canEditBankCard
                          ? {
                              onLabelChange: (val: string) =>
                                handleChange(bankCard.id, val),
                              onBlur: async (val: string) => {
                                const err = validateLabel(val)
                                if (err) {
                                  setError(bankCard.id, err)
                                  return
                                }
                                const result = await onUpdateBankCardName?.(
                                  bankCard.id,
                                  val
                                )
                                // Draft toujours nettoyé (même si erreur Supabase)
                                clearDraft(bankCard.id)
                                clearError(bankCard.id)
                                // Success uniquement si pas d'erreur Supabase
                                if (!result?.error) triggerSuccess(bankCard.id)
                              },
                            }
                          : {})}
                        {...(canDeleteBankCard
                          ? {
                              onDelete: async () => {
                                await onDeleteBankCard?.(
                                  bankCard.id,
                                  bankCard.name
                                )
                              },
                            }
                          : {})}
                        {...(canTogglePublished
                          ? {
                              published: bankCard.published,
                              onPublishedChange: async (
                                newPublished: boolean
                              ) => {
                                await onUpdateBankCardPublished?.(
                                  bankCard.id,
                                  newPublished
                                )
                              },
                            }
                          : {})}
                        // ✅ Checkbox timeline active
                        checked={isCardInTimeline(bankCard.id)}
                        onToggleCheck={() => handleToggleCheckbox(bankCard.id)}
                        disabled={checkboxDisabled}
                        checkboxDisabled={
                          lockedCardIds?.has(bankCard.id) ?? false
                        }
                        // 🚫 Pas de catégories pour cartes banque (non pertinent)
                        className={[
                          errors[bankCard.id]
                            ? 'input-field__input--error'
                            : '',
                          successIds.has(bankCard.id)
                            ? 'input-field__input--success'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      />
                    )
                  }}
                  columns={3}
                  gap="medium"
                  layout="custom"
                  className="edition-section__grid"
                  getItemId={(bankCard: BankCardItem) => bankCard.id}
                />
              ))}
          </div>

          {/* Section 2 : Mes cartes (édition complète) */}
          <div className="cards-edition__library-group">
            <h3 className="cards-edition__section-title">
              Mes cartes ({items.length})
            </h3>
            {items.length === 0 ? (
              <div
                className="edition-section__empty"
                role="status"
                aria-live="polite"
              >
                💤 Aucune carte personnelle
              </div>
            ) : (
              <DndGrid
                items={items}
                onReorder={newItems => {
                  if (onReorder) {
                    onReorder(newItems.map(item => item.id))
                  }
                }}
                renderItem={(item: CardItem) => (
                  <EditionCard
                    imageComponent={
                      <SignedImage
                        filePath={item.image_url || ''}
                        bucket="personal-images"
                        alt={item.name}
                        size={80}
                      />
                    }
                    labelId={item.id}
                    label={drafts[item.id] ?? item.name}
                    onLabelChange={val => handleChange(item.id, val)}
                    onBlur={val => handleBlur(item.id, val)}
                    onDelete={() => onDelete(item)}
                    checked={isCardInTimeline(item.id)}
                    onToggleCheck={() => handleToggleCheckbox(item.id)}
                    disabled={checkboxDisabled}
                    checkboxDisabled={
                      lockedCardIds?.has(String(item.id)) ?? false
                    }
                    categorie={item.categorie || ''}
                    {...(systemCategoryId != null
                      ? { defaultCategoryId: systemCategoryId }
                      : {})}
                    onCategorieChange={val => onUpdateCategorie(item.id, val)}
                    categorieOptions={categories.map(c => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    className={[
                      errors[item.id] ? 'input-field__input--error' : '',
                      successIds.has(item.id)
                        ? 'input-field__input--success'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                )}
                columns={3}
                gap="medium"
                layout="custom"
                className="edition-section__grid"
                getItemId={(item: CardItem) => item.id}
              />
            )}
          </div>
        </div>
      ) : (
        // Comportement actuel : une seule grille (cartes personnelles uniquement)
        <>
          {items.length === 0 ? (
            <div
              className="edition-section__empty"
              role="status"
              aria-live="polite"
            >
              💤 Aucune carte à afficher
            </div>
          ) : (
            <DndGrid
              items={items}
              onReorder={newItems => {
                if (onReorder) {
                  onReorder(newItems.map(item => item.id))
                }
              }}
              renderItem={(item: CardItem) => (
                <EditionCard
                  imageComponent={
                    <SignedImage
                      filePath={item.image_url || ''}
                      bucket="personal-images"
                      alt={item.name}
                      size={80}
                    />
                  }
                  labelId={item.id}
                  label={drafts[item.id] ?? item.name}
                  onLabelChange={val => handleChange(item.id, val)}
                  onBlur={val => handleBlur(item.id, val)}
                  onDelete={() => onDelete(item)}
                  checked={isCardInTimeline(item.id)}
                  onToggleCheck={() => handleToggleCheckbox(item.id)}
                  disabled={checkboxDisabled}
                  checkboxDisabled={
                    lockedCardIds?.has(String(item.id)) ?? false
                  }
                  categorie={item.categorie || ''}
                  {...(systemCategoryId != null
                    ? { defaultCategoryId: systemCategoryId }
                    : {})}
                  onCategorieChange={val => onUpdateCategorie(item.id, val)}
                  categorieOptions={categories.map(c => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  className={[
                    errors[item.id] ? 'input-field__input--error' : '',
                    successIds.has(item.id)
                      ? 'input-field__input--success'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
              columns={3}
              gap="medium"
              layout="custom"
              className="edition-section__grid"
              getItemId={(item: CardItem) => item.id}
            />
          )}
        </>
      )}

      <ModalAjout
        isOpen={modalCardOpen}
        onClose={() => setModalCardOpen(false)}
        includeCategory
        categories={categories}
        assetType="card_image"
        overlayClassName="modal-overlay--transparent"
        onSubmit={values => {
          onSubmitCard(values)
          setModalCardOpen(false)
        }}
      />

      <ModalCategory
        isOpen={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories.map(c => ({ value: c.id, label: c.name }))}
        onDeleteCategory={value => setCatASupprimer(value)}
        onAddCategory={handleAddCategory}
        newCategory={newCatLabel}
        onChangeNewCategory={setNewCatLabel}
        isSubmitting={isSubmittingCategory}
        overlayClassName="modal-overlay--transparent"
      />

      <ModalConfirm
        isOpen={!!catASupprimer}
        onClose={() => setCatASupprimer(null)}
        confirmLabel={t('actions.delete')}
        onConfirm={() => handleRemoveCategory(catASupprimer!)}
        overlayClassName="modal-overlay--transparent"
      >
        <>
          ❗ {t('edition.confirmDeleteCategory')}
          {categories.find(c => c.id === catASupprimer)?.name}&rdquo; ?
          <br />
          {t('edition.categoryReassignmentWarning')}
        </>
      </ModalConfirm>
    </div>
  )
}
