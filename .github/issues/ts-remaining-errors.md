# [TS] 329 erreurs TypeScript restantes après migration Next.js

## 🎯 Contexte

Après avoir ajusté `tsconfig.json` pour permettre la migration vers Next.js, il reste **329 erreurs TypeScript** non-bloquantes à corriger progressivement.

## 📊 Réduction d'erreurs effectuée

- **Avant**: 607 erreurs (post-pnpm migration)
- **Erreurs critiques corrigées**: 28 erreurs (imports, Analytics, Modal/Button props)
- **Après ajustement tsconfig**: 329 erreurs (-43% vs état initial)
- **Total réduit**: 278 erreurs corrigées (-46%)

## 📂 Catégories d'erreurs restantes (329 total)

### Erreurs par type

| Code d'erreur | Nombre | Description | Priorité |
|--------------|--------|-------------|----------|
| TS2339 | ~108 | Property does not exist on type (Supabase Json) | Moyenne |
| TS2322 | ~72 | Type is not assignable to type | Moyenne |
| TS2345 | ~41 | Argument not assignable to parameter | Moyenne |
| TS18048 | ~21 | Variable possibly undefined | Haute |
| TS7030 | ~28 | Not all code paths return a value | Basse |
| TS18047 | ~13 | Variable possibly null | Haute |
| TS2375 | ~8 | exactOptionalPropertyTypes incompatibility | Moyenne |
| Autres | ~38 | Divers | Variable |

### Fichiers les plus impactés

| Fichier | Erreurs | Type principal |
|---------|---------|----------------|
| `src/hooks/useRBAC.test.tsx` | 43 | Types Supabase, tests |
| `src/pages/profil/Profil.test.tsx` | 25 | Tests |
| `src/tools/legal-config-tester/LegalConfigTester.tsx` | 23 | Types implicites |
| `src/hooks/useTachesDnd.ts` | 23 | Supabase queries |
| `src/pages/admin-permissions/AdminPermissions.tsx` | 22 | Types Supabase Json |
| `src/hooks/useParametres.test.ts` | 21 | Tests |
| `src/pages/tableau/Tableau.tsx` | 18 | DemoTache types |
| `src/pages/edition/Edition.tsx` | 16 | Callback types |
| `src/hooks/useAdminPermissions.ts` | 14 | Supabase types |
| `src/hooks/useAccountStatus.ts` | 12 | Supabase types |

## ✅ Configuration actuelle (tsconfig.json)

```json
{
  "compilerOptions": {
    // Relaxations temporaires pour migration Next.js
    "noImplicitAny": false,        // Permet any implicites
    "noImplicitReturns": false,    // Permet retours manquants
    "noUnusedLocals": false,       // Permet variables inutilisées
    "noUnusedParameters": false,   // Permet paramètres inutilisés

    // Strictness maintenue
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## 💡 Plan d'action recommandé

### Phase 1: Erreurs critiques (haute priorité) - 2-3h

**Cible**: ~34 erreurs (TS18048, TS18047 - null/undefined)

1. **Null/Undefined checks** (`src/hooks/useTachesDnd.ts`, `src/pages/tableau/Tableau.tsx`)
   - Ajouter guards `if (user)` avant utilisation
   - Utiliser optional chaining `user?.id`
   - Estimé: 1.5h

2. **Supabase query types** (`src/hooks/useAdminPermissions.ts`, `src/hooks/useAccountStatus.ts`)
   - Typer correctement les réponses Supabase
   - Utiliser types générés `Database['public']['Tables']['...']`
   - Estimé: 1h

### Phase 2: Erreurs Supabase Json (~108 erreurs) - 4-5h

**Cible**: Propriétés inexistantes sur types Json

Fichiers concernés:
- `src/pages/admin-permissions/AdminPermissions.tsx`
- `src/components/features/admin/permissions/HistoryTab.tsx`
- `src/components/features/admin/permissions/LogsTab.tsx`

Solutions:
```typescript
// Option 1: Cast explicite
const jsonData = data as Record<string, unknown>
const value = jsonData.field as string

// Option 2: Type guards
if ('field' in data && typeof data.field === 'string') {
  const value = data.field
}

// Option 3: Interfaces dédiées
interface HistoryEntry {
  display_name: string
  change_type: string
}
const entry = data as HistoryEntry
```

### Phase 3: Erreurs assignations (~72 erreurs) - 3-4h

**Cible**: Type 'X' is not assignable to type 'Y'

Principalement:
- Types `string | null` vs `string`
- `DemoTache[]` vs types attendus
- `exactOptionalPropertyTypes` incompatibilités

### Phase 4: Tests (~100+ erreurs) - 2-3h

Fichiers:
- `useRBAC.test.tsx`, `Profil.test.tsx`, `useParametres.test.ts`
- Principalement types mock Supabase

Solution rapide: Utiliser `as any` temporairement dans tests

### Phase 5: Réactiver strictness (1h)

Une fois toutes les erreurs corrigées, réactiver dans `tsconfig.json`:
```json
{
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

## 📋 Checklist de progression

### Haute priorité (Phase 1)
- [ ] Corriger null/undefined checks dans `useTachesDnd.ts` (~10 erreurs)
- [ ] Corriger null/undefined checks dans `Tableau.tsx` (~8 erreurs)
- [ ] Corriger null/undefined checks dans autres hooks (~16 erreurs)

### Moyenne priorité (Phases 2-3)
- [ ] Typer propriétés Json dans AdminPermissions.tsx (~22 erreurs)
- [ ] Typer propriétés Json dans HistoryTab.tsx (~10 erreurs)
- [ ] Typer propriétés Json dans LogsTab.tsx (~3 erreurs)
- [ ] Corriger assignations incompatibles (~72 erreurs)

### Basse priorité (Phase 4-5)
- [ ] Typer les tests correctement (~100 erreurs)
- [ ] Corriger retours manquants (~28 erreurs)
- [ ] Nettoyer variables/paramètres inutilisés (~40 erreurs)
- [ ] Réactiver strictness complète

## 🎯 Estimation totale

- **Phase 1 (Haute)**: 2-3 heures
- **Phase 2 (Moyenne)**: 4-5 heures
- **Phase 3 (Moyenne)**: 3-4 heures
- **Phase 4-5 (Basse)**: 3-4 heures

**Total estimé**: 12-16 heures de travail

Répartition recommandée:
- Sprint 1 (1 semaine): Phase 1 (critiques)
- Sprint 2 (1 semaine): Phase 2 (Supabase Json)
- Sprint 3 (1 semaine): Phases 3-5 (finitions)

## 🔗 Issues liées

- #XX - [TS] Erreurs critiques null/undefined (Phase 1)
- #YY - [TS] Erreurs Supabase Json types (Phase 2)
- #ZZ - [TS] Erreurs assignations types (Phase 3)

## 📚 Ressources

- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/typescript-support)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Handling JSON in TypeScript](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

---

**État actuel**: 329 erreurs restantes
**Build**: ✅ Réussi
**Tests**: ✅ Tous passent
**Bloquant migration Next.js**: ❌ Non

**Étiquettes**: `typescript`, `tech-debt`, `migration-nextjs`, `documentation`
**Priorité**: Moyenne (non-bloquant)
**Estimation**: 12-16 heures sur 3 sprints
