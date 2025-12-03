#!/bin/bash
# Script de test pour vérifier le bon fonctionnement d'Exa.ai MCP

echo "🔍 Test de configuration MCP Exa.ai"
echo "===================================="
echo ""

# 1. Vérifier que le serveur est bien configuré
echo "1️⃣ Vérification de la configuration..."
if grep -q '"exa"' ~/.claude.json; then
    echo "   ✅ Configuration Exa trouvée dans ~/.claude.json"
else
    echo "   ❌ Configuration Exa introuvable"
    exit 1
fi

# 2. Vérifier que le binaire existe
EXA_BIN="/Users/accipiter_tell/.volta/tools/image/packages/exa-mcp-server/lib/node_modules/exa-mcp-server/.smithery/stdio/index.cjs"
if [ -f "$EXA_BIN" ]; then
    echo "   ✅ Binaire Exa trouvé : $EXA_BIN"
else
    echo "   ❌ Binaire Exa introuvable"
    exit 1
fi

# 3. Vérifier que la clé API est configurée
if grep -q "EXA_API_KEY" ~/.claude.json; then
    echo "   ✅ Clé API Exa configurée"
else
    echo "   ❌ Clé API Exa manquante"
    exit 1
fi

# 4. Tester la connexion du serveur MCP
echo ""
echo "2️⃣ Test de connexion au serveur MCP..."
MCP_LIST_OUTPUT=$(claude mcp list 2>&1)
if echo "$MCP_LIST_OUTPUT" | grep -q "exa.*Connected"; then
    echo "   ✅ Serveur Exa.ai connecté avec succès"
else
    echo "   ⚠️  Serveur Exa.ai non connecté (peut nécessiter un redémarrage)"
    echo ""
    echo "   Output de 'claude mcp list':"
    echo "$MCP_LIST_OUTPUT" | grep -i exa
fi

# 5. Récapitulatif
echo ""
echo "3️⃣ Récapitulatif de la configuration"
echo "   📦 Package : exa-mcp-server v3.1.1"
echo "   🔧 Type : stdio (Node.js)"
echo "   🔑 API Key : configurée"
echo "   📡 Outils disponibles après redémarrage :"
echo "      - mcp__exa__web_search_exa"
echo "      - mcp__exa__get_code_context_exa"
echo ""
echo "✨ Configuration terminée !"
echo ""
echo "📝 Pour utiliser Exa.ai :"
echo "   1. Redémarrez Claude Code (exit puis claude)"
echo "   2. Les outils Exa.ai seront disponibles automatiquement"
echo ""
