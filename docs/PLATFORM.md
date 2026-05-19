# PLATFORM.md — Outillage et dépendances de développement

Guide des outils de développement, leurs versions pinnées, et les procédures de mise à jour.

---

## Supabase CLI

### Version pinnée

Le CLI Supabase est installé comme `devDependency` dans `package.json` :

```json
"supabase": "2.98.2"
```

**Pourquoi une version exacte (sans `^`) ?**  
`pnpm context:update` régénère `supabase/schema.sql` et `src/types/supabase.ts`. Si deux développeurs ou deux environnements utilisent des versions différentes du CLI, les fichiers générés divergent et produisent des commits parasites. Pinner la version garantit un `schema.sql` identique pour tous.

### Après `pnpm install`

Le CLI est automatiquement disponible via `pnpm exec supabase` ou simplement `supabase` dans les scripts pnpm (il est dans `node_modules/.bin/`).

### Mettre à jour le CLI

1. Choisir la nouvelle version cible sur [github.com/supabase/cli/releases](https://github.com/supabase/cli/releases).

2. Mettre à jour `package.json` :

   ```bash
   pnpm add -D -E supabase@X.Y.Z   # -E = exact, sans ^
   ```

3. Vérifier que le CLI fonctionne :

   ```bash
   supabase --version
   ```

4. Régénérer les fichiers de contexte et vérifier qu'ils sont stables :

   ```bash
   pnpm supabase:start --ignore-health-check
   pnpm context:update
   git diff supabase/schema.sql src/types/supabase.ts
   ```

5. Si le diff est vide (ou uniquement lié à la version du CLI), commiter :

   ```bash
   git add package.json pnpm-lock.yaml supabase/schema.sql src/types/supabase.ts
   git commit -m "chore(tooling): mettre à jour Supabase CLI de X.Y.Z vers A.B.C"
   ```

6. Mettre à jour ce fichier avec la nouvelle version.

> ⚠️ Ne jamais mettre à jour le CLI isolément sans régénérer `schema.sql` et `supabase.ts` dans le même commit. Les deux fichiers doivent toujours être cohérents avec la version du CLI.

---

## Node.js

Géré par **Volta** (configuration dans `package.json`) :

```json
"volta": {
  "node": "20.19.4"
}
```

Volta sélectionne automatiquement la bonne version de Node.js quand on entre dans le répertoire. Aucune action manuelle requise.

---

## pnpm

Version fixée dans `package.json` :

```json
"packageManager": "pnpm@9.15.0"
```

Corepack (inclus dans Node.js ≥ 16.10) lit ce champ et utilise automatiquement la bonne version.

---

_Dernière mise à jour : 2026-05-19 — TICKET-002 résolu (pin Supabase CLI v2.98.2)_
