# Agent Skills — Guide complet

Guide optimisé pour créer des skills efficaces avec Claude Code et l'API Claude.

---

## Table des matières

1. [Qu'est-ce qu'un Skill ?](#quest-ce-quun-skill)
2. [Architecture et fonctionnement](#architecture-et-fonctionnement)
3. [Structure d'un Skill](#structure-dun-skill)
4. [Best Practices](#best-practices)
5. [Patterns communs](#patterns-communs)
6. [Progressive Disclosure](#progressive-disclosure)
7. [Skills avec code exécutable](#skills-avec-code-exécutable)
8. [Skills vs autres features](#skills-vs-autres-features)
9. [Partage et distribution](#partage-et-distribution)
10. [Troubleshooting](#troubleshooting)

---

## Qu'est-ce qu'un Skill ?

**Agent Skills** sont des capacités modulaires réutilisables qui étendent les fonctionnalités de Claude avec des instructions, métadonnées, et ressources (scripts, templates) que Claude utilise automatiquement quand pertinent.

### Pourquoi utiliser des Skills ?

- **Spécialiser Claude** : Adapter les capacités pour des tâches spécifiques
- **Réduire la répétition** : Créer une fois, utiliser automatiquement
- **Composer des capacités** : Combiner des Skills pour des workflows complexes

### Quand créer un Skill ?

**Règle simple** : Si tu répètes la même explication à Claude plusieurs fois → c'est un Skill.

**Exemples d'usage** :

- Standards de code review de ton équipe
- Formats de commit messages préférés
- Guidelines de marque organisation
- Templates de documentation
- Checklists de debugging pour frameworks spécifiques

---

## Architecture et fonctionnement

### Les 3 niveaux de chargement (Progressive Disclosure)

Skills utilisent un chargement progressif pour optimiser le contexte :

| Niveau                     | Quand chargé            | Coût tokens       | Contenu                                   |
| -------------------------- | ----------------------- | ----------------- | ----------------------------------------- |
| **Niveau 1: Metadata**     | Toujours (au démarrage) | ~100 tokens/skill | `name` + `description` (YAML frontmatter) |
| **Niveau 2: Instructions** | Quand skill activé      | <5k tokens        | Corps de SKILL.md                         |
| **Niveau 3: Resources**    | À la demande            | Illimité          | Fichiers référencés (bash, sans contexte) |

### Comment Claude accède aux Skills

1. **Au démarrage** : Charge uniquement `name` et `description` de tous les skills
2. **Matching sémantique** : Compare ta requête aux descriptions
3. **Confirmation** : Te demande confirmation avant de charger le skill complet
4. **Chargement** : Lit SKILL.md via bash (entre dans le contexte)
5. **Ressources** : Lit fichiers référencés ou exécute scripts à la demande

**Avantage** : Tu peux avoir 100+ skills installés sans pénalité de contexte.

---

## Structure d'un Skill

### Fichiers requis

```
ton-skill/
├── SKILL.md              # Requis : instructions principales
├── REFERENCE.md          # Optionnel : documentation détaillée
├── EXAMPLES.md           # Optionnel : exemples
└── scripts/              # Optionnel : scripts utilitaires
    └── validate.py
```

### Format SKILL.md

```yaml
---
name: ton-skill-name
description: Description concise de ce que fait le skill et quand l'utiliser
allowed-tools: Read, Grep, Glob, Bash  # Optionnel : restreindre les outils
model: sonnet  # Optionnel : forcer un modèle
---

# Nom du Skill

## Instructions

Instructions claires étape par étape pour Claude.

## Exemples

Exemples concrets d'utilisation.
```

### Champs requis

**`name`** :

- Maximum 64 caractères
- Minuscules, chiffres, tirets uniquement
- Pas de mots réservés : "anthropic", "claude"
- Pas de XML tags

**`description`** :

- Non vide, maximum 1024 caractères
- Pas de XML tags
- **Doit inclure** : ce que fait le skill **ET** quand l'utiliser

---

## Best Practices

### 1. La concision est clé

**Principe par défaut** : Claude est déjà très intelligent.

N'ajoute que le contexte que Claude n'a pas déjà.

**✅ Bon (concis, 50 tokens)** :

````markdown
## Extraire texte PDF

Utilise pdfplumber pour l'extraction :

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

````

**❌ Mauvais (verbeux, 150 tokens)** :
```markdown
## Extraire texte PDF

Les fichiers PDF (Portable Document Format) sont un format commun qui contient
du texte, des images et autre contenu. Pour extraire du texte d'un PDF, tu dois
utiliser une librairie. Il y a beaucoup de librairies disponibles mais pdfplumber
est recommandé car facile à utiliser et gère la plupart des cas...
````

### 2. Descriptions efficaces

**Une bonne description répond à 2 questions** :

1. Que fait le skill ?
2. Quand l'utiliser ?

**✅ Bon** :

```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**❌ Mauvais** :

```yaml
description: Helps with documents
```

**⚠️ Toujours en 3ème personne** (injecté dans system prompt) :

- ✅ "Processes Excel files and generates reports"
- ❌ "I can help you process Excel files"
- ❌ "You can use this to process Excel files"

### 3. Degrés de liberté appropriés

**Haute liberté** (instructions textuelles) :

- Plusieurs approches valides
- Décisions dépendent du contexte

```markdown
## Code review process

1. Analyze code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability
4. Verify adherence to project conventions
```

**Liberté moyenne** (pseudocode avec paramètres) :

- Pattern préféré existe
- Variation acceptable

````markdown
## Generate report

Use this template and customize as needed:

```python
def generate_report(data, format="markdown", include_charts=True):
    # Process data
    # Generate output in specified format
```
````

**Basse liberté** (scripts spécifiques) :

- Opérations fragiles
- Consistance critique

````markdown
## Database migration

Run exactly this script:

```bash
python scripts/migrate.py --verify --backup
```
````

Do not modify the command or add flags.

### 4. Tester avec tous les modèles cibles

Skills agissent comme des extensions de modèles → l'efficacité dépend du modèle.

- **Claude Haiku** : A-t-il assez de guidance ?
- **Claude Sonnet** : Instructions claires et efficaces ?
- **Claude Opus** : Éviter sur-explication ?

### 5. Conventions de nommage

**Forme gérondive recommandée** (verbe + -ing) :

- `processing-pdfs`
- `analyzing-spreadsheets`
- `managing-databases`
- `testing-code`

**Alternatives acceptables** :

- Groupes nominaux : `pdf-processing`, `spreadsheet-analysis`
- Action-oriented : `process-pdfs`, `analyze-spreadsheets`

**❌ Éviter** :

- Noms vagues : `helper`, `utils`, `tools`
- Trop générique : `documents`, `data`, `files`
- Mots réservés : `anthropic-helper`, `claude-tools`

---

## Progressive Disclosure

### Principe

Garde SKILL.md comme overview qui pointe vers matériaux détaillés.

**Règle** : SKILL.md < 500 lignes. Au-delà → fichiers séparés.

### Pattern 1 : Guide avec références

````markdown
# PDF Processing

## Quick start

Extract text with pdfplumber:

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

## Advanced features

**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
**Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns

Claude charge FORMS.md, REFERENCE.md ou EXAMPLES.md **seulement quand nécessaire**.

### Pattern 2 : Organisation par domaine

Pour skills multi-domaines, organise par domaine pour éviter chargement contexte non pertinent.

```
bigquery-skill/
├── SKILL.md (overview et navigation)
└── reference/
    ├── finance.md (revenue, billing)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

````markdown
# BigQuery Data Analysis

## Available datasets

**Finance**: Revenue, ARR, billing → See [reference/finance.md](reference/finance.md)
**Sales**: Opportunities, pipeline → See [reference/sales.md](reference/sales.md)
**Product**: API usage, features → See [reference/product.md](reference/product.md)
**Marketing**: Campaigns, attribution → See [reference/marketing.md](reference/marketing.md)

## Quick search

```bash
grep -i "revenue" reference/finance.md
grep -i "pipeline" reference/sales.md
```
````

### ⚠️ Éviter références imbriquées

**❌ Mauvais (trop profond)** :

```
SKILL.md → advanced.md → details.md → info réelle
```

**✅ Bon (1 niveau)** :

```
SKILL.md → advanced.md
SKILL.md → reference.md
SKILL.md → examples.md
```

### Table des matières pour gros fichiers

Pour fichiers de référence > 100 lignes, inclure table des matières en haut.

```markdown
# API Reference

## Contents

- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features (batch operations, webhooks)
- Error handling patterns
- Code examples

## Authentication and setup

...
```

---

## Patterns communs

### Workflows pour tâches complexes

Décompose opérations complexes en étapes séquentielles claires.

**Pattern checklist** (pour workflows sans code) :

```markdown
## Research synthesis workflow

Copy this checklist and track your progress:
```

Research Progress:

- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
- [ ] Step 3: Cross-reference claims
- [ ] Step 4: Create structured summary
- [ ] Step 5: Verify citations

```

**Step 1: Read all source documents**

Review each document in sources/ directory. Note main arguments and evidence.

**Step 2: Identify key themes**

Look for patterns across sources. Where do sources agree or disagree?

...
```

**Pattern checklist** (pour workflows avec code) :

```markdown
## PDF form filling workflow

Copy this checklist:
```

Task Progress:

- [ ] Step 1: Analyze form (run analyze_form.py)
- [ ] Step 2: Create field mapping (edit fields.json)
- [ ] Step 3: Validate mapping (run validate_fields.py)
- [ ] Step 4: Fill form (run fill_form.py)
- [ ] Step 5: Verify output (run verify_output.py)

```

**Step 1: Analyze the form**

Run: `python scripts/analyze_form.py input.pdf`

This extracts form fields and saves to fields.json.

**Step 2: Create field mapping**

Edit fields.json to add values for each field.

...
```

### Feedback loops

**Pattern : Exécute validator → corrige erreurs → répète**

**Exemple (sans code)** :

```markdown
## Content review process

1. Draft content following STYLE_GUIDE.md
2. Review against checklist:
   - Check terminology consistency
   - Verify examples follow format
   - Confirm all required sections present
3. If issues found:
   - Note each issue with section reference
   - Revise content
   - Review checklist again
4. Only proceed when all requirements met
5. Finalize and save document
```

**Exemple (avec code)** :

```markdown
## Document editing process

1. Make edits to `word/document.xml`
2. **Validate immediately**: `python ooxml/scripts/validate.py unpacked_dir/`
3. If validation fails:
   - Review error message carefully
   - Fix issues in XML
   - Run validation again
4. **Only proceed when validation passes**
5. Rebuild: `python ooxml/scripts/pack.py unpacked_dir/ output.docx`
6. Test output document
```

### Templates

**Pour exigences strictes** :

````markdown
## Report structure

ALWAYS use this exact template:

```markdown
# [Analysis Title]

## Executive summary

[One-paragraph overview]

## Key findings

- Finding 1 with supporting data
- Finding 2 with supporting data

## Recommendations

1. Specific actionable recommendation
2. Specific actionable recommendation
```
````

````

**Pour guidance flexible** :
```markdown
## Report structure

Sensible default format, use judgment:

```markdown
# [Analysis Title]

## Executive summary

[Overview]

## Key findings

[Adapt sections based on what you discover]
````

Adjust sections as needed.

````

### Exemples input/output

Pour skills où qualité dépend d'exemples :

```markdown
## Commit message format

Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output:

````

feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware

```

**Example 2:**
Input: Fixed bug where dates displayed incorrectly
Output:

```

fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation

```

Follow this style: type(scope): brief description, then detailed explanation.
```

### Workflow conditionnel

```markdown
## Document modification workflow

1. Determine modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Use docx-js library
   - Build document from scratch
   - Export to .docx format

3. Editing workflow:
   - Unpack existing document
   - Modify XML directly
   - Validate after each change
   - Repack when complete
```

---

## Skills avec code exécutable

### Résoudre, ne pas déléguer

**✅ Bon** : Gérer erreurs explicitement

```python
def process_file(path):
    """Process file, creating it if doesn't exist."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"File {path} not found, creating default")
        with open(path, "w") as f:
            f.write("")
        return ""
    except PermissionError:
        print(f"Cannot access {path}, using default")
        return ""
```

**❌ Mauvais** : Déléguer à Claude

```python
def process_file(path):
    # Just fail and let Claude figure it out
    return open(path).read()
```

### Scripts utilitaires

**Avantages** :

- Plus fiables que code généré
- Économie de tokens (pas de code en contexte)
- Économie de temps (pas de génération)
- Consistance garantie

**Important** : Clarifier dans instructions si Claude doit :

- **Exécuter le script** (le plus commun) : "Run `analyze_form.py` to extract fields"
- **Le lire comme référence** (pour logique complexe) : "See `analyze_form.py` for extraction algorithm"

**Exemple** :

````markdown
## Utility scripts

**analyze_form.py**: Extract all form fields from PDF

```bash
python scripts/analyze_form.py input.pdf > fields.json
```
````

Output format:

```json
{
  "field_name": { "type": "text", "x": 100, "y": 200 },
  "signature": { "type": "sig", "x": 150, "y": 500 }
}
```

**validate_boxes.py**: Check for overlapping bounding boxes

```bash
python scripts/validate_boxes.py fields.json
# Returns: "OK" or lists conflicts
```

### Analyse visuelle

Quand inputs peuvent être rendus en images :

````markdown
## Form layout analysis

1. Convert PDF to images:

   ```bash
   python scripts/pdf_to_images.py form.pdf
   ```
````

2. Analyze each page image to identify form fields
3. Claude can see field locations and types visually

### Outputs intermédiaires vérifiables

Pattern "plan-validate-execute" pour tâches complexes :

**Pourquoi ce pattern marche** :

- Catch errors early : Validation trouve problèmes avant application
- Machine-verifiable : Scripts fournissent vérification objective
- Reversible planning : Claude peut itérer sur plan sans toucher originaux
- Clear debugging : Messages d'erreur pointent problèmes spécifiques

**Quand utiliser** : Batch operations, changements destructifs, règles de validation complexes, opérations high-stakes.

### Dépendances packages

**claude.ai** : Peut installer packages npm/PyPI et pull GitHub repos
**Claude API** : Pas d'accès réseau, pas d'installation runtime

Liste packages requis dans SKILL.md et vérifie disponibilité dans [documentation code execution tool](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/code-execution-tool).

### Environnement runtime

**Comment Claude accède aux Skills** :

1. Metadata pre-loaded au démarrage
2. Fichiers lus à la demande via bash Read tools
3. Scripts exécutés efficacement via bash (output uniquement en contexte)
4. Pas de pénalité contexte pour gros fichiers (jusqu'à lecture effective)

**Implications pour authoring** :

- Chemins fichiers importent : utilise forward slashes (`reference/guide.md`)
- Nomme fichiers descriptifs : `form_validation_rules.md`, pas `doc2.md`
- Organise pour découverte : structure par domaine/feature
- Bundle ressources complètes : docs API, exemples, datasets (pas de pénalité)
- Préfère scripts pour opérations déterministes
- Clarifie intent d'exécution : "Run X" vs "See X for algorithm"

---

## Skills vs autres features

### CLAUDE.md vs Skills

**CLAUDE.md** :

- Chargé dans **chaque conversation**, toujours
- Usage : Standards projet always-on, contraintes, préférences framework

**Skills** :

- Chargé **à la demande** quand matching requête
- Usage : Expertise task-specific, connaissance pertinente parfois, procédures détaillées

### Subagents vs Skills

**Skills** :

- Ajoutent connaissance à **conversation actuelle**
- Instructions rejoignent contexte existant

**Subagents** :

- Exécutent dans **contexte séparé**
- Reçoivent tâche, travaillent indépendamment, retournent résultats

**Utilise Subagents quand** :

- Délégation tâche à contexte d'exécution séparé
- Accès outils différent de conversation principale
- Isolation entre travail délégué et contexte principal

**Utilise Skills quand** :

- Améliorer connaissance Claude pour tâche actuelle
- Expertise s'applique tout au long d'une conversation

### Hooks vs Skills

**Hooks** :

- Event-driven : se déclenchent sur événements
- Usage : Opérations sur chaque save, validation avant tool calls, side effects automatiques

**Skills** :

- Request-driven : activés selon requête
- Usage : Connaissance informant gestion requêtes, guidelines affectant raisonnement

### Mise en commun

Setup typique :

- **CLAUDE.md** : Standards projet always-on
- **Skills** : Expertise task-specific chargée à la demande
- **Hooks** : Opérations automatisées déclenchées par événements
- **Subagents** : Contextes d'exécution isolés pour travail délégué
- **MCP servers** : Outils et intégrations externes

Chacun gère sa spécialité — combine-les au lieu de tout forcer dans skills.

---

## Partage et distribution

### 1. Commit dans repository

**Emplacement** : `.claude/skills/`

**Avantage** : Toute personne clonant le repo obtient les skills automatiquement.

**Usage** :

- Standards de code équipe
- Workflows projet-specific
- Skills référençant structure codebase

### 2. Plugins

**Création** : Dossier `skills/` dans projet plugin (structure similaire `.claude/`)

**Distribution** : Via marketplace

**Usage** : Skills non project-specific utiles à communauté large

### 3. Enterprise Managed Settings

**Déploiement** : Organization-wide via managed settings

**Priorité** : La plus haute (override personal/project/plugin)

**Configuration** :

```json
"strictKnownMarketplaces": [
  {
    "source": "github",
    "repo": "acme-corp/approved-plugins"
  },
  {
    "source": "npm",
    "package": "@acme-corp/compliance-plugins"
  }
]
```

**Usage** : Standards obligatoires, exigences sécurité, compliance, pratiques cohérentes org

### Skills et Subagents ⚠️

**IMPORTANT** : Subagents n'héritent PAS automatiquement des skills.

**Distinctions** :

- **Built-in agents** (Explorer, Plan, Verify) : **NE peuvent PAS accéder aux skills**
- **Custom subagents** (définis dans `.claude/agents`) : Peuvent utiliser skills **si listés explicitement**
- Skills chargés au **démarrage** du subagent, pas à la demande

**Créer custom subagent avec skills** :

Utilise `/agents` command dans Claude Code ou crée `.claude/agents/mon-agent.md` :

```yaml
---
name: frontend-reviewer
description: 'Review frontend code for accessibility...'
tools: Bash, Glob, Grep, Read, WebFetch, WebSearch, Skill
model: sonnet
color: blue
skills: accessibility-audit, performance-check
---
# Frontend Reviewer

Instructions pour ce subagent...
```

**Prérequis** : Skills doivent exister dans `.claude/skills/`

**Pattern efficace quand** :

- Délégation tâche isolée avec expertise spécifique
- Différents subagents nécessitent différents skills
- Enforcer standards dans travail délégué sans prompts

---

## Troubleshooting

### Skills Validator Tool

**Première étape** : Utilise [agent skills verifier](https://github.com/anthropics/agent-skills-verifier)

```bash
# Installation (via uv recommandé)
uv tool install agent-skills-verifier

# Utilisation
agent-skills-verifier ~/.claude/skills/ton-skill
```

Catch problèmes structurels avant debugging.

### Skill ne se déclenche pas

**Cause** : Presque toujours la description.

**Solutions** :

1. Vérifie description vs requêtes réelles
2. Ajoute trigger phrases utilisées vraiment
3. Teste variations : "help me profile this", "why is this slow?", "make this faster"
4. Si variation échoue → ajoute keywords à description

### Skill ne charge pas

**Vérifie structure** :

- ✅ SKILL.md doit être dans dossier nommé (pas à racine skills)
- ✅ Nom fichier exact : `SKILL.md` (SKILL en majuscules, .md minuscule)

**Debug** :

```bash
claude --debug
```

Regarde messages mentionnant ton skill name.

### Mauvais skill utilisé

**Cause** : Descriptions trop similaires.

**Solution** : Rends descriptions distinctes et spécifiques.

### Conflits de priorité

**Hiérarchie** : Enterprise > Personal > Project > Plugins

Si skill personnel ignoré, check si enterprise/higher-priority a même nom.

**Options** :

1. Renomme ton skill (plus facile)
2. Parle à admin du skill enterprise

### Plugin skills n'apparaissent pas

**Fix** :

1. Clear cache
2. Restart Claude Code
3. Reinstall plugin

Si toujours absent → structure plugin incorrecte (utilise validator).

### Erreurs runtime

**Causes communes** :

- **Dépendances manquantes** : Packages doivent être installés
- **Problèmes permissions** : Scripts nécessitent execute permission (`chmod +x`)
- **Path separators** : Utilise forward slashes partout (même Windows)

### Quick Troubleshooting Checklist

- [ ] Pas déclenché ? → Améliore description + ajoute trigger phrases
- [ ] Pas chargé ? → Vérifie path, nom fichier, syntaxe YAML
- [ ] Mauvais skill utilisé ? → Rends descriptions plus distinctes
- [ ] Shadowed ? → Check hiérarchie priorité et renomme si besoin
- [ ] Plugin skills manquants ? → Clear cache + reinstall
- [ ] Runtime failure ? → Check dependencies, permissions, paths

---

## Checklist finale

Avant partager un skill, vérifie :

### Qualité core

- [ ] Description spécifique avec termes clés
- [ ] Description inclut ce que fait le skill **ET** quand l'utiliser
- [ ] Corps SKILL.md < 500 lignes
- [ ] Détails additionnels dans fichiers séparés (si nécessaire)
- [ ] Pas d'info time-sensitive (ou section "old patterns")
- [ ] Terminologie consistante
- [ ] Exemples concrets, pas abstraits
- [ ] Références fichiers 1 niveau profond max
- [ ] Progressive disclosure utilisée appropriée
- [ ] Workflows avec étapes claires

### Code et scripts

- [ ] Scripts résolvent problèmes (pas délèguent à Claude)
- [ ] Gestion erreurs explicite et utile
- [ ] Pas de "voodoo constants" (valeurs justifiées)
- [ ] Packages requis listés et vérifiés disponibles
- [ ] Scripts avec doc claire
- [ ] Pas de paths Windows-style (forward slashes partout)
- [ ] Steps validation/vérification pour opérations critiques

---

## Développement itératif avec Claude

**Pattern le plus efficace** : Travailler avec Claude pour créer skills.

### Créer nouveau skill

1. **Complete tâche sans skill** : Travaille problème avec Claude A via prompting normal. Note ce que tu fournis répétitivement.

2. **Identifie pattern réutilisable** : Après tâche, identifie quel contexte serait utile pour tâches similaires futures.

3. **Demande à Claude A de créer skill** : "Create a Skill that captures this pattern we just used."

   💡 Claude comprend format Skill nativement — pas besoin de prompts spéciaux.

4. **Review concision** : Vérifie que Claude A n'a pas ajouté explications inutiles. "Remove explanation about what X means — Claude already knows that."

5. **Améliore architecture info** : "Organize this so table schema is in separate reference file."

6. **Teste sur tâches similaires** : Utilise skill avec Claude B (instance fraîche) sur cas d'usage liés.

7. **Itère selon observations** : Si Claude B struggle → retour Claude A avec spécifiques : "When Claude used this, it forgot to filter by date. Should we add section about date filtering?"

### Itérer sur skills existants

1. **Utilise skill dans workflows réels** : Donne à Claude B tâches réelles
2. **Observe comportement Claude B** : Note où il struggle, réussit, choix inattendus
3. **Retour Claude A pour améliorations** : Partage SKILL.md actuel + observations
4. **Review suggestions Claude A** : Peut suggérer réorganisation, langage plus fort, restructuration workflow
5. **Applique et teste changements** : Update skill, teste avec Claude B
6. **Répète selon usage** : Continue observe-refine-test cycle

**Pourquoi ça marche** : Claude A comprend besoins agent, tu fournis expertise domaine, Claude B révèle gaps via usage réel.

---

## Anti-patterns à éviter

### ❌ Paths Windows-style

- ✓ **Bon** : `scripts/helper.py`, `reference/guide.md`
- ✗ **Évite** : `scripts\\helper.py`, `reference\\guide.md`

### ❌ Trop d'options

**Mauvais** : "You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image, or..."

**Bon** : "Use pdfplumber for text extraction. For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."

### ❌ Info time-sensitive

**Mauvais** : "If you're doing this before August 2025, use old API."

**Bon** : Section "Old patterns" avec `<details>` collapsed.

### ❌ Terminologie inconsistente

**Bon - Consistent** :

- Toujours "API endpoint"
- Toujours "field"
- Toujours "extract"

**Mauvais - Inconsistent** :

- Mix "API endpoint", "URL", "API route", "path"
- Mix "field", "box", "element", "control"

---

## Évaluation et itération

### Build evaluations first

**Evaluation-driven development** :

1. **Identifie gaps** : Exécute Claude sur tâches représentatives sans skill. Documente échecs spécifiques.
2. **Crée évaluations** : Build 3 scénarios testant ces gaps.
3. **Établis baseline** : Mesure performance Claude sans skill.
4. **Écris instructions minimales** : Crée juste assez pour adresser gaps et passer évaluations.
5. **Itère** : Exécute évaluations, compare vs baseline, raffine.

**Structure évaluation** :

```json
{
  "skills": ["pdf-processing"],
  "query": "Extract all text from this PDF and save to output.txt",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "Successfully reads PDF using appropriate library",
    "Extracts text from all pages without missing any",
    "Saves to output.txt in clear, readable format"
  ]
}
```

### Observe navigation Skills

Pendant itération, attention à comment Claude utilise réellement skills :

- **Exploration paths inattendus** : Lit fichiers dans ordre non anticipé ? Structure pas intuitive.
- **Connexions manquées** : Échoue à suivre références ? Liens doivent être plus explicites/proéminents.
- **Sur-reliance sections** : Lit répétitivement même fichier ? Contenu devrait être dans SKILL.md main.
- **Contenu ignoré** : N'accède jamais fichier bundlé ? Inutile ou mal signalé.

Itère selon observations, pas assumptions.

---

**Ce guide contient tout l'essentiel pour créer des skills efficaces avec Claude.** 🚀
