#!/usr/bin/env bash
# Script d'audit SCSS pour migration mobile-first
# Détecte les problèmes critiques avant refactorisation

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

OUT="audit-scss-report.csv"
SRC_DIR="src"

echo -e "${BLUE}🔍 Démarrage de l'audit SCSS...${NC}\n"

# Initialiser le rapport CSV
echo "Priorité,Catégorie,Fichier,Ligne,Problème,Contexte" > "$OUT"

# Compteurs
CRITICAL=0
URGENT=0
IMPORTANT=0

#############################################
# 1. CRITICAL: respond-to(xs) usage
#############################################
echo -e "${RED}[CRITICAL]${NC} Recherche de respond-to(xs)..."
while IFS=: read -r file line content; do
  if [[ -n "$file" ]]; then
    echo "CRITICAL,respond-to(xs),$file,$line,Breakpoint xs utilisé mais mobile doit être base,\"$content\"" >> "$OUT"
    ((CRITICAL++))
  fi
done < <(grep -Rn "@include[[:space:]]*respond-to.*[('\"]xs['\")]" "$SRC_DIR" --include="*.scss" || true)

#############################################
# 2. CRITICAL: Animations >150ms (TSA)
#############################################
echo -e "${RED}[CRITICAL]${NC} Recherche d'animations >150ms..."
while IFS=: read -r file line content; do
  if [[ -n "$file" ]]; then
    # Extraire la durée
    if [[ "$content" =~ ([0-9]+(\.[0-9]+)?(s|ms)) ]]; then
      duration="${BASH_REMATCH[1]}"
      echo "CRITICAL,Animation lente,$file,$line,Animation >150ms (TSA-unsafe),\"$content\"" >> "$OUT"
      ((CRITICAL++))
    fi
  fi
done < <(grep -Rn -E "transition:.*(0\.[2-9]s|1[5-9][1-9]ms|[2-9][0-9]{2,}ms)" "$SRC_DIR" --include="*.scss" || true)

#############################################
# 3. URGENT: Media queries max-width
#############################################
echo -e "${YELLOW}[URGENT]${NC} Recherche de max-width hardcodés..."
while IFS=: read -r file line content; do
  if [[ -n "$file" ]]; then
    echo "URGENT,max-width hardcodé,$file,$line,Media query desktop-first détecté,\"$content\"" >> "$OUT"
    ((URGENT++))
  fi
done < <(grep -Rn "@media[[:space:]]*(max-width" "$SRC_DIR" --include="*.scss" || true)

#############################################
# 4. URGENT: Touch targets potentiellement <48px
#############################################
echo -e "${YELLOW}[URGENT]${NC} Recherche de touch targets..."
while IFS=: read -r file line content; do
  if [[ -n "$file" ]] && [[ "$content" =~ (width|height|min-width|min-height):[[:space:]]*([0-9]+)px ]]; then
    size="${BASH_REMATCH[2]}"
    if (( size < 48 )); then
      echo "URGENT,Touch target petit,$file,$line,Element interactif <48px (TSA-unsafe),\"$content\"" >> "$OUT"
      ((URGENT++))
    fi
  fi
done < <(grep -Rn -E "\.(btn|button|icon|handle|clickable|interactive)" "$SRC_DIR" --include="*.scss" -A 5 || true)

#############################################
# 5. IMPORTANT: Images sans lazy loading
#############################################
echo -e "${GREEN}[IMPORTANT]${NC} Recherche d'images sans lazy loading..."
while IFS=: read -r file line content; do
  if [[ -n "$file" ]] && [[ ! "$content" =~ loading= ]]; then
    echo "IMPORTANT,Lazy loading manquant,$file,$line,Image sans loading=lazy,\"$content\"" >> "$OUT"
    ((IMPORTANT++))
  fi
done < <(grep -Rn "<img" "$SRC_DIR" --include="*.jsx" || true)

#############################################
# 6. IMPORTANT: Focus states manquants
#############################################
echo -e "${GREEN}[IMPORTANT]${NC} Recherche de focus states..."
# Chercher les classes interactives
interactive_classes=$(grep -Rh -E "^\.(btn|button|link|input|select|textarea)" "$SRC_DIR" --include="*.scss" | sed 's/[[:space:]]*{.*//' | sort -u)

while IFS= read -r class_name; do
  if [[ -n "$class_name" ]]; then
    # Vérifier si :focus-visible existe pour cette classe
    if ! grep -Rq "${class_name}:focus-visible" "$SRC_DIR" --include="*.scss"; then
      # Trouver le fichier où la classe est définie
      file=$(grep -Rl "^${class_name}[[:space:]]*{" "$SRC_DIR" --include="*.scss" | head -1)
      if [[ -n "$file" ]]; then
        line=$(grep -n "^${class_name}[[:space:]]*{" "$file" | head -1 | cut -d: -f1)
        echo "IMPORTANT,Focus state manquant,$file,$line,Pas de :focus-visible pour élément interactif,\"$class_name\"" >> "$OUT"
        ((IMPORTANT++))
      fi
    fi
  fi
done <<< "$interactive_classes"

#############################################
# Résumé
#############################################
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Résumé de l'audit${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}CRITICAL:${NC}   $CRITICAL problèmes (bloquants)"
echo -e "${YELLOW}URGENT:${NC}     $URGENT problèmes (importantes)"
echo -e "${GREEN}IMPORTANT:${NC}  $IMPORTANT problèmes (à traiter)"
echo ""
echo -e "Rapport détaillé: ${BLUE}$OUT${NC}"
echo ""

# Recommandations
if (( CRITICAL > 0 )); then
  echo -e "${RED}⚠️  ATTENTION: $CRITICAL problèmes CRITIQUES détectés${NC}"
  echo -e "   ${RED}→${NC} Corriger avant toute migration mobile-first"
  echo -e "   ${RED}→${NC} Voir ÉTAPE 1 du plan de migration"
  echo ""
fi

if (( CRITICAL == 0 && URGENT == 0 && IMPORTANT == 0 )); then
  echo -e "${GREEN}✅ Aucun problème détecté - prêt pour la migration${NC}"
fi

echo -e "${BLUE}💡 Prochaines étapes:${NC}"
echo -e "   1. Examiner le rapport CSV: $OUT"
echo -e "   2. Corriger les problèmes CRITICAL"
echo -e "   3. Lancer le script de correction automatique (si disponible)"
echo -e "   4. Passer à l'ÉTAPE 2 du plan (tests automatisés)"
echo ""
