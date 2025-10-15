# Phase 4 - Cleanup Final RBAC

## 🎯 Objectif

Nettoyer et optimiser le système RBAC maintenant que tous les fichiers sont migrés vers `useRBAC()`.

---

## ✅ Déjà fait

- [x] Hook `useRBAC()` créé
- [x] Tous les fichiers migrés
- [x] Tests unitaires complets
- [x] Documentation complète

---

## 📋 Ce qui reste (optionnel)

### 1. Déprécier formellement les anciens hooks

**Fichiers à modifier :**

- `src/hooks/useQuotas.js`
- `src/hooks/useEntitlements.js`

**Actions :**

```javascript
/**
 * @deprecated Use useRBAC() instead
 * Ce hook est déprécié depuis Phase 2 du refactoring RBAC.
 * Migrez vers useRBAC() pour une API unifiée.
 *
 * @see {@link useRBAC}
 * @see {@link RBAC_GUIDE.md}
 */
export default function useQuotas() {
  if (import.meta.env.DEV) {
    console.warn(
      '⚠️ useQuotas() is deprecated. Use useRBAC() instead. ' +
        'See src/hooks/RBAC_GUIDE.md for migration guide.'
    )
  }

  // ... reste du code inchangé
}
```

**Bénéfices :**

- Warnings dans la console en dev
- JSDoc indique la dépréciation
- Guides vers la nouvelle API

**Effort :** ~10 min

---

### 2. (Optionnel) Supprimer les anciens hooks

**⚠️ ATTENTION : Breaking change !**

Si tu veux vraiment nettoyer :

```bash
# Supprimer les anciens hooks
rm src/hooks/useQuotas.js
rm src/hooks/useEntitlements.js

# Retirer des exports
# Editer src/hooks/index.js
```

**Bénéfices :**

- Code plus propre
- Moins de maintenance
- -450 lignes de code

**Risques :**

- Breaking change si imports directs quelque part
- Plus de backward compatibility

**Recommandation :** ❌ **NE PAS FAIRE** maintenant

- Garde les hooks pour compatibilité
- Supprime-les dans 3-6 mois quand tu es sûr

**Effort :** ~5 min (mais risqué)

---

### 3. Tests d'intégration E2E (optionnel)

**Créer :** `src/hooks/useRBAC.integration.test.jsx`

**Tester :**

- Scénario complet utilisateur (visitor → free → subscriber)
- Vérifier quotas en conditions réelles
- Tester realtime updates

**Bénéfices :**

- Confiance accrue
- Détecte les bugs subtils

**Effort :** ~30-60 min

---

### 4. Optimisations (optionnel)

**Idées :**

- Cache plus agressif pour quotas
- Debouncing des realtime updates
- Prefetch des quotas au login

**Bénéfices :**

- Performance améliorée
- Moins de requêtes RPC

**Effort :** ~1-2h

---

## 🎯 Recommandation

### Pour maintenant (5-10 min)

✅ **Faire uniquement l'étape 1** : Déprécier formellement les hooks

```javascript
// src/hooks/useQuotas.js
/**
 * @deprecated Use useRBAC() instead
 */
export default function useQuotas() {
  if (import.meta.env.DEV) {
    console.warn('⚠️ useQuotas() is deprecated. Use useRBAC() instead.')
  }
  // ... reste inchangé
}
```

### Pour plus tard (3-6 mois)

1. ⏳ Supprimer les anciens hooks (quand tu es sûr)
2. ⏳ Ajouter tests E2E (si besoin)
3. ⏳ Optimisations (si problèmes de performance)

---

## ✅ Conclusion

**Le refactoring RBAC est fonctionnellement TERMINÉ.**

Phase 4 concerne uniquement :

- Cleanup cosmétique
- Optimisations futures
- Maintenance à long terme

Tu peux considérer ce projet comme **COMPLET** et passer à autre chose ! 🎉

---

**Créé après Phase 2-3 du refactoring RBAC**
