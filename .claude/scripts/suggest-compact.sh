#!/bin/bash
# Hook pré-édition : Suggère /compact après N éditions
# Optimise l'utilisation du contexte Claude Code

set -e

# Fichier compteur (dans .claude pour persistence)
COUNTER_FILE="$CLAUDE_PROJECT_DIR/.claude/.edit-count"
THRESHOLD=15  # Suggérer /compact tous les 15 éditions

# Créer le fichier s'il n'existe pas
if [ ! -f "$COUNTER_FILE" ]; then
  echo "0" > "$COUNTER_FILE"
fi

# Lire le compteur actuel
COUNT=$(cat "$COUNTER_FILE")

# Incrémenter
NEW_COUNT=$((COUNT + 1))
echo "$NEW_COUNT" > "$COUNTER_FILE"

# Si on atteint le seuil, suggérer /compact
if [ $NEW_COUNT -ge $THRESHOLD ]; then
  echo "" >&2
  echo "💡 [Optimisation Context] $NEW_COUNT éditions effectuées" >&2
  echo "   → Envisager de compacter le contexte avec /compact" >&2
  echo "   → Cela réduira l'utilisation de tokens et améliorera les performances" >&2
  echo "" >&2

  # Reset le compteur
  echo "0" > "$COUNTER_FILE"
fi

# Toujours autoriser (exit 0)
exit 0
