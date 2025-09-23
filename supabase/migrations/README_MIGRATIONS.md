# Instructions d'Application des Migrations - Système de Comptes & Abonnements

## 📋 Ordre d'Application des Scripts SQL

Appliquez les scripts dans l'ordre suivant dans l'interface Supabase :

### 1. **01_add_account_status.sql**

- ✅ Ajoute les colonnes `account_status` et `deletion_scheduled_at` à la table `profiles`
- ✅ Crée les index pour les performances
- ✅ Met à jour tous les profils existants avec le statut 'active'

### 2. **02_add_roles_free_staff.sql**

- ✅ Ajoute les rôles `free` (compte gratuit) et `staff` (support)
- ✅ Met à jour les priorités des rôles existants

### 3. **03_create_quota_system.sql**

- ✅ Crée la table `role_quotas` pour gérer les limites
- ✅ Configure les quotas pour les comptes gratuits
- ✅ Crée les fonctions `check_user_quota` et `get_user_quota_info`

### 4. **04_create_demo_cards.sql**

- ✅ Crée la table `demo_cards` pour les visiteurs
- ✅ Insère des cartes de démonstration prédéfinies
- ✅ Crée les fonctions d'accès aux cartes de démo

### 5. **05_create_audit_logs.sql**

- ✅ Crée la table `account_audit_logs` pour tracer les changements
- ✅ Crée les fonctions de gestion des états de compte
- ✅ Configure les politiques RLS appropriées

### 6. **06_migrate_existing_data.sql**

- ✅ Migre les utilisateurs existants vers le nouveau système
- ✅ Assigne les bons rôles selon leur statut actuel
- ✅ Crée un rapport de migration

### 7. **07_verification_finale.sql**

- ✅ Vérifie que toutes les migrations ont été appliquées
- ✅ Teste les fonctions principales
- ✅ Affiche un rapport final complet

## 🔧 Comment Appliquer les Migrations

### Via l'Interface Supabase :

1. **Connectez-vous à votre projet Supabase**
   - Allez sur [supabase.com](https://supabase.com)
   - Sélectionnez votre projet

2. **Accédez à l'éditeur SQL**
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Ou allez dans "Database" → "SQL Editor"

3. **Appliquez chaque script**
   - Copiez le contenu du premier script
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" pour exécuter
   - Répétez pour chaque script dans l'ordre

4. **Vérifiez les résultats**
   - Chaque script affiche des messages de confirmation
   - Le script de vérification finale vous donnera un rapport complet

### Via la CLI Supabase (optionnel) :

```bash
# Si vous avez la CLI configurée
supabase db push
```

## ⚠️ Points d'Attention

### Avant d'Appliquer :

- ✅ **Sauvegardez votre base de données** (export complet)
- ✅ **Testez sur un environnement de développement** si possible
- ✅ **Vérifiez que vous avez les droits d'administration**

### Pendant l'Application :

- ✅ **Appliquez les scripts dans l'ordre exact**
- ✅ **Attendez que chaque script se termine complètement**
- ✅ **Notez les messages d'erreur éventuels**

### Après l'Application :

- ✅ **Exécutez le script de vérification finale**
- ✅ **Testez les fonctionnalités dans votre application**
- ✅ **Vérifiez que les utilisateurs existants fonctionnent toujours**

## 🧪 Tests de Validation

Après avoir appliqué toutes les migrations, testez :

1. **Connexion des utilisateurs existants**
2. **Création de nouveaux comptes**
3. **Fonctionnement des quotas pour les comptes gratuits**
4. **Accès aux cartes de démonstration pour les visiteurs**
5. **Gestion des états de compte (si vous avez des droits admin)**

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifiez les logs** dans l'interface Supabase
2. **Consultez les messages d'erreur** dans l'éditeur SQL
3. **Vérifiez que tous les scripts ont été appliqués** dans l'ordre
4. **Exécutez le script de vérification finale** pour diagnostiquer

## 🎯 Prochaines Étapes

Une fois les migrations appliquées :

1. **Mettre à jour le frontend** pour utiliser les nouveaux rôles
2. **Configurer les emails automatiques** (bienvenue, paiement échoué, etc.)
3. **Tester les quotas** avec des comptes gratuits
4. **Configurer les notifications** pour les changements d'état

---

**✅ Bonne migration !** Le système de Comptes & Abonnements sera prêt pour l'utilisation.
