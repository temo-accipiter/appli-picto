// src/utils/images/webpConverter.test.js
import { describe, it, expect } from 'vitest'
import { convertToWebP } from './webpConverter'

describe('webpConverter', () => {
  it('ne convertit pas SVG', async () => {
    const mockSvg = new File(['<svg></svg>'], 'test.svg', {
      type: 'image/svg+xml',
    })

    const result = await convertToWebP(mockSvg)

    expect(result).toBe(mockSvg) // Retour tel quel
  })

  it('retourne fichier si déjà ≤ 20 KB', async () => {
    const smallFile = new File([new ArrayBuffer(10 * 1024)], 'small.png', {
      type: 'image/png',
    })

    const result = await convertToWebP(smallFile)

    expect(result).toBe(smallFile) // Aucune conversion
  })

  // Note : Tests hash SHA-256 skippés (crypto.subtle.digest non disponible en jsdom)
  // Ces fonctions seront testées en environnement navigateur réel
})
