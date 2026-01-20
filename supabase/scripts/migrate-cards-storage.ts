/**
 * Script migration storage : cards → cards-bank + cards-user
 *
 * Usage:
 *   pnpm tsx supabase/scripts/migrate-cards-storage.ts
 *
 * Prérequis :
 *   - Migration 008 appliquée (buckets cards-bank + cards-user créés)
 *   - Variables env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY configurées
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const OLD_BUCKET = 'cards'
const BANK_BUCKET = 'cards-bank'
const USER_BUCKET = 'cards-user'

// ============================================================================
// Fonctions utilitaires
// ============================================================================

interface MigrationStats {
  total: number
  bank: number
  user: number
  errors: number
  skipped: number
}

const stats: MigrationStats = {
  total: 0,
  bank: 0,
  user: 0,
  errors: 0,
  skipped: 0,
}

/**
 * Liste toutes images dans ancien bucket
 */
async function listOldBucketFiles(path = ''): Promise<string[]> {
  const { data, error } = await supabase.storage.from(OLD_BUCKET).list(path, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    console.error(`❌ Erreur list ${path}:`, error)
    return []
  }

  const files: string[] = []

  for (const item of data || []) {
    const itemPath = path ? `${path}/${item.name}` : item.name

    if (item.id) {
      // Fichier
      files.push(itemPath)
    } else {
      // Dossier → récursion
      const subFiles = await listOldBucketFiles(itemPath)
      files.push(...subFiles)
    }
  }

  return files
}

/**
 * Copie une image vers nouveau bucket
 */
async function copyImage(
  oldPath: string,
  newBucket: string,
  newPath: string
): Promise<boolean> {
  try {
    // 1. Télécharger image depuis ancien bucket
    const { data: blob, error: downloadError } = await supabase.storage
      .from(OLD_BUCKET)
      .download(oldPath)

    if (downloadError) {
      console.error(`  ❌ Download failed: ${downloadError.message}`)
      return false
    }

    if (!blob) {
      console.error(`  ❌ No blob returned`)
      return false
    }

    // 2. Uploader vers nouveau bucket
    const { error: uploadError } = await supabase.storage
      .from(newBucket)
      .upload(newPath, blob, {
        contentType: blob.type,
        upsert: false, // Fail si existe déjà (éviter écrasement accidentel)
      })

    if (uploadError) {
      // Si fichier existe déjà, skip (pas une erreur)
      if (uploadError.message?.includes('already exists')) {
        console.log(`  ⏭️  Already exists, skipping`)
        stats.skipped++
        return true
      }

      console.error(`  ❌ Upload failed: ${uploadError.message}`)
      return false
    }

    return true
  } catch (err) {
    console.error(`  ❌ Exception:`, err)
    return false
  }
}

/**
 * Migrer une image bank
 */
async function migrateBankImage(oldPath: string): Promise<void> {
  console.log(`\n📦 Bank: ${oldPath}`)

  // Path dans nouveau bucket : garde préfixe 'bank/'
  const newPath = oldPath

  const success = await copyImage(oldPath, BANK_BUCKET, newPath)

  if (success) {
    console.log(`  ✅ Copied to ${BANK_BUCKET}/${newPath}`)
    stats.bank++
  } else {
    stats.errors++
  }
}

/**
 * Migrer une image user
 */
async function migrateUserImage(oldPath: string): Promise<void> {
  console.log(`\n👤 User: ${oldPath}`)

  // Path dans nouveau bucket : identique (migration 008 v2)
  // Ancien : user/<owner_id>/<card_id>.jpg
  // Nouveau : user/<owner_id>/<card_id>.jpg (identique)
  const newPath = oldPath

  const success = await copyImage(oldPath, USER_BUCKET, newPath)

  if (success) {
    console.log(`  ✅ Copied to ${USER_BUCKET}/${newPath}`)
    stats.user++
  } else {
    stats.errors++
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🚀 Migration storage : cards → cards-bank + cards-user\n')
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`)
  console.log(`📦 Source bucket: ${OLD_BUCKET}`)
  console.log(`🎯 Target buckets: ${BANK_BUCKET}, ${USER_BUCKET}\n`)

  // 1. Lister toutes images
  console.log('📋 Listing files in old bucket...')
  const files = await listOldBucketFiles()
  stats.total = files.length

  console.log(`Found ${files.length} files\n`)

  if (files.length === 0) {
    console.log('✅ No files to migrate')
    return
  }

  // 2. Migrer chaque image
  for (const file of files) {
    if (file.startsWith('bank/')) {
      await migrateBankImage(file)
    } else if (file.startsWith('user/')) {
      await migrateUserImage(file)
    } else {
      console.warn(`⚠️  Unknown path format: ${file} (skipped)`)
      stats.skipped++
    }
  }

  // 3. Résumé
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Stats:')
  console.log('='.repeat(60))
  console.log(`Total files:       ${stats.total}`)
  console.log(`Bank images:       ${stats.bank}`)
  console.log(`User images:       ${stats.user}`)
  console.log(`Skipped (exists):  ${stats.skipped}`)
  console.log(`Errors:            ${stats.errors}`)
  console.log('='.repeat(60))

  if (stats.errors > 0) {
    console.error('\n❌ Migration completed with errors')
    process.exit(1)
  } else {
    console.log('\n✅ Migration completed successfully!')
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
