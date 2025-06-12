# AGENTS.md

## 🎯 Objectif du projet

Ce projet est une application web complète en deux parties :
- `frontend/` : interface React (Vite + Yarn 4 + SCSS)
- `backend/` : API Express (Node.js)

Les scripts `install.sh` et `start.sh` permettent d’installer et de démarrer toute l’application.

---

## 🧭 Structure du projet

- `frontend/` : React (fonctionnel, composants modulaires, SCSS)
- `backend/` : Express, routes modulaires
- `install.sh` : installe les dépendances dans frontend et backend
- `start.sh` : lance le backend puis le frontend

---

## ✅ Règles pour l'agent Codex

### 🔒 Ne jamais modifier :
- `.pnp.cjs`, `.yarnrc.yml`, `.DS_Store`, `node_modules`, `.git`
- `install.sh` ou `start.sh` (sauf si explicitement demandé)

### 🛠 Autorisé à modifier :
- Tous les fichiers dans `/frontend` ou `/backend`
- Ajouter/modifier routes, composants, helpers, fichiers `.env.example`, etc.

### 🧠 À respecter :
- Utiliser React avec composants fonctionnels
- Utiliser Prettier pour formater le code JS/JSX/TS/TSX
- Proposer un résumé clair et une explication des changements avant commit
- Ne jamais supprimer de code existant sans raison claire
- Créer une branche nommée `codex/{feature}` (ex: `codex/ajout-route-api`)

---

## 🚀 Test et lancement

Toutes les modifications doivent être testables avec :
```bash
chmod +x start.sh
./start.sh
```

---

## 📬 Auteur

Projet maintenu par [@temo-accipiter](https://github.com/temo-accipiter)
