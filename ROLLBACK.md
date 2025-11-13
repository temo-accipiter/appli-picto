# 🔙 Rollback vers Yarn

**Guide complet pour revenir à Yarn en cas de problème avec la migration pnpm**

⚠️ **IMPORTANT** : Utilisez ce guide uniquement si la migration pnpm pose des problèmes bloquants.

---

## 🎯 Scénarios de rollback

- ❌ **pnpm install échoue** avec des erreurs bloquantes
- ❌ **Application ne démarre pas** avec pnpm dev
- ❌ **Build échoue** avec des erreurs de module
- ❌ **Régressions fonctionnelles** détectées
- ❌ **Problèmes de performance** avec pnpm
- ❌ **Incompatibilités** avec des dépendances

---

## ✅ Option 1 : Rollback via tag (Recommandé)

**Avantage** : Retour à un état stable garanti (avant toute modification).

### Étapes

```bash
# 1. Vérifier que le tag existe
git tag -l v0.0.0-pre-pnpm-migration

# 2. Revenir au tag (état Yarn stable)
git checkout v0.0.0-pre-pnpm-migration

# 3. Créer une nouvelle branche depuis le tag
git checkout -b rollback-pnpm-$(date +%Y%m%d)

# 4. Nettoyer les fichiers pnpm (si présents)
rm -rf node_modules pnpm-lock.yaml .pnpm-store

# 5. Réinstaller avec Yarn
yarn install

# 6. Vérifier que tout fonctionne
yarn dev
# ✅ Devrait démarrer normalement

# 7. Tester l'application
# Navigation, auth, data, upload, etc.

# 8. Si OK, pousser la branche rollback
git push origin rollback-pnpm-$(date +%Y%m%d)
```

### Vérifications post-rollback

```bash
# Vérifier que Yarn est utilisé
cat package.json | grep packageManager
# ✅ Devrait afficher : "packageManager": "yarn@4.10.3"

# Vérifier que yarn.lock existe
ls -lh yarn.lock
# ✅ Devrait exister

# Vérifier que .yarn/ existe
ls -d .yarn/
# ✅ Devrait exister

# Vérifier qu'aucun fichier pnpm ne reste
ls pnpm-lock.yaml 2>/dev/null
# ✅ Ne devrait PAS exister

# Tester les commandes
yarn dev
yarn build
yarn test
```

---

## ✅ Option 2 : Rollback manuel sur branche actuelle

**Avantage** : Permet de garder certaines modifications (si nécessaire).

### Étapes

```bash
# 1. Supprimer les fichiers pnpm
rm -rf node_modules pnpm-lock.yaml
rm -rf ~/.pnpm-store  # Cache global pnpm

# 2. Restaurer les fichiers Yarn depuis le tag
git checkout v0.0.0-pre-pnpm-migration -- yarn.lock
git checkout v0.0.0-pre-pnpm-migration -- .yarn
git checkout v0.0.0-pre-pnpm-migration -- package.json

# 3. Supprimer les fichiers de config pnpm (optionnel)
# git rm .npmrc .pnpmfile.cjs
# OU les garder pour référence future

# 4. Réinstaller avec Yarn
yarn install

# 5. Vérifier que tout fonctionne
yarn dev
yarn build
yarn test

# 6. Commiter le rollback
git add .
git commit -m "revert: rollback pnpm migration, restore Yarn 4.10.3

Reason: [décrire le problème rencontré]
- Restored yarn.lock from tag v0.0.0-pre-pnpm-migration
- Restored .yarn/ directory
- Restored package.json with yarn packageManager
- Removed pnpm-lock.yaml and node_modules"

# 7. Pousser
git push origin [nom-de-la-branche]
```

---

## ✅ Option 3 : Rollback partiel (Garder la config pnpm)

**Avantage** : Permet de retenter la migration plus tard sans tout reconfigurer.

### Étapes

```bash
# 1. Supprimer uniquement pnpm-lock.yaml et node_modules
rm -rf node_modules pnpm-lock.yaml

# 2. Restaurer yarn.lock
git checkout v0.0.0-pre-pnpm-migration -- yarn.lock

# 3. Changer packageManager dans package.json
# Éditer manuellement package.json :
# "packageManager": "pnpm@9.15.0" → "packageManager": "yarn@4.10.3"

# 4. Restaurer .yarn/ si supprimé
git checkout v0.0.0-pre-pnpm-migration -- .yarn

# 5. Réinstaller avec Yarn
yarn install

# 6. Tester
yarn dev

# 7. Garder les fichiers de config pnpm pour référence
# .npmrc, .pnpmfile.cjs restent présents (ignorés par Yarn)
```

**Note** : Cette option permet de revenir à pnpm plus tard en inversant les étapes.

---

## 🔧 Option 4 : Nettoyer complètement et réinstaller Yarn

**Avantage** : Repart de zéro avec un état propre.

### Étapes

```bash
# 1. Nettoyer TOUT
rm -rf node_modules
rm -rf .pnpm-store ~/.pnpm-store
rm -f pnpm-lock.yaml
rm -f .npmrc
rm -f .pnpmfile.cjs

# 2. Vérifier que le cache pnpm est nettoyé
pnpm store prune 2>/dev/null || echo "pnpm non installé"

# 3. Désinstaller pnpm (optionnel)
npm uninstall -g pnpm

# 4. Revenir au tag
git checkout v0.0.0-pre-pnpm-migration

# 5. Créer une branche de travail
git checkout -b after-rollback

# 6. Réinstaller avec Yarn
yarn install

# 7. Vérifier
yarn dev
yarn build
yarn test

# 8. Si OK, continuer le développement sur cette branche
```

---

## 📊 Comparaison des options

| Option | Rapidité | Sécurité | Perte de modifications |
|--------|----------|----------|------------------------|
| **Option 1 (tag)** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Aucune (état garanti) |
| **Option 2 (manuel)** | ⭐⭐ | ⭐⭐⭐⭐ | ⚠️ Possible (si commits non poussés) |
| **Option 3 (partiel)** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Garde la config pnpm |
| **Option 4 (nettoyage)** | ⭐ | ⭐⭐⭐⭐⭐ | ⚠️ Nettoie tout |

**Recommandation** : **Option 1** pour un rollback safe et rapide.

---

## 🐛 Dépannage

### Problème : "yarn: command not found" après rollback

**Cause** : Yarn n'est pas installé ou pas dans le PATH.

**Solution** :
```bash
# Réinstaller Yarn via Corepack
corepack enable
corepack prepare yarn@4.10.3 --activate

# OU via npm
npm install -g yarn@4.10.3

# Vérifier
yarn --version
# ✅ Devrait afficher 4.10.3
```

### Problème : yarn.lock corrompu après rollback

**Solution** :
```bash
# Restaurer yarn.lock depuis le tag
git checkout v0.0.0-pre-pnpm-migration -- yarn.lock

# Nettoyer le cache Yarn
yarn cache clean

# Réinstaller
yarn install
```

### Problème : .yarn/ manquant après rollback

**Solution** :
```bash
# Restaurer .yarn/ depuis le tag
git checkout v0.0.0-pre-pnpm-migration -- .yarn

# Vérifier que les fichiers sont présents
ls -la .yarn/releases/
ls -la .yarn/sdks/

# Réinstaller
yarn install
```

### Problème : Conflits Git lors du checkout

**Solution** :
```bash
# Stash les modifications locales
git stash

# Checkout le tag
git checkout v0.0.0-pre-pnpm-migration

# Récupérer les modifications si nécessaire
git stash pop
```

### Problème : Packages manquants après rollback

**Solution** :
```bash
# Nettoyer complètement
rm -rf node_modules

# Nettoyer le cache Yarn
yarn cache clean

# Réinstaller proprement
yarn install

# Si toujours des problèmes, forcer la réinstallation
yarn install --force
```

---

## ✅ Checklist post-rollback

Après rollback, vérifier que :

- [ ] `package.json` contient `"packageManager": "yarn@4.10.3"`
- [ ] `yarn.lock` existe et n'est pas corrompu
- [ ] `.yarn/` existe avec `releases/` et `sdks/`
- [ ] `pnpm-lock.yaml` n'existe plus
- [ ] `node_modules/` est présent (Yarn PnP n'a pas de node_modules)
- [ ] `yarn --version` affiche `4.10.3`
- [ ] `yarn dev` démarre l'application
- [ ] Hot-reload fonctionne
- [ ] `yarn build` compile sans erreur
- [ ] `yarn test` passe tous les tests
- [ ] **Aucune régression** par rapport à avant la migration

---

## 📝 Documenter le problème

Si vous devez faire un rollback, **documenter le problème** pour analyse :

```bash
# Créer un fichier de rapport
cat > PNPM_MIGRATION_ISSUE.md << 'EOF'
# Problème rencontré lors de la migration pnpm

## Date
[date du problème]

## Phase
Phase 0.3 - Installation pnpm

## Symptômes
[décrire les erreurs/problèmes]

## Commande qui a échoué
```bash
[commande exacte]
```

## Logs d'erreur
```
[copier les logs]
```

## Environnement
- OS : [Linux/macOS/Windows]
- Node.js : [version]
- pnpm : [version]
- Branche : [nom de la branche]

## Actions prises
1. [décrire les tentatives de résolution]
2. ...

## Solution de contournement
Rollback vers Yarn 4.10.3 (Option [1/2/3/4])

## À investiguer
- [points à analyser pour une future migration]

EOF

# Commiter le rapport
git add PNPM_MIGRATION_ISSUE.md
git commit -m "docs: add pnpm migration issue report"
```

---

## 🔍 Analyser les logs d'erreur

Si `pnpm install` a échoué, récupérer les logs :

```bash
# Logs pnpm
cat pnpm-debug.log

# OU avec loglevel debug
pnpm install --loglevel debug > pnpm-install-debug.log 2>&1

# Sauvegarder les logs pour analyse
git add pnpm-debug.log pnpm-install-debug.log
git commit -m "chore: save pnpm debug logs for analysis"
```

---

## 🎯 Retenter la migration pnpm plus tard

Si le rollback a été nécessaire, voici comment retenter la migration :

### Après correction du problème

```bash
# 1. Revenir sur la branche pnpm
git checkout claude/prepare-yarn-pnpm-migration-011CV5yWmukVnBfKXMECFpo3

# 2. Mettre à jour depuis main (si nécessaire)
git merge main

# 3. Supprimer les anciens fichiers
rm -rf node_modules pnpm-lock.yaml

# 4. Retenter l'installation
pnpm install

# 5. Tester
pnpm dev
pnpm build
pnpm test

# 6. Si OK, commiter et merger
git add pnpm-lock.yaml
git commit -m "chore(pnpm): add pnpm-lock.yaml (retry after rollback)"
git push
```

---

## 📞 Support

En cas de doute sur le rollback :

1. **Ne pas paniquer** : Tous les états sont sauvegardés dans Git
2. **Consulter le tag** : `v0.0.0-pre-pnpm-migration` est un état stable garanti
3. **Tester localement** : Ne jamais forcer un push sans tester
4. **Documenter** : Créer un rapport d'incident (voir ci-dessus)

---

## ⚠️ IMPORTANT : Commit de rollback

Si vous faites un rollback, **commiter et pousser** pour informer l'équipe :

```bash
git add .
git commit -m "revert: rollback pnpm migration to Yarn 4.10.3

Reason: [description du problème]

Changes:
- Restored yarn.lock from tag v0.0.0-pre-pnpm-migration
- Restored .yarn/ directory
- Removed pnpm-lock.yaml
- package.json: packageManager pnpm@9.15.0 → yarn@4.10.3

Migration will be retried after investigating the issue.
See PNPM_MIGRATION_ISSUE.md for details."

git push origin [nom-branche]
```

---

**Date de création** : 2025-11-13
**Phase** : 0.3 - Rollback pnpm
**Tag de référence** : `v0.0.0-pre-pnpm-migration`
**Commit Yarn stable** : `b258296`
