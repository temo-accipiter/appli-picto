# Tests Manuels - Système de Quotas (Phases 1-5)

## 📋 Vue d'ensemble

Ce document liste tous les tests manuels à effectuer pour valider le système de quotas mensuels et le monitoring.

---

## 🎯 Prérequis

### Compte de test Free

1. Créer un compte utilisateur free (ou utiliser un existant)
2. S'assurer d'avoir le rôle `free` assigné
3. Vérifier les quotas dans la base :
   ```sql
   SELECT * FROM role_quotas WHERE role_id = (SELECT id FROM roles WHERE name = 'free');
   ```
   Devrait afficher :
   - 5 tasks/month (monthly)
   - 2 rewards/month (monthly)
   - 2 categories/total

### Configuration locale

- ✅ Supabase local running (`npx supabase start`)
- ✅ App running (`yarn dev`)
- ✅ Toutes les migrations appliquées

---

## 🧪 Tests par Fonctionnalité

### 1. Quotas Mensuels - Tâches

#### Test 1.1 : Création progressive (80% warning)

**Objectif :** Vérifier le warning à 80% d'utilisation

**Étapes :**

1. En tant que Free user, aller sur `/edition`
2. Créer 4 tâches (80% de 5)
3. Observer le QuotaIndicator en haut de page

**Résultat attendu :**

- ✅ QuotaIndicator affiche "4/5 tâches ce mois-ci"
- ✅ Barre de progression à 80% en orange clair
- ✅ Icône ℹ️ + message "Quota en cours d'utilisation (80%)"
- ✅ Bordure orange clair autour du QuotaIndicator
- ✅ Pas d'animation de pulsation

#### Test 1.2 : Warning critique (90%)

**Objectif :** Vérifier le warning critique à 90%

**Étapes :**

1. Créer 4 tâches (voir test 1.1)
2. Essayer de créer une 5ème tâche
3. Observer le QuotaIndicator après création

**Résultat attendu :**

- ✅ Tâche créée avec succès
- ✅ QuotaIndicator affiche "5/5 tâches ce mois-ci"
- ✅ Barre de progression à 100% en rouge
- ✅ Icône 🚫 + message "Limite atteinte"
- ✅ Bordure rouge + animation de pulsation rapide
- ✅ Message "Passe à la version Premium"

#### Test 1.3 : Blocage à la limite (100%)

**Objectif :** Vérifier qu'on ne peut plus créer après la limite

**Étapes :**

1. Avoir 5 tâches créées (voir test 1.2)
2. Cliquer sur "Ajouter une tâche"
3. Remplir le formulaire
4. Cliquer sur "Enregistrer"

**Résultat attendu :**

- ✅ Modal ModalQuota s'affiche avec :
  - Titre : "Limite atteinte"
  - Message : "5 / 5 tâches ce mois-ci"
  - Contexte : "Vous avez utilisé toutes vos tâches pour ce mois. Le quota se réinitialisera le mois prochain."
  - Suggestion Premium
  - 💡 Astuce : "Votre quota mensuel se réinitialisera automatiquement le 1er du mois prochain..."
- ✅ Tâche non créée
- ✅ Console log : Event `quota_exceeded` envoyé

#### Test 1.4 : Suppression et recréation

**Objectif :** Vérifier que supprimer une tâche libère un slot

**Étapes :**

1. Avoir 5 tâches (limite atteinte)
2. Supprimer 1 tâche
3. Observer le QuotaIndicator
4. Créer une nouvelle tâche

**Résultat attendu :**

- ✅ Après suppression : "4/5 tâches ce mois-ci"
- ✅ Warning orange (80%)
- ✅ Création autorisée
- ✅ Retour à "5/5 tâches ce mois-ci"

---

### 2. Quotas Mensuels - Récompenses

#### Test 2.1 : Création normale

**Objectif :** Vérifier le quota de 2 récompenses/mois

**Étapes :**

1. En tant que Free user, aller sur `/edition`
2. Créer 1 récompense
3. Observer le QuotaIndicator récompenses

**Résultat attendu :**

- ✅ QuotaIndicator affiche "1/2 récompenses ce mois-ci"
- ✅ Barre à 50% (bleu normal)
- ✅ Pas de warning

#### Test 2.2 : Warning et blocage

**Objectif :** Vérifier le blocage à 2 récompenses

**Étapes :**

1. Créer une 2ème récompense
2. Observer le QuotaIndicator
3. Essayer de créer une 3ème

**Résultat attendu :**

- ✅ Après 2ème : "2/2 récompenses ce mois-ci" + bordure rouge + animation
- ✅ Tentative 3ème : Modal ModalQuota s'affiche
- ✅ Message contexte : "Vous avez utilisé toutes vos récompenses pour ce mois."
- ✅ 💡 Astuce sur réinitialisation mensuelle

---

### 3. Quotas Totaux - Catégories

#### Test 3.1 : Quota total (non mensuel)

**Objectif :** Vérifier que les catégories utilisent un quota total, pas mensuel

**Étapes :**

1. Créer 1 catégorie
2. Observer le QuotaIndicator catégories
3. Créer une 2ème catégorie
4. Essayer d'en créer une 3ème

**Résultat attendu :**

- ✅ Après 1ère : "1/2 catégories au total" (pas "ce mois-ci" !)
- ✅ Après 2ème : "2/2 catégories au total" + bordure rouge
- ✅ Tentative 3ème : Modal affiche "au total" et non "ce mois-ci"
- ✅ Message : "Vous avez utilisé toutes vos catégories disponibles dans votre forfait gratuit."
- ✅ PAS d'astuce de réinitialisation mensuelle

---

### 4. Sécurité RLS (Server-Side)

#### Test 4.1 : Bypass impossible via API directe

**Objectif :** Vérifier que les quotas sont bien appliqués côté serveur

**Étapes :**

1. Ouvrir la console développeur (F12)
2. Avoir 5 tâches créées (limite atteinte)
3. Exécuter dans la console :
   ```javascript
   const { supabase } = await import('/src/utils/supabaseClient.js')
   const result = await supabase.from('taches').insert({
     label: 'Hack attempt',
     user_id: (await supabase.auth.getUser()).data.user.id,
   })
   console.log(result)
   ```

**Résultat attendu :**

- ✅ Erreur RLS : "new row violates row-level security policy"
- ✅ Tâche NON créée dans la base
- ✅ Event `quota_exceeded` logué dans `quota_events`

#### Test 4.2 : Vérification des logs de monitoring

**Objectif :** Vérifier que les events sont bien enregistrés

**Étapes :**

1. Après avoir tenté de créer une tâche à la limite (test 1.3)
2. Vérifier les logs dans Supabase :
   ```sql
   SELECT * FROM quota_events
   WHERE user_id = 'your-user-id'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

**Résultat attendu :**

- ✅ Event `quota_exceeded` avec :
  - `resource_type: 'task'`
  - `quota_period: 'monthly'`
  - `current_usage: 5`
  - `quota_limit: 5`
  - `percentage: 100`
  - `metadata` contient le rôle

---

### 5. Animations et UX

#### Test 5.1 : Animations de pulsation

**Objectif :** Vérifier les animations CSS

**Étapes :**

1. Avoir 5 tâches (100%)
2. Observer le QuotaIndicator pendant 5 secondes

**Résultat attendu :**

- ✅ Animation de pulsation rapide (1.5s)
- ✅ Box-shadow change d'intensité (rouge clair → rouge foncé)
- ✅ Bordure change de couleur (#ef4444 → #f87171)
- ✅ Animation fluide et non invasive

#### Test 5.2 : Responsive mobile

**Objectif :** Vérifier l'affichage mobile

**Étapes :**

1. Ouvrir DevTools (F12)
2. Mode responsive (iPhone 12)
3. Naviguer vers `/edition`
4. Observer le QuotaIndicator

**Résultat attendu :**

- ✅ Info mensuelle "(X/Y ce mois)" masquée sur mobile
- ✅ Compteur restant masqué sur mobile
- ✅ Barre de progression et pourcentage visibles
- ✅ Messages d'erreur adaptés

---

### 6. Rôles et Permissions

#### Test 6.1 : Compte Admin (pas de quotas)

**Objectif :** Vérifier qu'un admin n'a pas de limites

**Étapes :**

1. Se connecter avec un compte admin
2. Créer 10+ tâches
3. Observer l'UI

**Résultat attendu :**

- ✅ QuotaIndicator NON affiché
- ✅ Aucune limite
- ✅ Pas de Modal de quota

#### Test 6.2 : Compte Abonné (quotas élevés)

**Objectif :** Vérifier les quotas pour abonnés

**Étapes :**

1. Se connecter avec un compte `abonne`
2. Vérifier les quotas :
   ```sql
   SELECT * FROM role_quotas WHERE role_id = (SELECT id FROM roles WHERE name = 'abonne');
   ```
3. Créer plusieurs tâches

**Résultat attendu :**

- ✅ Quotas élevés (40 tasks, 10 rewards, 50 categories)
- ✅ QuotaIndicator affiché mais avec limites hautes
- ✅ Pas de blocage avant les hautes limites

---

### 7. Réinitialisation Mensuelle (Simulation)

#### Test 7.1 : Changement de mois

**Objectif :** Vérifier que les compteurs se réinitialisent au changement de mois

**⚠️ Ce test nécessite de modifier temporairement la date système ou d'attendre le 1er du mois**

**Simulation manuelle :**

1. Avoir 5 tâches créées en novembre 2025
2. Modifier les compteurs manuellement :
   ```sql
   UPDATE monthly_user_usage_counters
   SET year = 2025, month = 10, tasks = 5
   WHERE user_id = 'your-user-id';
   ```
3. Créer une nouvelle tâche
4. Observer le compteur

**Résultat attendu :**

- ✅ Nouveau compteur créé pour novembre 2025 avec tasks = 1
- ✅ Ancien compteur (octobre) reste à 5
- ✅ QuotaIndicator affiche "1/5 tâches ce mois-ci"

---

### 8. Messages d'erreur contextuels

#### Test 8.1 : ModalQuota - Quota mensuel à 100%

**Objectif :** Vérifier le message pour quota mensuel dépassé

**Étapes :**

1. Avoir 5 tâches (limite mensuelle)
2. Tenter de créer une 6ème

**Résultat attendu :**

```
┌─────────────────────────────────────────┐
│         Limite atteinte                 │
├─────────────────────────────────────────┤
│ 5 / 5 tâches ce mois-ci                │
│                                         │
│ Vous avez utilisé toutes vos tâches    │
│ pour ce mois. Le quota se réinitialisera│
│ le mois prochain.                       │
│                                         │
│ Tu as atteint la limite de ton forfait │
│ gratuit                                 │
│                                         │
│ Passe à la version Premium pour         │
│ débloquer plus de fonctionnalités       │
│                                         │
│ 💡 Astuce : Votre quota mensuel se     │
│ réinitialisera automatiquement le 1er  │
│ du mois prochain. Ou passez à Premium  │
│ pour supprimer les limites !           │
└─────────────────────────────────────────┘
```

#### Test 8.2 : ModalQuota - Quota total à 100%

**Objectif :** Vérifier le message pour quota total dépassé

**Étapes :**

1. Avoir 2 catégories (limite totale)
2. Tenter de créer une 3ème

**Résultat attendu :**

```
┌─────────────────────────────────────────┐
│         Limite atteinte                 │
├─────────────────────────────────────────┤
│ 2 / 2 catégories au total              │
│                                         │
│ Vous avez utilisé toutes vos catégories│
│ disponibles dans votre forfait gratuit.│
│                                         │
│ Tu as atteint la limite de ton forfait │
│ gratuit                                 │
│                                         │
│ Passe à la version Premium pour         │
│ débloquer plus de fonctionnalités       │
│                                         │
│ [PAS d'astuce de réinitialisation]     │
└─────────────────────────────────────────┘
```

---

## 🐛 Bugs Connus / À Surveiller

### Points de vigilance

1. **Realtime Supabase** : Si les compteurs ne se mettent pas à jour automatiquement, vérifier que le channel realtime est bien actif
2. **Cache navigateur** : Si les quotas semblent incorrects, faire un hard refresh (Ctrl+Shift+R)
3. **Race conditions** : Si on crée 2 tâches très rapidement, vérifier que les compteurs sont cohérents
4. **Triggers** : Si les compteurs ne s'incrémentent pas, vérifier les logs Supabase pour erreurs de trigger

---

## ✅ Checklist Finale

Une fois tous les tests passés, cocher :

- [ ] Quotas mensuels (tâches) : warnings 80%, 90%, 100%
- [ ] Quotas mensuels (récompenses) : blocage correct
- [ ] Quotas totaux (catégories) : messages "au total"
- [ ] RLS server-side : impossible de bypass
- [ ] Monitoring : events logués dans `quota_events`
- [ ] Animations : pulsation fluide
- [ ] Responsive : mobile OK
- [ ] Rôles : admin sans quotas
- [ ] Messages contextuels : mensuel vs total
- [ ] Console : pas d'erreurs JavaScript

---

## 🔧 Commandes Utiles pour Debug

```bash
# Vérifier les compteurs d'un user
yarn supabase db execute "
SELECT
  u.email,
  uuc.tasks as total_tasks,
  uuc.rewards as total_rewards,
  muuc.year,
  muuc.month,
  muuc.tasks as monthly_tasks,
  muuc.rewards as monthly_rewards
FROM auth.users u
LEFT JOIN user_usage_counters uuc ON u.id = uuc.user_id
LEFT JOIN monthly_user_usage_counters muuc ON u.id = muuc.user_id
WHERE u.email = 'votre-email@example.com';
"

# Vérifier les events de quota
yarn supabase db execute "
SELECT
  created_at,
  event_type,
  resource_type,
  quota_period,
  current_usage,
  quota_limit,
  percentage
FROM quota_events
ORDER BY created_at DESC
LIMIT 20;
"

# Reset d'un user pour retester
yarn supabase db execute "
DELETE FROM monthly_user_usage_counters WHERE user_id = 'user-id';
DELETE FROM user_usage_counters WHERE user_id = 'user-id';
DELETE FROM taches WHERE user_id = 'user-id';
DELETE FROM recompenses WHERE user_id = 'user-id';
DELETE FROM categories WHERE user_id = 'user-id';
"
```

---

## 📊 Métriques de Succès

Après les tests, valider que :

1. **Fiabilité** : 0 bypass possible des quotas
2. **UX** : Messages clairs et contextuels
3. **Performance** : Pas de lag lors des créations
4. **Monitoring** : 100% des events critiques logués
5. **Accessibilité** : Warnings lisibles et compréhensibles

---

**Dernière mise à jour** : 1 novembre 2025
**Version** : Phase 1-5 complètes
