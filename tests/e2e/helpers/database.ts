/**
 * 🗄️ Helpers de base de données pour tests E2E Playwright
 *
 * Fournit des utilitaires pour gérer la base de données Supabase locale
 * (seed, cleanup, fixtures).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Configuration Supabase pour tests locaux
 */
const SUPABASE_TEST_CONFIG = {
  url: process.env.SUPABASE_TEST_URL || 'http://localhost:54321',
  anonKey:
    process.env.SUPABASE_TEST_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  serviceRoleKey:
    process.env.SUPABASE_TEST_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
}

/**
 * Client Supabase pour tests (avec service role pour bypass RLS)
 */
let testClient: SupabaseClient | null = null

/**
 * Obtenir le client Supabase de test
 */
export function getTestClient(): SupabaseClient {
  if (!testClient) {
    testClient = createClient(
      SUPABASE_TEST_CONFIG.url,
      SUPABASE_TEST_CONFIG.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return testClient
}

/**
 * Nettoyer toutes les données de test
 *
 * ⚠️ ATTENTION : Cette fonction supprime TOUTES les données de la base de données locale !
 * À n'utiliser QUE dans les tests avec Supabase Local.
 *
 * @example
 * await cleanupDatabase()
 */
export async function cleanupDatabase(): Promise<void> {
  const client = getTestClient()

  // Supprimer dans l'ordre inverse des dépendances
  await client
    .from('recompenses')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  await client
    .from('taches')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  await client
    .from('categories')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  await client
    .from('abonnements')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  await client
    .from('parametres')
    .delete()
    .neq('user_id', '00000000-0000-0000-0000-000000000000')
  await client
    .from('user_permissions')
    .delete()
    .neq('user_id', '00000000-0000-0000-0000-000000000000')
  await client
    .from('user_roles')
    .delete()
    .neq('user_id', '00000000-0000-0000-0000-000000000000')

  // Supprimer les images du storage
  const { data: files } = await client.storage.from('images').list()
  if (files && files.length > 0) {
    const filePaths = files.map(file => file.name)
    await client.storage.from('images').remove(filePaths)
  }
}

/**
 * Créer un utilisateur de test
 *
 * @param email - Email de l'utilisateur
 * @param password - Mot de passe
 * @param role - Rôle de l'utilisateur
 * @returns ID de l'utilisateur créé
 *
 * @example
 * const userId = await createTestUser('test@example.com', 'password', 'free')
 */
// Overload signatures
export async function createTestUser(
  email: string,
  password: string,
  role?: 'free' | 'abonne' | 'admin'
): Promise<string>
export async function createTestUser(options: {
  role?: 'free' | 'abonne' | 'admin'
  email?: string
  password?: string
}): Promise<{ email: string; password: string; userId: string }>

// Implementation
export async function createTestUser(
  emailOrOptions: string | { role?: 'free' | 'abonne' | 'admin'; email?: string; password?: string },
  password?: string,
  role: 'free' | 'abonne' | 'admin' = 'free'
): Promise<string | { email: string; password: string; userId: string }> {
  const client = getTestClient()

  // Determine which signature was used
  let email: string
  let pwd: string
  let userRole: 'free' | 'abonne' | 'admin'
  let returnObject = false

  if (typeof emailOrOptions === 'object') {
    // Options signature
    email = emailOrOptions.email || `test-${Date.now()}@example.com`
    pwd = emailOrOptions.password || 'Test123!@#'
    userRole = emailOrOptions.role || 'free'
    returnObject = true
  } else {
    // Individual parameters signature
    email = emailOrOptions
    pwd = password!
    userRole = role
  }

  // Créer l'utilisateur via l'API admin
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: pwd,
    email_confirm: true,
  })

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`)
  }

  const userId = data.user.id

  // Assigner le rôle
  await client.from('user_roles').insert({
    user_id: userId,
    role: userRole,
  })

  // Créer les paramètres par défaut
  await client.from('parametres').insert({
    user_id: userId,
    confettis: true,
  })

  if (returnObject) {
    return { email, password: pwd, userId }
  }
  return userId
}

/**
 * Supprimer un utilisateur de test
 *
 * @param userId - ID de l'utilisateur à supprimer
 *
 * @example
 * await deleteTestUser(userId)
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const client = getTestClient()

  // Supprimer les données liées
  await client.from('recompenses').delete().eq('user_id', userId)
  await client.from('taches').delete().eq('user_id', userId)
  await client.from('categories').delete().eq('user_id', userId)
  await client.from('abonnements').delete().eq('user_id', userId)
  await client.from('parametres').delete().eq('user_id', userId)
  await client.from('user_permissions').delete().eq('user_id', userId)
  await client.from('user_roles').delete().eq('user_id', userId)

  // Supprimer l'utilisateur
  await client.auth.admin.deleteUser(userId)
}

/**
 * Seed des données de test pour un utilisateur
 *
 * @param userId - ID de l'utilisateur
 * @param options - Options de seed
 *
 * @example
 * await seedUserData(userId, { taches: 5, recompenses: 3 })
 */
export async function seedUserData(
  userId: string,
  options: {
    taches?: number
    recompenses?: number
    categories?: number
  } = {}
): Promise<void> {
  const client = getTestClient()

  const { taches = 5, recompenses = 3, categories = 2 } = options

  // Créer des catégories
  const categoriesData = []
  for (let i = 0; i < categories; i++) {
    // @ts-ignore - Supabase insert type inference issue
    categoriesData.push({
      user_id: userId,
      label: `Catégorie Test ${i + 1}`,
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][i % 4],
    })
  }

  const { data: createdCategories } = await client
    .from('categories')
    .insert(categoriesData)
    .select()

  // Créer des tâches
  const tachesData = []
  for (let i = 0; i < taches; i++) {
    // @ts-ignore - Supabase insert type inference issue
    tachesData.push({
      user_id: userId,
      label: `Tâche Test ${i + 1}`,
      fait: i % 2 === 0,
      aujourdhui: i < 3,
      position: i,
      category_id:
        createdCategories?.[i % createdCategories.length]?.id || null,
    })
  }

  await client.from('taches').insert(tachesData)

  // Créer des récompenses
  const recompensesData = []
  for (let i = 0; i < recompenses; i++) {
    // @ts-ignore - Supabase insert type inference issue
    recompensesData.push({
      user_id: userId,
      label: `Récompense Test ${i + 1}`,
      selected: i === 0,
    })
  }

  await client.from('recompenses').insert(recompensesData)
}

/**
 * Créer un abonnement de test pour un utilisateur
 *
 * @param userId - ID de l'utilisateur
 * @param status - Statut de l'abonnement
 *
 * @example
 * await createTestSubscription(userId, 'active')
 */
export async function createTestSubscription(
  userId: string,
  status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active'
): Promise<void> {
  const client = getTestClient()

  await client.from('abonnements').insert({
    user_id: userId,
    customer_id: `cus_test_${userId.substring(0, 8)}`,
    subscription_id: `sub_test_${userId.substring(0, 8)}`,
    status: status,
    current_period_end: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(), // +30 jours
  })

  // Mettre à jour le rôle vers 'abonne' si l'abonnement est actif
  if (status === 'active' || status === 'trialing') {
    await client
      .from('user_roles')
      .update({ role: 'abonne' })
      .eq('user_id', userId)
  }
}

/**
 * Créer un scénario de test complet
 *
 * Cette fonction crée un utilisateur avec des données de test complètes.
 *
 * @param scenario - Type de scénario
 * @returns ID de l'utilisateur et ses credentials
 *
 * @example
 * const { userId, email, password } = await createTestScenario('free-with-data')
 */
export async function createTestScenario(
  scenario: 'free-empty' | 'free-with-data' | 'abonne-full' | 'admin'
): Promise<{ userId: string; email: string; password: string }> {
  const timestamp = Date.now()
  const email = `test-${scenario}-${timestamp}@test.local`
  const password = 'TestPassword123!'

  let role: 'free' | 'abonne' | 'admin' = 'free'
  let withData = false
  let withSubscription = false

  switch (scenario) {
    case 'free-empty':
      role = 'free'
      break
    case 'free-with-data':
      role = 'free'
      withData = true
      break
    case 'abonne-full':
      role = 'abonne'
      withData = true
      withSubscription = true
      break
    case 'admin':
      role = 'admin'
      withData = true
      break
  }

  const userId = await createTestUser(email, password, role)

  if (withData) {
    await seedUserData(userId, {
      taches: role === 'free' ? 3 : 10,
      recompenses: role === 'free' ? 2 : 5,
      categories: role === 'free' ? 2 : 5,
    })
  }

  if (withSubscription) {
    await createTestSubscription(userId, 'active')
  }

  return { userId, email, password }
}
