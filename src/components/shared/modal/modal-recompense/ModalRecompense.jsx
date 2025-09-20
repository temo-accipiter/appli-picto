import { DemoSignedImage, Modal, SignedImage } from '@/components'
import PropTypes from 'prop-types'
import './ModalRecompense.scss'

export default function ModalRecompense({ isOpen, onClose, reward }) {
  if (!reward) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎉 Bravo !">
      <div className="modal-recompense">
        {reward.isDemo ? (
          <DemoSignedImage
            filePath={reward.imagepath}
            alt={reward.label}
            className="img-size-md"
          />
        ) : (
          <SignedImage
            filePath={reward.imagepath}
            bucket="images"
            alt={reward.label}
            className="img-size-md"
          />
        )}

        <h2 className="modal-recompense__label">{reward.label}</h2>
        <p className="modal-recompense__text">Tu as gagné cette récompense !</p>
      </div>
    </Modal>
  )
}

ModalRecompense.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  reward: PropTypes.object.isRequired,
}
