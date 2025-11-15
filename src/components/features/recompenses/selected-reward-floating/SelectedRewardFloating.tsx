'use client'

// src/components/selectedRewardFloating/SelectedRewardFloating.tsx
import { DemoSignedImage, EditionCard, SignedImage } from '@/components'
import './SelectedRewardFloating.scss'

interface Reward {
  id: string
  imagepath: string | null
  label: string
  isDemo?: boolean
}

interface SelectedRewardFloatingProps {
  reward: Reward | null
}

export default function SelectedRewardFloating({
  reward,
}: SelectedRewardFloatingProps) {
  if (!reward || !reward.id || !reward.imagepath) return null

  return (
    <div className="selected-reward-floating" aria-hidden="true">
      <EditionCard
        imageComponent={
          reward.isDemo ? (
            <DemoSignedImage
              filePath={reward.imagepath}
              alt={reward.label}
              className="img-size-xs"
            />
          ) : (
            <SignedImage
              filePath={reward.imagepath}
              bucket="images"
              alt={reward.label}
              className="img-size-xs"
            />
          )
        }
        label={reward.label}
        labelId={reward.id}
        editable={false}
        checked={false}
        onToggleCheck={() => {}}
        onDelete={() => {}}
        categorieOptions={[]} // masque le select
        className="grayscale no-actions"
      />
    </div>
  )
}
