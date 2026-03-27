#!/bin/bash
# Hook post-édition : TypeScript check rapide
# Vérifie uniquement le fichier édité (pas tout le projet)

set -e

# Lire l'input JSON depuis stdin
INPUT=$(cat)

# Extraire le chemin du fichier édité
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Si pas de fichier ou pas TypeScript/JavaScript, skip
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Vérifier si c'est un fichier TS/TSX/JS/JSX
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

# Vérifier si le fichier existe
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# TypeScript check silencieux (exit 0 = pas d'erreur)
# On affiche seulement si erreurs trouvées
if ! pnpm tsc --noEmit "$FILE_PATH" 2>&1 | grep -q "error TS"; then
  exit 0
fi

# Si erreurs trouvées, afficher
echo "" >&2
echo "⚠️  [TypeScript] Erreurs détectées dans $FILE_PATH" >&2
echo "   → Exécuter: pnpm type-check" >&2
echo "" >&2

# Exit 0 (avertissement seulement, pas bloquant)
exit 0
