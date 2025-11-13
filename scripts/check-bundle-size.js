#!/usr/bin/env node
/**
 * Script de vérification de la taille des bundles
 * Échoue si un chunk JS dépasse 1.6 MB
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DIST_DIR = path.join(__dirname, '../dist/assets')
const MAX_CHUNK_SIZE_MB = 1.6
const MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024

console.log('🔍 Vérification de la taille des bundles...\n')

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ Le dossier dist/assets n\'existe pas. Lancez "pnpm build" d\'abord.')
  process.exit(1)
}

const files = fs.readdirSync(DIST_DIR)
const jsFiles = files.filter(f => f.endsWith('.js'))

let hasError = false
const filesSizes = []

jsFiles.forEach(file => {
  const filePath = path.join(DIST_DIR, file)
  const stats = fs.statSync(filePath)
  const sizeMB = stats.size / (1024 * 1024)

  filesSizes.push({ file, size: stats.size, sizeMB })

  if (stats.size > MAX_CHUNK_SIZE_BYTES) {
    console.error(`❌ ${file}: ${sizeMB.toFixed(2)} MB (> ${MAX_CHUNK_SIZE_MB} MB)`)
    hasError = true
  } else if (sizeMB > 1.0) {
    console.warn(`⚠️  ${file}: ${sizeMB.toFixed(2)} MB`)
  } else {
    console.log(`✅ ${file}: ${sizeMB.toFixed(2)} MB`)
  }
})

// Afficher le résumé
console.log('\n📊 Résumé:')
console.log(`Total de fichiers JS: ${jsFiles.length}`)

const totalSize = filesSizes.reduce((sum, f) => sum + f.size, 0)
const totalSizeMB = totalSize / (1024 * 1024)
console.log(`Taille totale: ${totalSizeMB.toFixed(2)} MB`)

// Trouver le plus gros fichier
const biggestFile = filesSizes.reduce((max, f) => f.size > max.size ? f : max, filesSizes[0])
console.log(`Plus gros fichier: ${biggestFile.file} (${biggestFile.sizeMB.toFixed(2)} MB)`)

if (hasError) {
  console.error('\n❌ Des chunks dépassent la limite de taille !')
  console.error('💡 Solutions suggérées:')
  console.error('   - Utiliser dynamic import() pour le code splitting')
  console.error('   - Configurer build.rollupOptions.output.manualChunks')
  console.error('   - Lazy-loader les composants lourds')
  process.exit(1)
}

console.log('\n✅ Toutes les tailles de bundles sont acceptables')
process.exit(0)
