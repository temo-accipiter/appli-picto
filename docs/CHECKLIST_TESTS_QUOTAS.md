# ✅ Checklist Tests Rapides - Quotas

## Setup Initial

- [ ] Compte Free créé et connecté
- [ ] `yarn dev` running
- [ ] Supabase local actif

---

## 🎯 Tests Critiques (15 min)

### 1. Quotas Mensuels - Tâches

- [ ] **4/5 tâches** → Warning orange 80% + icône ℹ️
- [ ] **5/5 tâches** → Bordure rouge + animation pulsation + icône 🚫
- [ ] **Tentative 6ème** → Modal s'affiche "5 / 5 tâches ce mois-ci"
- [ ] **Modal** → 💡 Astuce réinitialisation mensuelle présente
- [ ] **Supprimer 1 tâche** → Retour à 4/5, création possible

### 2. Quotas Mensuels - Récompenses

- [ ] **1/2 récompenses** → Affichage normal (50%)
- [ ] **2/2 récompenses** → Bordure rouge + animation
- [ ] **Tentative 3ème** → Modal + astuce mensuelle

### 3. Quotas Totaux - Catégories

- [ ] **1/2 catégories** → Affiche "**au total**" (pas "ce mois-ci")
- [ ] **2/2 catégories** → Blocage + Modal
- [ ] **Modal** → Message "forfait gratuit", **PAS d'astuce mensuelle**

### 4. Sécurité RLS

- [ ] Tentative bypass via console → Erreur RLS
- [ ] Event `quota_exceeded` dans `quota_events`

### 5. UI/UX

- [ ] Animations fluides (pas de lag)
- [ ] Messages clairs et compréhensibles
- [ ] Mobile responsive (F12 → iPhone 12)

---

## 🚀 Tests Optionnels (si temps)

### Rôles

- [ ] Admin → Pas de QuotaIndicator, création illimitée
- [ ] Abonné → Quotas élevés (40/10/50)

### Edge Cases

- [ ] Création rapide 2 tâches → Compteurs cohérents
- [ ] Page refresh → Quotas persistent
- [ ] Realtime → Suppression met à jour le QuotaIndicator en direct

---

## 🐛 Debug Si Problème

```bash
# Voir les compteurs
SELECT * FROM monthly_user_usage_counters WHERE user_id = 'xxx';

# Voir les events
SELECT * FROM quota_events ORDER BY created_at DESC LIMIT 5;

# Reset pour retester
DELETE FROM taches WHERE user_id = 'xxx';
DELETE FROM monthly_user_usage_counters WHERE user_id = 'xxx';
```

---

## ✅ Validation Finale

Si tous les tests ✅ :

- 🎉 **Phases 1-5 validées**
- 📝 Prêt pour commit
- 🚀 Prêt pour deploy vers Supabase Cloud

**Temps estimé** : 15-20 minutes pour tests critiques
