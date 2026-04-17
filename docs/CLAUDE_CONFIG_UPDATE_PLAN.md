# Plan de mise à jour `.claude/` — Appli-Picto (exécution autonome)

> **Destinataire** : Claude Code CLI — exécution **autonome** sans validations intermédiaires.
> **Objectif** : Aligner la structure `.claude/` sur les best practices officielles Anthropic, optimiser le contexte chargé, réduire la consommation de tokens.
> **Autorité** : L'utilisateur a autorisé l'exécution complète sans demande de confirmation par itération.
> **Posture** : chaque itération doit être (1) auditée read-only d'abord, (2) modifiée, (3) committée atomiquement avec un message conventionnel. Rollback possible par `git revert` d'une itération.

---

## 0. Règles du jeu

### 0.1 État initial

Déjà nettoyé par l'utilisateur :
- ✅ `.claude/README.md` supprimé
- ✅ `.claude/AGENTS_TEST_GUIDE.md` supprimé

### 0.2 Principes directeurs — NE PAS DÉVIER

1. **Audit read-only AVANT modification** pour chaque phase. Tu exécutes les `grep`/`find`/`wc` de l'itération, tu affiches le résultat, puis tu modifies.
2. **Atomicité git** : un commit par itération, message conventionnel `chore(claude): iter N - <description>`.
3. **Zéro modification fonctionnelle** : aucun changement dans `src/`, `supabase/`, `tests/`. Seuls `.claude/`, `docs/`, `.gitignore` peuvent être modifiés.
4. **Conventions Anthropic officielles** :
   - Skills : kebab-case, `SKILL.md` exact (case-sensitive), **pas de `README.md`** dans le dossier
   - Rules : fichiers .md dans `.claude/rules/`, frontmatter `paths:` pour chargement conditionnel
   - Agents : frontmatter avec `name`, `description`, optionnellement `tools`, `model`, `memory`, `color`
   - Agent-memory : `.claude/agent-memory/<agent-name>/` (déjà correct)
   - Hooks : scripts dans `.claude/scripts/` référencés depuis `settings.json`
5. **Langue** : commentaires et nouveaux contenus en français.
6. **Préservation** : aucun contenu ne doit être perdu. Vérifier par comparaison `wc -l` avant/après aux endroits critiques.

### 0.3 Décisions prises par l'utilisateur (pas besoin de redemander)

- `playwright-config.json` → déplacer à la racine du projet
- `playwright-screenshots/` → supprimer (dossier d'output jetable) + ajouter au `.gitignore`
- Progressive disclosure dans skills → **faire seulement si** SKILL.md > 200 lignes, sinon ne pas fractionner
- `admin-architecture.md` → **Option A** : ajouter un disclaimer "non-authoritaire" en tête. Ne PAS promouvoir vers `docs/` automatiquement.

### 0.4 En cas de problème imprévu

Si un script échoue, un fichier a un contenu inattendu, ou une modification casserait l'intégrité :
- **NE PAS FORCER**. Arrête l'itération en cours.
- Logue clairement ce qui a échoué et pourquoi.
- Passe à l'itération suivante si elle est indépendante, sinon arrête et rapporte.

---

## Itération 1 — Audit initial (READ-ONLY, aucun commit)

### 1.1 Structure actuelle

```bash
echo "=== Fichiers supprimés confirmés ==="
test ! -f .claude/README.md && echo "OK README.md absent" || echo "PROBLEME README.md encore présent"
test ! -f .claude/AGENTS_TEST_GUIDE.md && echo "OK AGENTS_TEST_GUIDE.md absent" || echo "PROBLEME AGENTS_TEST_GUIDE.md encore présent"

echo
echo "=== Arborescence ==="
find .claude -maxdepth 3 -type f | sort
```

### 1.2 Audit frontmatter des rules

```bash
echo "=== Frontmatter actuel des rules ==="
for f in .claude/rules/*.md; do
  echo "--- $f ---"
  head -10 "$f"
  echo
done
```

### 1.3 Audit skills (conformité Anthropic)

```bash
echo "=== Conformité skills ==="
for dir in .claude/skills/*/; do
  echo "--- $dir ---"
  ls -la "$dir"
  test -f "$dir/SKILL.md" && echo "OK SKILL.md" || echo "PROBLEME SKILL.md manquant"
  test -f "$dir/README.md" && echo "PROBLEME README.md interdit dans skill" || echo "OK pas de README.md"
done
```

### 1.4 Audit agents (frontmatter complet)

```bash
echo "=== Frontmatter agents ==="
for f in .claude/agents/*.md; do
  echo "--- $f ---"
  head -10 "$f"
  echo
done
```

### 1.5 Audit tailles

```bash
echo "=== Tailles fichiers critiques ==="
wc -l CLAUDE.md
wc -l .claude/skills/*/SKILL.md
wc -l .claude/rules/*.md
wc -l .claude/output-styles/*.md
find .claude/agent-memory -name "*.md" -exec wc -l {} +
```

### 1.6 Rapport de fin d'itération 1

Synthétise dans un rapport bref :
- Nombre de fichiers par dossier `.claude/`
- Rules ayant déjà un frontmatter `paths:` (si aucun, c'est normal, itération 3 va les ajouter)
- Skills ≥ 200 lignes (candidats à progressive disclosure en itération 5)
- `CLAUDE.md` racine en nombre de lignes

**Aucun commit pour cette itération** (read-only).

---

## Itération 2 — Déplacements hors de `.claude/`

**Commit final** : `chore(claude): iter 2 - move playwright config and screenshots out of .claude/`

### 2.1 Déplacer `playwright-config.json` à la racine

```bash
# Audit
test -f .claude/playwright-config.json && echo "Source présente"
test -f playwright.config.ts && echo "ATTENTION playwright.config.ts existe déjà à la racine"
test -f playwright.config.js && echo "ATTENTION playwright.config.js existe déjà à la racine"
test -f playwright-config.json && echo "ATTENTION playwright-config.json existe déjà à la racine"
```

**Action** :
- Si un autre `playwright.config.*` existe déjà à la racine : lire les deux, fusionner si nécessaire ou choisir de supprimer la copie `.claude/playwright-config.json`. Logger clairement la décision prise.
- Sinon : `git mv .claude/playwright-config.json ./playwright-config.json`

### 2.2 Supprimer `playwright-screenshots/`

```bash
# Audit
ls .claude/playwright-screenshots/ 2>/dev/null | head -20
find .claude/playwright-screenshots -type f -mtime -7 2>/dev/null | head
```

**Action** :
- Si des fichiers ont été modifiés récemment (< 7 jours) : arrêter, logger, passer à 2.3 sans supprimer
- Sinon : `rm -rf .claude/playwright-screenshots/`

### 2.3 Mettre à jour `.gitignore`

```bash
# Ajouter sans dupliquer
for line in ".claude/settings.local.json" ".claude/.edit-count" ".claude/playwright-screenshots/"; do
  grep -Fxq "$line" .gitignore || echo "$line" >> .gitignore
done
```

Si une section "# Claude Code" existe déjà dans `.gitignore`, déplacer les 3 lignes dessous pour garder une structure propre.

### 2.4 Vérification d'acceptation

```bash
test ! -f .claude/playwright-config.json && echo "OK playwright-config.json déplacé"
test ! -d .claude/playwright-screenshots && echo "OK playwright-screenshots supprimé"
grep -q "^\.claude/\.edit-count$" .gitignore && echo "OK .edit-count gitignored"
grep -q "^\.claude/settings\.local\.json$" .gitignore && echo "OK settings.local.json gitignored"
```

**Commit** `chore(claude): iter 2 - move playwright config and screenshots out of .claude/`

---

## Itération 3 — Optimiser `rules/` avec frontmatter `paths:`

**Commit final** : `chore(claude): iter 3 - add paths: frontmatter to rules for conditional loading`

**Impact critique** : c'est l'itération la plus rentable en tokens. Chaque règle va se charger seulement quand Claude travaille sur des fichiers matchants, au lieu de systématiquement.

### 3.1 Règle absolue

**Préserver 100% du contenu existant.** Ajouter UNIQUEMENT le bloc frontmatter YAML en haut. Si un frontmatter existe déjà, ajouter la clé `paths:` dedans sans écraser les autres clés.

### 3.2 Plan par fichier

Pour chaque fichier, appliquer le frontmatter indiqué :

**`.claude/rules/app-router.md`**
```yaml
---
paths:
  - "src/app/**/*.{ts,tsx}"
  - "middleware.ts"
---
```

**`.claude/rules/components.md`**
```yaml
---
paths:
  - "src/components/**/*.{ts,tsx,scss}"
  - "src/page-components/**/*.{ts,tsx,scss}"
---
```

**`.claude/rules/migrations.md`**
```yaml
---
paths:
  - "supabase/migrations/**/*.sql"
  - "supabase/schema.sql"
---
```

**`.claude/rules/performance.md`**
```yaml
---
paths:
  - "src/**/*.{ts,tsx}"
  - "next.config.*"
---
```

**`.claude/rules/security.md`**
```yaml
---
paths:
  - "supabase/migrations/**/*.sql"
  - "src/hooks/**/*.ts"
  - "middleware.ts"
  - "supabase/functions/**/*.ts"
---
```

**`.claude/rules/supabase-hooks.md`**
```yaml
---
paths:
  - "src/hooks/**/*.ts"
  - "src/hooks/**/*.tsx"
---
```

### 3.3 Procédure d'insertion

Pour chaque fichier :
1. Lire la première ligne
2. Si la première ligne est `---` : frontmatter existant. Insérer `paths:` dans le bloc existant sans casser les autres clés
3. Sinon : préfixer le fichier avec le bloc complet `---\npaths:\n  - ...\n---\n\n`

Utiliser un script Python ou awk/sed pour garantir l'atomicité. Faire un backup `.bak` avant modification, le supprimer après vérification.

### 3.4 Vérification d'acceptation

```bash
echo "=== Vérification frontmatter paths: ==="
for f in .claude/rules/*.md; do
  if head -5 "$f" | grep -q "^paths:"; then
    echo "OK $f"
  else
    echo "PROBLEME $f manque paths:"
  fi
done

echo
echo "=== Contenu préservé ==="
wc -l .claude/rules/*.md
```

Vérifier que chaque fichier a gagné un nombre de lignes cohérent avec le frontmatter ajouté (entre 4 et 8 lignes selon les chemins).

**Commit** `chore(claude): iter 3 - add paths: frontmatter to rules for conditional loading`

---

## Itération 4 — Cross-références rules ↔ skills ↔ agents

**Commit final** : `chore(claude): iter 4 - add cross-references between rules, skills, and agents`

### 4.1 Vérifier redondance `rules/supabase-hooks.md` ↔ `skills/db-first-frontend/SKILL.md`

```bash
echo "=== Comparaison de contenu ==="
echo "--- rules/supabase-hooks.md ---"
cat .claude/rules/supabase-hooks.md
echo
echo "--- skills/db-first-frontend/SKILL.md (extract) ---"
head -80 .claude/skills/db-first-frontend/SKILL.md
```

**Action** :
- Si `rules/supabase-hooks.md` contient des infos uniques (AbortController, patterns hooks custom spécifiques à Appli-Picto, isAbortLike, etc.) qui ne sont **pas** dans le skill : **préserver ces infos**. Ajouter juste une section "Voir aussi" en fin de fichier pointant vers le skill.
- Si `rules/supabase-hooks.md` est redondant à 90%+ avec le skill : le réécrire comme résumé court (10-15 lignes) qui renvoie vers le skill, en préservant les patterns uniques Appli-Picto.

**Structure cible si refactor complet** (sous le frontmatter déjà ajouté en itération 3) :
```markdown
# Hooks Supabase — règles actives sur `src/hooks/`

Pour le contrat complet, voir le skill `db-first-frontend` (`.claude/skills/db-first-frontend/SKILL.md`).

## Rappels rapides applicables ici

- Aucune query Supabase directe : toujours via un hook custom.
- AbortController obligatoire dans chaque `useEffect` avec fetch.
- Import `isAbortLike` depuis `@/hooks/_net`.
- Fallback sécurisé sur erreur réseau, jamais bloquer l'utilisateur.
- Erreur DB → toast non technique, pas de leak d'erreur brute.

Pour les Red Flags et la Rationalization Table, voir le skill.
```

### 4.2 Vérifier `rules/security.md` ↔ `agents/security-reviewer.md`

```bash
echo "--- rules/security.md ---"
head -40 .claude/rules/security.md
echo
echo "--- agents/security-reviewer.md ---"
head -40 .claude/agents/security-reviewer.md
```

**Action** : Si `rules/security.md` ne référence pas l'agent, ajouter une section en fin :
```markdown

## Pour un audit approfondi

Pour une review sécurité complète sur un diff, invoquer `@security-reviewer`.
```

### 4.3 Vérifier références obsolètes dans `agents/typescript-reviewer.md`

```bash
grep -n "typescript-patterns" .claude/agents/typescript-reviewer.md
grep -r "typescript-patterns" .claude/ docs/ 2>/dev/null
```

**Action** : Si `typescript-patterns` n'existe nulle part comme skill :
- Supprimer ou reformuler la section "Reference" en fin de `agents/typescript-reviewer.md` qui y fait allusion
- Remplacer par une référence aux vrais skills du projet : skill `db-first-frontend`, rule `app-router.md`

### 4.4 Dédoublonnage léger `output-styles/appli-picto-guide.md` ↔ `skills/tsa-ux-rules`

```bash
echo "--- Sections TSA/Mobile-First dans output-style ---"
awk '/TSA|MOBILE-FIRST/,/^---$|^##/' .claude/output-styles/appli-picto-guide.md | head -50
echo
echo "--- skill tsa-ux-rules ---"
cat .claude/skills/tsa-ux-rules/SKILL.md
```

**Action conditionnelle** :
- **Si** les sections "♿ PRIORITÉ MENTALE TSA" et "📱 MOBILE-FIRST" de l'output-style contiennent des règles de domaine (≥ 0.3s, cibles tactiles 44px, etc.) également présentes dans `tsa-ux-rules` SKILL.md : **raccourcir** ces sections à 2-3 lignes qui renvoient au skill.
- **Sinon** (les sections ne portent que des règles de ton/style de communication) : ne rien changer.

**Important** : garder TOUT ce qui est propre au style de réponse (ton pédagogique, langue française, structure 6 étapes). Ne déplacer que les règles de domaine métier si elles sont dupliquées.

**Commit** `chore(claude): iter 4 - add cross-references between rules, skills, and agents`

---

## Itération 5 — Progressive disclosure dans les skills (conditionnel)

**Commit final** (seulement si action effectuée) : `chore(claude): iter 5 - progressive disclosure in oversized skills`

### 5.1 Déclencheur

```bash
echo "=== Skills à fractionner (> 200 lignes) ==="
for f in .claude/skills/*/SKILL.md; do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 200 ]; then
    echo "$f : $lines lignes — candidat"
  else
    echo "$f : $lines lignes — OK"
  fi
done
```

### 5.2 Règle stricte

**Ne fractionner QUE les skills > 200 lignes.** En dessous, la complexité ajoutée ne vaut pas le gain. Si aucun skill ne dépasse 200 lignes : **sauter cette itération** (pas de commit).

### 5.3 Procédure si fractionnement nécessaire

Pour chaque skill > 200 lignes :

1. Créer `.claude/skills/<skill-name>/references/`
2. Identifier les sections "détail" vs "essentiel" :
   - **Essentiel (reste dans SKILL.md)** : Iron Law, Red Flags, Gate Functions, Core Principles, Absolute Prohibitions
   - **Détail (vers references/)** : tables d'exemples longs, rationalization tables, listes d'erreurs, inventaires
3. Déplacer les sections détail vers des fichiers dédiés :
   - `references/rationalization.md`
   - `references/error-patterns.md`
   - `references/examples.md`
4. Dans SKILL.md, ajouter une section en fin :
```markdown
## References

Pour les détails approfondis :
- `references/rationalization.md` — table des excuses et contre-arguments
- `references/error-patterns.md` — patterns d'erreurs détaillés
```

### 5.4 Vérification

```bash
# Total lignes doit rester cohérent (même contenu, juste redistribué)
for dir in .claude/skills/*/; do
  total=$(find "$dir" -name "*.md" -exec cat {} + | wc -l)
  echo "$dir : $total lignes totales"
done
```

Aucun contenu ne doit être perdu. Si une vérification échoue, rollback immédiat.

**Commit** `chore(claude): iter 5 - progressive disclosure in oversized skills` (seulement si au moins un skill a été fractionné)

---

## Itération 6 — Gouvernance `agent-memory/` + CLAUDE.md racine

**Commit final** : `chore(claude): iter 6 - agent-memory governance in CLAUDE.md`

### 6.1 Ajouter la gouvernance dans `CLAUDE.md` racine

Vérifier d'abord la taille :
```bash
wc -l CLAUDE.md
```

Ajouter la section suivante à la fin de `CLAUDE.md`, **AVANT** la ligne `**Mise à jour** : ...` si elle existe :

```markdown
## 🧠 Gouvernance agent-memory

`.claude/agent-memory/` contient des notes d'exploration des sub-agents (`explore-codebase`, `typescript-reviewer`).

**Statut** : éphémère, non-authoritatif.

**Règles** :
- Les sub-agents peuvent y écrire librement.
- `docs/` reste la **seule source de vérité** pour l'architecture et les contrats.
- Un apprentissage qui devient stable doit être **promu manuellement** vers `docs/` (ex : `docs/PLATFORM.md`).
- `agent-memory/` peut être nettoyé à tout moment sans perte critique.
```

Mettre à jour la ligne `**Mise à jour** : AAAA-MM-JJ` avec la date du jour.

**Contrainte** : après ajout, `wc -l CLAUDE.md` doit rester ≤ 200.
- Si dépassement : extraire la nouvelle section dans `.claude/rules/agent-memory-governance.md` avec un frontmatter vide `paths: []` (chargement inconditionnel) et remplacer dans CLAUDE.md par un import : `Voir @.claude/rules/agent-memory-governance.md`.

### 6.2 Disclaimer sur `admin-architecture.md` (Option A choisie)

Ajouter en tête du fichier `.claude/agent-memory/explore-codebase/admin-architecture.md`, juste après le bloc frontmatter `---` existant et avant le titre `#` :

```markdown
> ⚠️ **Non-authoritaire** — Ce fichier est une exploration générée par `@explore-codebase`. Pour la source de vérité sur l'architecture admin, consulter `docs/PLATFORM.md` et `docs/FRONTEND_CONTRACT.md`. Ce fichier peut diverger de la réalité au fil du temps.
```

### 6.3 Vérification

```bash
wc -l CLAUDE.md  # ≤ 200 lignes
grep -q "Gouvernance agent-memory" CLAUDE.md && echo "OK section ajoutée"
grep -q "Non-authoritaire" .claude/agent-memory/explore-codebase/admin-architecture.md && echo "OK disclaimer ajouté"
```

**Commit** `chore(claude): iter 6 - agent-memory governance in CLAUDE.md`

---

## Itération 7 — Vérification finale + doc humaine

**Commit final** : `chore(claude): iter 7 - post-migration verification and setup docs`

### 7.1 Audit complet post-migration

```bash
echo "=== Structure finale ==="
find .claude -maxdepth 3 -type f | sort

echo
echo "=== Tailles ==="
wc -l CLAUDE.md
wc -l .claude/skills/*/SKILL.md
wc -l .claude/rules/*.md

echo
echo "=== Conformité skills ==="
for dir in .claude/skills/*/; do
  test -f "$dir/SKILL.md" && echo "OK $dir" || echo "PROBLEME $dir manque SKILL.md"
  test -f "$dir/README.md" && echo "PROBLEME $dir a README.md interdit"
done

echo
echo "=== Conformité rules (paths: présent) ==="
for f in .claude/rules/*.md; do
  head -5 "$f" | grep -q "^paths:" && echo "OK $f" || echo "ATTENTION $f sans paths: (chargé systématiquement)"
done

echo
echo "=== Conformité agents (name + description) ==="
for f in .claude/agents/*.md; do
  has_name=$(head -5 "$f" | grep -c "^name:")
  has_desc=$(head -5 "$f" | grep -c "^description:")
  if [ "$has_name" -eq 1 ] && [ "$has_desc" -eq 1 ]; then
    echo "OK $f"
  else
    echo "PROBLEME $f frontmatter incomplet"
  fi
done
```

### 7.2 Créer `docs/CLAUDE_CODE_SETUP.md`

**Important** : ce fichier va dans `docs/`, **PAS dans `.claude/`**. Il est destiné aux humains qui veulent comprendre la config, pas chargé dans le contexte Claude.

Contenu :

```markdown
# Configuration Claude Code — Appli-Picto

Documentation humaine de la structure `.claude/` du projet. Claude Code n'a pas besoin de lire ce fichier — il est destiné aux développeurs qui veulent comprendre ou modifier la config.

## Structure

```
CLAUDE.md                     # Racine projet (règles transverses critiques)
.claude/
├── agent-memory/             # Notes d'exploration des sub-agents (éphémère)
├── agents/                   # Sub-agents personnalisés (invoqués par @nom)
├── commands/                 # Commandes custom (/nom)
├── output-styles/            # Styles de réponse (ton, format, persona)
├── rules/                    # Règles auto-chargées par glob de fichiers
├── scripts/                  # Scripts shell référencés par les hooks
├── skills/                   # Expertise de domaine chargée à la demande
├── settings.json             # Config projet (versionné)
└── settings.local.json       # Config perso (gitignored)
```

## Différences conceptuelles

| Mécanisme | Chargement | Cas d'usage |
|---|---|---|
| **CLAUDE.md racine** | À chaque session | Règles transverses critiques (stack, workflow, architecture) |
| **rules/** | Auto selon `paths:` glob | Règles techniques par type de fichier (SCSS, migrations, hooks) |
| **skills/** | Quand Claude juge pertinent | Expertise de domaine (DB-first, TSA, tokens SCSS) |
| **agents/** | Invoqué explicitement (`@nom`) | Review spécialisée (sécurité, TypeScript, SCSS refactor) |
| **commands/** | Invoqué explicitement (`/nom`) | Workflows packagés (verify-quick, debug, supabase-migrate) |
| **output-styles/** | Configuré dans `settings.json` | Persona / ton / structure de réponse (transverse) |
| **agent-memory/** | Lu/écrit par les sub-agents | Notes éphémères, NON-AUTHORITATIVES |

## Différence rules vs skills vs output-styles

- Un **output-style** contrôle **comment** Claude répond (ton, format, langue). Il est transverse.
- Un **skill** contrôle **quelle expertise** Claude applique. Il est contextuel.
- Une **rule** contrôle **quelles conventions techniques** s'appliquent sur certains fichiers. Elle est glob-dépendante.

## Ajouter une nouvelle règle

1. Déterminer le type :
   - Ton/format/persona → `output-styles/`
   - Règle technique par type de fichier → `rules/<nom>.md` avec `paths:` frontmatter
   - Expertise métier → `skills/<nom>/SKILL.md`
   - Workflow à invoquer → `commands/<nom>.md`
   - Review spécialisée → `agents/<nom>.md`
2. Respecter le format Anthropic (kebab-case pour skills, frontmatter YAML, **pas de README.md** dans un dossier skill).
3. Tester avec `/memory` dans Claude Code pour vérifier le chargement.

## Gouvernance agent-memory

Voir section dédiée dans `CLAUDE.md` racine.

## Références officielles Anthropic

- Skills : https://docs.claude.com/en/docs/claude-code/skills
- Rules : https://code.claude.com/docs/claude-code/rules
- Sub-agents : https://code.claude.com/docs/claude-code/sub-agents
- Hooks : https://code.claude.com/docs/claude-code/hooks
- Best Practices : https://code.claude.com/docs/claude-code/best-practices
```

### 7.3 Vérification

```bash
test -f docs/CLAUDE_CODE_SETUP.md && echo "OK doc humaine créée"
```

**Commit** `chore(claude): iter 7 - post-migration verification and setup docs`

---

## Ordre d'exécution final

| Itération | Commit | Risque | Rollback |
|-----------|--------|--------|----------|
| 1 | (aucun, read-only) | Nul | N/A |
| 2 | `iter 2 - move playwright ...` | Faible | `git revert` |
| 3 | `iter 3 - add paths: frontmatter ...` | Faible | `git revert` |
| 4 | `iter 4 - add cross-references ...` | Moyen | `git revert` |
| 5 | `iter 5 - progressive disclosure ...` (conditionnel) | Moyen | `git revert` |
| 6 | `iter 6 - agent-memory governance ...` | Faible | `git revert` |
| 7 | `iter 7 - post-migration verification ...` | Nul | `git revert` |

## Ce qui NE DOIT PAS être modifié

- ❌ `.claude/settings.json` (hooks fonctionnels)
- ❌ `.claude/commands/*.md`
- ❌ `.claude/output-styles/appli-picto-guide.md` (sauf dédoublonnage très léger en itération 4.4)
- ❌ `.claude/scripts/*.sh`
- ❌ `src/`, `supabase/`, `tests/`
- ❌ `docs/*.md` existants (seule création : `docs/CLAUDE_CODE_SETUP.md`)

## Modèles recommandés pour l'exécution

- Itérations 1, 2, 7 : `/model haiku` + `/effort low` (mécanique)
- Itérations 3, 5, 6 : `/model sonnet` + `/effort medium` (parsing/décisions)
- Itération 4 : `/model sonnet` + `/effort medium` (décisions de dédoublonnage)

## Rapport final attendu

À la fin des 7 itérations, produire un rapport résumant :
- Fichiers déplacés / supprimés / modifiés (par itération)
- Rules ayant reçu un frontmatter `paths:` (liste)
- Skills fractionnés (s'il y en a)
- Tailles finales : `CLAUDE.md`, chaque `SKILL.md`, chaque rule
- Toute divergence non-prévue rencontrée et comment elle a été gérée
- Liste des 7 commits effectués (ou 6 si itération 5 sautée)

---

**Exécution** : linéaire, itérations dans l'ordre, un commit par itération, pas de demande de validation à l'utilisateur sauf en cas de problème imprévu (voir §0.4).
