// .pnpmfile.cjs
// Hook pnpm pour résoudre les problèmes de peer dependencies
// Utilisé pour adapter les packages qui attendent React 18 vers React 19

/**
 * Hook appelé par pnpm avant de résoudre les dépendances
 * @param {object} pkg - Package actuel
 * @param {object} context - Contexte pnpm
 * @returns {object} Package modifié
 */
function readPackage(pkg, context) {
  // Fix pour React 19 : adapter les packages qui attendent React 18
  if (pkg.peerDependencies?.react) {
    const reactVersion = pkg.peerDependencies.react

    // Si le package attend React 18, permettre aussi React 19
    if (reactVersion.startsWith('^18') || reactVersion.startsWith('18.')) {
      context.log(`📦 Adapting ${pkg.name}: React ^18 → ^18 || ^19`)
      pkg.peerDependencies.react = '^18.0.0 || ^19.0.0'
    }
  }

  // Même chose pour react-dom
  if (pkg.peerDependencies?.['react-dom']) {
    const reactDomVersion = pkg.peerDependencies['react-dom']

    if (reactDomVersion.startsWith('^18') || reactDomVersion.startsWith('18.')) {
      context.log(`📦 Adapting ${pkg.name}: React DOM ^18 → ^18 || ^19`)
      pkg.peerDependencies['react-dom'] = '^18.0.0 || ^19.0.0'
    }
  }

  return pkg
}

module.exports = {
  hooks: {
    readPackage
  }
}
