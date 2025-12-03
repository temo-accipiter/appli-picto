#!/bin/bash

# Script de debug pour diagnostiquer le problème de tokens

# Lire JSON depuis stdin
json_input=$(cat)

# Parser JSON principal
transcript_path=$(echo "$json_input" | jq -r '.transcript_path // ""')

echo "═══════════════════════════════════════════════════════════"
echo "🔍 DEBUG TOKENS - Diagnostic complet"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📂 Transcript path: $transcript_path"
echo ""

# Vérifier si le fichier existe
if [ ! -f "$transcript_path" ]; then
    echo "❌ ERREUR: Le fichier transcript n'existe pas !"
    echo ""
    exit 0
fi

echo "✅ Fichier transcript existe"
echo ""

# Afficher taille du fichier
file_size=$(wc -c < "$transcript_path" 2>/dev/null)
echo "📏 Taille du fichier: $file_size bytes"
echo ""

# Compter nombre de lignes
line_count=$(wc -l < "$transcript_path" 2>/dev/null)
echo "📊 Nombre de lignes: $line_count"
echo ""

# Afficher première ligne (pour voir le format)
echo "🔍 Première ligne du transcript:"
echo "---"
head -n 1 "$transcript_path" 2>/dev/null | jq '.' 2>/dev/null || head -n 1 "$transcript_path"
echo "---"
echo ""

# Chercher toutes les entrées avec .message.usage
echo "🔍 Recherche entrées avec .message.usage..."
entries_with_usage=$(jq 'select(.message.usage)' "$transcript_path" 2>/dev/null | wc -l)
echo "📊 Nombre d'entrées avec usage: $entries_with_usage"
echo ""

# Afficher dernière entrée avec usage
echo "🔍 Dernière entrée avec .message.usage:"
echo "---"
last_entry=$(jq 'select(.message.usage and .isSidechain != true and .isApiErrorMessage != true)' "$transcript_path" 2>/dev/null | tail -n 1)
echo "$last_entry" | jq '.' 2>/dev/null || echo "❌ Aucune entrée trouvée"
echo "---"
echo ""

# Extraire les tokens si disponibles
if [ -n "$last_entry" ]; then
    input_tokens=$(echo "$last_entry" | jq '.message.usage.input_tokens // 0')
    output_tokens=$(echo "$last_entry" | jq '.message.usage.output_tokens // 0')
    cache_read=$(echo "$last_entry" | jq '.message.usage.cache_read_input_tokens // 0')
    cache_created=$(echo "$last_entry" | jq '.message.usage.cache_creation_input_tokens // 0')

    echo "📊 Tokens extraits:"
    echo "   Input tokens: $input_tokens"
    echo "   Output tokens: $output_tokens"
    echo "   Cache read: $cache_read"
    echo "   Cache created: $cache_created"
    echo "   Total: $((input_tokens + output_tokens + cache_read + cache_created))"
else
    echo "❌ Impossible d'extraire les tokens"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
