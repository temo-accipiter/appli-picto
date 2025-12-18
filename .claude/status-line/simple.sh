#!/bin/bash

# Claude Code Status Line - Simple version
# Affiche : répertoire courant • tokens utilisés/total (pourcentage)

# Lire JSON depuis stdin
json_input=$(cat)

# Parser avec jq
cwd=$(echo "$json_input" | jq -r '.workspace.current_dir // "~"')
transcript_path=$(echo "$json_input" | jq -r '.transcript_path // ""')

# Variables
max_tokens=200000
total_tokens=0

# Si le transcript existe, extraire les tokens
if [ -f "$transcript_path" ]; then
    last_usage=$(jq 'select(.message.usage and .isSidechain != true and .isApiErrorMessage != true) | .message.usage' "$transcript_path" 2>/dev/null | tail -1)

    if [ -n "$last_usage" ]; then
        input_tokens=$(echo "$last_usage" | jq '.input_tokens // 0')
        output_tokens=$(echo "$last_usage" | jq '.output_tokens // 0')
        cache_read=$(echo "$last_usage" | jq '.cache_read_input_tokens // 0')
        cache_created=$(echo "$last_usage" | jq '.cache_creation_input_tokens // 0')

        total_tokens=$((input_tokens + output_tokens + cache_read + cache_created))
    fi
fi

# Calculer pourcentage
percentage=0
if [ "$max_tokens" -gt 0 ] && [ "$total_tokens" -gt 0 ]; then
    percentage=$((total_tokens * 100 / max_tokens))
fi

# Nom du répertoire (basename)
dir_name=$(basename "$cwd")

# Couleurs ANSI
GRAY='\033[0;90m'
LIGHT_GRAY='\033[0;37m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
GREEN='\033[0;32m'
RESET='\033[0m'

# Déterminer couleur selon pourcentage
if [ "$percentage" -lt 50 ]; then
    color="$GREEN"
    emoji="✅"
elif [ "$percentage" -lt 80 ]; then
    color="$YELLOW"
    emoji="⚡"
else
    color="$RED"
    emoji="🔴"
fi

# Afficher status line
echo -e "${LIGHT_GRAY}📂 ${dir_name} ${GRAY}• ${color}${emoji} ${total_tokens}/${max_tokens} tokens (${percentage}%)${RESET}"
echo ""