export const validateNotEmpty = (label) =>
  !label.trim() ? 'Le nom est requis' : ''

export const noEdgeSpaces = (label) =>
  label !== label.trim() ? 'Pas d’espace en début/fin' : ''

export const noDoubleSpaces = (label) =>
  /\s{2,}/.test(label) ? 'Pas de doubles espaces' : ''
