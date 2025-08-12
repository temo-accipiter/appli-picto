/*
// --- Validation texte ---
export const validateNotEmpty = label =>
  !label.trim() ? 'Le nom est requis' : ''

export const noEdgeSpaces = label =>
  label !== label.trim() ? 'Pas d’espace en début/fin' : ''

export const noDoubleSpaces = label =>
  /\s{2,}/.test(label) ? 'Pas de doubles espaces' : ''

export const validatePseudo = pseudo => {
  const trimmed = pseudo.trim()
  if (!trimmed) return 'Le pseudo est requis.'
  if (trimmed.length > 30)
    return 'Le pseudo ne doit pas dépasser 30 caractères.'
  return ''
}

// --- Validation images ---
export const validateImagePresence = file =>
  !file ? 'Choisis une image (PNG, JPEG, JPG, SVG, WEBP ≤ 2 Mo)' : ''

export const validateImageType = file =>
  file &&
  ![
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml',
  ].includes(file.type)
    ? 'Format non supporté.\nChoisis une image (PNG, JPG, SVG, WEBP ≤ 2 Mo)'
    : ''

export const compressionErrorMessage =
  'Image trop lourde même après compression (max 2 Mo).'

// ✅ Compression automatique si image > 500 Ko
export const compressImageIfNeeded = async (file, maxSizeKo = 100) => {
  if (!file || file.type === 'image/svg+xml' || file.size <= maxSizeKo * 1024) {
    return file
  }

  return new Promise(resolve => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const reader = new FileReader()

    reader.onload = e => {
      img.src = e.target.result
    }

    img.onload = () => {
      const maxWidth = 512
      const maxHeight = 512
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      const hasAlpha = file.type === 'image/png' || file.type === 'image/webp' // suppose que PNG/WEBP potentiellement avec alpha

      const outputType = hasAlpha ? 'image/png' : 'image/jpeg'
      const quality = outputType === 'image/jpeg' ? 0.6 : 1

      canvas.toBlob(
        blob => {
          const extension = outputType === 'image/png' ? 'png' : 'jpg'
          const fileName = file.name.replace(/\.\w+$/, `.${extension}`)
          const compressedFile = new File([blob], fileName, {
            type: outputType,
            lastModified: Date.now(),
          })

          if (compressedFile.size > 2 * 1024 * 1024) {
            resolve(null)
          } else {
            resolve(compressedFile)
          }
        },
        outputType,
        quality
      )
    }

    reader.readAsDataURL(file)
  })
}
*/
// --- Validation texte ---
export const validateNotEmpty = label =>
  !label.trim() ? 'Le nom est requis' : ''

export const noEdgeSpaces = label =>
  label !== label.trim() ? 'Pas d’espace en début/fin' : ''

export const noDoubleSpaces = label =>
  /\s{2,}/.test(label) ? 'Pas de doubles espaces' : ''

export const validatePseudo = pseudo => {
  const trimmed = pseudo.trim()
  if (!trimmed) return 'Le pseudo est requis.'
  if (trimmed.length > 30)
    return 'Le pseudo ne doit pas dépasser 30 caractères.'
  return ''
}

/* ➕ Normalisation finale (enregistrement) : supprime espaces doublons et bords */
export const normalizeSpaces = s => (s ?? '').replace(/\s{2,}/g, ' ').trim()

// --- Validation images (inchangé) ---
export const validateImagePresence = file =>
  !file ? 'Choisis une image (PNG, JPEG, JPG, SVG, WEBP ≤ 2 Mo)' : ''

export const validateImageType = file =>
  file &&
  ![
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml',
  ].includes(file.type)
    ? 'Format non supporté.\nChoisis une image (PNG, JPG, SVG, WEBP ≤ 2 Mo)'
    : ''

export const compressionErrorMessage =
  'Image trop lourde même après compression (max 2 Mo).'

// ✅ Compression automatique si image > 500 Ko (inchangé)
export const compressImageIfNeeded = async (file, maxSizeKo = 100) => {
  if (!file || file.type === 'image/svg+xml' || file.size <= maxSizeKo * 1024) {
    return file
  }
  return new Promise(resolve => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const reader = new FileReader()
    reader.onload = e => {
      img.src = e.target.result
    }
    img.onload = () => {
      const maxWidth = 512,
        maxHeight = 512
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      const hasAlpha = file.type === 'image/png' || file.type === 'image/webp'
      const outputType = hasAlpha ? 'image/png' : 'image/jpeg'
      const quality = outputType === 'image/jpeg' ? 0.6 : 1
      canvas.toBlob(
        blob => {
          const extension = outputType === 'image/png' ? 'png' : 'jpg'
          const fileName = file.name.replace(/\.\w+$/, `.${extension}`)
          const compressedFile = new File([blob], fileName, {
            type: outputType,
            lastModified: Date.now(),
          })
          if (compressedFile.size > 2 * 1024 * 1024) resolve(null)
          else resolve(compressedFile)
        },
        outputType,
        quality
      )
    }
    reader.readAsDataURL(file)
  })
}
