# Guide Docker - Appli Picto

## 🎯 Vue d'ensemble

Ce projet utilise Docker pour créer un environnement de développement cohérent et reproductible.

## 📁 Fichiers Docker

- `Dockerfile` : Configuration de l'image de l'application React
- `docker-compose.yml` : Orchestration des services
- `.dockerignore` : Fichiers à exclure du build Docker

## 🚀 Commandes essentielles

### Démarrage rapide
```bash
# Construire l'image (première fois ou après changements majeurs)
docker compose build

# Lancer l'application
docker compose up

# Lancer en arrière-plan
docker compose up -d
```

### Gestion des conteneurs
```bash
# Arrêter l'application
docker compose down

# Voir les conteneurs en cours
docker ps

# Voir tous les conteneurs
docker ps -a

# Voir les logs
docker compose logs

# Suivre les logs en temps réel
docker compose logs -f
```

### Nettoyage
```bash
# Supprimer les conteneurs arrêtés
docker compose down

# Nettoyer complètement (conteneurs + images + volumes)
docker compose down --rmi all --volumes

# Nettoyer tout Docker (attention !)
docker system prune -a
```

## 🔧 Développement

### Option 1 : Développement local classique
```bash
yarn dev
```
- Plus rapide à démarrer
- Hot reload natif
- Accès direct aux fichiers

### Option 2 : Développement avec Docker
```bash
docker compose up
```
- Environnement isolé
- Identique à la production
- Partage facile avec l'équipe

## 📝 Workflow recommandé

### Pour le développement quotidien
1. Utilisez `yarn dev` pour un développement rapide
2. Testez avec `docker compose up` avant de commiter
3. Utilisez Docker pour reproduire des bugs spécifiques

### Pour les changements majeurs
1. Modifiez le code
2. Si changement de dépendances : `yarn install`
3. Rebuilder l'image : `docker compose build`
4. Tester : `docker compose up`

## 🌐 Accès à l'application

- **Local** : http://localhost:5173
- **Docker** : http://localhost:5173 (même port)

## 🐛 Dépannage

### L'application ne démarre pas
```bash
# Vérifier que Docker tourne
docker info

# Reconstruire l'image
docker compose build --no-cache

# Voir les logs détaillés
docker compose up --no-deps
```

### Problèmes de dépendances
```bash
# Mettre à jour yarn.lock localement
yarn install

# Reconstruire sans cache
docker compose build --no-cache
```

### Problèmes de port
```bash
# Vérifier les ports utilisés
docker compose ps

# Changer le port dans docker-compose.yml si nécessaire
ports:
  - "3000:5173"  # Port 3000 au lieu de 5173
```

## 📊 Informations utiles

### Structure de l'image
- **Base** : Node.js 20 Alpine Linux
- **Taille** : Optimisée avec .dockerignore
- **Port** : 5173 (Vite par défaut)

### Volumes montés
- Code source synchronisé en temps réel
- node_modules isolé dans le conteneur

## 🎉 Prochaines étapes

### Ajouts possibles
- [ ] Base de données PostgreSQL
- [ ] Redis pour le cache
- [ ] Nginx pour la production
- [ ] Tests automatisés
- [ ] CI/CD avec Docker

### Production
- Créer un Dockerfile.prod optimisé
- Utiliser docker-compose.prod.yml
- Configurer les variables d'environnement

---

## 💡 Tips

- **Première fois** : Le build peut prendre 5-10 minutes
- **Builds suivants** : Plus rapides grâce au cache
- **Hot reload** : Fonctionne avec les volumes montés
- **Debugging** : Utilisez `docker compose logs -f app`

## 🆘 Aide

Si vous rencontrez des problèmes :
1. Vérifiez que Docker Desktop tourne
2. Consultez les logs : `docker compose logs`
3. Essayez un rebuild : `docker compose build --no-cache`
4. En dernier recours : `docker system prune -a` (attention, supprime tout)

---
*Guide créé le $(date) - Docker version 28.4.0*

