# MIGRATION YARN → PNPM

## 📋 Informations de la migration

- **Date de début** : 2025-11-13
- **Version Yarn actuelle** : 4.10.3 (Plug'n'Play)
- **Version pnpm cible** : 9.15.0
- **Node.js requis** : 20.19.4 (géré par Volta)
- **Commit de sauvegarde** : `b258296be214d7985cd9381dc5fa2c85b5694852`
- **Tag de sauvegarde** : `v0.0.0-pre-pnpm-migration`

## 🔄 Instructions de rollback

En cas de problème, revenir à l'état stable avec Yarn :

```bash
# Option 1 : Utiliser le tag
git checkout v0.0.0-pre-pnpm-migration

# Option 2 : Utiliser le hash du commit
git checkout b258296be214d7985cd9381dc5fa2c85b5694852

# Restaurer les dépendances Yarn
yarn install
```

---

## 📊 État actuel de la configuration Yarn

### Configuration détectée

- **Package manager** : `yarn@4.10.3` (défini dans package.json)
- **Mode** : Plug'n'Play (PnP)
- **Fichiers Yarn présents** :
  - ✅ `.yarn/releases/` (binaire Yarn)
  - ✅ `.yarn/sdks/` (SDKs pour éditeurs)
  - ❌ `.yarnrc.yml` (configuration par défaut utilisée)
- **Workspaces** : Non configurés (projet monolithique)
- **Resolutions** : 1 résolution active
  ```json
  "@modelcontextprotocol/sdk": "1.18.1"
  ```

### Scripts utilisant `yarn` directement

Les scripts suivants devront être adaptés pour pnpm :

| Script           | Commande actuelle                     | Action requise                          |
| ---------------- | ------------------------------------- | --------------------------------------- |
| `check`          | `yarn lint:fix && yarn format`        | Remplacer `yarn` par `pnpm`             |
| `audit`          | `yarn audit`                          | Remplacer `yarn audit` par `pnpm audit` |
| `audit:fix`      | `yarn audit fix`                      | Remplacer par `pnpm audit --fix`        |
| `verify`         | `yarn type-check && yarn lint && ...` | Remplacer tous les `yarn`               |
| `verify:quick`   | `yarn type-check && yarn lint && ...` | Remplacer tous les `yarn`               |
| `verify:ci`      | `yarn type-check && yarn lint && ...` | Remplacer tous les `yarn`               |
| `context:update` | `yarn db:dump && yarn db:types`       | Remplacer tous les `yarn`               |
| `clean:all`      | `yarn clean && rm -rf yarn.lock`      | Remplacer par `pnpm-lock.yaml`          |
| `postinstall`    | `yarn db:types \|\| true`             | Remplacer `yarn` par `pnpm`             |

**Note** : Les scripts utilisant `dotenv -e .env -- sh -lc` n'ont PAS besoin d'être modifiés (ils n'utilisent pas yarn).

---

## ⚠️ Dépendances potentiellement problématiques

### Dépendances à surveiller lors de la migration

#### 1. React 19 (très récent)

```json
"react": "^19.0.0",
"react-dom": "^19.0.0"
```

- **Risque** : Peer dependencies complexes
- **Action** : Activer `auto-install-peers=true` dans `.npmrc`

#### 2. @supabase/supabase-js (version fixée)

```json
"@supabase/supabase-js": "2.45.0"
```

- **Risque** : Version exacte sans `^` (volontaire)
- **Action** : Vérifier que pnpm respecte cette contrainte

#### 3. @dnd-kit/\* (packages multiples)

```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2"
```

- **Risque** : Plusieurs packages interdépendants
- **Action** : Tester le drag & drop après migration

#### 4. React Router v7 (récent)

```json
"react-router-dom": "^7.5.0"
```

- **Risque** : Version majeure récente
- **Action** : Vérifier la compatibilité du routage

#### 5. Autres packages à surveiller

- `@stripe/stripe-js@^7.8.0` (intégration paiement)
- `@sentry/react@^10.23.0` (monitoring)
- `framer-motion@^12.10.1` (animations)

#### 6. Resolution à convertir

```json
"resolutions": {
  "@modelcontextprotocol/sdk": "1.18.1"
}
```

- **Action** : Convertir en `pnpm.overrides` dans package.json

---

## 🔧 Configuration pnpm recommandée

### Fichier `.npmrc` à créer (Phase 0.2)

```ini
# ===== HOISTING =====
# Nécessaire pour React/Next.js qui attendent un node_modules plat
shamefully-hoist=true

# ===== PEER DEPENDENCIES =====
# Auto-installation des peer dependencies (simplifie React 19)
auto-install-peers=true

# Désactiver strict mode temporairement (réactiver après stabilisation)
strict-peer-dependencies=false

# ===== PUBLIC HOIST PATTERN =====
# Hoister certains packages si problèmes de résolution
public-hoist-pattern[]=*@supabase/*
public-hoist-pattern[]=*react*
public-hoist-pattern[]=*@stripe/*
public-hoist-pattern[]=*@dnd-kit/*

# ===== LOCKFILE =====
# Format du lockfile (v9 par défaut avec pnpm 9)
lockfile-version=9

# ===== PERFORMANCE =====
# Désactiver les scripts de postinstall des dépendances (sécurité)
# ignore-scripts=false  # Laisser activé pour l'instant

# ===== STORE =====
# Partager le store global entre projets (économise l'espace)
# store-dir=~/.pnpm-store  # Utiliser le défaut
```

### Conversion des resolutions en overrides

Dans `package.json`, remplacer :

```json
"resolutions": {
  "@modelcontextprotocol/sdk": "1.18.1"
}
```

Par :

```json
"pnpm": {
  "overrides": {
    "@modelcontextprotocol/sdk": "1.18.1"
  }
}
```

---

## ✅ Checklist de compatibilité

### Environnement

- ✅ **Node.js 20.19.4** : Compatible avec pnpm 9.15.0
- ✅ **Volta** : Gère automatiquement la version Node
- ⚠️ **Node actuel détecté** : v22.21.1 (Volta doit forcer 20.19.4)

### Scripts

- ✅ **Scripts POSIX** : Utilisent `sh -lc` (compatible)
- ⚠️ **Scripts yarn** : 9 scripts à adapter (simple remplacement)
- ✅ **dotenv-cli** : Compatible pnpm

### Fichiers à modifier (Phase 0.2)

- `package.json` :
  - Changer `packageManager` de `yarn@4.10.3` à `pnpm@9.15.0`
  - Remplacer `resolutions` par `pnpm.overrides`
  - Adapter les scripts contenant `yarn`
- Créer `.npmrc` avec la configuration recommandée

### Fichiers à supprimer (Phase 0.3)

- `.yarn/` (dossier complet)
- `.pnp.cjs` (si présent)
- `.pnp.loader.mjs` (si présent)
- `yarn.lock`

### Fichiers à créer (Phase 0.2)

- `pnpm-lock.yaml` (via `pnpm install`)
- `.npmrc` (configuration pnpm)

---

## 🚀 Prochaines étapes

### Phase 0.2 : Configuration

1. Installer pnpm 9.15.0 globalement
2. Créer `.npmrc` avec la configuration recommandée
3. Modifier `package.json` :
   - Changer `packageManager`
   - Convertir `resolutions` en `pnpm.overrides`
   - Adapter les scripts yarn

### Phase 0.3 : Migration proprement dite

1. Supprimer `node_modules/` et `.yarn/`
2. Supprimer `yarn.lock`
3. Lancer `pnpm install`
4. Tester les commandes critiques :
   ```bash
   pnpm dev
   pnpm check
   pnpm test
   pnpm build
   ```

### Phase 0.4 : Validation

1. Tester toutes les fonctionnalités critiques
2. Vérifier les imports Supabase
3. Tester le drag & drop (@dnd-kit)
4. Tester les paiements Stripe
5. Valider le build de production
6. Commiter et pusher les changements

---

## 📝 Notes importantes

### Différences Yarn PnP vs pnpm

| Aspect            | Yarn PnP                                 | pnpm                                  |
| ----------------- | ---------------------------------------- | ------------------------------------- |
| **Structure**     | Pas de `node_modules`, fichiers `.pnp.*` | `node_modules` avec liens symboliques |
| **Performance**   | Très rapide (pas de copie)               | Rapide (hard links)                   |
| **Compatibilité** | Nécessite support explicite              | Compatible avec npm/yarn              |
| **Espace disque** | Économise l'espace                       | Économise l'espace (store global)     |
| **Debuggage**     | Plus complexe                            | Plus simple (node_modules standard)   |

### Avantages attendus de la migration

1. **Meilleure compatibilité** : pnpm est compatible avec tous les packages npm
2. **Débogage simplifié** : `node_modules` classique
3. **Gestion stricte** : Détecte les dépendances fantômes
4. **Performance** : Aussi rapide que Yarn PnP grâce au store partagé
5. **Standard** : Plus répandu que Yarn PnP dans l'écosystème

### Risques identifiés

1. **React 19** : Peer dependencies complexes → Mitigé par `auto-install-peers`
2. **@dnd-kit** : Packages multiples → Tester le drag & drop
3. **Supabase** : Version fixée → Vérifier le respect de la contrainte
4. **Scripts personnalisés** : 9 scripts à adapter → Simple remplacement

---

## ✅ Phase 0.1 TERMINÉE (2025-11-13)

- ✅ Tag de sauvegarde créé (`v0.0.0-pre-pnpm-migration`)
- ✅ Configuration Yarn analysée (PnP, 9 scripts identifiés)
- ✅ Dépendances problématiques listées (React 19, Supabase, etc.)
- ✅ Configuration pnpm préparée
- ✅ Documentation complète créée

**Commit** : `2be4898` - "docs: Phase 0.1 - Analyse et préparation migration pnpm"

---

## ✅ Phase 0.2 TERMINÉE (2025-11-13)

### Fichiers créés

1. **`.npmrc`** - Configuration pnpm

   ```ini
   shamefully-hoist=true
   auto-install-peers=true
   strict-peer-dependencies=false
   public-hoist-pattern[]=*@supabase/*
   public-hoist-pattern[]=*react*
   public-hoist-pattern[]=*@stripe/*
   public-hoist-pattern[]=*@dnd-kit/*
   resolution-mode=highest
   ```

2. **`.pnpmfile.cjs`** - Hook pour adapter les peer dependencies React 18 → 19
   - Adapte automatiquement les packages qui attendent React 18
   - Permet la compatibilité avec React 19

### Fichiers modifiés

1. **`package.json`**
   - ✅ `packageManager`: `yarn@4.10.3` → `pnpm@9.15.0`
   - ✅ Section `pnpm.overrides` ajoutée (+ `resolutions` gardée pour compatibilité)
   - ✅ 9 scripts adaptés (yarn → pnpm) :
     - `check`, `audit`, `audit:fix`
     - `verify`, `verify:quick`, `verify:ci`
     - `context:update`, `clean:all`, `postinstall`

2. **`.gitignore`**
   - ✅ Ajout de `.pnpm-store/`
   - ✅ Ajout de `.pnpm-debug.log`

### État du projet

- ⚠️ **Yarn toujours présent** : `yarn.lock` et `.yarn/` non supprimés
- ⚠️ **pnpm non installé** : `pnpm install` pas encore exécuté
- ✅ **Application fonctionnelle** : Toujours utilisable avec Yarn
- ✅ **Configuration prête** : Tous les fichiers pnpm en place

### Rollback Phase 0.2

```bash
git checkout v0.0.0-pre-pnpm-migration
yarn install
```

---

## ✅ Phase 0.3 EN COURS (2025-11-13)

### ⚠️ Point de non-retour : Fichiers Yarn supprimés

Les fichiers suivants ont été **SUPPRIMÉS** :

- ❌ `yarn.lock` (280 KB)
- ❌ `.yarn/` (dossier complet : releases + sdks)
- ❌ `.yarnrc.yml` (n'existait pas)
- ❌ `.pnp.cjs` (n'existait pas)
- ❌ `.pnp.loader.mjs` (n'existait pas)

### Fichiers créés pour guidance

1. **`INSTALL_INSTRUCTIONS.md`** (10.5 KB)
   - Guide complet d'installation pnpm 9.15.0
   - Instructions pas-à-pas avec validations
   - Commandes de test et vérification
   - Checklist complète de validation
   - Dépannage et troubleshooting
   - **→ SUIVRE CE GUIDE EN LOCAL**

2. **`ROLLBACK.md`** (8.2 KB)
   - 4 options de rollback vers Yarn
   - Guide de dépannage détaillé
   - Checklist post-rollback
   - Documentation des problèmes
   - **→ À UTILISER SI PROBLÈME**

### État du projet

- ⚠️ **Yarn supprimé** : Plus de yarn.lock ni .yarn/
- ⚠️ **pnpm non installé** : `pnpm install` pas encore exécuté
- ⚠️ **node_modules/ présent** : Installé avec Yarn (sera remplacé)
- ✅ **Configuration pnpm prête** : .npmrc + .pnpmfile.cjs + package.json
- ✅ **Tag de sauvegarde** : `v0.0.0-pre-pnpm-migration` disponible

### ⚠️ IMPORTANT : Installation à faire EN LOCAL

**Je ne peux PAS exécuter `pnpm install` depuis GitHub.**

**Actions requises de votre part** :

1. **Récupérer la branche** :

   ```bash
   git fetch origin
   git checkout claude/prepare-yarn-pnpm-migration-011CV5yWmukVnBfKXMECFpo3
   ```

2. **Suivre INSTALL_INSTRUCTIONS.md** :
   - Installer pnpm 9.15.0
   - Exécuter `pnpm install`
   - Tester l'application complètement
   - Valider toutes les fonctionnalités

3. **Si OK** :

   ```bash
   git add pnpm-lock.yaml
   git commit -m "chore(pnpm): add pnpm-lock.yaml after successful migration"
   git push
   ```

4. **Si problème** :
   - Consulter ROLLBACK.md
   - Revenir à `v0.0.0-pre-pnpm-migration`

### Checklist de validation (à faire en local)

- [ ] pnpm 9.15.0 installé : `pnpm --version`
- [ ] `pnpm install` exécuté avec succès
- [ ] `pnpm-lock.yaml` généré
- [ ] `node_modules/` contient `.pnpm/` (structure pnpm)
- [ ] **Tests de base** :
  - [ ] `pnpm dev` démarre Vite
  - [ ] `pnpm build` compile sans erreur
  - [ ] `pnpm lint` passe
  - [ ] `pnpm format` fonctionne
  - [ ] `pnpm test` passe tous les tests
- [ ] **Tests fonctionnels** :
  - [ ] Navigation dans l'app
  - [ ] Authentification Supabase
  - [ ] CRUD tâches (create, read, update, delete)
  - [ ] Upload d'images
  - [ ] Drag & drop (@dnd-kit)
  - [ ] Animations et confettis
  - [ ] Paiements Stripe (si applicable)
- [ ] **Aucune régression détectée**

### Rollback en cas de problème

**Commande rapide** :

```bash
git checkout v0.0.0-pre-pnpm-migration
yarn install
```

**Guide complet** : Voir `ROLLBACK.md`

### Fichiers de documentation

| Fichier                   | Taille       | Description                 |
| ------------------------- | ------------ | --------------------------- |
| `INSTALL_INSTRUCTIONS.md` | 10.5 KB      | Guide d'installation pnpm   |
| `ROLLBACK.md`             | 8.2 KB       | Guide de rollback vers Yarn |
| `MIGRATION_PNPM.md`       | [ce fichier] | Documentation complète      |

---

## 🎯 État actuel : Phase 0.3 PRÉPARÉE ⚠️

**Statut** : Configuration prête, **INSTALLATION À TESTER EN LOCAL**

**Prochaine étape** :

1. **Vous** : Tester l'installation pnpm en local (suivre INSTALL_INSTRUCTIONS.md)
2. **Si OK** : Commiter pnpm-lock.yaml et merger
3. **Si problème** : Rollback (suivre ROLLBACK.md)
4. **Après validation** : Migration Next.js (Phase suivante)
