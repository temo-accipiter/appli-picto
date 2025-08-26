// src/components/selectedRewardFloating/SelectedRewardFloating.jsx
import { EditionCard, SignedImage } from '@/components'
import './SelectedRewardFloating.scss'

import PropTypes from 'prop-types'

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

SelectedRewardFloating.propTypes = {
  reward: PropTypes.shape({
    id: PropTypes.string.isRequired,
    imagepath: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
}
