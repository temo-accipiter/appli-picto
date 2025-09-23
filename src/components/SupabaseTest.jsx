import { supabase } from '@/utils'
import { useState } from 'react'

export default function SupabaseTest() {
  const [testResults, setTestResults] = useState({})
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    const results = {}

    try {
      // Test 1: Connexion de base
      results.connection = '✅ Client Supabase créé avec succès'

      // Test 2: Vérifier les tables
      const { data: _profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (profilesError) {
        results.tables = `❌ Erreur tables: ${profilesError.message}`
      } else {
        results.tables = '✅ Accès aux tables réussi'
      }

      // Test 3: Vérifier l'authentification
      const { data: authData, error: authError } =
        await supabase.auth.getSession()
      if (authError) {
        results.auth = `❌ Erreur auth: ${authError.message}`
      } else {
        results.auth = `✅ Service d'authentification fonctionnel (Session: ${authData.session ? 'Connecté' : 'Non connecté'})`
      }

      // Test 4: Vérifier le storage
      const { data: buckets, error: storageError } =
        await supabase.storage.listBuckets()
      if (storageError) {
        results.storage = `❌ Erreur storage: ${storageError.message}`
      } else {
        results.storage = `✅ Service de storage fonctionnel (Buckets: ${buckets.map(b => b.name).join(', ')})`
      }

      // Test 5: Vérifier les fonctions Edge
      try {
        const { data: _functions, error: functionsError } =
          await supabase.functions.invoke('test-connection', {
            body: { message: 'test' },
          })
        if (functionsError) {
          results.functions = `⚠️ Fonctions Edge: ${functionsError.message}`
        } else {
          results.functions = '✅ Fonctions Edge accessibles'
        }
      } catch {
        results.functions =
          '⚠️ Fonctions Edge non testées (fonction test-connection inexistante)'
      }
    } catch (error) {
      results.general = `❌ Erreur générale: ${error.message}`
    }

    setTestResults(results)
    setLoading(false)
  }

  return (
    <div
      className="supabase-test"
      style={{
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        margin: '20px',
      }}
    >
      <h3>🧪 Test d&apos;intégration Supabase</h3>

      <button
        onClick={runTests}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3ecf8e',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Tests en cours...' : 'Lancer les tests'}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Résultats des tests :</h4>
          {Object.entries(testResults).map(([test, result]) => (
            <div
              key={test}
              style={{
                margin: '10px 0',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
              }}
            >
              <strong>{test}:</strong> {result}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>
          <strong>Note :</strong> Ce composant teste la connectivité de base
          avec Supabase.
        </p>
        <p>Pour des tests complets, vérifiez aussi :</p>
        <ul>
          <li>L&apos;authentification utilisateur</li>
          <li>Les opérations CRUD sur vos tables</li>
          <li>Le téléchargement/upload de fichiers</li>
          <li>Les fonctions Edge</li>
        </ul>
      </div>
    </div>
  )
}
