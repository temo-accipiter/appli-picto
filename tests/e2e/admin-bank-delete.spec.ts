/**
 * Tests E2E — Suppression carte banque (Admin)
 *
 * Non-régression après correction du bug categories=t :
 *   T1 — Suppression réussit même si une ligne pivot user_card_categories existe
 *        (trigger cards_prevent_delete_bank_if_referenced : vérification user_card_categories retirée)
 *   T2 — Suppression bloquée si la carte est référencée dans un slot réel
 *        (garde-fou slots/sequences intact après le fix)
 *
 * ⚠️ Bug i18n connu (à traiter séparément) :
 *    Clé 'card.delete' absente de public/locales/fr/common.json.
 *    L'aria-label du ButtonDelete vaut la clé brute "card.delete" en runtime.
 *    Sélecteur : /card\.delete|Supprimer/i (couvre les deux états possibles).
 *
 * Infrastructure locale :
 *   - Compte admin seed : admin@local.dev / Admin1234x (UUID fixe : aaaaaaaa-aaaa-aaaa-aaaa-000000000001)
 *   - image_url fictive (NOT NULL requis) : le bucket bank-images peut ne pas contenir le fichier.
 *     Si la carte ne s'affiche pas faute d'image résoluble, l'assertion toBeVisible échouera — signaler
 *     au lieu de contourner.
 *   - T2 : un profil "garde-fou" peut rester en DB après le premier run (trigger anti-dernier-profil).
 *     Propre après pnpm db:reset.
 */

import { test, expect } from '@playwright/test'
import { loginAs, getTestClient } from './helpers'

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'
const E2E_IMAGE = 'bank-images/e2e-placeholder.png'

// Timeout étendu : loginAs inclut reload + networkidle qui peut prendre 15-20s sur cold start
test.setTimeout(60000)
// 1 retry pour absorber les pannes réseau transitoires (Supabase cold start, Docker)
test.describe.configure({ retries: 1 })

test.beforeEach(async ({ page }) => {
  // Pré-injecter le consentement cookies avant CHAQUE navigation (addInitScript).
  // La CookieBanner a position:fixed + z-index élevé et se retrouve sur la zone des
  // boutons de la modal sur mobile → pointer interception sur Mobile Chrome / Safari.
  // addInitScript s'exécute avant chaque page.goto / page.reload → bannière invisible.
  await page.addInitScript(() => {
    localStorage.setItem(
      'cookie_consent_v2',
      JSON.stringify({
        version: '1.0.0',
        ts: new Date().toISOString(),
        mode: 'refuse',
        choices: { necessary: true, analytics: false, marketing: false },
      })
    )
  })

  // ⚠️ Remettre toasts_enabled à true avant chaque test.
  // La préférence admin peut être désactivée via l'UI entre deux sessions.
  // Sans ce reset, show('...', 'success') est silencieux → assertion toast échoue.
  const db = getTestClient()
  await db
    .from('account_preferences')
    .update({ toasts_enabled: true })
    .eq('account_id', ADMIN_ID)

  await loginAs(page, 'admin')
})

// ─── T1 : Suppression OK après changement de catégorie ──────────────────────

test.describe('T1 — Pivot user_card_categories ne bloque plus la suppression', () => {
  let cardId: string
  let categoryId: string

  test.beforeEach(async () => {
    const db = getTestClient()

    const { data: card, error: cardErr } = await db
      .from('cards')
      .insert({
        type: 'bank',
        name: 'Carte E2E — pivot',
        image_url: E2E_IMAGE,
        published: true,
        account_id: null,
      })
      .select('id')
      .single()
    if (cardErr || !card)
      throw new Error(`Seed carte banque : ${cardErr?.message}`)
    cardId = card.id

    const { data: cat, error: catErr } = await db
      .from('categories')
      .insert({
        account_id: ADMIN_ID,
        name: 'Catégorie E2E pivot',
        is_system: false,
      })
      .select('id')
      .single()
    if (catErr || !cat) throw new Error(`Seed catégorie : ${catErr?.message}`)
    categoryId = cat.id
  })

  test.afterEach(async () => {
    const db = getTestClient()
    // user_card_categories supprimé en cascade par FK cards.id → safe même si la carte
    // a déjà été supprimée par le test (DELETE sans résultat = pas d'erreur)
    await db.from('cards').delete().eq('id', cardId)
    await db.from('categories').delete().eq('id', categoryId)
  })

  test('suppression réussit même après changement de catégorie (pivot existant)', async ({
    page,
  }) => {
    await page.goto('/edition')
    await page.waitForLoadState('domcontentloaded')

    await page.getByRole('tab', { name: /Banque/ }).click()

    const card = page.locator(`[data-testid="base-card-${cardId}"]`)
    await expect(card).toBeVisible({ timeout: 15000 })

    // Vérifier que le Select catégorie est rendu (categorieOptions.length > 0)
    const selectTrigger = card.locator(`#select-categorie-${cardId}`)
    await expect(selectTrigger).toBeVisible({ timeout: 5000 })

    // Changer la catégorie via le Select → UPSERT dans user_card_categories
    // C'est exactement l'opération qui déclenchait le bug categories=t
    const pivotDone = page.waitForResponse(
      resp => resp.url().includes('/rest/v1/user_card_categories') && resp.ok(),
      { timeout: 5000 }
    )
    await selectTrigger.click()
    await page
      .locator('[role="option"]')
      .filter({ hasText: 'Catégorie E2E pivot' })
      .click()
    await pivotDone

    // Supprimer la carte via le bouton de la carte
    await card.getByRole('button', { name: /card\.delete|Supprimer/i }).click()
    // Filtre sur "Confirmer la suppression" pour éviter le match sur le cookie banner (role="dialog" aussi)
    const modal = page
      .getByRole('dialog')
      .filter({ hasText: 'Confirmer la suppression' })
    await expect(modal).toBeVisible({ timeout: 5000 })
    await modal.getByRole('button', { name: 'Supprimer' }).click()

    // ✅ Toast succès
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Carte de banque supprimée avec succès' })
    ).toBeVisible({ timeout: 8000 })

    // ✅ Carte absente de la liste
    await expect(card).not.toBeVisible({ timeout: 5000 })
  })
})

// ─── T2 : Suppression bloquée si carte dans un slot ─────────────────────────

test.describe('T2 — Garde-fou slot conservé après correction', () => {
  let cardId: string
  let profileId: string

  test.beforeEach(async () => {
    const db = getTestClient()

    // Créer la carte banque de test
    const { data: card, error: cardErr } = await db
      .from('cards')
      .insert({
        type: 'bank',
        name: 'Carte E2E — slot',
        image_url: E2E_IMAGE,
        published: true,
        account_id: null,
      })
      .select('id')
      .single()
    if (cardErr || !card)
      throw new Error(`Seed carte banque : ${cardErr?.message}`)
    cardId = card.id

    // Assurer la présence d'au moins 1 profil "garde-fou" pour l'admin.
    // Contexte : trigger tg_child_profiles_prevent_delete_last bloque la suppression
    // du DERNIER profil d'un compte. Sans ce garde-fou, la suppression du profil de test
    // en afterEach échouerait lors du premier run (0 profils existants → 0 restants → erreur).
    // Ce profil n'est pas supprimé en afterEach ; il est nettoyé par pnpm db:reset.
    const { count } = await db
      .from('child_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', ADMIN_ID)
    if ((count ?? 0) === 0) {
      await db
        .from('child_profiles')
        .insert({ account_id: ADMIN_ID, name: 'E2E Guard — profil invariant' })
    }

    // Créer le profil de test.
    // Triggers en cascade :
    //   child_profiles INSERT → trigger_child_profiles_auto_create_timeline → INSERT timelines
    //   timelines INSERT → trigger_timelines_auto_create_minimal_slots → INSERT slots (1 step + 1 reward)
    const { data: profile, error: profErr } = await db
      .from('child_profiles')
      .insert({ account_id: ADMIN_ID, name: 'E2E Slot Test' })
      .select('id')
      .single()
    if (profErr || !profile)
      throw new Error(`Seed profil : ${profErr?.message}`)
    profileId = profile.id

    // Récupérer la timeline auto-créée
    const { data: timeline, error: tlErr } = await db
      .from('timelines')
      .select('id')
      .eq('child_profile_id', profileId)
      .single()
    if (tlErr || !timeline)
      throw new Error(`Timeline introuvable : ${tlErr?.message}`)

    // Assigner la carte banque au slot step auto-créé (card_id NULL → bank card).
    // enforce_slot_card_ownership : les cartes banque sont explicitement autorisées (RETURN NEW immédiat).
    // slots_guard_validated_on_structural_change : assignation NULL → card toujours permise.
    const { error: slotErr } = await db
      .from('slots')
      .update({ card_id: cardId })
      .eq('timeline_id', timeline.id)
      .eq('kind', 'step')
    if (slotErr) throw new Error(`Assign slot : ${slotErr.message}`)
  })

  test.afterEach(async () => {
    const db = getTestClient()

    // 1. Désassigner la carte du slot (bank card → NULL : autorisé hors active_started).
    //    Sans cette étape, le trigger cards_prevent_delete_bank_if_referenced bloquerait
    //    la suppression de la carte même via service_role (les triggers ignorent la RLS bypass).
    await db.from('slots').update({ card_id: null }).eq('card_id', cardId)

    // 2. Supprimer la carte banque de test
    await db.from('cards').delete().eq('id', cardId)

    // 3. Supprimer le profil de test.
    //    Le profil "garde-fou" garantit remaining_count ≥ 1 → trigger autorise.
    await db.from('child_profiles').delete().eq('id', profileId)

    // Note : le profil "garde-fou" reste intentionnellement en DB.
    // Nettoyage via pnpm db:reset entre les sessions CI / locales.
  })

  test('suppression bloquée si carte référencée dans un slot réel (garde-fou actif)', async ({
    page,
  }) => {
    await page.goto('/edition')
    await page.waitForLoadState('domcontentloaded')

    await page.getByRole('tab', { name: /Banque/ }).click()

    const card = page.locator(`[data-testid="base-card-${cardId}"]`)
    await expect(card).toBeVisible({ timeout: 15000 })

    // Tenter la suppression
    await card.getByRole('button', { name: /card\.delete|Supprimer/i }).click()
    // Filtre sur "Confirmer la suppression" pour éviter le match sur le cookie banner (role="dialog" aussi)
    const modal = page
      .getByRole('dialog')
      .filter({ hasText: 'Confirmer la suppression' })
    await expect(modal).toBeVisible({ timeout: 5000 })
    await modal.getByRole('button', { name: 'Supprimer' }).click()

    // ✅ Toast erreur (trigger bloque : slot encore actif)
    await expect(
      page.getByRole('status').filter({
        hasText: 'Cette carte est utilisée et ne peut pas être supprimée.',
      })
    ).toBeVisible({ timeout: 8000 })

    // ✅ Carte toujours présente
    await expect(card).toBeVisible({ timeout: 5000 })
  })
})
