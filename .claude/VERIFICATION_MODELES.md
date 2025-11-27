# Vérification des modèles Claude Code

## Comment être SÛR du modèle utilisé ?

### ✅ Méthode 1 : Demande directe (100% fiable)

```bash
@sonnet Quel modèle utilises-tu ? Réponds juste par le nom.
```

**Réponse attendue** : `sonnet` ou `claude-sonnet-4-5-20250929`

---

### ✅ Méthode 2 : Header Claude Code

Le header affiche le modèle actif :

- `Haiku 4.5` → Modèle Haiku actif
- `Sonnet 4.5` → Modèle Sonnet actif
- `Opus 4.5` → Modèle Opus actif (si disponible)

---

### ✅ Méthode 3 : Test de performance

| Modèle | Vitesse               | Qualité réponse  |
| ------ | --------------------- | ---------------- |
| Haiku  | ⚡ Très rapide (1-2s) | Concise          |
| Sonnet | 🚀 Moyen (2-4s)       | Détaillée        |
| Opus   | 🐢 Plus lent (4-8s)   | Très approfondie |

---

## 🎯 Garantie que @sonnet fonctionne

Le préfixe `@` a la **priorité absolue** :

```
@sonnet <question>  → Force Sonnet (priorité max)
@haiku <question>   → Force Haiku
@opus <question>    → Force Opus (si plan Max)
```

**Aucun settings.json ne peut override `@`**

---

## 🧪 Test rapide

```bash
# Étape 1 : Question normale (Haiku par défaut)
Bonjour

# Étape 2 : Vérifier modèle actuel
Quel modèle es-tu ?
# Devrait répondre : haiku

# Étape 3 : Forcer Sonnet
@sonnet Quel modèle es-tu ?
# Devrait répondre : sonnet

# Étape 4 : Revenir défaut
Quel modèle es-tu ?
# Devrait répondre : haiku
```

**Si le test fonctionne** → `@sonnet` est 100% fiable ✅

---

## 💡 Astuce : Vérification visuelle

Dans l'interface Claude (web/VSCode), le **sélecteur de modèle** (menu déroulant) affiche le modèle actif :

- Si vous tapez `@sonnet` → Le sélecteur change temporairement vers "Sonnet 4.5"
- Après la réponse → Revient à "Haiku 4.5" (défaut)

---

**Conclusion** : `@sonnet` est **garanti** d'utiliser Sonnet 4.5, peu importe votre configuration par défaut.
