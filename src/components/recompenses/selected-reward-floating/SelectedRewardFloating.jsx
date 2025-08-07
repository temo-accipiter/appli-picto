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
            bucket="images"
            alt={reward.label}
            className="img-size-xs"
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
