// scripts/pull-functions.js
import { execSync } from 'node:child_process'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts })
}

function cmdOk(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function tryJsonList() {
  const cmds = [
    'supabase functions list --output json',
    'supabase functions list -o json',
  ]
  for (const c of cmds) {
    try {
      const out = run(`yarn exec dotenv -e .env -- ${c}`)
      const arr = JSON.parse(out)
      if (Array.isArray(arr)) return arr.map(f => f.name).filter(Boolean)
    } catch {
      /* on tente la suivante */
    }
  }
  return null
}

function parseTextTable(txt) {
  const lines = txt.split('\n')
  let start = lines.findIndex(l => l.includes('| NAME '))
  if (start === -1) start = 0
  const body = lines.slice(start + 2) // saute header + séparateurs
  const names = []
  for (const line of body) {
    if (!line.includes('|')) continue
    const cols = line.split('|').map(s => s.trim())
    const name = cols[1]
    if (name && name !== 'NAME' && !/^-{3,}$/.test(name)) names.push(name)
  }
  return names
}

function getFunctionNames() {
  const fromJson = tryJsonList()
  if (fromJson?.length) return fromJson
  const txt = run('yarn exec dotenv -e .env -- supabase functions list')
  return parseTextTable(txt)
}

function dockerRunning() {
  return cmdOk('docker info')
}

function downloadFn(name) {
  const ref = process.env.SUPABASE_PROJECT_REF
  // Sans Docker → on tente d'abord legacy
  if (!dockerRunning()) {
    try {
      run(
        `yarn exec dotenv -e .env -- supabase functions download "${name}" --project-ref "${ref}" --legacy-bundle`,
        { stdio: 'inherit' }
      )
      return true
    } catch (e) {
      const msg = e?.stdout?.toString?.() || e.message
      if (/InvalidV2/i.test(msg)) {
        console.error(
          `⚠️  Impossible de télécharger "${name}" (bundle récent 'V2').\n   → Solutions :\n     1) Démarrer Docker Desktop et relancer (sans --legacy-bundle)\n     2) Télécharger depuis le Dashboard (Functions → ${name} → Download source)\n     3) Re-déployer la fonction avec ta CLI locale puis retenter le download`
        )
        return false
      }
      throw e
    }
  }

  // Avec Docker → méthode moderne
  run(
    `yarn exec dotenv -e .env -- supabase functions download "${name}" --project-ref "${ref}"`,
    { stdio: 'inherit' }
  )
  return true
}

try {
  console.log('📥 Récupération de la liste des fonctions depuis Supabase…')
  const names = getFunctionNames()

  if (!names.length) {
    console.log('⚠️ Aucune Edge Function trouvée sur le projet lié.')
    process.exit(0)
  }

  console.log(`✅ Fonctions détectées (${names.length}) :`, names)

  let ok = 0,
    ko = 0
  for (const n of names) {
    console.log(`⬇️ Téléchargement de "${n}"…`)
    try {
      if (downloadFn(n)) ok++
      else ko++
    } catch (e) {
      console.error(
        `❌ Échec sur "${n}" :`,
        e?.stdout?.toString?.() || e.message
      )
      ko++
    }
  }

  console.log(`\n🎯 Résumé : ${ok} téléchargée(s), ${ko} en échec.`)
  if (ko > 0) {
    console.log(
      '👉 Pour les échecs, suis les indications ci-dessus (Docker ou Download via Dashboard).'
    )
  }
} catch (e) {
  console.error('❌ Erreur générale :', e?.stdout?.toString?.() || e.message)
  process.exit(1)
}
