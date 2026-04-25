#!/bin/bash
# Script de vérification Mobile-First pour Appli-Picto
# Détecte les @media (max-width: ...) interdits (desktop-first)

set -e

echo "📱 Vérification Mobile-First dans fichiers SCSS..."

# Compteur d'erreurs
errors=0

# Fichiers exclus (desktop-only, non prioritaires)
EXCLUDED_FILES=(
  "src/page-components/admin-permissions/AdminPermissions.scss"  # Page admin desktop-only
)

# Chercher tous les fichiers SCSS
while IFS= read -r file; do
  # Vérifier si le fichier est dans la liste d'exclusion
  skip=false
  for excluded in "${EXCLUDED_FILES[@]}"; do
    if [[ "$file" == "$excluded" ]]; then
      skip=true
      break
    fi
  done

  # Skip si exclu
  if [ "$skip" = true ]; then
    continue
  fi

  # Chercher @media avec max-width (desktop-first interdit)
  # Exclure les commentaires SassDoc (///) et les commentaires simples (//)
  matches=$(grep -n "@media.*max-width" "$file" 2>/dev/null | grep -vE "^\s*[0-9]+:\s*///" | grep -vE "^\s*[0-9]+:\s*//" || true)
  if [ -n "$matches" ]; then
    echo "❌ ERREUR: Desktop-first détecté dans $file"
    echo "$matches"
    echo "   → Remplacer @media (max-width: ...) par @media (min-width: ...)"
    echo "   → Appli-Picto est Mobile-First (tablette/smartphone prioritaires)"
    errors=$((errors + 1))
  fi
done < <(find src -type f -name "*.scss" 2>/dev/null)

if [ $errors -gt 0 ]; then
  echo ""
  echo "❌ $errors fichier(s) avec desktop-first détecté(s)"
  echo ""
  echo "📖 Règle Mobile-First Appli-Picto :"
  echo "   TOUJOURS utiliser @media (min-width: ...) pour mobile-first"
  echo ""
  echo "✅ Exemple correct (mobile-first) :"
  echo "   .button {"
  echo "     padding: 12px;  // Mobile par défaut"
  echo "     @media (min-width: 768px) {"
  echo "       padding: 20px;  // Tablette"
  echo "     }"
  echo "   }"
  echo ""
  echo "❌ Exemple interdit (desktop-first) :"
  echo "   .button {"
  echo "     padding: 20px;  // Desktop par défaut"
  echo "     @media (max-width: 768px) {  // ❌ max-width interdit"
  echo "       padding: 12px;"
  echo "     }"
  echo "   }"
  exit 1
fi

echo "✅ Tous les fichiers SCSS utilisent mobile-first (min-width)"
exit 0
