// src/types/cards.ts
// Types partagés pour les cartes personnelles — source unique de vérité

/**
 * Données du formulaire de création/édition d'une carte personnelle.
 * `categorie` est optionnel : obligatoire dans CardsEdition, facultatif dans Edition.
 */
export interface CardFormData {
  label: string
  categorie?: string
  image: File
  /** Path Storage uploadé : {accountId}/cards/{cardId}.jpg */
  imagePath: string
  imageUrl?: string
  /** UUID v4 généré côté client */
  cardId: string
}

/**
 * Représentation légère d'une carte pour les listes UI.
 * `position` est optionnel : utilisé pour le DnD dans CardsEdition, absent dans Edition.
 */
export interface CardItem {
  id: string | number
  name: string
  image_url?: string
  categorie?: string
  position?: number
}
