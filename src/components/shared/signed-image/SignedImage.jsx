/*
import { useEffect, useState } from 'react'
import { supabase } from '@/utils'
import PropTypes from 'prop-types'
import './SignedImage.scss'

export default function SignedImage({ filePath, alt = '', size = 60 }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!filePath) return

    const getSignedUrl = async () => {
      const { data, error } = await supabase.storage
        .from('images')
        .createSignedUrl(filePath, 60 * 60)

      if (!error) {
        setUrl(data.signedUrl)
      }
    }

    getSignedUrl()
  }, [filePath])

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
        />
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
}
*/
import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { supabase } from '@/utils'
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

  useEffect(() => {
    if (!filePath) return

    const cacheKey = `${bucket}/${filePath}`

    if (signedUrlCache.has(cacheKey)) {
      setUrl(signedUrlCache.get(cacheKey))
      return
    }

    const getSignedUrl = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600)

      if (!error && data?.signedUrl) {
        signedUrlCache.set(cacheKey, data.signedUrl)
        setUrl(data.signedUrl)
      }
    }

    getSignedUrl()
  }, [filePath, bucket])

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
        />
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
