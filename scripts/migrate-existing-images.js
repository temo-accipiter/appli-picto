// scripts/migrate-existing-images.js
// Migration images existantes vers nouveau système (hash SHA-256 + dimensions)

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BATCH_SIZE = 10
const PAUSE_MS = 2000

// Rapport migration
const report = {
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
}

async function migrateImages(dryRun = true, limit = null) {
  console.log(`\n🚀 Migration images vers nouveau système`)
  console.log(`Mode : ${dryRun ? '🧪 DRY RUN (test)' : '🔴 LIVE (production)'}`)

  // Récupérer assets sans hash (= anciennes images)
  let query = supabase.from('user_assets').select('*').is('sha256_hash', null)

  if (limit) {
    query = query.limit(limit)
    console.log(`Limite : ${limit} images`)
  }

  const { data: assets, error } = await query

  if (error) {
    console.error('❌ Erreur récupération assets:', error)
    return
  }

  report.total = assets.length
  console.log(`📦 ${assets.length} images à migrer\n`)

  // Migration par batch
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(assets.length / BATCH_SIZE)

    console.log(
      `\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} images)`
    )
    console.log('─'.repeat(60))

    for (const asset of batch) {
      try {
        // Télécharger fichier
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('images')
          .download(asset.file_path)

        if (downloadError || !fileData) {
          throw new Error(`Téléchargement échoué: ${downloadError?.message}`)
        }

        // Calculer hash SHA-256
        const arrayBuffer = await fileData.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hash = hashArray
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // Extraire dimensions (si image bitmap)
        let width = null
        let height = null

        if (
          asset.mime_type?.startsWith('image/') &&
          asset.mime_type !== 'image/svg+xml'
        ) {
          try {
            const bitmap = await createImageBitmap(fileData)
            width = bitmap.width
            height = bitmap.height
            bitmap.close()
          } catch (_e) {
            console.warn(`  ⚠️ Dimensions non extraites (${asset.mime_type})`)
          }
        }

        if (!dryRun) {
          // Mise à jour BDD
          const { error: updateError } = await supabase
            .from('user_assets')
            .update({
              sha256_hash: hash,
              width,
              height,
              migrated_at: new Date().toISOString(),
            })
            .eq('id', asset.id)

          if (updateError) {
            throw new Error(`Update BDD échoué: ${updateError.message}`)
          }
        }

        const dimensionsStr = width && height ? `${width}×${height}` : 'N/A'

        console.log(
          `  ✅ ${asset.file_path.slice(-40)} (${dimensionsStr}, hash: ${hash.slice(0, 8)}...)`
        )

        report.success++
      } catch (error) {
        console.error(`  ❌ ${asset.file_path.slice(-40)} :`, error.message)

        report.failed++
        report.errors.push({
          assetId: asset.id,
          filePath: asset.file_path,
          error: error.message,
        })
      }
    }

    // Pause entre batches
    if (i + BATCH_SIZE < assets.length) {
      console.log(`\n⏸️  Pause ${PAUSE_MS}ms...`)
      await new Promise(resolve => setTimeout(resolve, PAUSE_MS))
    }
  }

  // Rapport final
  console.log('\n' + '═'.repeat(60))
  console.log('📊 RAPPORT DE MIGRATION')
  console.log('═'.repeat(60))
  console.log(`Total     : ${report.total}`)
  console.log(`✅ Succès : ${report.success}`)
  console.log(`❌ Échecs : ${report.failed}`)

  if (report.errors.length > 0) {
    const errorLog = `migration-errors-${Date.now()}.json`
    fs.writeFileSync(errorLog, JSON.stringify(report.errors, null, 2))
    console.log(`\n⚠️  Erreurs détaillées → ${errorLog}`)
  }

  if (dryRun) {
    console.log('\n🧪 DRY RUN terminé - AUCUNE modification appliquée')
    console.log('💡 Exécutez avec --live pour migration réelle')
  } else {
    console.log('\n🎉 Migration terminée !')
  }
}

// CLI
const args = process.argv.slice(2)
const dryRun = !args.includes('--live')
const limitArg = args.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null

migrateImages(dryRun, limit).catch(console.error)
