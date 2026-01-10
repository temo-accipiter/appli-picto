'use client'

import { useCallback, useRef } from 'react'

/**
 * Hook pour gérer AudioContext de manière lazy et sécurisée
 * Crée le contexte audio seulement après la première interaction utilisateur
 */

export interface UseAudioContextReturn {
  getAudioContext: () => AudioContext | null
  playBeep: (frequency?: number) => void
  playSound: (url: string, volume?: number) => Promise<void>
}

/**
 * Joue un bip sonore via Web Audio API
 * @param audioCtx - Contexte audio
 * @param frequency - Fréquence en Hz (par défaut 440 = La)
 */
function playBeepSound(audioCtx: AudioContext, frequency: number = 440): void {
  try {
    // Vérifier que l'AudioContext est dans un état valide
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    if (audioCtx.state !== 'running') {
      return // Ne pas jouer si le contexte n'est pas prêt
    }

    const osc = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime)

    // Contrôler le volume pour éviter les sons trop forts
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)

    osc.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.1)

    // Nettoyer les nœuds après utilisation
    osc.onended = () => {
      osc.disconnect()
      gainNode.disconnect()
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ Erreur lors de la création du son:',
        (error as Error).message
      )
    }
  }
}

/**
 * Hook pour gérer AudioContext lazy et play beep
 * Crée l'AudioContext seulement lors de la première interaction
 * @returns Objet avec getAudioContext et playBeep
 */
export function useAudioContext(): UseAudioContextReturn {
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) {
      try {
        const AudioContextConstructor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (AudioContextConstructor) {
          audioCtxRef.current = new AudioContextConstructor()
        }
        // Si le contexte est suspendu, on le reprend
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume()
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '⚠️ Impossible de créer AudioContext:',
            (error as Error).message
          )
        }
        return null
      }
    }
    return audioCtxRef.current
  }, [])

  const playBeep = useCallback(
    (frequency: number = 440) => {
      const audioCtx = getAudioContext()
      if (audioCtx) {
        try {
          playBeepSound(audioCtx, frequency)
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '⚠️ Erreur lors de la lecture audio:',
              (error as Error).message
            )
          }
        }
      }
    },
    [getAudioContext]
  )

  /**
   * Jouer un fichier audio (ex: wav, mp3)
   * @param url - URL du fichier audio
   * @param volume - Volume entre 0 et 1 (par défaut 0.5)
   */
  const playSound = useCallback(
    async (url: string, volume: number = 0.5): Promise<void> => {
      try {
        const audio = new Audio(url)
        audio.volume = Math.max(0, Math.min(1, volume)) // Clamper entre 0 et 1
        await audio.play()
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '⚠️ Erreur lors de la lecture du fichier audio:',
            (error as Error).message
          )
        }
        // Ignorer silencieusement l'erreur en production
      }
    },
    []
  )

  return { getAudioContext, playBeep, playSound }
}
