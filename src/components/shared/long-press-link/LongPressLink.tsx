'use client'

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useReducedMotion } from '@/hooks'
import './LongPressLink.scss'

interface LongPressLinkProps {
  href: string
  className?: string
  'aria-label'?: string
  title?: string
  /** Durée de l'appui long en ms (défaut : 2000ms) */
  duration?: number
  children: ReactNode
}

/**
 * LongPressLink — Protège une navigation par un appui long.
 *
 * Comportement :
 * - Appui court (< duration ms) → annule (navigation pas déclenchée)
 * - Appui long (≥ duration ms) → navigue vers href
 * - Clavier Entrée/Espace → navigue immédiatement (accessibilité adulte)
 * - prefers-reduced-motion → demi-cercle statique (pas d'animation)
 *
 * TSA : protège le lien Édition sur le Tableau enfant.
 * Un enfant relâche naturellement avant 2s.
 * Un adulte maintient intentionnellement.
 */
export default function LongPressLink({
  href,
  className,
  'aria-label': ariaLabel,
  title,
  duration = 2000,
  children,
}: LongPressLinkProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [progress, setProgress] = useState(0) // 0 → 1
  const [pressing, setPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const cancelPress = useCallback(() => {
    setPressing(false)
    setProgress(0)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startPress = useCallback(() => {
    setPressing(true)
    setProgress(0)
    startTimeRef.current = Date.now()

    // Boucle RAF pour animer la progression (ignorée si reduced motion)
    if (!reducedMotion) {
      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current
        const p = Math.min(elapsed / duration, 1)
        setProgress(p)
        if (p < 1) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    // Navigation déclenchée après duration ms
    timerRef.current = setTimeout(() => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setPressing(false)
      setProgress(0)
      router.push(href)
    }, duration)
  }, [duration, href, reducedMotion, router])

  // Clavier : navigation immédiate (adultes, pas d'appui long requis)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        router.push(href)
      }
    },
    [href, router]
  )

  // Paramètres cercle SVG (viewBox 0 0 32 32)
  const r = 13
  const circumference = 2 * Math.PI * r
  // reduced motion : demi-cercle statique comme indication visuelle
  const dashOffset = reducedMotion
    ? circumference * 0.5
    : circumference * (1 - progress)

  const cls = [
    'long-press-link',
    className,
    pressing && 'long-press-link--pressing',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={cls}
      aria-label={ariaLabel}
      title={title}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onKeyDown={handleKeyDown}
    >
      {children}
      {pressing && (
        <span className="long-press-link__progress" aria-hidden="true">
          <svg
            viewBox="0 0 32 32"
            className="long-press-link__svg"
            aria-hidden="true"
          >
            {/* Fond du cercle */}
            <circle className="long-press-link__track" cx="16" cy="16" r={r} />
            {/* Progression */}
            <circle
              className="long-press-link__fill"
              cx="16"
              cy="16"
              r={r}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
        </span>
      )}
    </button>
  )
}
