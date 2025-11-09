# 🐳 Configuration Supabase Local avec Docker

Guide complet pour configurer et utiliser Supabase en local pour les tests.

## 📋 Prérequis

- **Docker Desktop** installé et démarré
- **Supabase CLI** installé globalement : `npm install -g supabase`
- **Yarn** pour exécuter les scripts npm

## 🚀 Installation

### 1. Vérifier que Docker est bien démarré

```bash
docker --version
docker ps  # Doit fonctionner sans erreur
```

### 2. Démarrer Supabase Local

```bash
yarn supabase:start
```

Cette commande va :
- Télécharger les images Docker nécessaires (première fois seulement)
- Démarrer tous les services Supabase (Auth, Database, Storage, etc.)
- Créer une base de données PostgreSQL locale
- Exécuter les migrations et le seed automatiquement

**Durée** : ~2-3 minutes la première fois, ~30 secondes les fois suivantes.

### 3. Vérifier que tout fonctionne

```bash
yarn supabase:status
```

Vous devriez voir :

```
         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔑 Configuration des variables d'environnement

### Créer un fichier `.env.test`

Le fichier `.env.test` est déjà créé avec les bonnes valeurs :

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Utiliser ces variables dans vos tests

Pour Vitest, le fichier `.env.test` est automatiquement chargé.

Pour Playwright, spécifiez le fichier dans `playwright.config.ts` :

```typescript
import { config } from 'dotenv'
config({ path: '.env.test' })
```

## 🌱 Seed de données de test

Le fichier `supabase/seed.sql` contient des données de test prédéfinies :

### Utilisateurs de test

| Email | Mot de passe | Rôle | Description |
|-------|--------------|------|-------------|
| `test-free@appli-picto.test` | `TestPassword123!` | `free` | Utilisateur gratuit avec quotas limités |
| `test-abonne@appli-picto.test` | `TestPassword123!` | `abonne` | Utilisateur avec abonnement actif |
| `test-admin@appli-picto.test` | `TestPassword123!` | `admin` | Administrateur |

### Données créées automatiquement

- ✅ **Rôles** : visiteur, free, abonné, admin
- ✅ **Features** : create_taches, create_recompenses, etc.
- ✅ **Permissions** : mappées selon les rôles
- ✅ **Quotas** : configurés par rôle
- ✅ **Tâches** : 3 pour free, 10 pour abonné
- ✅ **Récompenses** : 2 pour free, 5 pour abonné
- ✅ **Catégories** : 2 pour free, 5 pour abonné
- ✅ **Stations de métro** : données pour la feature thème

### Réinitialiser la base de données

Pour repartir de zéro avec les données de seed :

```bash
yarn supabase:reset
```

⚠️ **ATTENTION** : Cette commande supprime TOUTES les données locales !

## 🛠️ Utilisation avec les tests

### Tests unitaires (Vitest)

Les helpers dans `tests/e2e/helpers/database.ts` permettent de manipuler les données :

```typescript
import { createTestUser, seedUserData } from '@/tests/e2e/helpers/database'

test('créer un utilisateur de test', async () => {
  const userId = await createTestUser('test@example.com', 'password', 'free')
  await seedUserData(userId, { taches: 5, recompenses: 3 })
})
```

### Tests E2E (Playwright)

Utiliser les helpers d'authentification :

```typescript
import { loginAs } from '@/tests/e2e/helpers/auth'

test('se connecter en tant qu\'abonné', async ({ page }) => {
  await loginAs(page, 'abonne')
  // L'utilisateur est maintenant connecté
})
```

## 📊 Accès au Supabase Studio

L'interface web Supabase Studio est disponible sur :

**http://localhost:54323**

Vous pouvez :
- Voir les tables et leurs données
- Exécuter des requêtes SQL
- Gérer les utilisateurs Auth
- Voir les fichiers Storage
- Tester les Edge Functions

## 📧 Test des emails (Inbucket)

Tous les emails envoyés en local sont capturés par **Inbucket** :

**http://localhost:54324**

Utile pour :
- Tester les emails de confirmation
- Tester les emails de reset password
- Voir le contenu des emails sans les envoyer réellement

## 🔄 Scripts disponibles

| Script | Description |
|--------|-------------|
| `yarn supabase:start` | Démarrer Supabase Local |
| `yarn supabase:stop` | Arrêter Supabase Local |
| `yarn supabase:status` | Voir l'état des services |
| `yarn supabase:reset` | Réinitialiser la DB + seed |

## 🐛 Dépannage

### Erreur "Docker daemon is not running"

```bash
# Démarrer Docker Desktop
# Attendre que Docker soit complètement démarré
# Réessayer
yarn supabase:start
```

### Erreur "Port 54321 already in use"

```bash
# Arrêter l'instance existante
yarn supabase:stop

# Ou forcer l'arrêt
docker stop $(docker ps -q --filter "name=supabase")

# Redémarrer
yarn supabase:start
```

### Erreur "Migration failed"

```bash
# Réinitialiser complètement
yarn supabase:stop
docker volume prune -f  # Supprimer les volumes Docker
yarn supabase:start
```

### Les données seed ne sont pas chargées

```bash
# Vérifier que le fichier existe
ls -la supabase/seed.sql

# Réinitialiser
yarn supabase:reset
```

## 🔐 Sécurité

⚠️ **IMPORTANT** :

- Les clés dans `.env.test` sont UNIQUEMENT pour le développement local
- JAMAIS utiliser ces clés en production
- JAMAIS commiter de vraies clés Supabase dans le repo
- Le fichier `.env.test` est dans `.gitignore`

## 📚 Ressources

- [Documentation Supabase CLI](https://supabase.com/docs/guides/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Testing with Supabase](https://supabase.com/docs/guides/getting-started/testing)

## ✅ Checklist pour les tests

Avant de lancer les tests E2E :

- [ ] Docker Desktop est démarré
- [ ] `yarn supabase:start` a été exécuté
- [ ] `yarn supabase:status` affiche tous les services
- [ ] Les utilisateurs de test existent (voir Supabase Studio)
- [ ] Le fichier `.env.test` est configuré

---

**Dernière mise à jour** : Phase 4 - Fondations de tests
