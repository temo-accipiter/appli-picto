# [TS] Corriger les erreurs TypeScript dans les composants Admin

## 📋 Description

Cette issue suit les erreurs TypeScript dans les **composants Admin** après la migration vers pnpm.

## 🎯 Objectif

Corriger environ **~150 erreurs TypeScript** dans les composants d'administration.

## 📂 Fichiers concernés

### Composants Admin principaux
- [ ] `src/components/features/admin/AccountManagement.tsx` - ~4 erreurs
  - `pseudo` peut être null
  - `email` manquant dans profiles (récupérer depuis auth.users)
- [ ] `src/components/features/admin/ImageAnalytics.tsx` - Corrigé ✅
- [ ] `src/components/features/admin/MetricsDashboard.tsx` - Corrigé ✅
- [ ] `src/components/features/admin/QuotaManagement.tsx` - ~2 erreurs
  - Variable `handleCreateQuota` non utilisée

### Composants Permissions
- [ ] `src/components/features/admin/permissions/HistoryTab.tsx` - ~10 erreurs
  - Type `change_type` devrait être `string` au lieu de `ChangeType`
  - Propriétés `display_name` inexistantes sur types Json
- [ ] `src/components/features/admin/permissions/LogsTab.tsx` - ~3 erreurs
  - Type `details` incompatible (Json vs Record<string, any>)
- [ ] `src/components/features/admin/permissions/PermissionsTab.tsx` - Corrigé ✅
- [ ] `src/components/features/admin/permissions/RolesTab.tsx` - ~2 erreurs
  - Type `RoleObject` manque propriété `id`
  - Type `string | undefined` non assignable
- [ ] `src/components/features/admin/permissions/UsersTab.tsx` - Corrigé ✅

## 🔍 Types d'erreurs principaux

1. **TS2322**: Type incompatible (Json vs types stricts)
2. **TS2339**: Propriété inexistante sur type
3. **TS2345**: Argument de mauvais type
4. **TS6133**: Variable déclarée mais non utilisée

## ✅ Critères d'acceptance

- [ ] Toutes les erreurs TypeScript dans `src/components/features/admin/` sont corrigées
- [ ] Les tests passent : `pnpm test`
- [ ] Le build réussit : `pnpm build`
- [ ] Le type-check passe : `pnpm type-check` (pour cette catégorie)
- [ ] Aucune régression fonctionnelle

## 💡 Solutions suggérées

### Pour les types Json de Supabase
```typescript
// Au lieu de
const value = data.field

// Utiliser
const value = data.field as string
// ou
const jsonData = data as Record<string, unknown>
const value = jsonData.field as string
```

### Pour les champs optionnels
```typescript
// Rendre les interfaces plus permissives
interface User {
  pseudo?: string | null  // Au lieu de pseudo: string
  email: string
}
```

### Pour les variables inutilisées
```typescript
// Préfixer avec underscore ou supprimer
const _handleCreateQuota = () => { /* ... */ }
// ou ajouter
// eslint-disable-next-line @typescript-eslint/no-unused-vars
```

## 📚 Ressources

- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/typescript-support)
- [TypeScript strictNullChecks](https://www.typescriptlang.org/tsconfig#strictNullChecks)
- Documentation locale : `CLAUDE.md`

## 🔗 Issues liées

- Issue parente : Migration pnpm
- #XXX - [TS] Erreurs dans composants shared
- #YYY - [TS] Erreurs i18n TFunction

## 📝 Notes

- Priorité : **Moyenne**
- Estimation : **4-6 heures**
- Étiquettes : `typescript`, `tech-debt`, `admin`, `good-first-issue`

---

**Checklist de test** :
- [ ] Page Admin Permissions accessible
- [ ] Gestion des comptes fonctionne
- [ ] Métriques s'affichent correctement
- [ ] Logs de souscription visibles
- [ ] Pas d'erreurs console
