import './ImagePreview.scss'

type ImageSize = 'sm' | 'md' | 'lg'

interface ImagePreviewProps {
  url: string
  alt?: string
  className?: string
  size?: ImageSize
}

export default function ImagePreview({
  url,
  alt = 'Aperçu',
  className = '',
  size = 'md',
}: ImagePreviewProps) {
  if (!url) return null

  return (
    <div className={`image-preview image-preview--${size} ${className}`}>
      <img src={url} alt={alt} className="image-preview__img" loading="lazy" />
    </div>
  )
}
