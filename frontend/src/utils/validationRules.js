export const validateNotEmpty = (label) =>
  !label.trim() ? 'Le nom est requis' : ''

export const noEdgeSpaces = (label) =>
  label !== label.trim() ? 'Pas d’espace en début/fin' : ''

export const noDoubleSpaces = (label) =>
  /\s{2,}/.test(label) ? 'Pas de doubles espaces' : ''

export const validateImagePresence = (file) =>
  !file ? 'Choisis une image (PNG, JPG, SVG ≤ 500 Ko)' : ''

export const validateImageType = (file) =>
  file &&
  !['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)
    ? 'Format non supporté. (PNG, JPG ou SVG)'
    : ''

export const validateImageSize = (file) =>
  file && file.size > 500 * 1024 ? 'Image trop lourde (max. 500 Ko).' : ''
