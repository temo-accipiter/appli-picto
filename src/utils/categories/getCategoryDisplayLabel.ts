export interface CategoryLabelSource {
  is_system: boolean
  name: string
}

/**
 * Alias UI uniquement :
 * - DB conserve la catégorie système "Sans catégorie" (is_system=true)
 * - UI affiche "Aucune catégorie" pour réduire l'ambiguïté
 */
export function getCategoryDisplayLabel(category: CategoryLabelSource): string {
  return category.is_system ? 'Aucune catégorie' : category.name
}
