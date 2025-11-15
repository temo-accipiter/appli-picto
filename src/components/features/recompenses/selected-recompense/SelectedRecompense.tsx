'use client'

/**
 * Rôle :
 *   Affiche la récompense actuellement sélectionnée.
 *   • Affichée uniquement si une récompense existe.
 *   • Indique si la récompense est débloquée (toutes les tâches terminées).
 *   • Permet de confirmer la sélection en cliquant lorsque déverrouillée.
 */

import { SignedImage } from '@/components'
import './SelectedRecompense.scss'

interface Recompense {
  id: string
  label: string
  imagepath?: string
  selected?: boolean
}

interface SelectedRecompenseProps {
  recompense: Recompense | null
  done: number
  total: number
  onSelect: (id: string) => void
}

export default function SelectedRecompense({
  recompense,
  done,
  total,
  onSelect,
}: SelectedRecompenseProps) {
  if (!recompense) return null

  const isUnlocked = total > 0 && done === total

  return (
    <div
      className={`selected-recompense ${isUnlocked ? 'unlocked' : 'locked'}`}
      onClick={() => isUnlocked && onSelect(recompense.id)}
    >
      <span className="label">{recompense.label}</span>
      {recompense.imagepath && (
        <SignedImage
          filePath={recompense.imagepath}
          bucket="images"
          alt={recompense.label}
          size={40}
        />
      )}
    </div>
  )
}
