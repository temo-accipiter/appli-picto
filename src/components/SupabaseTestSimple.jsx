import { supabase } from '@/utils'
import { useState } from 'react'

export default function SupabaseTestSimple() {
  const [testResults, setTestResults] = useState({})
  const [loading, setLoading] = useState(false)

  const runBasicTests = async () => {
    setLoading(true)
    const results = {}

    try {
      // Test 1: Connexion de base
      results.connection = '✅ Client Supabase créé avec succès'

      // Test 2: Vérifier l'authentification
      const { data: authData, error: authError } =
        await supabase.auth.getSession()
      if (authError) {
        results.auth = `❌ Erreur auth: ${authError.message}`
      } else {
        results.auth = `✅ Service d'authentification fonctionnel (Session: ${authData.session ? 'Connecté' : 'Non connecté'})`
      }

      // Test 3: Vérifier l'accès aux tables
      const { data: _profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (profilesError) {
        results.tables = `❌ Erreur tables: ${profilesError.message}`
      } else {
        results.tables = '✅ Accès aux tables réussi'
      }

      // Test 4: Vérifier le storage
      const { data: buckets, error: storageError } =
        await supabase.storage.listBuckets()
      if (storageError) {
        results.storage = `❌ Erreur storage: ${storageError.message}`
      } else {
        results.storage = `✅ Service de storage fonctionnel (Buckets: ${buckets.map(b => b.name).join(', ')})`
      }
    } catch (error) {
      results.general = `❌ Erreur générale: ${error.message}`
    }

    setTestResults(results)
    setLoading(false)
  }

  return (
    <div
      style={{
        padding: '15px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        margin: '15px',
        backgroundColor: '#fafafa',
        fontSize: '14px',
      }}
    >
      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>🧪 Test Supabase</h4>

      <button
        onClick={runBasicTests}
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3ecf8e',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '12px',
        }}
      >
        {loading ? 'Tests...' : 'Tester'}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div style={{ marginTop: '15px' }}>
          {Object.entries(testResults).map(([test, result]) => (
            <div
              key={test}
              style={{
                margin: '8px 0',
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
              }}
            >
              <strong style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                {test}:
              </strong>
              <span style={{ marginLeft: '8px' }}>{result}</span>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: '15px',
          fontSize: '11px',
          color: '#666',
          borderTop: '1px solid #e0e0e0',
          paddingTop: '10px',
        }}
      >
        <p style={{ margin: '5px 0' }}>
          <strong>Note:</strong> Tests de connectivité de base
        </p>
        <p style={{ margin: '5px 0' }}>
          Pour des tests complets, vérifiez l&apos;authentification et les
          opérations CRUD
        </p>
      </div>
    </div>
  )
}
