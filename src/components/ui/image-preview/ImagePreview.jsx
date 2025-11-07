import PropTypes from 'prop-types'
import './ImagePreview.scss'

export default function ImagePreview({
  url,
  alt = 'Aperçu',
  className = '',
  size = 'md', // sm | md | lg
}) {
  if (!url) return null

  return (
    <div className={`image-preview image-preview--${size} ${className}`}>
      <img src={url} alt={alt} className="image-preview__img" loading="lazy" />
    </div>
  )
}

ImagePreview.propTypes = {
  url: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
}
