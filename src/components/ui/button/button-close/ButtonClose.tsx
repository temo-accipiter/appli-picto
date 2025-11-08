import './ButtonClose.scss'

interface ButtonCloseProps {
  onClick: () => void
  ariaLabel?: string
}

export default function ButtonClose({
  onClick,
  ariaLabel = 'Fermer',
}: ButtonCloseProps) {
  return (
    <button className="button-close" onClick={onClick} aria-label={ariaLabel}>
      ×
    </button>
  )
}
