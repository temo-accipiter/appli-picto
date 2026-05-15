# MOTION MIGRATION DONE — Rapport final

**Date** : 2026-05-15
**Branche** : `feature/re-design-edition`
**Commits** : `fb14909` → `9a25ff9` (7 lots atomiques) + `Lot 8` (nettoyage tokens)

---

## Résumé

Migration complète des easing non conformes à la doctrine motion v1.0.
Tous les call sites de `easing('smooth')`, `easing('ease-in-out')` et `easing('smooth-pop')` ont été classifiés et migrés. Les tokens correspondants ont été supprimés de `_tokens.scss`.

---

## Statistiques

| Token migré             | Call sites migrés | Vers `linear` | Vers `ease-out` |
| ----------------------- | ----------------- | ------------- | --------------- |
| `easing('smooth')`      | 67                | 55            | 12              |
| `easing('ease-in-out')` | 6                 | 5             | 1               |
| `easing('smooth-pop')`  | 2                 | 2             | 0               |
| **Total**               | **75**            | **62**        | **13**          |

---

## 8 lots atomiques — commits

| Lot | Commit        | Contenu                                                              |
| --- | ------------- | -------------------------------------------------------------------- |
| 1   | `fb14909`     | Boutons et liens — Cat. 1 high (15 call sites)                       |
| 2   | `44142e6`     | Formulaires et inputs — Cat. 1 high (11 call sites)                  |
| 3   | `0fe6b41`     | TimeTimer + FloatingTimeTimer — Cat. 1 + arbitrage Cat. 2 (11)       |
| 4   | `acbba31`     | Apparitions Cat. 2 — Select, Profil, Logs, Edition, Tableau (8)      |
| 5   | `3ddcc92`     | Cat. 1 medium + Cards/DnD/Cookie — arbitrages 3 et 4 (21)            |
| 6   | `c0cc41e`     | `ease-in-out` — mixins, GlobalLoader, SignedImage, ErrorBoundary (6) |
| 7   | `9a25ff9`     | Cat. 2/3 résiduels — Input, Select, Tableau, TimeTimer SVG (4)       |
| 8   | _(ce commit)_ | Suppression tokens + nettoyage docs                                  |

---

## Arbitrages (décisions Temo — mai 2026)

| #   | Fichier / contexte              | Décision                                                   |
| --- | ------------------------------- | ---------------------------------------------------------- |
| 1   | `Select.scss` — dropdown open   | `ease-out` (Cat. 2 — apparition dropdown)                  |
| 2   | `Select.scss` — dropdown closed | `ease-out` (Cat. 2 — disparition == apparition inversée)   |
| 3   | `TachesDnd.scss` — card hover   | `linear` + `timing('base')` (timing slow → base, anti-TSA) |
| 4   | `TachesDnd.scss` — drag overlay | `linear` (`smooth-pop` → linear, rotation+scale suffisent) |
| 5   | `TimeTimer.scss` — état sélec.  | `ease-out` (Cat. 2 — apparition d'état actif)              |
| 6   | `FloatingTimeTimer.scss`        | `linear` (feedback de saisie, Cat. 1)                      |

---

## Tokens supprimés de `_tokens.scss`

- `easing('smooth')` → `ease` — 67 usages migrés
- `easing('ease-in-out')` → `ease-in-out` — 6 usages migrés
- `easing('smooth-pop')` → `cubic-bezier(0.34, 1.56, 0.64, 1)` — 2 usages migrés

CSS vars supprimées de `_motion.scss` :

- `--easing-smooth`
- `--easing-smooth-in-out`

---

## Anomalies non traitées (hors scope)

| Code | Fichier            | Nature                                                                                      | Traitement                |
| ---- | ------------------ | ------------------------------------------------------------------------------------------- | ------------------------- |
| A1   | `_motion.scss:114` | Default `$easing-key: 'smooth'` dans mixin legacy `transition()` — jamais appelé            | À nettoyer ultérieurement |
| A2   | `_shadows.scss`    | Mixin `card-shadow-interactive` avec easing direct — migré dans Lot 2 (`_shadows.scss:278`) | ✅ Traité                 |
| A3   | `_forms.scss`      | Mixin form base — migré dans Lot 2 (`_forms.scss:221`)                                      | ✅ Traité                 |

---

## Vérification finale

```bash
# Zéro call site actif (hors commentaires et _motion.scss)
grep -rn "easing('smooth')\|easing('ease-in-out')\|easing('smooth-pop')" src/ --include="*.scss" \
  | grep -v "_motion.scss" | grep -v "_tokens.scss" | grep -v "^.*//.*easing"
# → (aucun résultat)
```

---

## Audit source

→ `docs/audits/MOTION_MIGRATION_AUDIT.md`
