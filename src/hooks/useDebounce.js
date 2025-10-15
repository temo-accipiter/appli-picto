// src/hooks/useDebounce.js
import { useEffect, useState } from 'react'

/**
 * Hook useDebounce - Retarde la mise à jour d'une valeur
 *
 * Utile pour les inputs de recherche, filtres, ou tout champ qui
 * déclenche des requêtes DB ou calculs coûteux.
 *
 * @param {*} value - Valeur à debouncer
 * @param {number} delay - Délai en millisecondes (défaut: 500ms)
 * @returns {*} Valeur debouncée (mise à jour après le délai)
 *
 * @example
 * // Dans un composant de recherche
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 300)
 *
 * useEffect(() => {
 *   // Cette requête ne s'exécutera que 300ms après l'arrêt de la saisie
 *   searchDatabase(debouncedSearch)
 * }, [debouncedSearch])
 *
 * @example
 * // Dans un filtre de catégories
 * const [filterValue, setFilterValue] = useState('')
 * const debouncedFilter = useDebounce(filterValue, 500)
 *
 * const filteredItems = items.filter(item =>
 *   item.label.toLowerCase().includes(debouncedFilter.toLowerCase())
 * )
 */
export default function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // Créer un timer qui mettra à jour debouncedValue après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup : annuler le timer si value change avant la fin du délai
    // Cela garantit qu'on ne met à jour que lorsque l'utilisateur arrête de taper
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
