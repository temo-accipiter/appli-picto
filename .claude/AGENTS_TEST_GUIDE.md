# Guide de test des agents Claude Code

## ✅ Statut de validation

**Date** : 2026-03-26
**Agents configurés** : 5/5
**Syntaxe YAML** : ✅ Validée
**Dépendances externes** : ✅ Aucune (config propre)

---

## 📋 Agents disponibles

| Agent                | Modèle | Couleur   | Rôle                                       | Features        |
| -------------------- | ------ | --------- | ------------------------------------------ | --------------- |
| **scss-refactor**    | sonnet | 🔵 Blue   | Refactoring SCSS vers design system tokens | skills + memory |
| **action**           | haiku  | 🟣 Purple | Exécution conditionnelle batch             | -               |
| **explore-codebase** | haiku  | 🟡 Yellow | Exploration locale codebase                | memory          |
| **explore-docs**     | haiku  | 🔵 Cyan   | Recherche documentation externe            | -               |
| **websearch**        | haiku  | 🟢 Green  | Recherche web générale                     | -               |

---

## 🧪 Comment tester

### 1️⃣ Lister les agents

Dans Claude Code, exécute :

```
/agents
```

**Résultat attendu** :

- Tu devrais voir les 5 agents listés
- Chaque agent a sa couleur distinctive
- Les descriptions sont claires

---

### 2️⃣ Tester chaque agent individuellement

#### **Test scss-refactor**

```
@scss-refactor Analyse ce fichier SCSS et propose un refactoring vers les tokens
```

Puis donne lui un fichier SCSS.

**Résultat attendu** :

- L'agent utilise le modèle Sonnet (plus capable)
- Il a accès aux règles sass-tokens-discipline (pré-chargées)
- Il peut Read + Edit des fichiers

---

#### **Test action**

```
@action Vérifie si ces dépendances sont utilisées : lodash, moment, axios
```

**Résultat attendu** :

- L'agent vérifie avec Grep avant toute action
- Il utilise Read, Grep, Glob, Bash
- Il ne peut pas Edit/Write (sécurité)

---

#### **Test explore-codebase**

```
@explore-codebase Trouve tous les hooks Supabase custom dans le projet
```

**Résultat attendu** :

- L'agent explore avec Read, Grep, Glob
- Il ne peut pas modifier de fichiers (read-only)
- Il mémorise les patterns découverts (memory: project)

---

#### **Test explore-docs**

```
@explore-docs Comment utiliser Server Components dans Next.js 16 ?
```

**Résultat attendu** :

- L'agent utilise WebSearch + WebFetch
- Il ne peut pas lire les fichiers locaux
- Il fournit de la documentation avec exemples de code

---

#### **Test websearch**

```
@websearch Quelles sont les nouveautés React 19 en 2025 ?
```

**Résultat attendu** :

- L'agent utilise WebSearch + WebFetch
- Il cite ses sources
- Il privilégie les contenus récents (2024-2025)

---

## 🎯 Tests de restriction tools

### Vérifier que scss-refactor peut Edit

```
@scss-refactor Ajoute un commentaire en haut de src/styles/abstracts/_functions.scss
```

✅ **Devrait fonctionner** (Edit autorisé)

### Vérifier que explore-codebase ne peut pas Edit

```
@explore-codebase Modifie le fichier README.md
```

❌ **Devrait échouer** (Edit non autorisé, read-only)

### Vérifier que action peut utiliser Bash

```
@action Liste les fichiers du dossier scripts/
```

✅ **Devrait fonctionner** (Bash autorisé)

### Vérifier que explore-docs ne peut pas lire fichiers locaux

```
@explore-docs Lis le contenu de package.json
```

❌ **Devrait échouer** (Read non autorisé, WebSearch/WebFetch seulement)

---

## 🔍 Vérifier memory (apprentissage)

### Pour explore-codebase

1. Demande : `@explore-codebase Explore la structure des hooks custom`
2. L'agent devrait créer/mettre à jour `.claude/agent-memory/explore-codebase/MEMORY.md`
3. Vérifie le fichier : `cat .claude/agent-memory/explore-codebase/MEMORY.md`

### Pour scss-refactor

1. Demande : `@scss-refactor Analyse un fichier SCSS`
2. L'agent devrait mémoriser les conventions dans `.claude/agent-memory/scss-refactor/MEMORY.md`

---

## ✅ Checklist de validation

- [ ] Les 5 agents apparaissent dans `/agents`
- [ ] Chaque agent a sa couleur distinctive
- [ ] scss-refactor utilise le modèle Sonnet
- [ ] Les autres utilisent Haiku
- [ ] scss-refactor peut Edit des fichiers
- [ ] explore-codebase ne peut pas Edit (read-only)
- [ ] explore-docs/websearch utilisent WebSearch
- [ ] explore-docs/websearch ne peuvent pas Read de fichiers locaux
- [ ] action peut utiliser Bash
- [ ] explore-codebase et scss-refactor créent des fichiers memory

---

## 🚨 Problèmes potentiels

### Si un agent ne se charge pas

1. Vérifier la syntaxe YAML : `cat .claude/agents/<nom>.md`
2. Vérifier les logs Claude Code en mode verbose (Ctrl+O)
3. Redémarrer Claude Code

### Si un agent a des outils non autorisés

1. Vérifier le field `tools` dans le frontmatter
2. S'assurer qu'il n'y a pas de `disallowedTools` qui annule

### Si la mémoire ne fonctionne pas

1. Vérifier que `memory: project` est dans le frontmatter
2. Vérifier les permissions du dossier `.claude/agent-memory/`

---

## 📊 Résultat attendu

Après validation complète, tous les agents devraient :

- ✅ Se charger correctement au démarrage de Claude Code
- ✅ Respecter leurs restrictions tools
- ✅ Avoir leurs couleurs distinctives
- ✅ Fonctionner de manière autonome
- ✅ (Pour certains) Mémoriser leurs apprentissages

---

**Guide créé le** : 2026-03-26
**Dernière validation** : À faire par l'utilisateur
