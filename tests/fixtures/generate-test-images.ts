// tests/fixtures/generate-test-images.js
// Génération d'images de test pour E2E (PNG, JPEG)

import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Fonction pour créer une image colorée avec texte
function createTestImage(width, height, text, bgColor, textColor) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // Background gradient pastel (TSA-friendly)
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, bgColor)
  gradient.addColorStop(1, '#F0F8FF')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Cercle décoratif
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, Math.min(width, height) / 3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(168, 213, 255, 0.6)' // Pastel bleu
  ctx.fill()

  // Texte
  ctx.fillStyle = textColor
  ctx.font = `bold ${height / 8}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2)

  return canvas
}

// 1. PNG test (50 KB environ) - 256x256 pour être converti à 192x192
console.log('🖼️  Génération test-image.png (50 KB)...')
const pngCanvas = createTestImage(256, 256, 'PNG TEST', '#A8D5FF', '#2E5C7A')
const pngBuffer = pngCanvas.toBuffer('image/png', {
  compressionLevel: 6,
  // @ts-expect-error - PNG_FILTER_NONE is a static property
  filters: pngCanvas.PNG_FILTER_NONE,
})
fs.writeFileSync(path.join(__dirname, 'test-image.png'), pngBuffer)
console.log(
  `✅ test-image.png créé (${(pngBuffer.length / 1024).toFixed(1)} KB)`
)

// 2. JPEG large (500 KB environ) - pour test quota
console.log('🖼️  Génération large-image.jpg (500 KB)...')
const jpegCanvas = createTestImage(
  1024,
  1024,
  'LARGE JPEG',
  '#B8E0D0',
  '#2E7A5C'
)
const jpegBuffer = jpegCanvas.toBuffer('image/jpeg', { quality: 0.95 })
fs.writeFileSync(path.join(__dirname, 'large-image.jpg'), jpegBuffer)
console.log(
  `✅ large-image.jpg créé (${(jpegBuffer.length / 1024).toFixed(1)} KB)`
)

// 3. PNG petit (10 KB) - pour test déduplication rapide
console.log('🖼️  Génération small-image.png (10 KB)...')
const smallCanvas = createTestImage(128, 128, 'SMALL', '#F0E0D0', '#7A5C2E')
const smallBuffer = smallCanvas.toBuffer('image/png', { compressionLevel: 9 })
fs.writeFileSync(path.join(__dirname, 'small-image.png'), smallBuffer)
console.log(
  `✅ small-image.png créé (${(smallBuffer.length / 1024).toFixed(1)} KB)`
)

console.log('\n🎉 Toutes les fixtures générées !')
console.log('📂 Fichiers dans tests/fixtures/')
