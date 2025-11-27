#!/bin/bash

# Claude Code Status Line - Simple version
# Affiche : répertoire courant • tokens utilisés/total (pourcentage)

# Lire JSON depuis stdin
json_input=$(cat)

# Parser avec jq (préinstallé sur macOS)
cwd=$(echo "$json_input" | jq -r '.workspace.current_dir // "~"')
tokens=$(echo "$json_input" | jq -r '.context_summary.total_tokens // 0')
max_tokens=200000

# Calculer pourcentage
if [ "$max_tokens" -gt 0 ]; then
    percentage=$((tokens * 100 / max_tokens))
else
    percentage=0
fi

# Nom du répertoire (basename)
dir_name=$(basename "$cwd")

# Couleurs ANSI
GRAY='\033[0;90m'
LIGHT_GRAY='\033[0;37m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

# Déterminer couleur selon pourcentage
if [ "$percentage" -lt 50 ]; then
    color="$LIGHT_GRAY"
elif [ "$percentage" -lt 80 ]; then
    color="$YELLOW"
else
    color="$RED"
fi

# Afficher status line
echo -e "${LIGHT_GRAY}📂 ${dir_name} ${GRAY}• ${color}🔢 ${tokens}/${max_tokens} tokens (${percentage}%)${RESET}"
echo ""
