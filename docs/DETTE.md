# Dettes techniques — Appli-Picto

**Dernière mise à jour** : 2026-05-16

Ce fichier centralise les tickets de dette technique du projet.
Les tickets fonctionnels (features) sont dans `BACKLOG.md`.

---

## Tickets ouverts

### DETTE-001 — Réviser le hook pre-commit

**Problème** : `pnpm vitest run` est exécuté dans le hook pre-commit, ce qui ralentit chaque commit. Il devrait être déplacé vers un hook pre-push (ou délégué à la CI Vercel).

**Effort estimé** : 1–2h
**Priorité** : Moyenne (post-commercialisation acceptable, bénéfice immédiat sur la productivité)

**Action** : Refacto `.claude/scripts/pre-commit.sh` + création `.husky/pre-push`.
**Dépendance** : Vérifier que la CI Vercel exécute `pnpm test` sur push avant de supprimer le filet pre-commit.

---

## Tickets fermés

### DETTE-002 — Test Tableau flaky ✅

**Fermé le** : 2026-05-15
**Commit** : `dad8b45` — `fix(test/tableau): ajouter timeout explicite à waitFor (5000ms)`
**Rapport** : `docs/audits/DETTE_002_DONE.md`

### DETTE-003 — Nettoyage commentaires et JSDoc post-migration motion ✅

**Fermé le** : 2026-05-15
**Commit** : `dd1436e` — `chore(motion): nettoyer commentaires et JSDoc post-migration v1.0`

### DETTE-004 — Handlers MSW manquants pour les tables Tableau ✅

**Fermé le** : 2026-05-15
**Commit** : `6b0f455` — `test(msw): ajouter handlers pour tables Tableau (DETTE-004)`

### DETTE-005 — Handlers MSW résiduels + URL Supabase mal alignée en tests ✅

**Fermé le** : 2026-05-15
**Commit** : `bd8964b` — `test(msw): aligner URL Supabase tests + handler WebSocket Realtime (DETTE-005)`
**Rapport** : `docs/audits/DETTE_005_DONE.md`
