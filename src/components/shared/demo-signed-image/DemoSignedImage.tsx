'use client'

import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import './DemoSignedImage.scss'

// ⚡ cache en mémoire pour éviter les appels redondants
const signedUrlCache = new Map<string, string>()

interface DemoSignedImageProps {
  filePath: string
  alt: string // WCAG 1.1.1 - alt obligatoire pour accessibilité
  size?: number
  className?: string
}

/**
 * Composant pour afficher les images de démonstration
 * Utilise le bucket public 'demo-images' - pas besoin d'authentification
 */
export default function DemoSignedImage({
  filePath,
  alt,
  size = 60,
  className = '',
}: DemoSignedImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!filePath) return

    const cacheKey = `demo-images/${filePath}`

    if (signedUrlCache.has(cacheKey)) {
      setUrl(signedUrlCache.get(cacheKey)!)
      return
    }

    const getPublicUrl = () => {
      try {
        // Nettoyer le chemin : enlever /demo-images/ si présent
        const cleanPath = filePath.startsWith('/demo-images/')
          ? filePath.replace('/demo-images/', '')
          : filePath

        // Debug logs désactivés pour réduire le bruit dans la console
        // if (import.meta.env.DEV) {
        //   console.log('🔍 DemoSignedImage - Chemin nettoyé:', cleanPath)
        // }

        // Utiliser l'URL publique au lieu de l'URL signée
        const { data } = supabase.storage
          .from('demo-images')
          .getPublicUrl(cleanPath)

        // if (import.meta.env.DEV) {
        //   console.log('🔍 DemoSignedImage - URL générée:', data?.publicUrl)
        // }

        if (data?.publicUrl) {
          signedUrlCache.set(cacheKey, data.publicUrl)
          setUrl(data.publicUrl)
          setError(false)
        } else {
          throw new Error("Impossible de générer l'URL publique")
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Erreur DemoSignedImage:', (err as Error).message)
          console.warn('⚠️ Chemin original:', filePath)
        }
        setError(true)
      }
    }

    getPublicUrl()
  }, [filePath, retryCount])

  // Fonction de retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setError(false)
    setUrl(null)
  }

  // Gestion des erreurs d'image
  const handleImageError = () => {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Image de démo corrompue détectée, tentative de retry...')
    }
    // Retry automatique après 2 secondes
    setTimeout(() => {
      setRetryCount(prev => prev + 1)
      setUrl(null)
    }, 2000)
  }

  if (error) {
    return (
      <div
        className={`demo-image-error ${className}`}
        style={{ width: size, height: size }}
        onClick={handleRetry}
        title="Cliquer pour réessayer"
      >
        <span className="error-icon">🖼️</span>
        <span className="error-text">Erreur</span>
      </div>
    )
  }

  if (!url) {
    return (
      <div
        className={`demo-image-loading ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`demo-signed-image ${className}`}
      style={{ width: size, height: size }}
      onError={handleImageError}
      loading="lazy"
    />
  )
}
