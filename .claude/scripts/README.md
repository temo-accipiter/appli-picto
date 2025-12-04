# Scripts de vérification Appli-Picto

Scripts automatiques pour garantir la qualité du code et le respect des règles du projet.

## 📋 Scripts disponibles

### 1. `pre-commit.sh` - Vérifications avant commit

**Exécution** : Automatique avant `git commit` et `git push`

**Vérifications effectuées** :

1. ✅ Lint + format (`pnpm check`)
2. ✅ Tests unitaires (`pnpm test`)
3. ✅ Mobile-First (pas de `@media max-width`)
4. ✅ Architecture hooks (pas de query Supabase directe)

**Usage manuel** :

```bash
.claude/scripts/pre-commit.sh
```

**Sortie si erreur** :

```
❌ ÉCHEC : 2 vérification(s) échouée(s)
⚠️ Corriger les erreurs avant de commit
```

**Sortie si OK** :

```
✅ SUCCÈS : Toutes les vérifications passées !
✓ Code prêt pour commit
```

---

### 2. `post-migration.sh` - Régénération types après migration

**Exécution** : Automatique après migration Supabase (`mcp__supabase__apply_migration`)

**Actions effectuées** :

1. 📦 Dump schéma PostgreSQL → `supabase/schema.sql`
2. 🔧 Génération types TypeScript → `src/types/supabase.ts`

**Usage manuel** :

```bash
.claude/scripts/post-migration.sh
```

**OU utiliser commande pnpm** :

```bash
pnpm context:update
```

---

### 3. `check-mobile-first.sh` - Détection desktop-first

**Ce qu'il fait** :

- Scanne tous les fichiers `.scss`
- Détecte les `@media (max-width: ...)` interdits
- Rappelle la règle Mobile-First

**Usage manuel** :

```bash
.claude/scripts/check-mobile-first.sh
```

**Erreur détectée** :

```
❌ ERREUR: Desktop-first détecté dans src/components/Button/Button.scss
   → Remplacer @media (max-width: ...) par @media (min-width: ...)
```

**Règle Mobile-First** :

```scss
// ✅ CORRECT - Mobile-First
.button {
  padding: 12px; // Mobile par défaut

  @media (min-width: 768px) {
    padding: 20px; // Tablette
  }
}

// ❌ INTERDIT - Desktop-first
.button {
  padding: 20px; // Desktop par défaut

  @media (max-width: 768px) {
    // ❌ max-width interdit
    padding: 12px;
  }
}
```

---

### 4. `check-supabase-hooks.sh` - Détection queries directes

**Ce qu'il fait** :

- Scanne les composants `.tsx` / `.ts`
- Détecte les queries Supabase directes interdites
- Rappelle les hooks custom disponibles

**Usage manuel** :

```bash
.claude/scripts/check-supabase-hooks.sh
```

**Erreur détectée** :

```
❌ ERREUR: Query Supabase directe dans src/components/TaskList/TaskList.tsx:42
   → Utiliser hooks custom au lieu de query directe
```

**Hooks disponibles** :

- `useTaches()` - CRUD tâches
- `useTachesEdition()` - Édition tâches
- `useTachesDnd()` - Drag & drop tâches
- `useRecompenses()` - CRUD récompenses
- `useCategories()` - CRUD catégories
- `useAuth()` - Authentification

**Règle architecture** :

```typescript
// ✅ CORRECT - Hook custom
import { useTaches } from '@/hooks'
const { taches, loading } = useTaches()

// ❌ INTERDIT - Query directe
const { data } = await supabase.from('taches').select()
```

---

## 🔄 Activation automatique (hooks)

Les scripts sont automatiquement exécutés via hooks Claude Code (`.claude/settings.json`) :

### Hooks pre-tool-use (AVANT action)

```json
"pre-tool-use": {
  "bash(git commit:*)": ".claude/scripts/pre-commit.sh",
  "bash(git push:*)": ".claude/scripts/pre-commit.sh"
}
```

**Déclenchement** :

- AVANT tout `git commit`
- AVANT tout `git push`

**Si erreur** : Commit/push **bloqué** avec message d'erreur clair

### Hooks post-tool-use (APRÈS action)

```json
"post-tool-use": {
  "mcp__supabase__apply_migration": ".claude/scripts/post-migration.sh"
}
```

**Déclenchement** :

- APRÈS toute migration Supabase

**Action** : Régénère automatiquement `schema.sql` + `types.ts`

---

## 🛠️ Désactiver temporairement les hooks

Si tu veux désactiver temporairement les vérifications :

### Option 1 : Commenter dans settings.json

```json
"hooks": {
  // "pre-tool-use": { ... }  // Désactivé temporairement
}
```

### Option 2 : Skip pour un commit unique

```bash
git commit --no-verify -m "fix: urgence"
```

⚠️ **ATTENTION** : Utiliser `--no-verify` SEULEMENT en urgence (deploy critique)

---

## 📊 Workflow complet

### Scénario 1 : Développement normal

```bash
# 1. Tu codes normalement
# 2. Tu demandes à Claude de commit
# 3. Script pre-commit.sh s'exécute automatiquement
#    ✅ Lint OK
#    ✅ Tests OK
#    ✅ Mobile-First OK
#    ✅ Hooks OK
# 4. Commit autorisé !
```

### Scénario 2 : Erreur détectée

```bash
# 1. Tu codes (avec erreur desktop-first)
# 2. Tu demandes à Claude de commit
# 3. Script pre-commit.sh détecte erreur
#    ❌ Mobile-First : Desktop-first détecté
# 4. Commit BLOQUÉ
# 5. Tu corriges l'erreur
# 6. Tu recommences
```

### Scénario 3 : Migration Supabase

```bash
# 1. Tu fais une migration Supabase
# 2. Migration appliquée
# 3. Script post-migration.sh s'exécute automatiquement
#    ✅ Schema dumpé
#    ✅ Types régénérés
# 4. Prêt pour commit !
```

---

## 🐛 Dépannage

### Script ne s'exécute pas

**Vérifier permissions** :

```bash
ls -la .claude/scripts/
# Tous les .sh doivent être exécutables (x)
```

**Réparer permissions** :

```bash
chmod +x .claude/scripts/*.sh
```

### Hook ne se déclenche pas

**Vérifier configuration** :

```bash
cat .claude/settings.json | grep -A 10 hooks
```

**Relancer Claude Code** pour recharger config.

### Script échoue à l'exécution

**Tester manuellement** :

```bash
.claude/scripts/pre-commit.sh
# Lire message d'erreur
```

---

## 📚 Références

- **CLAUDE.md** : Règles complètes du projet
- **Output-style** : `.claude/output-styles/appli-picto-guide.md`
- **Claude Code hooks** : https://docs.claude.com/en/docs/claude-code/hooks
