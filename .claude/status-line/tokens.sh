#!/bin/bash

# Claude Code Status Line - Version avec tokens fonctionnels
# Affiche : répertoire • modèle • tokens/contexte (%) • coût

# Lire JSON depuis stdin
json_input=$(cat)

# Parser JSON principal
cwd=$(echo "$json_input" | jq -r '.workspace.current_dir // "~"')
model=$(echo "$json_input" | jq -r '.model.display_name // "Unknown"')
cost=$(echo "$json_input" | jq -r '.cost.total_cost_usd // 0')
transcript_path=$(echo "$json_input" | jq -r '.transcript_path // ""')

# Variables de contexte
max_tokens=200000
total_tokens=0

# Si le transcript existe, extraire les tokens
if [ -f "$transcript_path" ]; then
    # Lire la dernière entrée avec usage (skip sidechains et erreurs)
    last_usage=$(jq 'select(.message.usage and .isSidechain != true and .isApiErrorMessage != true) | .message.usage' "$transcript_path" 2>/dev/null | tail -1)

    if [ -n "$last_usage" ]; then
        input_tokens=$(echo "$last_usage" | jq '.input_tokens // 0')
        output_tokens=$(echo "$last_usage" | jq '.output_tokens // 0')
        cache_read=$(echo "$last_usage" | jq '.cache_read_input_tokens // 0')
        cache_created=$(echo "$last_usage" | jq '.cache_creation_input_tokens // 0')

        # Total = input + output + cache
        total_tokens=$((input_tokens + output_tokens + cache_read + cache_created))
    fi
fi

# Calculer pourcentage de contexte
percentage=0
if [ "$max_tokens" -gt 0 ] && [ "$total_tokens" -gt 0 ]; then
    percentage=$((total_tokens * 100 / max_tokens))
fi

# Nom du répertoire (basename)
dir_name=$(basename "$cwd")

# Couleurs ANSI
GRAY='\033[0;90m'
LIGHT_GRAY='\033[0;37m'
YELLOW='\033[1;33m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RESET='\033[0m'

# Couleur pour tokens selon pourcentage
if [ "$percentage" -lt 50 ]; then
    token_color="$GREEN"
    token_emoji="✅"
elif [ "$percentage" -lt 75 ]; then
    token_color="$CYAN"
    token_emoji="⚡"
elif [ "$percentage" -lt 90 ]; then
    token_color="$ORANGE"
    token_emoji="⚠️"
else
    token_color="$RED"
    token_emoji="🔴"
fi

# Couleur pour coût (utiliser awk au lieu de bc pour compatibilité)
cost_formatted=$(printf "%.3f" "$cost")
if awk -v cost="$cost" 'BEGIN { exit (cost < 0.01) ? 0 : 1 }'; then
    cost_color="$GREEN"
    cost_emoji="💚"
elif awk -v cost="$cost" 'BEGIN { exit (cost < 0.05) ? 0 : 1 }'; then
    cost_color="$CYAN"
    cost_emoji="💙"
elif awk -v cost="$cost" 'BEGIN { exit (cost < 0.10) ? 0 : 1 }'; then
    cost_color="$ORANGE"
    cost_emoji="💛"
else
    cost_color="$RED"
    cost_emoji="❤️"
fi

# Afficher status line formatée
echo -e "${LIGHT_GRAY}📂 ${dir_name} ${GRAY}• ${LIGHT_GRAY}🤖 ${model} ${GRAY}• ${token_color}${token_emoji} ${total_tokens}/${max_tokens} (${percentage}%)${GRAY} • ${cost_color}${cost_emoji} \$${cost_formatted}${RESET}"
echo ""