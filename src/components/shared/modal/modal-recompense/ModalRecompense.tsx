import { DemoSignedImage, Modal, SignedImage } from '@/components'
import { useI18n } from '@/hooks'
import type { Recompense } from '@/types/global'
import './ModalRecompense.scss'

interface RewardWithDemo extends Recompense {
  isDemo?: boolean
}

interface ModalRecompenseProps {
  isOpen: boolean
  onClose: () => void
  reward: RewardWithDemo
}

export default function ModalRecompense({
  isOpen,
  onClose,
  reward,
}: ModalRecompenseProps) {
  const { t } = useI18n()

  if (!reward) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🎉 ${t('rewards.wellDone')}`}
    >
      <div className="modal-recompense">
        {reward.isDemo ? (
          <DemoSignedImage
            filePath={reward.imagepath || ''}
            alt={reward.label}
            className="img-size-md"
          />
        ) : (
          <SignedImage
            filePath={reward.imagepath || ''}
            bucket="images"
            alt={reward.label}
            className="img-size-md"
          />
        )}

        <h2 className="modal-recompense__label">{reward.label}</h2>
        <p className="modal-recompense__text">{t('rewards.chooseReward')}</p>
      </div>
    </Modal>
  )
}
