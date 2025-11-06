#!/usr/bin/env bash
# Script de correction automatique des respond-to(xs)
# Transforme les mixins xs en styles de base (mobile-first)

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SRC_DIR="src"
BACKUP_DIR="backup-xs-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}🔧 Correction automatique des respond-to(xs)...${NC}\n"

# Vérifier si des fichiers sont affectés
affected_files=$(grep -Rl "@include[[:space:]]*respond-to.*[('\"]xs['\")]" "$SRC_DIR" --include="*.scss" || true)

if [[ -z "$affected_files" ]]; then
  echo -e "${GREEN}✅ Aucun respond-to(xs) détecté - rien à corriger${NC}"
  exit 0
fi

file_count=$(echo "$affected_files" | wc -l | tr -d ' ')
echo -e "${YELLOW}📝 $file_count fichier(s) à corriger${NC}\n"

# Créer backup
echo -e "${BLUE}💾 Création du backup dans $BACKUP_DIR...${NC}"
mkdir -p "$BACKUP_DIR"

while IFS= read -r file; do
  if [[ -n "$file" ]]; then
    # Créer la structure de répertoires
    target_dir="$BACKUP_DIR/$(dirname "$file")"
    mkdir -p "$target_dir"
    cp "$file" "$BACKUP_DIR/$file"
    echo "   ✓ Backup: $file"
  fi
done <<< "$affected_files"

echo ""
echo -e "${BLUE}🔄 Application des corrections...${NC}\n"

# Compteurs
fixed_count=0
error_count=0

# Pour chaque fichier affecté
while IFS= read -r file; do
  if [[ -z "$file" ]]; then
    continue
  fi

  echo -e "${YELLOW}Traitement:${NC} $file"

  # Créer un fichier temporaire
  temp_file="${file}.tmp"

  # Traiter le fichier ligne par ligne
  in_xs_block=false
  indent_level=""

  while IFS= read -r line; do
    # Détecter le début d'un bloc respond-to(xs)
    if [[ "$line" =~ ^([[:space:]]*)@include[[:space:]]+respond-to\(['\"]?xs['\"]?\)[[:space:]]*\{[[:space:]]*$ ]]; then
      indent_level="${BASH_REMATCH[1]}"
      in_xs_block=true
      echo "      /* [Mobile-first] Styles de base (anciennement xs) */" >> "$temp_file"
      ((fixed_count++))
      continue
    fi

    # Détecter la fin du bloc
    if [[ "$in_xs_block" == true ]] && [[ "$line" =~ ^[[:space:]]*\}[[:space:]]*$ ]]; then
      in_xs_block=false
      indent_level=""
      continue
    fi

    # Si on est dans un bloc xs, retirer l'indentation de 2 espaces
    if [[ "$in_xs_block" == true ]]; then
      # Retirer 2 espaces d'indentation
      echo "$line" | sed 's/^  //' >> "$temp_file"
    else
      # Ligne normale, la copier telle quelle
      echo "$line" >> "$temp_file"
    fi
  done < "$file"

  # Remplacer le fichier original
  mv "$temp_file" "$file"
  echo -e "   ${GREEN}✓${NC} Corrigé"

done <<< "$affected_files"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Résumé des corrections${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ $fixed_count bloc(s) respond-to(xs) corrigé(s)${NC}"
echo -e "${BLUE}💾 Backup sauvegardé dans:${NC} $BACKUP_DIR"
echo ""

if (( error_count > 0 )); then
  echo -e "${RED}⚠️  $error_count erreur(s) détectée(s)${NC}"
  echo -e "   Vérifiez manuellement les fichiers affectés"
  echo ""
fi

echo -e "${BLUE}💡 Prochaines étapes:${NC}"
echo -e "   1. Vérifier visuellement les corrections"
echo -e "   2. Tester l'application: ${GREEN}yarn dev${NC}"
echo -e "   3. Vérifier les styles mobile (responsive)"
echo -e "   4. Si OK: ${GREEN}git add . && git commit -m 'fix: remove respond-to(xs) mixins'${NC}"
echo -e "   5. Si KO: ${YELLOW}restaurer depuis $BACKUP_DIR${NC}"
echo ""
