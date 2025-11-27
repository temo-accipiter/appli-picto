# Model IDs Claude - Référence rapide

## 📋 Modèles Claude (Novembre 2024)

### ✅ UTILISER LES ALIAS (RECOMMANDÉ)

Claude Code supporte des **alias simples** qui pointent toujours vers la dernière version :

| Alias    | Modèle | Version actuelle      |
| -------- | ------ | --------------------- |
| `haiku`  | Haiku  | 4.5 (la plus récente) |
| `sonnet` | Sonnet | 4.5 (la plus récente) |
| `opus`   | Opus   | 4.5 (la plus récente) |

**Avantages** :

- ✅ Toujours la dernière version automatiquement
- ✅ Plus simple à écrire
- ✅ Pas besoin de changer les IDs quand nouvelle version sort

---

## 🎯 Configuration Appli-Picto

### Défaut (settings.json)

```json
{
  "model": "haiku"
}
```

### Commandes spécifiques

```json
{
  "commands": {
    "debug": { "model": "sonnet" },
    "explore": { "model": "sonnet" }
  }
}
```

---

## 💰 Estimation coûts (relatifs)

| Modèle | Version | Plan requis              | Usage                     |
| ------ | ------- | ------------------------ | ------------------------- |
| Haiku  | 4.5     | ✅ Pro                   | 90% du temps (défaut)     |
| Sonnet | 4.5     | ✅ Pro                   | Debug, exploration        |
| Opus   | 4.5     | ❌ Max ou `/extra-usage` | Non disponible (plan Pro) |

**Configuration actuelle** : Haiku 4.5 par défaut, Sonnet 4.5 pour tâches complexes

Dernière mise à jour : 27 novembre 2024
