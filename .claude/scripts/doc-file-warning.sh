#!/bin/bash
# Hook pré-écriture : Avertit si création doc hors standards
# Évite la prolifération de docs non organisés

set -e

# Lire l'input JSON depuis stdin
INPUT=$(cat)

# Extraire le chemin du fichier
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Si pas de fichier, skip
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Vérifier si c'est un fichier .md
if ! echo "$FILE_PATH" | grep -qE '\.md$'; then
  exit 0
fi

# Répertoires standards autorisés pour docs
ALLOWED_DIRS=(
  "^docs/"
  "^VISITOR/"
  "^\.claude/"
  "^README\.md$"
  "^CHANGELOG\.md$"
  "^CONTRIBUTING\.md$"
  "^LICENSE\.md$"
)

# Vérifier si le fichier est dans un répertoire autorisé
for pattern in "${ALLOWED_DIRS[@]}"; do
  if echo "$FILE_PATH" | grep -qE "$pattern"; then
    exit 0
  fi
done

# Avertissement : doc hors standard
echo "" >&2
echo "⚠️  [Documentation] Fichier .md créé hors répertoires standards" >&2
echo "   Fichier: $FILE_PATH" >&2
echo "   Répertoires recommandés: docs/, VISITOR/, .claude/" >&2
echo "   → Envisager de déplacer dans un répertoire standard" >&2
echo "" >&2

# Exit 0 (avertissement seulement, pas bloquant)
exit 0
