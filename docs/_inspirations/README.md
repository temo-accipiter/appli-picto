# Inspirations visuelles — Référentiel ponctuel

> ⚠️ **STATUT : INSPIRATION ONLY — NON CONTRACTUEL**
>
> Les fichiers de ce dossier sont des supports d'inspiration ponctuels
> issus d'outils externes (Claude Design, Figma, captures de concurrents,
> moodboards). Ils ne constituent **JAMAIS** une source de vérité.

---

## Sources de vérité (par ordre de priorité)

Pour toute décision de design ou d'implémentation, consulter dans cet ordre :

1. `docs/CSS_ARCHITECTURE.md` — tokens disponibles, règles d'usage,
   palette sémantique, fonctions wrapper.
2. `docs/ux.md` — comportements UX, invariants TSA, contrats par contexte.
3. `src/styles/abstracts/` — code source des tokens (vérité ultime).
4. `docs/refonte_front/direction-visuelle-v1.1.md` — direction visuelle
   officielle.

**Les images de ce dossier ne remplacent JAMAIS ces sources.**

---

## Règles d'usage pour Claude (humain ou agent)

### ✅ Usage autorisé

- Inspiration de composition générale (hiérarchie, structure, proportions
  relatives).
- Discussion produit / arbitrage UX en amont d'un chantier.
- Référence éphémère pendant un chantier de redesign.

### ❌ Usage interdit

- Reproduire pixel-perfect les valeurs visibles (couleurs hex,
  espacements, radius). Toute valeur DOIT venir des tokens Sass.
- Citer ce dossier comme "spec" dans un commit ou une PR.
- Considérer ces fichiers comme à jour. Ils figent un instant T,
  pas le produit en cours.
- Supposer qu'une fonctionnalité visible ici est implémentée ou validée.

---

## Cycle de vie

- Une inspiration est **datée** dans son nom de fichier
  (`AAAA-MM-JJ_sujet.ext`).
- Une inspiration **expire après 6 mois** par défaut. Au-delà, elle doit
  être supprimée ou explicitement reclassée comme archive.
- Aucune inspiration ne doit accumuler plus de 5 fichiers ; au-delà, faire
  le tri.

---

## Inventaire actuel

| Date       | Fichier                                     | Sujet                      | Chantier associé       |
| ---------- | ------------------------------------------- | -------------------------- | ---------------------- |
| 2026-05-01 | `2026-05-01_card-tableau-claude-design.png` | Carte session Page Tableau | Redesign carte Tableau |

---

## Si tu doutes

Pose la question avant d'implémenter. Une inspiration mal interprétée
crée une dette visuelle silencieuse beaucoup plus coûteuse à corriger
qu'une question posée à temps.
