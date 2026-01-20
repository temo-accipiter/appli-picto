/**
 * Timeline Components - Barrel Export
 *
 * Composants pour Planning Visuel & Séquençage (Appli-Picto)
 *
 * - Timeline : Container horizontal sticky réutilisable (Édition + Tableau)
 * - EditionSlot : Slot éditable avec DnD, jetons, bouton supprimer
 *
 * Usage:
 *   import { Timeline, EditionSlot } from '@/components/features/timeline'
 */

export { default as Timeline } from './Timeline'
export type { TimelineProps } from './Timeline'

export { default as EditionSlot } from './EditionSlot'
export type { EditionSlotProps, EditionSlotCard } from './EditionSlot'
