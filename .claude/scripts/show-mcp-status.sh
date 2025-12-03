#!/bin/bash
# Affichage visuel du statut des serveurs MCP

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         🔌 Statut des serveurs MCP - Appli-Picto         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Vérifier les serveurs MCP
claude mcp list 2>&1 | grep -E "(context7|supabase|exa)" | while read line; do
    if echo "$line" | grep -q "Connected"; then
        echo "✅ $line"
    elif echo "$line" | grep -q "Failed"; then
        echo "❌ $line"
    else
        echo "⚠️  $line"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📘 Documentation complète : .claude/MCP_CONFIGURATION.md"
echo "🧪 Test Exa.ai          : .claude/scripts/test-exa-mcp.sh"
echo ""
