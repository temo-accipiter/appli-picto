#!/bin/bash

# Debug script - Affiche le JSON brut reçu

# Lire JSON depuis stdin
json_input=$(cat)

# Sauvegarder dans un fichier pour inspection
echo "$json_input" > /tmp/claude-statusline-debug.json

# Afficher aussi dans la console
echo "📋 JSON reçu sauvegardé dans /tmp/claude-statusline-debug.json"
echo ""
echo "$json_input" | jq '.' 2>/dev/null || echo "$json_input"
echo ""
