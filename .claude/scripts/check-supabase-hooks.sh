#!/bin/bash
# Script de vérification architecture hooks Supabase pour Appli-Picto
# Détecte les queries Supabase directes interdites

set -e

echo "🗄️ Vérification architecture hooks Supabase..."

# Compteur d'erreurs
errors=0

# Patterns interdits (queries Supabase directes)
# Note: supabase.auth est autorisé (Login/Signup légitimes)
forbidden_patterns=(
  "supabase\.from\("
  "supabase\.storage\.from\("
)

# Hooks custom autorisés
allowed_hooks=(
  "useTaches"
  "useTachesEdition"
  "useTachesDnd"
  "useRecompenses"
  "useCategories"
  "useParametres"
  "useAuth"
)

# Fichiers à exclure (utilitaires qui PEUVENT utiliser supabase directement)
exclude_files=(
  "src/utils/supabaseClient"
  "src/hooks/"
  "src/contexts/"
)

# Chercher tous les fichiers TSX/TS dans src (sauf hooks et utils)
while IFS= read -r file; do
  # Exclure les fichiers autorisés
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

  # Chercher patterns interdits
  for pattern in "${forbidden_patterns[@]}"; do
    if grep -n "$pattern" "$file" 2>/dev/null | grep -v "// @ts-ignore" | grep -v "// eslint-disable" > /dev/null; then
      line_number=$(grep -n "$pattern" "$file" | head -1 | cut -d: -f1)
      echo "❌ ERREUR: Query Supabase directe dans $file:$line_number"
      echo "   → Utiliser hooks custom au lieu de query directe"
      errors=$((errors + 1))
    fi
  done
done < <(find src/components src/page-components -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null)

if [ $errors -gt 0 ]; then
  echo ""
  echo "❌ $errors query/queries Supabase directe(s) détectée(s)"
  echo ""
  echo "📖 Règle architecture Appli-Picto :"
  echo "   TOUJOURS utiliser hooks custom, JAMAIS query Supabase directe"
  echo ""
  echo "✅ Hooks disponibles :"
  for hook in "${allowed_hooks[@]}"; do
    echo "   - $hook()"
  done
  echo ""
  echo "✅ Exemple correct (hook custom) :"
  echo "   import { useTaches } from '@/hooks'"
  echo "   const { taches, loading } = useTaches()"
  echo ""
  echo "❌ Exemple interdit (query directe) :"
  echo "   const { data } = await supabase.from('taches').select()"
  exit 1
fi

echo "✅ Tous les composants utilisent hooks custom (pas de query directe)"
exit 0