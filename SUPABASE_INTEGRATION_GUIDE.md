# 🧪 Guide complet d'intégration et de test Supabase

## 📋 Vue d'ensemble

Ce guide unique vous explique comment tester et maintenir l'intégration de votre application avec Supabase.

## 🔍 Comment voir ce que vous avez dans Supabase

### **Option 1 : Dashboard web (recommandé)**
- Allez sur [supabase.com](https://supabase.com)
- Connectez-vous et sélectionnez votre projet `tklcztqoqvnialaqfcjm`
- Naviguez vers **Table Editor** pour voir vos données
- Allez vers **Database** > **Schema** pour voir la structure

### **Option 2 : Fichier schema.sql**
- **OUI**, ce fichier contient un "dump" complet de votre base
- Il doit être maintenu à jour à chaque modification
- Utilisez les scripts fournis pour l'automatiser

## 🚀 Tests rapides de l'intégration

### **Test 1 : Vérifier l'état de l'intégration**
```bash
# Vérifier la configuration et l'état actuel
yarn test:supabase

# Ce script analyse votre configuration sans avoir besoin de Docker
```

### **Test 2 : Tester en temps réel**
```bash
# Lancer l'application
yarn test:app

# Dans votre navigateur, ajoutez temporairement le composant SupabaseTestSimple
# à une de vos pages pour voir les résultats en temps réel
```

### **Test 3 : Mettre à jour le schema (optionnel)**
```bash
# Mettre à jour le schema depuis Supabase (nécessite Docker)
yarn test:supabase:update

# Comparer avec la version précédente
yarn test:supabase:compare
```

## 🔧 Configuration requise

### **Installation de Supabase CLI (optionnel)**
```bash
npm install -g supabase
supabase login
supabase link --project-ref tklcztqoqvnialaqfcjm
```

## 📊 État actuel de votre intégration

D'après l'analyse automatique, votre intégration Supabase est **BIEN CONFIGURÉE** :

- **9 tables** configurées (profiles, taches, categories, etc.)
- **6 fonctions** personnalisées (authentification, gestion utilisateurs)
- **22 politiques RLS** pour la sécurité
- **Client Supabase** correctement configuré
- **Hooks et contextes** d'intégration présents

### **Tables principales :**
- `profiles` - Profils utilisateurs
- `taches` - Tâches des utilisateurs
- `categories` - Catégories personnalisées
- `recompenses` - Système de récompenses
- `stations` - Stations de transport
- `abonnements` - Gestion Stripe
- `consentements` - RGPD
- `parametres` - Configuration app
- `subscription_logs` - Logs des abonnements

### **Fonctions personnalisées :**
- `handle_new_user()` - Création automatique de profil
- `is_admin()` - Vérification des droits admin
- `email_exists()` - Vérification d'email
- `user_can_upload_avatar()` - Contrôle des uploads
- `purge_old_consentements()` - Nettoyage automatique
- `set_updated_at()` - Mise à jour automatique des timestamps

## 🎯 Tests manuels recommandés

### **1. Authentification**
- [ ] Créer un compte
- [ ] Se connecter
- [ ] Se déconnecter
- [ ] Vérifier la persistance de session

### **2. Opérations CRUD**
- [ ] Créer une tâche
- [ ] Modifier une tâche
- [ ] Supprimer une tâche
- [ ] Vérifier la synchronisation

### **3. Storage**
- [ ] Upload d'avatar
- [ ] Upload d'image de tâche
- [ ] Vérifier les permissions

### **4. Fonctions Edge**
- [ ] Création de session Stripe
- [ ] Webhook Stripe
- [ ] Suppression de compte

## 🚨 Dépannage courant

### **Erreur de connexion**
```bash
# Vérifier les variables d'environnement
cat .env

# Vérifier la connexion CLI
supabase status
```

### **Erreur de permissions**
- Vérifier les politiques RLS dans `schema.sql`
- Contrôler les rôles utilisateur
- Vérifier les contraintes de clés étrangères

### **Erreur de schema**
```bash
# Forcer la mise à jour
yarn test:supabase:update

# Vérifier les différences
yarn test:supabase:compare
```

## 📝 Maintenance du schema.sql

### **Quand mettre à jour ?**
- ✅ Après chaque modification de structure de base
- ✅ Après ajout/suppression de tables
- ✅ Après modification des politiques RLS
- ✅ Après ajout de fonctions personnalisées

### **Comment automatiser ?**
```bash
# Ajouter à votre workflow Git
# Dans .gitignore, ajouter :
# supabase/schema.backup.sql

# Dans votre pipeline CI/CD
yarn test:supabase:update
```

## 🔒 Sécurité et bonnes pratiques

### **Variables d'environnement**
- Ne jamais commiter les clés Supabase
- Utiliser `.env.local` pour le développement
- Vérifier les permissions des rôles

### **Politiques RLS**
- Toujours activer RLS sur les tables sensibles
- Tester les politiques avec différents utilisateurs
- Vérifier les contraintes de clés étrangères

### **Fonctions Edge**
- Valider les entrées utilisateur
- Gérer les erreurs gracieusement
- Logger les actions importantes

## 📈 Monitoring et observabilité

### **Logs Supabase**
- Surveiller les erreurs d'authentification
- Vérifier les performances des requêtes
- Contrôler l'utilisation du storage

### **Métriques d'application**
- Temps de réponse des requêtes
- Taux d'erreur
- Utilisation des ressources

## 🎉 Conclusion

En suivant ce guide, vous pourrez :
1. **Vérifier rapidement** l'état de votre intégration Supabase
2. **Maintenir à jour** votre schema.sql automatiquement
3. **Détecter les problèmes** avant qu'ils n'affectent les utilisateurs
4. **Confirmer** que tout fonctionne avant d'ajouter de nouvelles fonctionnalités

**Rappel important :** Mettez toujours à jour votre `schema.sql` après chaque modification côté Supabase !

---

## 📚 Scripts disponibles

### **Tests et vérification (sans Docker)**
- **`yarn test:supabase`** - Vérification de l'état de l'intégration
- **`yarn test:supabase:compare`** - Comparaison des versions de schema
- **`yarn test:app`** - Lancement de l'application pour tests manuels

### **Mise à jour du schema**
- **`yarn context:update`** - **RECOMMANDÉ** : Mise à jour via pg_dump + génération types TypeScript
- **`yarn test:supabase:update`** - Alternative via Supabase CLI (moins efficace)
- **`yarn test:supabase:setup-docker`** - Instructions pour installer Docker

### **Logs et monitoring**
- **`yarn logs:checkout`** - Logs des fonctions Stripe
- **`yarn logs:webhook`** - Logs des webhooks

## 🔧 Gestion du schema.sql

### **Option 1 : Mise à jour automatique (recommandée)**
```bash
yarn context:update
```
**Cette est votre commande existante et elle est parfaite !** Elle :
- Met à jour `schema.sql` via `pg_dump` direct (sans Docker)
- Génère les types TypeScript automatiquement
- Utilise vos variables d'environnement configurées

### **Option 2 : Mise à jour manuelle (si pg_dump échoue)**
1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous et sélectionnez votre projet
3. Database → Schema → Export
4. Copiez le contenu dans `supabase/schema.sql`

### **Option 3 : Via Supabase CLI (si vous voulez Docker)**
```bash
yarn test:supabase:setup-docker
yarn test:supabase:update
```
**Note :** Cette option est moins efficace que votre `yarn context:update` existante.
