// src/components/selectedRewardFloating/SelectedRewardFloating.jsx
import './SelectedRewardFloating.scss'
import { EditionCard, SignedImage } from '@/components'

export default function SelectedRewardFloating({ reward }) {
  if (!reward || !reward.id || !reward.imagepath) return null

  return (
    <div className="selected-reward-floating" aria-hidden="true">
      <EditionCard
        imageComponent={
          <SignedImage
            filePath={reward.imagepath}
            alt={reward.label}
            size={50}
          />
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
