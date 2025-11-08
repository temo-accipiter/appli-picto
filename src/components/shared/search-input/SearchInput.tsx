import { useEffect, useState } from 'react'
import { useDebounce } from '@/hooks'
import { Search } from 'lucide-react'
import './SearchInput.scss'

interface SearchInputProps {
  placeholder?: string
  onSearch: (term: string) => void
  delay?: number
  className?: string
}

/**
 * SearchInput - Input de recherche avec debounce intégré
 *
 * Composant d'exemple montrant l'utilisation de useDebounce.
 * La recherche ne s'exécute que 300ms après l'arrêt de la saisie.
 *
 * @example
 * <SearchInput
 *   placeholder="Chercher une tâche..."
 *   onSearch={(term) => console.log('Recherche:', term)}
 *   delay={300}
 * />
 */
export default function SearchInput({
  placeholder = 'Rechercher...',
  onSearch,
  delay = 300,
  className = '',
}: SearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // ✅ useDebounce retarde la mise à jour de debouncedSearch
  // La recherche ne s'exécute que quand l'utilisateur arrête de taper
  const debouncedSearch = useDebounce(searchTerm, delay)

  // Quand debouncedSearch change, on exécute la recherche
  // (seulement après le délai de debounce)
  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearch)
    }
  }, [debouncedSearch, onSearch])

  const handleClear = () => {
    setSearchTerm('')
    if (onSearch) onSearch('')
  }

  return (
    <div className={`search-input ${className}`}>
      <Search className="search-input__icon" size={18} />
      <input
        type="text"
        className="search-input__field"
        placeholder={placeholder}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button
          type="button"
          className="search-input__clear"
          onClick={handleClear}
          aria-label="Effacer la recherche"
        >
          ✕
        </button>
      )}
    </div>
  )
}
