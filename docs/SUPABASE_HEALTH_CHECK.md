# 🏥 Système de Health Check Supabase

## 📚 Problème résolu

Le SDK Supabase peut se retrouver dans un état corrompu (deadlock) causant :

- Promises bloquées indéfiniment (timeout)
- Interface figée sans erreur console
- Impossibilité d'utiliser l'application

Ce système détecte et corrige automatiquement ces états.

---

## ✅ Architecture

### 1. Health Check (`src/utils/supabaseHealthCheck.js`)

**Fonctionnalités :**

- Teste `getSession()` avec timeout 3s
- Teste `select()` avec timeout 3s
- Compteur d'échecs consécutifs (max 2)
- Reset automatique si >2 échecs
- Logging complet dans `window.__supabaseHealth`

**Utilisation :**

```javascript
import { checkSupabaseHealth } from '@/utils/supabaseHealthCheck'

const health = await checkSupabaseHealth(supabase)
if (!health.healthy && health.shouldReset) {
  // SDK corrompu, reset nécessaire
}
```

---

### 2. Heartbeat Périodique (`src/utils/supabaseHeartbeat.js`)

**Fonctionnalités :**

- Health check toutes les 30 secondes
- Health check après retour de veille (`visibilitychange`)
- Toast avant reload automatique
- Reset + reload si SDK gelé

**Utilisation :**

```javascript
import { startSupabaseHeartbeat } from '@/utils/supabaseHeartbeat'

startSupabaseHeartbeat(supabase, {
  showToast: (message, type) => {
    // Afficher un toast à l'utilisateur
  },
})
```

---

### 3. Intégration AuthContext

Le système est démarré automatiquement dans `AuthContext` :

- Health check au boot de l'app
- Heartbeat démarré dès le montage
- Toast affiché avant reload
- Cleanup au démontage

---

## 🔍 Accès aux logs (Debug)

Dans la console browser :

```javascript
// Voir tous les logs
window.__supabaseHealth.logs

// Voir les stats
window.__supabaseHealth.stats

// Derniers logs
window.__supabaseHealth.logs.slice(-10)
```

**Format d'un log :**

```javascript
{
  timestamp: "2025-10-29T21:08:16.776Z",
  level: "warn", // 'info' | 'warn' | 'error'
  message: "Check failed (2/2)",
  data: {
    error: "TIMEOUT",
    consecutiveFailures: 2
  }
}
```

---

## ⚙️ Configuration

### Constantes modifiables

**Dans `supabaseHealthCheck.js` :**

```javascript
const HEALTH_CHECK_TIMEOUT = 3000 // Timeout des checks (ms)
const MAX_CONSECUTIVE_FAILURES = 2 // Échecs avant reset
const RELOAD_DELAY = 3000 // Délai avant reload (ms)
```

**Dans `supabaseHeartbeat.js` :**

```javascript
const HEARTBEAT_INTERVAL = 30000 // Intervalle checks (ms)
const VISIBILITY_CHECK_DELAY = 2000 // Délai après veille (ms)
```

---

## 🎯 Scénarios de fonctionnement

### Scénario 1 : Démarrage normal

```
1. User ouvre l'app
2. Health check au boot → SDK OK ✅
3. Heartbeat démarre (check toutes les 30s)
4. App fonctionne normalement
```

### Scénario 2 : SDK se corrompt pendant l'utilisation

```
1. User utilise l'app
2. Après 10 min, SDK se gèle
3. Heartbeat détecte timeout (30s max)
4. Toast affiché : "Connexion interrompue..."
5. Délai 3s (permet sauvegardes)
6. Reset automatique du SDK
7. Reload de la page
8. User reprend où il en était ✅
```

### Scénario 3 : Retour de veille

```
1. PC en veille 1h
2. User revient
3. visibilitychange détecté
4. Health check après 2s
5. Si SDK gelé → Toast + Reload
6. App redémarre proprement ✅
```

### Scénario 4 : SDK gelé au démarrage

```
1. User ouvre l'app
2. Health check au boot → SDK TIMEOUT ❌
3. Détection immédiate (3s max)
4. Toast + Reset + Reload
5. Nouveau démarrage propre ✅
```

---

## 🧪 Tests recommandés

### Test 1 : Démarrage normal

```bash
1. Ouvrir l'app
2. Console : "[Heartbeat] 💓 Started monitoring..."
3. ✅ App charge normalement
4. ✅ Pas de reload intempestif
```

### Test 2 : Simulation SDK gelé

```javascript
// Dans la console browser
;(async () => {
  // Forcer un timeout sur getSession
  const orig = supabase.auth.getSession
  supabase.auth.getSession = () => new Promise(() => {})

  // Attendre 30s → heartbeat va détecter
  // ✅ Résultat : Toast + Reload automatique
})()
```

### Test 3 : Retour de veille

```bash
1. Ouvrir l'app
2. Mettre PC en veille 5 min
3. Réveiller PC
4. ✅ Health check automatique après 2s
5. ✅ Si SDK gelé → Toast + Reload
```

### Test 4 : Vérifier les logs

```javascript
// Après quelques minutes d'utilisation
window.__supabaseHealth.logs.filter(l => l.level === 'warn')

// Voir les stats actuelles
window.__supabaseHealth.stats
```

---

## ⚠️ Comportement attendu

### ✅ Avantages

- **Détection rapide** : SDK gelé détecté en <30s
- **Reset automatique** : Plus besoin de refresh manuel
- **Toast informatif** : User informé avant reload
- **Délai de sauvegarde** : 3s pour terminer les opérations
- **Logging complet** : Debug facile via `window.__supabaseHealth`

### ⚠️ Compromis

- **Reload automatique** : Perte de l'état local non sauvegardé
  - Mais préférable à une app figée définitivement
  - La plupart des données sont en DB

- **Timeout 30s** : Maximum 30s entre gel et détection
  - Peut être réduit si besoin (ex: 15s)
  - Plus court = plus de checks = plus de charge

---

## 🔧 Maintenance

### Ajuster le timeout des checks

Si des faux positifs (reload intempestifs) :

```javascript
// Augmenter le timeout
const HEALTH_CHECK_TIMEOUT = 5000 // 5s au lieu de 3s
```

### Ajuster l'intervalle heartbeat

Si trop de checks :

```javascript
// Réduire la fréquence
const HEARTBEAT_INTERVAL = 60000 // 60s au lieu de 30s
```

### Désactiver temporairement

```javascript
// Dans AuthContext.jsx
// Commenter la ligne :
// startSupabaseHeartbeat(supabase, { showToast: showReconnectionToast })
```

---

## 📊 Métriques à surveiller

1. **Fréquence des reloads** : Si >1/jour → problème sous-jacent
2. **Logs "warn"** : Nombre d'échecs consécutifs
3. **Logs "error"** : Erreurs de reset
4. **Pattern temporel** : Heure des incidents (corrélation veille?)

---

## 🚀 Améliorations futures possibles

1. **Backoff exponentiel** : Augmenter délai entre checks après échecs
2. **Circuit breaker** : Désactiver heartbeat si trop d'échecs
3. **Analytics** : Reporter les incidents à un service de monitoring
4. **Retry avant reload** : Tenter plusieurs resets avant reload
5. **State persistence** : Sauvegarder l'état avant reload

---

## 📝 Changelog

### v1.0.0 (2025-10-29)

- ✅ Health check avec timeout 3s
- ✅ Heartbeat périodique 30s
- ✅ Reset automatique après 2 échecs
- ✅ Toast avant reload
- ✅ Délai 3s pour sauvegardes
- ✅ Logging complet `window.__supabaseHealth`
- ✅ Check après retour de veille
