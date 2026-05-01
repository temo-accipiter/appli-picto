#!/usr/bin/env bash
# .claude/scripts/check-inline-styles.sh
# Détecte les style={{ avec valeurs CSS hardcodées dans les fichiers TSX/TS
# Déclenché en PostToolUse après chaque édition de fichier .tsx/.ts
# Advisory uniquement (exit 0) — non bloquant

FILE="$1"

# Ne traiter que les fichiers TSX/TS
if [[ ! "$FILE" =~ \.(tsx|ts)$ ]]; then
  exit 0
fi

# Patterns interdits : px/rem/% hardcodés, hex, rgb dans style={{
# On exclut les CSS custom properties (--ma-var) qui sont le pattern autorisé
VIOLATIONS=$(grep -n 'style={{' "$FILE" \
  | grep -E '(:[[:space:]]*['\''"][0-9]+(px|rem|%)|#[0-9a-fA-F]{3,6}|rgb\(|rgba\()' \
  | grep -v "'\''--[a-z]")

if [[ -n "$VIOLATIONS" ]]; then
  echo ""
  echo "⚠️  CSS inline détecté dans $FILE :"
  echo "$VIOLATIONS"
  echo ""
  echo "→ Valeurs hardcodées interdites dans style={{ }}"
  echo "→ Pour valeurs dynamiques, utiliser une CSS custom property :"
  echo "   style={{ '--ma-var': \`\${value}px\` } as React.CSSProperties}"
  echo "→ Consommer via var(--ma-var) dans le .scss correspondant"
  echo ""
fi

exit 0