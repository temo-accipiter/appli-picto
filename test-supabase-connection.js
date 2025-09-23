// Script de test pour vérifier la connexion Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tklcztqoqvnialaqfcjm.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGN6dHFvcXZuaWFsYXFmY2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTM0NDEsImV4cCI6MjA2ODgyOTQ0MX0.O2H1eyrlUaq1K6d92j5uAGn3xzOaS0xroa4MagPna68'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('🔍 Test de connexion Supabase...')

  try {
    // Test 1: Connexion de base
    console.log('✅ Client Supabase créé avec succès')

    // Test 2: Vérifier les tables
    const { data: _tables, error: tablesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (tablesError) {
      console.error("❌ Erreur lors de l'accès aux tables:", tablesError)
    } else {
      console.log('✅ Accès aux tables réussi')
    }

    // Test 3: Vérifier l'authentification
    const { data: authData, error: authError } =
      await supabase.auth.getSession()
    if (authError) {
      console.error("❌ Erreur d'authentification:", authError)
    } else {
      console.log("✅ Service d'authentification fonctionnel")
      console.log(
        'Session actuelle:',
        authData.session ? 'Connecté' : 'Non connecté'
      )
    }

    // Test 4: Vérifier le storage
    const { data: buckets, error: storageError } =
      await supabase.storage.listBuckets()
    if (storageError) {
      console.error('❌ Erreur de storage:', storageError)
    } else {
      console.log('✅ Service de storage fonctionnel')
      console.log(
        'Buckets disponibles:',
        buckets.map(b => b.name)
      )
    }
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

testConnection()
