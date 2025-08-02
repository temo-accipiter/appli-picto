import { useStations } from '@/hooks'

export default function TestStations() {
  const { stations, loading, error } = useStations('6')

  if (loading) return <p>⏳ Chargement...</p>
  if (error) return <p>❌ Erreur : {error.message}</p>

  return (
    <div>
      <h2>Stations de la ligne 6 :</h2>
      <ul>
        {stations.map(station => (
          <li key={station.id}>
            {station.ordre}. {station.label} (ligne {station.ligne})
          </li>
        ))}
      </ul>
    </div>
  )
}
