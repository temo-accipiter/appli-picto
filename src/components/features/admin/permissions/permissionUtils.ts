// Helper pour obtenir la description d'une permission

interface Feature {
  name: string
  display_name: string
}

type PermissionName =
  | 'confetti'
  | 'change_language'
  | 'theme_toggle'
  | 'upload_images'
  | 'create_tasks'
  | 'read_tasks'
  | 'update_tasks'
  | 'delete_tasks'
  | 'create_rewards'
  | 'read_rewards'
  | 'update_rewards'
  | 'delete_rewards'
  | 'create_categories'
  | 'read_categories'
  | 'update_categories'
  | 'delete_categories'

export const getPermissionDescription = (feature: Feature): string => {
  const descriptions: Record<PermissionName, string> = {
    confetti: 'Effet visuel des confettis lors de la complétion des tâches',
    change_language: "Sélecteur de langue de l'interface",
    theme_toggle: 'Basculement entre thème clair et sombre',
    upload_images: "Interface d'upload d'images",
    create_tasks: 'Création de nouvelles tâches',
    read_tasks: 'Visualisation des tâches existantes',
    update_tasks: 'Modification des tâches existantes',
    delete_tasks: 'Suppression des tâches',
    create_rewards: 'Création de nouvelles récompenses',
    read_rewards: 'Visualisation des récompenses existantes',
    update_rewards: 'Modification des récompenses existantes',
    delete_rewards: 'Suppression des récompenses',
    create_categories: 'Création de nouvelles catégories',
    read_categories: 'Visualisation des catégories existantes',
    update_categories: 'Modification des catégories existantes',
    delete_categories: 'Suppression des catégories',
  }

  return (
    descriptions[feature.name as PermissionName] ||
    `Accès à la fonctionnalité ${feature.display_name}`
  )
}
