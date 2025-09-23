import { supabase } from '@/utils'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import './SignedImage.scss'

// ⚡ cache en mémoire pour éviter les appels redondants
const signedUrlCache = new Map()

export default function SignedImage({
  filePath,
  alt = '',
  size = 60,
  bucket = 'images', // 👈 permet de choisir le bucket (ex: avatars, images, etc.)
}) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!filePath) return

    const cacheKey = `${bucket}/${filePath}`

    if (signedUrlCache.has(cacheKey)) {
      setUrl(signedUrlCache.get(cacheKey))
      return
    }

    const getSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600)

        if (!error && data?.signedUrl) {
          signedUrlCache.set(cacheKey, data.signedUrl)
          setUrl(data.signedUrl)
          setError(false)
        } else {
          throw new Error(error?.message || 'Erreur création URL signée')
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Erreur SignedImage:', err.message)
        }
        setError(true)
      }
    }

    getSignedUrl()
  }, [filePath, bucket, retryCount])

  // Fonction de retry pour Firefox
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setError(false)
    setUrl(null)
  }

  // Gestion des erreurs d'image
  const handleImageError = () => {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Image corrompue détectée, tentative de retry...')
    }
    // Retry automatique après 2 secondes
    setTimeout(() => {
      setRetryCount(prev => prev + 1)
      setUrl(null)
    }, 2000)
  }

  return (
    <div
      className="signed-image"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          className="signed-image__img"
          crossOrigin="anonymous"
          onError={handleImageError}
          onLoad={() => setError(false)}
        />
      ) : error ? (
        <div
          className="signed-image__error"
          role="button"
          tabIndex={0}
          onClick={handleRetry}
          onKeyDown={e => e.key === 'Enter' && handleRetry()}
          aria-label="Erreur de chargement, cliquer pour réessayer"
        >
          <span>🔄</span>
          {retryCount > 0 && <small>Retry {retryCount}</small>}
        </div>
      ) : (
        <div
          role="status"
          aria-label="Chargement image"
          className="signed-image__placeholder"
        />
      )}
    </div>
  )
}

SignedImage.propTypes = {
  filePath: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.number,
  bucket: PropTypes.string,
}
