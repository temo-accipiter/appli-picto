// src/types/global.d.ts
import type { Database } from './supabase'

// ─────────────────────────────────────────────────────────────────
// Types extraits de la base de données
// ─────────────────────────────────────────────────────────────────

export type Tache = Database['public']['Tables']['taches']['Row']
export type Recompense = Database['public']['Tables']['recompenses']['Row']
export type Categorie = Database['public']['Tables']['categories']['Row']
export type Parametre = Database['public']['Tables']['parametres']['Row']

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
