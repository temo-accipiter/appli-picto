// src/types/global.d.ts
import type { Database } from './supabase'

// ─────────────────────────────────────────────────────────────────
// Types extraits de la base de données
// ─────────────────────────────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Tache = Database['public']['Tables']['taches']['Row']
export type Recompense = Database['public']['Tables']['recompenses']['Row']
export type Categorie = Database['public']['Tables']['categories']['Row']
export type Parametre = Database['public']['Tables']['parametres']['Row']
export type UserAsset = Database['public']['Tables']['user_assets']['Row']

// ─────────────────────────────────────────────────────────────────
// Enums et types métier
// ─────────────────────────────────────────────────────────────────

export type Role = 'visitor' | 'free' | 'abonne' | 'admin' | 'unknown'

export type AccountStatus =
  | 'active'
  | 'suspended'
  | 'deletion_scheduled'
  | 'pending_verification'

export type QuotaType = 'task' | 'reward' | 'category'
export type QuotaPeriod = 'lifetime' | 'monthly'

// ─────────────────────────────────────────────────────────────────
// Interfaces métier
// ─────────────────────────────────────────────────────────────────

export interface QuotaInfo {
  limit: number
  current: number
  remaining: number
  percentage: number
  isAtLimit: boolean
  isNearLimit: boolean
}

export interface QuotaData {
  quota_type: string
  quota_limit: number
  quota_period: string
}

export interface UsageData {
  tasks: number
  rewards: number
  categories: number
}

// ─────────────────────────────────────────────────────────────────
// Types pour les retours Supabase
// ─────────────────────────────────────────────────────────────────

export interface SupabaseResponse<T> {
  data: T | null
  error: Error | null
}

export interface SupabaseListResponse<T> {
  data: T[] | null
  error: Error | null
}

// ─────────────────────────────────────────────────────────────────
// Déclarations globales pour window
// ─────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    // Google Analytics 4
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}
