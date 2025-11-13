# 📦 Instructions d'installation pnpm

**Phase 0.3** : Installation et validation de la migration pnpm

⚠️ **IMPORTANT** : Ces instructions doivent être suivies EN LOCAL (pas sur GitHub).

---

## 🎯 Objectif

Installer pnpm 9.15.0 et valider que l'application fonctionne parfaitement avec le nouveau gestionnaire de packages.

---

## 📋 Prérequis

- Node.js 20.19.4 (géré automatiquement par Volta)
- Git configuré et connecté au repo
- Accès au dossier du projet en local

---

## 🚀 Étape 1 : Installer pnpm 9.15.0

### Option A : Via npm (rapide)

```bash
npm install -g pnpm@9.15.0
```

### Option B : Via Corepack (recommandé, inclus dans Node.js)

```bash
# Activer Corepack
corepack enable

# Préparer pnpm 9.15.0
corepack prepare pnpm@9.15.0 --activate
```

### Vérifier l'installation

```bash
pnpm --version
# Devrait afficher : 9.15.0
```

---

## 📥 Étape 2 : Récupérer la branche de migration

```bash
# Récupérer les dernières modifications
git fetch origin

# Se placer sur la branche Phase 0.3
git checkout claude/prepare-yarn-pnpm-migration-011CV5yWmukVnBfKXMECFpo3

# Vérifier qu'on est sur la bonne branche
git branch --show-current
```

---

## 🔧 Étape 3 : Installer les dépendances avec pnpm

```bash
# Installation des dépendances
pnpm install
```

**Durée estimée** : 2-5 minutes (première installation)

### Si erreurs de peer dependencies

Si vous voyez des warnings ou erreurs de peer dependencies (normal avec React 19) :

```bash
# Option 1 : Forcer l'installation
pnpm install --force

# Option 2 : Ignorer les warnings (si installation réussie malgré warnings)
# → Continuez avec les tests
```

**Note** : Le fichier `.pnpmfile.cjs` devrait adapter automatiquement les peer deps React 18→19.

---

## ✅ Étape 4 : Tests de validation

### 4.1 Vérifier la structure générée

```bash
# Vérifier que pnpm-lock.yaml a été créé
ls -lh pnpm-lock.yaml

# Vérifier que node_modules/ existe
ls -d node_modules/

# Vérifier que .pnpm-store/ a été créé (cache global)
ls -d ~/.pnpm-store/ 2>/dev/null || echo "Store pnpm créé"
```

### 4.2 Tests des commandes de base

```bash
# 1. Démarrer le serveur de développement
pnpm dev
# ✅ Devrait démarrer Vite sur http://localhost:5173
# ✅ Ouvrir le navigateur et vérifier que l'app se charge
# ✅ Modifier un fichier .jsx et vérifier le hot-reload
# Ctrl+C pour arrêter

# 2. Build de production
pnpm build
# ✅ Devrait compiler sans erreur
# ✅ Vérifier que dist/ est créé

# 3. Lint
pnpm lint
# ✅ Pas d'erreurs bloquantes (warnings OK)

# 4. Format
pnpm format
# ✅ Formatage OK

# 5. Tests unitaires
pnpm test
# ✅ Tous les tests passent
```

### 4.3 Tests fonctionnels critiques

Ouvrir l'application (`pnpm dev`) et tester :

- [ ] **Navigation** : Toutes les pages se chargent
- [ ] **Authentification Supabase** :
  - [ ] Connexion / Inscription fonctionne
  - [ ] Session persistante
- [ ] **Données Supabase** :
  - [ ] Lecture des tâches (tableau)
  - [ ] Création de tâches
  - [ ] Modification de tâches
  - [ ] Suppression de tâches
- [ ] **Upload d'images** :
  - [ ] Upload d'image fonctionne
  - [ ] Compression automatique (< 100KB)
  - [ ] Affichage des images
- [ ] **Drag & Drop (@dnd-kit)** :
  - [ ] Glisser-déposer des tâches fonctionne
  - [ ] Position sauvegardée
- [ ] **Paiements Stripe** (si applicable) :
  - [ ] Checkout fonctionne
  - [ ] Webhook reçu
- [ ] **Animations** :
  - [ ] Confettis affichés
  - [ ] Transitions fluides

---

## 🎉 Étape 5 : Commiter le pnpm-lock.yaml

Si tous les tests sont **✅ VALIDÉS**, commiter le lockfile généré :

```bash
# Ajouter pnpm-lock.yaml
git add pnpm-lock.yaml

# Vérifier le statut
git status

# Commiter
git commit -m "chore(pnpm): add pnpm-lock.yaml after successful migration

- pnpm install executed successfully
- All tests passing
- Application fully functional with pnpm 9.15.0"

# Pousser vers GitHub
git push origin claude/prepare-yarn-pnpm-migration-011CV5yWmukVnBfKXMECFpo3
```

---

## 📊 Comparaison Yarn vs pnpm

### Structure node_modules

**Avant (Yarn PnP)** :
```
.yarn/
├── releases/
│   └── yarn-4.10.3.cjs
└── sdks/
.pnp.cjs
yarn.lock
```

**Après (pnpm)** :
```
node_modules/
├── .pnpm/           # Packages réels (hard links)
├── package1/        # Symlinks
└── package2/        # Symlinks
.pnpm-store/         # Store global partagé
pnpm-lock.yaml
```

### Performances

| Opération | Yarn PnP | pnpm |
|-----------|----------|------|
| Installation initiale | ~2 min | ~2-3 min |
| Réinstallation (cache) | ~30s | ~20s |
| Espace disque | ~500 MB | ~300 MB (store partagé) |

---

## 🔍 Vérifications post-migration

Après installation, vérifier :

```bash
# 1. Structure node_modules
ls -la node_modules/.pnpm/ | head -10
# ✅ Devrait contenir les packages avec versions

# 2. Symlinks pnpm
ls -l node_modules/react
# ✅ Devrait être un symlink vers .pnpm/react@...

# 3. Store global pnpm
du -sh ~/.pnpm-store/ 2>/dev/null || du -sh .pnpm-store/
# ✅ Devrait afficher la taille du cache

# 4. Lockfile pnpm
head -20 pnpm-lock.yaml
# ✅ Devrait commencer par "lockfileVersion: '9.0'"
```

---

## 📚 Commandes pnpm équivalentes

| Yarn | pnpm | Description |
|------|------|-------------|
| `yarn` | `pnpm install` | Installer les dépendances |
| `yarn add [pkg]` | `pnpm add [pkg]` | Ajouter une dépendance |
| `yarn add -D [pkg]` | `pnpm add -D [pkg]` | Ajouter une dev dependency |
| `yarn remove [pkg]` | `pnpm remove [pkg]` | Supprimer une dépendance |
| `yarn upgrade [pkg]` | `pnpm update [pkg]` | Mettre à jour une dépendance |
| `yarn dev` | `pnpm dev` | Lancer le script `dev` |
| `yarn build` | `pnpm build` | Lancer le script `build` |
| `yarn [script]` | `pnpm [script]` | Lancer n'importe quel script |
| `yarn dlx [cmd]` | `pnpm dlx [cmd]` | Exécuter un package sans installer |
| `yarn why [pkg]` | `pnpm why [pkg]` | Pourquoi un package est installé |

---

## 🐛 Dépannage

### Problème : `pnpm: command not found`

**Solution** :
```bash
# Réinstaller pnpm
npm install -g pnpm@9.15.0

# OU utiliser npx
npx pnpm@9.15.0 install
```

### Problème : Erreurs de peer dependencies

**Solution** :
```bash
# Forcer l'installation
pnpm install --force

# OU ignorer les peer deps strictes
pnpm install --no-strict-peer-dependencies
```

### Problème : Module non trouvé après installation

**Cause** : pnpm est plus strict que Yarn sur les dépendances fantômes.

**Solution** :
```bash
# Ajouter explicitement la dépendance manquante
pnpm add [package-manquant]

# OU utiliser shamefully-hoist (déjà activé dans .npmrc)
```

### Problème : Import fails pour @supabase/supabase-js

**Solution** :
```bash
# Vérifier que le package est bien installé
pnpm list @supabase/supabase-js

# Réinstaller si nécessaire
pnpm install --force
```

### Problème : Build échoue avec "Cannot find module"

**Solution** :
```bash
# Nettoyer et réinstaller
rm -rf node_modules .pnpm-store
pnpm install

# Rebuild
pnpm build
```

---

## ⚠️ En cas de problème bloquant

Si la migration pnpm ne fonctionne pas, consulter `ROLLBACK.md` pour revenir à Yarn.

**Rollback rapide** :
```bash
git checkout v0.0.0-pre-pnpm-migration
yarn install
```

---

## ✅ Checklist finale

Avant de considérer la migration réussie, vérifier :

- [ ] `pnpm --version` affiche `9.15.0`
- [ ] `pnpm install` s'est exécuté sans erreur bloquante
- [ ] `pnpm-lock.yaml` a été créé
- [ ] `node_modules/` contient `.pnpm/` (structure pnpm)
- [ ] `pnpm dev` démarre l'application
- [ ] Hot-reload fonctionne
- [ ] `pnpm build` compile sans erreur
- [ ] `pnpm test` passe tous les tests
- [ ] Navigation dans l'app fonctionne
- [ ] Connexion Supabase fonctionne
- [ ] Upload d'images fonctionne
- [ ] Drag & drop fonctionne
- [ ] **Aucune régression fonctionnelle**

---

## 🎯 Prochaines étapes

Si tout est **✅ VALIDÉ** :

1. **Commiter pnpm-lock.yaml** (voir Étape 5)
2. **Merger dans main** (ou autre branche stable)
3. **Passer à la migration Next.js** (Phase suivante)

Si problèmes :

1. **Documenter les erreurs** dans MIGRATION_PNPM.md
2. **Consulter ROLLBACK.md**
3. **Revenir à Yarn si nécessaire**

---

## 📞 Support

En cas de blocage :

1. Vérifier `pnpm-debug.log` (si présent)
2. Consulter les logs d'installation : `pnpm install --loglevel debug`
3. Vérifier la doc pnpm : https://pnpm.io/
4. Consulter ROLLBACK.md

---

**Date de création** : 2025-11-13
**Phase** : 0.3 - Installation pnpm
**Branche** : `claude/prepare-yarn-pnpm-migration-011CV5yWmukVnBfKXMECFpo3`
