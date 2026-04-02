#!/bin/bash
# Script de blocage yarn/npm pour Appli-Picto
# Ce projet utilise UNIQUEMENT pnpm
# Format JSON deny — bloque réellement l'exécution

echo '{"decision": "block", "reason": "Ce projet utilise uniquement pnpm. Commandes correctes : pnpm install | pnpm dev | pnpm build | pnpm test | pnpm add <pkg>"}'
exit 0
