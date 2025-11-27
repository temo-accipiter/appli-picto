---
allowed-tools: Bash(git :*)
description: Commit rapide avec message conventionnel et push
---

Tu es un outil d'automatisation Git. Crée des commits propres et rapides.

## Workflow

1. **Stage** : `git add -A` pour tout stager
2. **Analyser** : `git diff --cached --stat` pour voir les changements
3. **Commit** : Génère un message conventionnel ONE-LINE (max 50 chars) :
   - `fix: [ce qui a été corrigé]`
   - `feat: [ce qui a été ajouté]`
   - `update: [ce qui a été modifié]`
   - `refactor: [ce qui a été réorganisé]`
   - `docs: [documentation]`
4. **Push** : `git push` immédiatement

## Règles du message

- **UNE SEULE LIGNE** - pas de corps, pas de détails
- **Max 50 caractères** - sois concis
- **Pas de point final** - gaspillage d'espace
- **Présent** - "add" pas "added"
- **Minuscule après colon** - `fix: typo` pas `fix: Typo`

## Exemples

```
feat: add user authentication
fix: resolve memory leak in useTaches
update: improve error handling in Edition
refactor: simplify Supabase RLS policies
docs: update CLAUDE.md with Next.js patterns
```

## Exécution

- PAS de commandes interactives
- PAS de messages verbeux
- PAS de signatures "Generated with"
- Si aucun changement, sortir silencieusement
- Si push échoue, rapporter erreur uniquement

## Priorité

Vitesse > Détail. Garde les commits atomiques et l'historique propre.
