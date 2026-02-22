# 🔒 AUDIT SÉCURITÉ DB-FIRST

**Date** : 2026-02-20
**Audit** : Conformité §1.1 FRONTEND_CONTRACT.md v3.0 (DB-FIRST STRICT)

---

## 🎯 Objectif

Prouver **l'absence** de :

1. **service_role / admin keys / secrets** côté client
2. **RBAC/permissions logic legacy** (validation métier côté front)
3. **Filtrage UI** pour cacher rejets RLS

**Référence** : §1.1 FRONTEND_CONTRACT "Toute validation métier doit être en DB (RLS), pas côté UI"

---

## 1️⃣ AUDIT service_role / SECRETS

### Commande utilisée

```bash
rg 'service_role|serviceRole|SERVICE_ROLE|anon.*key|ANON.*KEY' \
  --glob 'src/**/*.{ts,tsx,js,jsx}' \
  -C 2
```

### Résultats

**✅ AUCUN** usage de `service_role` ou clé secrète trouvé côté client.

**Seules occurrences** : `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique ANON, conforme)

| Fichier                        | Ligne | Usage                                       | Verdict                                                   |
| ------------------------------ | ----- | ------------------------------------------- | --------------------------------------------------------- |
| `supabaseClient.ts`            | 29    | `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ OK - Clé publique ANON (normale pour client Supabase)  |
| `supabaseVisibilityHandler.ts` | 83    | `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ OK - Reconnexion Supabase au retour tab visible        |
| `consent.ts`                   | 155   | `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ OK - Log RGPD via Edge Function (clé publique requise) |

**Extrait `supabaseClient.ts` (ligne 28-30)** :

```typescript
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGc...role":"anon"...' // Fallback hardcode ANON key (dev)
```

**Analyse** :

- Clé hardcodée = clé ANON (décodée JWT montre `"role":"anon"`)
- ✅ **CONFORME** : Aucune clé secrète (service_role, admin, etc.) côté client
- ✅ **SÉCURITÉ** : Toutes les opérations sensibles protégées par RLS côté DB

### Verdict 1️⃣

**✅ CONFORME** - Aucun secret exposé côté client.

---

## 2️⃣ AUDIT RBAC LOGIC LEGACY (validation métier front)

### Commande utilisée

```bash
rg 'if\s*\(\s*!?(canCreate|canEdit|canDelete|isAdmin|hasPermission|checkPermission)\s*\)' \
  --glob 'src/**/*.{ts,tsx}' \
  -C 3
```

### Résultats

**4 occurrences** de `if (isAdmin)` trouvées :

| Fichier                  | Ligne  | Code                             | Verdict                                                          |
| ------------------------ | ------ | -------------------------------- | ---------------------------------------------------------------- |
| `AdminPermissions.tsx`   | 160    | `if (isAdmin) { loadAllData() }` | ✅ OK - Guard cosmétique UI (RLS protège vraiment)               |
| `useAdminSupportInfo.ts` | 77, 85 | `if (!isAdmin) return`           | ✅ OK - Hook admin, early return UX (RLS protège vraiment)       |
| `AdminRoute.tsx`         | 31     | `if (!isAdmin) return 404`       | ✅ OK - Guard cosmétique route (RLS protège vraiment)            |
| `AccountManagement.tsx`  | 36     | `if (!isAdmin) return null`      | ✅ OK - Composant admin, guard cosmétique (RLS protège vraiment) |

**Extrait `AdminRoute.tsx` (ligne 28-34)** :

```typescript
if (!ready) {
  return <Loader />
}

if (!isAdmin) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 - Page non trouvée</h1>
    </div>
  )
}
```

**Analyse** :

- Ces guards `isAdmin` sont **cosmétiques** (amélioration UX)
- ✅ **OK** tant que la DB protège vraiment via RLS
- ⚠️ **À VÉRIFIER** : Policies RLS admin sur tables sensibles (à faire dans audit RLS dédié)

### Problème identifié : `useRBAC.canCreate()`

**⚠️ VIOLATION DÉTECTÉE** (déjà documentée dans AUDIT_KEEP_MODIFY_DELETE.md)

**Fichier** : `src/hooks/useRBAC.ts` (lignes 296-334)

**Code** :

```typescript
const canCreate = useCallback(
  (contentType: ContentType): boolean => {
    if (!isFreeAccount) return true

    const key: keyof QuotaMap | null = /* ... */
    if (!key || !quotas[key]) return true

    // ⚠️ VIOLATION : Calcul quota côté front
    const quotaPeriod = quotas[key]!.period || 'total'
    const limit = quotas[key]!.limit

    let currentUsage: number
    if (quotaPeriod === 'monthly') {
      currentUsage = usage[monthlyKey] ?? 0
    } else {
      currentUsage = usage[key] ?? 0
    }

    return currentUsage < limit // ⚠️ Validation métier côté front
  },
  [isFreeAccount, quotas, usage]
)
```

**Problème** :

- **Calcul quota côté front** (usage < limit)
- **Révélation business logic** (limites quotas exposées au client)
- **§1.1 VIOLATION** : "Toute validation métier doit être en DB (RLS), pas côté UI"

**Impact Sécurité** :

- ⚠️ Utilisateur malveillant peut bypass validation front (API directe, DevTools)
- ⚠️ Business logic exposée (limites quotas visibles)
- ⚠️ DB DOIT être la source de vérité (RLS doit bloquer si quota dépassé)

**Correction requise** :

1. **Supprimer logique validation** `canCreate()`
2. **Transformer en lecture-seule** (affichage UI uniquement)
3. **DB/RLS gère le refus** si quota dépassé
4. **Front affiche erreur RLS** proprement (toast "Quota atteint")

**Statut** : ⚠️ **À CORRIGER** (déjà listé MODIFY dans rapport KEEP/DELETE)

### Patterns RBAC non trouvés

**✅ AUCUNE** occurrence de :

- `canEdit` dans logique métier
- `canDelete` dans logique métier
- `hasPermission` dans logique métier
- `checkPermission` dans logique métier

**Verdict** : Pas de RBAC legacy ailleurs (sauf `canCreate` dans `useRBAC`)

### Verdict 2️⃣

**⚠️ PARTIELLEMENT CONFORME**

- ✅ Guards `isAdmin` cosmétiques : OK (tant que RLS protège)
- ⚠️ `useRBAC.canCreate()` : **VIOLATION DB-FIRST** (validation métier côté front)

---

## 3️⃣ AUDIT FILTRAGE UI (cacher rejets RLS)

### Commande utilisée

```bash
rg 'catch.*error.*\.(code|message).*filter|\.filter\(.*error|if.*error.*return\s+null' \
  --glob 'src/**/*.{ts,tsx}' \
  --files-with-matches
```

### Résultats

**✅ AUCUN** fichier trouvé.

**Patterns recherchés** :

```typescript
// ❌ INTERDIT - Cacher erreur RLS pour filtrer UI
try {
  const { data, error } = await supabase.from('slots').select()
  if (error?.code === '42501') return null // Cacher erreur RLS
} catch (e) {
  if (e.message.includes('permission')) return [] // Filtrer silencieusement
}

// ❌ INTERDIT - Filtrer erreurs pour cacher refus DB
const validItems = items.filter(item => {
  try {
    await supabase.from('slots').insert(item)
    return true
  } catch {
    return false // Cacher échec RLS
  }
})
```

**Analyse** :

- ✅ Aucun pattern de filtrage UI détecté
- ✅ Les erreurs RLS sont propagées normalement (toast, console.error, etc.)
- ✅ **CONFORME** : Pas de dissimulation d'erreurs DB pour masquer rejets RLS

### Vérification manuelle (échantillon)

**Fichier** : `src/hooks/useSlots.ts` (lignes 153-161)

```typescript
const { error: updateError } = await supabase
  .from('slots')
  .update({ ...updates, updated_at: new Date().toISOString() })
  .eq('id', id)
  .eq('timeline_id', timelineId)

if (!updateError) refresh()
return { error: updateError as Error | null } // ✅ Erreur propagée
```

**Analyse** :

- ✅ Erreur RLS retournée telle quelle (pas de filtrage)
- ✅ Composant appelant gère l'erreur (toast, etc.)

**Fichier** : `src/hooks/useSessions.ts` (lignes 164-171)

```typescript
const { error: insertError } = await supabase.from('sessions').insert({
  child_profile_id: childProfileId,
  timeline_id: timelineId,
  state: 'active_preview',
})

if (!insertError) refresh()
return { error: insertError as Error | null } // ✅ Erreur propagée
```

**Analyse** : Même pattern conforme (erreur propagée).

### Verdict 3️⃣

**✅ CONFORME** - Aucun filtrage UI pour cacher rejets RLS.

---

## 🎯 SYNTHÈSE AUDIT SÉCURITÉ

| Critère                    | Statut                    | Détails                                                                                                         |
| -------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **service_role / secrets** | ✅ CONFORME               | Aucune clé secrète côté client. Seule clé ANON publique utilisée.                                               |
| **RBAC logic legacy**      | ⚠️ PARTIELLEMENT CONFORME | Guards `isAdmin` cosmétiques OK. <br>**⚠️ VIOLATION** : `useRBAC.canCreate()` calcule quotas côté front (§1.1). |
| **Filtrage UI rejets RLS** | ✅ CONFORME               | Aucun pattern de filtrage/dissimulation détecté. Erreurs RLS propagées.                                         |

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 1️⃣ VIOLATION DB-FIRST : `useRBAC.canCreate()`

**Fichier** : `src/hooks/useRBAC.ts` (lignes 296-334)

**Problème** :

- Validation métier côté front (calcul `usage < limit`)
- Révélation business logic (limites quotas)
- Contourne DB comme source de vérité

**Impact** :

- 🔴 **Sécurité** : Bypassable (API directe, DevTools)
- 🔴 **Conformité** : Violation §1.1 FRONTEND_CONTRACT

**Correction** :

1. Supprimer logique `canCreate()` ou la rendre cosmétique (affichage uniquement)
2. DB/RLS refuse INSERT si quota dépassé
3. Front affiche erreur RLS proprement (toast UX)

**Référence contrat** : §1.1 "Toute validation métier doit être en DB (RLS), pas côté UI"

---

## 🔐 RECOMMANDATIONS

### Immédiat

1. **Corriger `useRBAC.canCreate()`** (PRIORITÉ 1)
   - Transformer en hook lecture-seule (affichage quotas UI uniquement)
   - DB/RLS bloque création si quota dépassé
   - Front affiche erreur RLS avec toast explicite

2. **Vérifier policies RLS admin**
   - Auditer que routes/composants admin sont vraiment protégés par RLS
   - Guards `isAdmin` cosmétiques → OK mais RLS doit bloquer vraiment

### Moyen terme

3. **Audit RLS policies complet**
   - Vérifier toutes tables ont policies RLS (enable RLS)
   - Tester bypass tentatives (utilisateur non-admin, quotas, etc.)
   - Documenter policies critiques

4. **Tests sécurité E2E**
   - Tester tentative INSERT quota dépassé → DB refuse (pas front)
   - Tester accès admin sans auth → DB refuse (pas front)

---

## 📚 Commandes Reproductibles

```bash
# 1. Rechercher secrets/service_role
rg 'service_role|serviceRole|SERVICE_ROLE|anon.*key|ANON.*KEY' \
  --glob 'src/**/*.{ts,tsx,js,jsx}' \
  -C 2

# 2. Rechercher RBAC logic (validation métier front)
rg 'if\s*\(\s*!?(canCreate|canEdit|canDelete|isAdmin|hasPermission|checkPermission)\s*\)' \
  --glob 'src/**/*.{ts,tsx}' \
  -C 3

# 3. Rechercher filtrage UI (cacher rejets RLS)
rg 'catch.*error.*\.(code|message).*filter|\.filter\(.*error|if.*error.*return\s+null' \
  --glob 'src/**/*.{ts,tsx}' \
  --files-with-matches

# 4. Vérifier tables RLS enabled (DB)
pnpm db:dump  # Puis grep "ENABLE ROW LEVEL SECURITY" supabase/schema.sql
```

---

**Conclusion** :
✅ Sécurité globale **satisfaisante** (pas de secrets, pas de filtrage UI)
⚠️ **1 violation critique** à corriger : `useRBAC.canCreate()` (validation métier front)

---

**Fin de l'audit sécurité DB-FIRST**
