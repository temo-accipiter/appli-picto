import { Modal } from '@/components';
import PropTypes from 'prop-types';

const SINGULAR = { task: 'tâche', reward: 'récompense', category: 'catégorie' };
const PLURAL = { task: 'tâches', reward: 'récompenses', category: 'catégories' };

export default function ModalQuota({
  isOpen,
  onClose,
  contentType,
  currentUsage,
  limit,
  period = 'total', // 'total' | 'monthly'
}) {
  const isPlural = currentUsage > 1 || limit > 1;
  const label = isPlural ? PLURAL[contentType] : SINGULAR[contentType];
  const periodText = period === 'monthly' ? 'ce mois' : 'au total';

  const title = `Limite ${period === 'monthly' ? 'mensuelle' : 'totale'} atteinte`;
  const message = `Vous avez atteint votre limite de ${limit} ${label} ${periodText}.\n\nPassez à Premium pour créer plus de ${label} !`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={[{ label: 'Compris', onClick: onClose, variant: 'primary' }]}
    >
      <div className="modal__message">
        <p style={{ whiteSpace: 'pre-line' }}>{message}</p>
      </div>
    </Modal>
  )
}

ModalQuota.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  contentType: PropTypes.oneOf(['task', 'reward', 'category']).isRequired,
  currentUsage: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
  period: PropTypes.oneOf(['total', 'monthly']),
}
