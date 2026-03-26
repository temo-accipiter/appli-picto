'use client'

// src/components/SignedImage.tsx
// Affiche une image issue d'un bucket privé en générant une URL signée côté client.
// Props conservées : { filePath, alt = '', size = 60, bucket = 'images' }
// Nouveautés :
// - Si bucket === 'demo-images' (public), on construit une URL publique (pas de signature).
// - Si la signature échoue avec le bucket fourni (ex. 'avatars'), on tente automatiquement 'images' en fallback.
// - Utilise next/image pour optimisation automatique (WebP/AVIF, lazy loading)

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { getSignedImageUrl } from '@/utils/storage/getSignedUrl'
import { supabase } from '@/utils/supabaseClient'
import './SignedImage.scss'

interface SignedImageProps {
  filePath?: string
  alt: string // WCAG 1.1.1 - alt obligatoire pour accessibilité
  size?: number
  bucket?: string
  className?: string
  allowLegacyFallback?: boolean // Si true, tente fallback vers 'images' si bucket échoue (avatars legacy uniquement)
}

export default function SignedImage({
  filePath,
  alt,
  size = 60,
  bucket = 'images',
  className,
  allowLegacyFallback = false,
}: SignedImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setError(false)
    setUrl(null)

    async function run() {
      if (!filePath) return

      // 1) Buckets publics : URL directe (demo-images + bank-images)
      if (bucket === 'demo-images' || bucket === 'bank-images') {
        const cleanPath = String(filePath).replace(/^(demo-images|bank-images)\//, '')
        const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath)
        if (!cancelled && mountedRef.current) {
          setUrl(data?.publicUrl || null)
        }
        return
      }

      // 2) Buckets privés : on signe le bucket demandé…
      const primary = await getSignedImageUrl(filePath, {
        bucket,
        expiresIn: 3600,
        forceRefresh: false,
      })
      if (!cancelled && mountedRef.current && primary.url) {
        setUrl(primary.url)
        return
      }

      // 3) Fallback opt-in vers 'images' (avatars legacy uniquement)
      // ⚠️ CRITIQUE : Désactivé par défaut. Passer allowLegacyFallback={true} explicitement si besoin.
      if (
        !cancelled &&
        mountedRef.current &&
        allowLegacyFallback &&
        bucket !== 'images'
      ) {
        const fallback = await getSignedImageUrl(filePath, {
          bucket: 'images',
          expiresIn: 3600,
          forceRefresh: false,
        })
        if (fallback.url) {
          setUrl(fallback.url)
          return
        }
      }

      // 4) Gestion d'erreur + mini retry
      if (!cancelled && mountedRef.current) {
        setError(true)
        if (retryCount < 2) {
          setTimeout(() => {
            if (!mountedRef.current) return
            setRetryCount(c => c + 1)
          }, 2000)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [filePath, bucket, allowLegacyFallback, retryCount])

  return (
    <div
      className={`signed-image ${className || ''}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {url ? (
        <Image
          src={url}
          alt={alt}
          width={size}
          height={size}
          className="signed-image__img"
          loading="lazy"
          unoptimized={true}
          quality={85}
        />
      ) : (
        <div
          role="img"
          aria-label={error ? 'Image indisponible' : 'Chargement image'}
          className="signed-image__placeholder"
        />
      )}
    </div>
  )
}
