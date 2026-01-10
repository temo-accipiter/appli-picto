'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Types pour les préférences du TimeTimer
 */
export type DiskColor = 'red' | 'blue' | 'green' | 'purple'

export interface TimerPreferences {
  isSilentMode: boolean
  lastDuration: number
  diskColor: DiskColor
  showNumbers: boolean
  enableVibration: boolean
  customDurations: number[]
}

interface UseTimerPreferencesReturn {
  preferences: TimerPreferences
  updateSilentMode: (value: boolean) => void
  updateLastDuration: (minutes: number) => void
  updateDiskColor: (color: DiskColor) => void
  updateShowNumbers: (value: boolean) => void
  updateVibration: (value: boolean) => void
  updateCustomDurations: (durations: number[]) => void
}

/**
 * Clés localStorage pour TimeTimer
 */
const STORAGE_KEYS = {
  silentMode: 'timeTimer_silentMode',
  lastDuration: 'timeTimer_lastDuration',
  diskColor: 'timeTimer_diskColor',
  showNumbers: 'timeTimer_showNumbers',
  vibrate: 'timeTimer_vibrate',
  customDurations: 'timeTimer_customDurations',
} as const

/**
 * Charger les préférences depuis localStorage
 */
function loadPreferences(initialDuration: number): TimerPreferences {
  if (typeof window === 'undefined') {
    return {
      isSilentMode: false,
      lastDuration: initialDuration,
      diskColor: 'red',
      showNumbers: true,
      enableVibration: false,
      customDurations: [],
    }
  }

  const isSilentMode = localStorage.getItem(STORAGE_KEYS.silentMode) === 'true'
  const lastDuration = parseInt(
    localStorage.getItem(STORAGE_KEYS.lastDuration) || String(initialDuration),
    10
  )
  const diskColor = (localStorage.getItem(STORAGE_KEYS.diskColor) ||
    'red') as DiskColor
  const showNumbers = localStorage.getItem(STORAGE_KEYS.showNumbers) !== 'false'
  const enableVibration = localStorage.getItem(STORAGE_KEYS.vibrate) === 'true'

  let customDurations: number[] = []
  const savedCustom = localStorage.getItem(STORAGE_KEYS.customDurations)
  if (savedCustom) {
    try {
      const parsed = JSON.parse(savedCustom)
      if (Array.isArray(parsed)) {
        customDurations = parsed
      }
    } catch {
      // Ignorer erreurs parsing
    }
  }

  return {
    isSilentMode,
    lastDuration,
    diskColor,
    showNumbers,
    enableVibration,
    customDurations,
  }
}

/**
 * Hook pour gérer les préférences du TimeTimer avec localStorage
 * Centralise toute la logique de persistance des préférences
 *
 * @param initialDuration - Durée initiale par défaut (minutes)
 * @returns Préférences et fonctions de mise à jour
 */
export function useTimerPreferences(
  initialDuration: number = 10
): UseTimerPreferencesReturn {
  const [preferences, setPreferences] = useState<TimerPreferences>(() =>
    loadPreferences(initialDuration)
  )

  // Charger les durées personnalisées depuis localStorage au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.customDurations)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setPreferences(prev => ({ ...prev, customDurations: parsed }))
          }
        } catch {
          // Ignorer erreurs parsing
        }
      }
    }
  }, [])

  /**
   * Mise à jour mode silencieux
   */
  const updateSilentMode = useCallback((value: boolean) => {
    setPreferences(prev => ({ ...prev, isSilentMode: value }))
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.silentMode, String(value))
    }
  }, [])

  /**
   * Mise à jour dernière durée utilisée
   */
  const updateLastDuration = useCallback((minutes: number) => {
    setPreferences(prev => ({ ...prev, lastDuration: minutes }))
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.lastDuration, String(minutes))
    }
  }, [])

  /**
   * Mise à jour couleur disque
   */
  const updateDiskColor = useCallback((color: DiskColor) => {
    setPreferences(prev => ({ ...prev, diskColor: color }))
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.diskColor, color)
    }
  }, [])

  /**
   * Mise à jour affichage numéros
   */
  const updateShowNumbers = useCallback((value: boolean) => {
    setPreferences(prev => ({ ...prev, showNumbers: value }))
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.showNumbers, String(value))
    }
  }, [])

  /**
   * Mise à jour vibration
   */
  const updateVibration = useCallback((value: boolean) => {
    setPreferences(prev => ({ ...prev, enableVibration: value }))
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.vibrate, String(value))
    }
  }, [])

  /**
   * Mise à jour durées personnalisées
   */
  const updateCustomDurations = useCallback((durations: number[]) => {
    setPreferences(prev => ({ ...prev, customDurations: durations }))
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.customDurations, JSON.stringify(durations))
    }
  }, [])

  return {
    preferences,
    updateSilentMode,
    updateLastDuration,
    updateDiskColor,
    updateShowNumbers,
    updateVibration,
    updateCustomDurations,
  }
}
