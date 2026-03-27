#!/bin/bash
# Script de blocage yarn/npm pour Appli-Picto
# Ce projet utilise UNIQUEMENT pnpm

echo ""
echo "❌ ERREUR: Utilisation de yarn/npm interdite"
echo ""
echo "→ Ce projet utilise UNIQUEMENT pnpm"
echo ""
echo "Commandes correctes:"
echo "  ✅ pnpm install"
echo "  ✅ pnpm dev"
echo "  ✅ pnpm build"
echo "  ✅ pnpm test"
echo ""
echo "→ Voir CLAUDE.md pour la liste complète des commandes"
echo ""
exit 1
