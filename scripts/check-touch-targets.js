#!/usr/bin/env node
/* eslint-disable */

/**
 * check-touch-targets.js
 *
 * Vérifie que les éléments interactifs respectent WCAG 2.2 AA touch targets.
 * Détecte les sélecteurs interactifs (button, a, [role=button], etc.)
 * qui n'utilisent PAS :
 *   - Mixin touch-target() ou @include touch-target
 *   - Annotation "touch-target" comment dans le fichier
 *   - Mixin interactive-target (legacy)
 *
 * Mode heuristique :
 *   - Ne casse pas la build (exit 0)
 *   - Liste les fichiers suspects pour review manuel
 *   - Utile pour début de migration
 *
 * Usage :
 *   node scripts/check-touch-targets.js
 *   pnpm validate:touch-targets
 *
 * Exit codes :
 *   0 = Toujours (warning only, pas d'erreur CI)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const CONFIG = {
  // Dossiers à scanner
  scanDirs: ['src/components', 'src/page-components'],

  // Fichiers à exclure
  excludePatterns: [
    '.test.',
    '.spec.',
    'node_modules/',
    'dist/',
    'build/',
  ],

  // Extensions de fichiers à scanner
  extensions: ['.scss', '.sass'],

  // Sélecteurs interactifs à vérifier
  interactiveSelectors: [
    'button',
    'a[role=button]',
    'a[role="button"]',
    '[role=button]',
    '[role="button"]',
    '[role=menuitem]',
    '[role="menuitem"]',
    'input[type=button]',
    'input[type="button"]',
    'input[type=submit]',
    'input[type="submit"]',
    '.btn',
    '.button',
    'a.card', // Cards cliquables
    '[onclick]',
  ],

  // Patterns indiquant que touch-target est géré
  validPatterns: [
    /@include\s+touch-target/i,
    /@include\s+interactive-target/i,
    /\/\*\s*touch-target\s*\*\//i,
    /min-height:\s*(?:44|56|48)px/i, // Valeurs WCAG directes
    /min-height:\s*spacing\(['"](?:44|56|48)['"]\)/i, // spacing tokens
    /min-height:\s*a11y\(/i, // a11y tokens
  ],
}

// Compteurs
let totalFiles = 0
let suspiciousFiles = 0
let totalInteractives = 0

/**
 * Vérifie si un fichier doit être exclu
 */
function shouldExclude(filePath) {
  return CONFIG.excludePatterns.some(pattern => filePath.includes(pattern))
}

/**
 * Récupère tous les fichiers SCSS récursivement
 */
function getAllScssFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      getAllScssFiles(filePath, filesList)
    } else if (CONFIG.extensions.some(ext => file.endsWith(ext))) {
      if (!shouldExclude(filePath)) {
        filesList.push(filePath)
      }
    }
  })

  return filesList
}

/**
 * Vérifie si le fichier contient patterns touch-target valides
 */
function hasValidTouchTarget(content) {
  return CONFIG.validPatterns.some(pattern => pattern.test(content))
}

/**
 * Vérifie si le fichier contient sélecteurs interactifs
 */
function hasInteractiveSelectors(content) {
  // Simple heuristique : chercher sélecteurs interactifs
  return CONFIG.interactiveSelectors.some(selector => {
    // Escape special chars pour regex
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${escaped}\\s*\\{`, 'i')
    return pattern.test(content)
  })
}

/**
 * Vérifie un fichier
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')

  // Fichier contient des éléments interactifs ?
  if (!hasInteractiveSelectors(content)) {
    return null // Pas d'éléments interactifs, skip
  }

  totalInteractives++

  // Fichier utilise touch-target ou équivalent ?
  if (hasValidTouchTarget(content)) {
    return null // Touch targets OK
  }

  // Fichier suspect (interactifs mais pas de touch-target)
  return {
    file: filePath,
    reason: 'Éléments interactifs détectés sans touch-target évident',
  }
}

/**
 * Formate les résultats
 */
function formatResults(suspiciousFilesList) {
  console.log('\n🖐️  Scan des touch targets WCAG 2.2 AA...\n')

  if (suspiciousFilesList.length === 0) {
    console.log(
      '✅ Aucun fichier suspect ! Touch targets semblent gérés.\n',
    )
    console.log(
      `📊 ${totalInteractives} fichiers avec éléments interactifs scannés.\n`,
    )
    return
  }

  console.log('⚠️  Fichiers suspects (review recommandée) :\n')

  suspiciousFilesList.forEach(({ file, reason }) => {
    console.log(`  📄 ${file}`)
    console.log(`     → ${reason}\n`)
  })

  console.log('─'.repeat(80))
  console.log(`📊 Résumé :`)
  console.log(`   - Fichiers scannés : ${totalFiles}`)
  console.log(`   - Fichiers avec interactifs : ${totalInteractives}`)
  console.log(`   - Fichiers suspects : ${suspiciousFiles}`)
  console.log('─'.repeat(80))

  console.log(`\n💡 Solutions :`)
  console.log(
    `   - Ajouter @include touch-target() sur éléments interactifs`,
  )
  console.log(`   - Ou ajouter commentaire /* touch-target */ si déjà géré`)
  console.log(`   - Touch target min : 44px (WCAG AA), recommandé TSA : 56px`)
  console.log(`   - Voir src/styles/abstracts/_a11y-tokens.scss\n`)
}

/**
 * Main
 */
function main() {
  const projectRoot = path.resolve(__dirname, '..')
  const suspiciousFilesList = []

  CONFIG.scanDirs.forEach(dir => {
    const dirPath = path.join(projectRoot, dir)

    if (!fs.existsSync(dirPath)) {
      console.warn(`⚠️  Dossier non trouvé : ${dir}`)
      return
    }

    const files = getAllScssFiles(dirPath)
    totalFiles += files.length

    files.forEach(filePath => {
      const result = checkFile(filePath)

      if (result) {
        suspiciousFiles++
        suspiciousFilesList.push({
          file: path.relative(projectRoot, result.file),
          reason: result.reason,
        })
      }
    })
  })

  formatResults(suspiciousFilesList)

  // Exit 0 toujours (warning only, pas d'erreur CI)
  // Pour début de migration, mode informatif
  process.exit(0)
}

main()
