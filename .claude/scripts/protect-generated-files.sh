#!/bin/bash
# Script de protection des fichiers générés automatiquement pour Appli-Picto
# Bloque toute tentative de modification manuelle

set -e

# Lire l'input JSON depuis stdin
INPUT=$(cat)

# Extraire le chemin du fichier
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Si pas de file_path, autoriser (pas un Write/Edit)
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Liste des fichiers protégés (générés automatiquement)
PROTECTED_FILES=(
  "src/types/supabase.ts"
  "supabase/schema.sql"
)

# Vérifier si le fichier est protégé
for protected in "${PROTECTED_FILES[@]}"; do
  if [[ "$FILE_PATH" == *"$protected"* ]]; then
    # Fichier protégé détecté - bloquer l'opération
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "❌ Fichier généré automatiquement - modification manuelle interdite\n\nCe fichier est généré par :\n  • src/types/supabase.ts → pnpm db:types\n  • supabase/schema.sql → pnpm db:dump\n\nPour mettre à jour :\n  1. Modifier la migration Supabase dans supabase/migrations/\n  2. Appliquer la migration : pnpm supabase:reset\n  3. Régénérer les types : pnpm context:update"
      }
    }'
    exit 0
  fi
done

# Fichier non protégé - autoriser l'opération
exit 0
