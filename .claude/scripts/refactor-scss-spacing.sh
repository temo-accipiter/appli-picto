#!/bin/bash
# Script de refactoring automatique : px/rem hardcodés → spacing()
# Phase 1.1 - Canoniser valeurs hardcodées AdminPermissions.scss
#
# Usage: ./refactor-scss-spacing.sh <file.scss>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <file.scss>"
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo "Erreur: Fichier '$FILE' introuvable"
  exit 1
fi

echo "🔧 Refactoring: $FILE"
echo "📊 Conversion px/rem hardcodés → spacing()"

# Backup
cp "$FILE" "$FILE.backup"

# MAPPING DES VALEURS VERS TOKENS (source de vérité: _tokens.scss)
# Format: sed 's/PATTERN/REPLACEMENT/g'

# === Valeurs exactes dans $spacing-tokens (_tokens.scss ligne 314-403) ===
sed -i '' \
  -e "s/: 0px/: spacing('none')/g" \
  -e "s/: 1px/: spacing('1')/g" \
  -e "s/: 2px/: spacing('2')/g" \
  -e "s/: 3px/: spacing('3')/g" \
  -e "s/: 4px/: spacing('4')/g" \
  -e "s/: 6px/: spacing('6')/g" \
  -e "s/: 8px/: spacing('8')/g" \
  -e "s/: 10px/: spacing('10')/g" \
  -e "s/: 12px/: spacing('12')/g" \
  -e "s/: 14px/: spacing('14')/g" \
  -e "s/: 15px/: spacing('15')/g" \
  -e "s/: 16px/: spacing('16')/g" \
  -e "s/: 18px/: spacing('18')/g" \
  -e "s/: 20px/: spacing('20')/g" \
  -e "s/: 22px/: spacing('22')/g" \
  -e "s/: 24px/: spacing('24')/g" \
  -e "s/: 25px/: spacing('25')/g" \
  -e "s/: 26px/: spacing('26')/g" \
  -e "s/: 28px/: spacing('28')/g" \
  -e "s/: 30px/: spacing('30')/g" \
  -e "s/: 32px/: spacing('32')/g" \
  -e "s/: 36px/: spacing('36')/g" \
  -e "s/: 39px/: spacing('39')/g" \
  -e "s/: 40px/: spacing('40')/g" \
  -e "s/: 44px/: spacing('44')/g" \
  -e "s/: 48px/: spacing('48')/g" \
  -e "s/: 50px/: spacing('50')/g" \
  -e "s/: 56px/: spacing('56')/g" \
  -e "s/: 60px/: spacing('60')/g" \
  -e "s/: 62px/: spacing('62')/g" \
  -e "s/: 64px/: spacing('64')/g" \
  -e "s/: 70px/: spacing('70')/g" \
  -e "s/: 80px/: spacing('80')/g" \
  -e "s/: 100px/: spacing('100')/g" \
  -e "s/: 120px/: spacing('120')/g" \
  -e "s/: 140px/: spacing('140')/g" \
  -e "s/: 150px/: spacing('150')/g" \
  -e "s/: 160px/: spacing('160')/g" \
  -e "s/: 180px/: spacing('180')/g" \
  -e "s/: 200px/: spacing('200')/g" \
  -e "s/: 250px/: spacing('250')/g" \
  -e "s/: 260px/: spacing('260')/g" \
  -e "s/: 300px/: spacing('300')/g" \
  -e "s/: 320px/: spacing('320')/g" \
  -e "s/: 400px/: spacing('400')/g" \
  -e "s/: 540px/: spacing('540')/g" \
  -e "s/: 600px/: spacing('600')/g" \
  -e "s/: 800px/: spacing('800')/g" \
  -e "s/: 1400px/: spacing('1400')/g" \
  "$FILE"

# === Valeurs rem (0.25rem = 4px, 0.5rem = 8px, etc.) ===
sed -i '' \
  -e "s/: 0\.0625rem/: spacing('1')/g" \
  -e "s/: 0\.125rem/: spacing('2')/g" \
  -e "s/: 0\.1875rem/: spacing('3')/g" \
  -e "s/: 0\.25rem/: spacing('4')/g" \
  -e "s/: 0\.375rem/: spacing('6')/g" \
  -e "s/: 0\.5rem/: spacing('8')/g" \
  -e "s/: 0\.625rem/: spacing('10')/g" \
  -e "s/: 0\.75rem/: spacing('12')/g" \
  -e "s/: 0\.875rem/: spacing('14')/g" \
  -e "s/: 0\.9375rem/: spacing('15')/g" \
  -e "s/: 1rem/: spacing('16')/g" \
  -e "s/: 1\.125rem/: spacing('18')/g" \
  -e "s/: 1\.25rem/: spacing('20')/g" \
  -e "s/: 1\.375rem/: spacing('22')/g" \
  -e "s/: 1\.5rem/: spacing('24')/g" \
  -e "s/: 1\.5625rem/: spacing('25')/g" \
  -e "s/: 1\.75rem/: spacing('28')/g" \
  -e "s/: 1\.875rem/: spacing('30')/g" \
  -e "s/: 2rem/: spacing('32')/g" \
  -e "s/: 2\.25rem/: spacing('36')/g" \
  -e "s/: 2\.5rem/: spacing('40')/g" \
  -e "s/: 2\.75rem/: spacing('44')/g" \
  -e "s/: 3rem/: spacing('48')/g" \
  -e "s/: 3\.125rem/: spacing('50')/g" \
  -e "s/: 3\.5rem/: spacing('56')/g" \
  -e "s/: 3\.75rem/: spacing('60')/g" \
  -e "s/: 4rem/: spacing('64')/g" \
  -e "s/: 5rem/: spacing('80')/g" \
  -e "s/: 6\.25rem/: spacing('100')/g" \
  -e "s/: 7\.5rem/: spacing('120')/g" \
  -e "s/: 8\.75rem/: spacing('140')/g" \
  -e "s/: 9\.375rem/: spacing('150')/g" \
  -e "s/: 10rem/: spacing('160')/g" \
  "$FILE"

# === Valeurs négatives (translateY, margin négatif) ===
sed -i '' \
  -e "s/(-1px)/spacing('-1')/g" \
  -e "s/(-2px)/spacing('-2')/g" \
  -e "s/(-4px)/spacing('-4')/g" \
  "$FILE"

# === Espaces (gap, padding, margin multi-valeurs) ===
# gap: 8px → gap: spacing('8')
sed -i '' \
  -e "s/gap: \([0-9]\+\)px/gap: spacing('\1')/g" \
  -e "s/gap: \([0-9.]\+\)rem/gap: spacing('\1-rem')/g" \
  "$FILE"

# padding: 12px 24px → padding: spacing('12') spacing('24')
# margin: 10px 20px → margin: spacing('10') spacing('20')
# TODO: Patterns complexes nécessitent regex avancé (sed -E ou perl)

echo "✅ Refactoring terminé !"
echo "📁 Backup sauvegardé: $FILE.backup"
echo "🔍 Vérifier les changements: git diff $FILE"
echo ""
echo "⚠️  Rappel: Certains patterns complexes (padding multi-valeurs) nécessitent édition manuelle"
echo "    Exemple: padding: 10px 20px → padding: spacing('10') spacing('20')"

# Statistiques
echo ""
echo "📊 Statistiques après refactoring:"
REMAINING_PX=$(grep -o "[0-9]\+px" "$FILE" | wc -l | tr -d ' ')
REMAINING_REM=$(grep -o "[0-9.]\+rem" "$FILE" | grep -v "font-size\|line-height" | wc -l | tr -d ' ')
SPACING_CALLS=$(grep -o "spacing(" "$FILE" | wc -l | tr -d ' ')

echo "  - Appels spacing(): $SPACING_CALLS"
echo "  - Px hardcodés restants: $REMAINING_PX"
echo "  - Rem hardcodés restants: $REMAINING_REM"
