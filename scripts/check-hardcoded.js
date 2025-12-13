#!/usr/bin/env node

/**
 * check-hardcoded.js
 *
 * Détecte les valeurs hardcodées dans les fichiers SCSS :
 *   - Hex colors (#fff, #ffffff, #AABBCC)
 *   - rgb/rgba colors (rgb(255, 0, 0), rgba(...))
 *   - Valeurs px pour spacing (padding, margin, gap)
 *
 * Exclut :
 *   - src/styles/abstracts/_tokens.scss (source de vérité)
 *   - src/styles/themes/*.scss (thèmes peuvent hardcoder)
 *   - Commentaires CSS
 *   - Valeurs dans strings/URLs
 *
 * Usage :
 *   node scripts/check-hardcoded.js
 *   pnpm lint:hardcoded
 *
 * Exit codes :
 *   0 = Aucun hardcode trouvé
 *   1 = Hardcodes détectés (fail CI)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const CONFIG = {
  // Dossiers à scanner
  scanDirs: ['src/components', 'src/styles', 'src/page-components'],

  // Fichiers à exclure (patterns)
  excludePatterns: [
    'src/styles/abstracts/_tokens.scss', // Source de vérité
    'src/styles/themes/', // Thèmes peuvent hardcoder
    'src/styles/vendors/', // Dépendances tierces
    '.test.', // Fichiers de tests
    '.spec.', // Fichiers de specs
  ],

  // Extensions de fichiers à scanner
  extensions: ['.scss', '.sass'],
}

// Regex patterns pour détection
const PATTERNS = {
  // Hex colors: #fff, #ffffff, #AABBCC (case insensitive)
  hexColor: /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi,

  // rgb/rgba functions: rgb(255, 0, 0), rgba(...)
  rgbColor: /rgba?\s*\([^)]+\)/gi,

  // px values dans propriétés spacing (padding, margin, gap, etc.)
  // Exclut : font-size, line-height, border-width (peuvent utiliser px)
  pxSpacing:
    /(?:padding|margin|gap|width|height|min-width|min-height|max-width|max-height|top|right|bottom|left|inset):\s*[^;]*\d+px/gi,

  // Commentaires CSS (à ignorer dans les résultats)
  comments: /\/\*[\s\S]*?\*\/|\/\/.*/g,
}

// Compteurs
let totalFiles = 0
let filesWithIssues = 0
let totalIssues = 0

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
 * Supprime les commentaires du contenu
 */
function removeComments(content) {
  return content.replace(PATTERNS.comments, '')
}

/**
 * Vérifie un fichier pour hardcodes
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const cleanContent = removeComments(content)
  const lines = content.split('\n')

  const issues = []

  // Check hex colors
  let match
  while ((match = PATTERNS.hexColor.exec(cleanContent)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length
    issues.push({
      type: 'hex-color',
      value: match[0],
      line: lineNumber,
      lineContent: lines[lineNumber - 1]?.trim(),
    })
  }

  // Reset regex lastIndex
  PATTERNS.hexColor.lastIndex = 0

  // Check rgb/rgba colors
  while ((match = PATTERNS.rgbColor.exec(cleanContent)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length
    issues.push({
      type: 'rgb-color',
      value: match[0],
      line: lineNumber,
      lineContent: lines[lineNumber - 1]?.trim(),
    })
  }

  PATTERNS.rgbColor.lastIndex = 0

  // Check px spacing
  while ((match = PATTERNS.pxSpacing.exec(cleanContent)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length
    // Filtrer les faux positifs (ex: min-height: 44px pour touch targets est OK si via token)
    const lineContent = lines[lineNumber - 1]?.trim()
    // Skip si la ligne contient spacing() ou a11y() ou var(--) (utilise tokens)
    if (
      !lineContent.includes('spacing(') &&
      !lineContent.includes('a11y(') &&
      !lineContent.includes('var(--')
    ) {
      issues.push({
        type: 'px-spacing',
        value: match[0],
        line: lineNumber,
        lineContent,
      })
    }
  }

  PATTERNS.pxSpacing.lastIndex = 0

  return issues
}

/**
 * Formate les résultats pour affichage
 */
function formatResults(fileIssues) {
  console.log('\n🔍 Scan des hardcodes SCSS...\n')

  if (fileIssues.length === 0) {
    console.log(
      '✅ Aucun hardcode détecté ! Le code utilise bien les tokens.\n'
    )
    return
  }

  console.log('⚠️  Hardcodes détectés :\n')

  fileIssues.forEach(({ file, issues }) => {
    console.log(`\n📄 ${file}`)
    console.log('─'.repeat(80))

    issues.forEach(issue => {
      const typeEmoji = {
        'hex-color': '🎨',
        'rgb-color': '🎨',
        'px-spacing': '📏',
      }[issue.type]

      const typeLabel = {
        'hex-color': 'Hex Color',
        'rgb-color': 'RGB Color',
        'px-spacing': 'PX Spacing',
      }[issue.type]

      console.log(
        `  ${typeEmoji} ${typeLabel} - Ligne ${issue.line}: ${issue.value}`
      )
      console.log(`     ${issue.lineContent}`)
    })
  })

  console.log('\n' + '─'.repeat(80))
  console.log(`📊 Résumé :`)
  console.log(`   - Fichiers scannés : ${totalFiles}`)
  console.log(`   - Fichiers avec problèmes : ${filesWithIssues}`)
  console.log(`   - Total hardcodes : ${totalIssues}`)
  console.log('─'.repeat(80))

  console.log(`\n💡 Solutions :`)
  console.log(`   - Hex/RGB colors → color(), role-color(), semantic()`)
  console.log(`   - PX spacing → spacing(), a11y()`)
  console.log(`   - Voir src/styles/abstracts/_tokens.scss\n`)
}

/**
 * Main
 */
function main() {
  const projectRoot = path.resolve(__dirname, '..')
  const fileIssues = []

  CONFIG.scanDirs.forEach(dir => {
    const dirPath = path.join(projectRoot, dir)

    if (!fs.existsSync(dirPath)) {
      console.warn(`⚠️  Dossier non trouvé : ${dir}`)
      return
    }

    const files = getAllScssFiles(dirPath)
    totalFiles += files.length

    files.forEach(filePath => {
      const issues = checkFile(filePath)

      if (issues.length > 0) {
        filesWithIssues++
        totalIssues += issues.length
        fileIssues.push({
          file: path.relative(projectRoot, filePath),
          issues,
        })
      }
    })
  })

  formatResults(fileIssues)

  // Exit code 1 si hardcodes trouvés (fail CI)
  process.exit(fileIssues.length > 0 ? 1 : 0)
}

main()
