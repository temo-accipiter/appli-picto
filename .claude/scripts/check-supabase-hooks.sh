#!/bin/bash
# Script de vérification architecture hooks Supabase pour Appli-Picto
# Détecte les queries Supabase directes interdites dans les composants
# Format JSON deny — bloque réellement l'écriture si violation détectée

errors=0
violation_list=""

# Patterns interdits (queries Supabase directes)
# Note: supabase.auth est autorisé (Login/Signup légitimes)
forbidden_patterns=(
  "supabase\.from\("
  "supabase\.storage\.from\("
)

# Fichiers à exclure (utilitaires qui PEUVENT utiliser supabase directement)
exclude_files=(
  "src/utils/supabaseClient"
  "src/hooks/"
  "src/contexts/"
)

# Chercher dans composants et page-components
while IFS= read -r file; do
  skip=false
  for exclude in "${exclude_files[@]}"; do
    if [[ "$file" == *"$exclude"* ]]; then
      skip=true
      break
    fi
  done

  if [ "$skip" = true ]; then
    continue
  fi

  for pattern in "${forbidden_patterns[@]}"; do
    if grep -n "$pattern" "$file" 2>/dev/null | grep -v "// @ts-ignore" | grep -v "// eslint-disable" > /dev/null; then
      line_number=$(grep -n "$pattern" "$file" | head -1 | cut -d: -f1)
      violation_list="${violation_list}  - ${file}:${line_number}\n"
      errors=$((errors + 1))
    fi
  done
done < <(find src/components src/page-components -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null)

if [ $errors -gt 0 ]; then
  reason=$(printf "❌ %d query/queries Supabase directe(s) détectée(s) dans les composants :\n%s\nRègle DB-First : toujours utiliser les hooks custom depuis @/hooks.\nListe complète des hooks disponibles : src/hooks/CLAUDE.md" \
    "$errors" "$violation_list")
  jq -n --arg r "$reason" '{"decision": "block", "reason": $r}'
  exit 0
fi

exit 0
