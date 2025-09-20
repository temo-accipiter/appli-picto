# Phase 2 : Plan d'Implémentation Frontend - Comptes & Abonnements

## 📋 Vue d'ensemble

Cette phase intègre le nouveau système de Comptes & Abonnements dans le frontend existant, en respectant l'architecture actuelle et en ajoutant les nouvelles fonctionnalités.

## 🎯 Objectifs

1. **Intégrer les nouveaux rôles** (`free`, `staff`) dans le système existant
2. **Ajouter la gestion des états de compte** (active, suspended, etc.)
3. **Implémenter le système de quotas** pour les comptes gratuits
4. **Migrer le système de démonstration** vers `demo_cards`
5. **Ajouter la gestion des comptes** pour les administrateurs

## 🏗️ Architecture Cible

### Contexte et Hooks Existants (à Modifier)
- `PermissionsContext` → Ajouter gestion des états de compte
- `useEntitlements` → Intégrer les nouveaux rôles et états
- `useSubscriptionStatus` → Ajouter gestion des quotas
- `useDemoData` → Migrer vers `demo_cards`

### Nouveaux Composants à Créer
- `AccountStatusBadge` → Affichage de l'état du compte
- `QuotaIndicator` → Indicateur de quotas pour comptes gratuits
- `AccountManagement` → Gestion des comptes (admin)
- `QuotaManagement` → Gestion des quotas (admin)
- `DemoCardsManager` → Gestion des cartes de démo (admin)

## 📝 Plan d'Implémentation Détaillé

### Étape 1 : Mise à jour du système de permissions
**Fichiers à modifier :**
- `src/contexts/PermissionsContext.jsx`
- `src/hooks/useEntitlements.js`
- `src/hooks/usePermissionsAPI.js`

**Modifications :**
1. Ajouter la gestion des états de compte (`account_status`)
2. Intégrer les nouveaux rôles (`free`, `staff`)
3. Ajouter les nouvelles permissions (quotas, gestion de comptes)

### Étape 2 : Création des hooks de gestion des comptes
**Nouveaux fichiers :**
- `src/hooks/useAccountStatus.js`
- `src/hooks/useQuotas.js`
- `src/hooks/useDemoCards.js`

**Fonctionnalités :**
1. Gestion des états de compte
2. Vérification et gestion des quotas
3. Récupération des cartes de démonstration

### Étape 3 : Mise à jour du système de démonstration
**Fichiers à modifier :**
- `src/hooks/useDemoData.js`
- `src/pages/tableau-demo/TableauDemo.jsx`

**Modifications :**
1. Migrer de `visible_en_demo` vers `demo_cards`
2. Utiliser les nouvelles cartes prédéfinies
3. Améliorer l'expérience utilisateur

### Étape 4 : Création des composants de gestion
**Nouveaux fichiers :**
- `src/components/admin/AccountManagement.jsx`
- `src/components/admin/QuotaManagement.jsx`
- `src/components/admin/DemoCardsManager.jsx`
- `src/components/shared/AccountStatusBadge.jsx`
- `src/components/shared/QuotaIndicator.jsx`

### Étape 5 : Mise à jour des pages existantes
**Fichiers à modifier :**
- `src/pages/profil/Profil.jsx`
- `src/pages/abonnement/Abonnement.jsx`
- `src/pages/tableau/Tableau.jsx`

**Modifications :**
1. Ajouter les indicateurs de quotas
2. Intégrer la gestion des états de compte
3. Améliorer l'interface utilisateur

### Étape 6 : Création des pages d'administration
**Nouveaux fichiers :**
- `src/pages/admin/AdminDashboard.jsx`
- `src/pages/admin/AccountManagement.jsx`
- `src/pages/admin/QuotaManagement.jsx`
- `src/pages/admin/DemoCardsManagement.jsx`

## 🔄 Ordre d'Implémentation

1. **Hooks et Contextes** (base du système)
2. **Composants de base** (réutilisables)
3. **Pages d'administration** (fonctionnalités avancées)
4. **Mise à jour des pages existantes** (intégration)
5. **Tests et optimisations** (finalisation)

## 📊 Priorités

### Priorité 1 (Critique)
- Mise à jour du système de permissions
- Hooks de gestion des comptes et quotas
- Migration du système de démonstration

### Priorité 2 (Important)
- Composants de gestion pour administrateurs
- Pages d'administration
- Mise à jour des pages existantes

### Priorité 3 (Amélioration)
- Optimisations et tests
- Interface utilisateur avancée
- Documentation

## 🎨 Considérations UX/UI

1. **Cohérence visuelle** avec l'existant
2. **Accessibilité** pour les utilisateurs autistes
3. **Feedback visuel** pour les quotas et états
4. **Interface intuitive** pour les administrateurs

## 🔧 Considérations Techniques

1. **Compatibilité** avec l'architecture existante
2. **Performance** des requêtes de quotas
3. **Sécurité** des fonctions d'administration
4. **Maintenabilité** du code

## 📈 Métriques de Succès

1. **Fonctionnalité** : Toutes les nouvelles fonctionnalités opérationnelles
2. **Performance** : Pas de dégradation des performances existantes
3. **UX** : Interface intuitive et accessible
4. **Sécurité** : Gestion sécurisée des permissions et quotas
