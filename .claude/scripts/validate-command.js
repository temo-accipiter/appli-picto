#!/usr/bin/env bun

/* global Bun */

/**
 * Claude Code "Before Tools" Hook - Validation Commandes Sécurité Appli-Picto
 *
 * Ce script valide les commandes avant exécution pour prévenir opérations dangereuses.
 * Reçoit données commande via stdin et retourne exit code 0 (autoriser) ou 1 (bloquer).
 *
 * Usage: Appelé automatiquement par hook PreToolUse de Claude Code
 * Test manuel: echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | bun .claude/scripts/validate-command.js
 */

// Base de données complète des patterns de commandes dangereuses
const SECURITY_RULES = {
  // Commandes destruction système critiques
  CRITICAL_COMMANDS: [
    'del',
    'format',
    'mkfs',
    'shred',
    'dd',
    'fdisk',
    'parted',
    'gparted',
    'cfdisk',
  ],

  // Escalade privilèges et accès système
  PRIVILEGE_COMMANDS: [
    'sudo',
    'su',
    'passwd',
    'chpasswd',
    'usermod',
    'chmod',
    'chown',
    'chgrp',
    'setuid',
    'setgid',
  ],

  // Outils réseau et accès distant
  NETWORK_COMMANDS: [
    'nc',
    'netcat',
    'nmap',
    'telnet',
    'ssh-keygen',
    'iptables',
    'ufw',
    'firewall-cmd',
    'ipfw',
  ],

  // Services système et manipulation processus
  SYSTEM_COMMANDS: [
    'systemctl',
    'service',
    'kill',
    'killall',
    'mount',
    'umount',
    'swapon',
    'swapoff',
  ],

  // Patterns regex dangereux
  DANGEROUS_PATTERNS: [
    // Destruction système de fichiers - bloquer rm -rf avec chemins absolus
    /rm\s+.*-rf\s*\/\s*$/i, // rm -rf se terminant à root
    /rm\s+.*-rf\s*\/etc/i, // rm -rf dans /etc
    /rm\s+.*-rf\s*\/usr/i, // rm -rf dans /usr
    /rm\s+.*-rf\s*\/bin/i, // rm -rf dans /bin
    /rm\s+.*-rf\s*\/sys/i, // rm -rf dans /sys
    /rm\s+.*-rf\s*\/proc/i, // rm -rf dans /proc
    /rm\s+.*-rf\s*\/boot/i, // rm -rf dans /boot
    /rm\s+.*-rf\s*\/home\/[^/]*\s*$/i, // rm -rf répertoire home entier
    /rm\s+.*-rf\s*\.\.+\//i, // rm -rf avec traversée parent directory
    /rm\s+.*-rf\s*\*.*\*/i, // rm -rf avec multiples wildcards
    /rm\s+.*-rf\s*\$\w+/i, // rm -rf avec variables (potentiellement dangereux)
    />\s*\/dev\/(sda|hda|nvme)/i,
    /dd\s+.*of=\/dev\//i,
    /shred\s+.*\/dev\//i,
    /mkfs\.\w+\s+\/dev\//i,

    // Fork bomb et épuisement ressources
    /:\(\)\{\s*:\|:&\s*\};:/,
    /while\s+true\s*;\s*do.*done/i,
    /for\s*\(\(\s*;\s*;\s*\)\)/i,

    // Exécution code à distance
    /\|\s*(sh|bash|zsh|fish)$/i,
    /(wget|curl)\s+.*\|\s*(sh|bash)/i,
    /(wget|curl)\s+.*-O-.*\|\s*(sh|bash)/i,

    // Substitution commande avec commandes dangereuses
    /`.*rm.*`/i,
    /\$\(.*rm.*\)/i,
    /`.*dd.*`/i,
    /\$\(.*dd.*\)/i,

    // Accès fichiers sensibles
    /cat\s+\/etc\/(passwd|shadow|sudoers)/i,
    />\s*\/etc\/(passwd|shadow|sudoers)/i,
    /echo\s+.*>>\s*\/etc\/(passwd|shadow|sudoers)/i,

    // Exfiltration réseau
    /\|\s*nc\s+\S+\s+\d+/i,
    /curl\s+.*-d.*\$\(/i,
    /wget\s+.*--post-data.*\$\(/i,

    // Manipulation logs
    />\s*\/var\/log\//i,
    /rm\s+\/var\/log\//i,
    /echo\s+.*>\s*~?\/?\.bash_history/i,

    // Création backdoor
    /nc\s+.*-l.*-e/i,
    /nc\s+.*-e.*-l/i,
    /ncat\s+.*--exec/i,
    /ssh-keygen.*authorized_keys/i,

    // Crypto mining et téléchargements malicieux
    /(wget|curl).*\.(sh|py|pl|exe|bin).*\|\s*(sh|bash|python)/i,
    /(xmrig|ccminer|cgminer|bfgminer)/i,

    // Accès direct matériel
    /cat\s+\/dev\/(mem|kmem)/i,
    /echo\s+.*>\s*\/dev\/(mem|kmem)/i,

    // Manipulation modules kernel
    /(insmod|rmmod|modprobe)\s+/i,

    // Manipulation cron jobs
    /crontab\s+-e/i,
    /echo\s+.*>>\s*\/var\/spool\/cron/i,

    // Exposition variables d'environnement
    /env\s*\|\s*grep.*PASSWORD/i,
    /printenv.*PASSWORD/i,
  ],

  // Chemins ne devant JAMAIS être écrits
  PROTECTED_PATHS: [
    '/etc/',
    '/usr/',
    '/bin/',
    '/sbin/',
    '/boot/',
    '/sys/',
    '/proc/',
    '/dev/',
    '/root/',
  ],

  // Chemins sûrs où rm -rf est autorisé
  SAFE_RM_PATHS: [
    '/Users/accipiter_tell/projets/new_sup/appli-picto/',
    '/tmp/',
    '/var/tmp/',
    process.cwd() + '/', // Répertoire de travail actuel
  ],
}

// Liste blanche commandes sûres (quand utilisées appropriément)
const SAFE_COMMANDS = [
  'ls',
  'dir',
  'pwd',
  'whoami',
  'date',
  'echo',
  'cat',
  'head',
  'tail',
  'grep',
  'find',
  'wc',
  'sort',
  'uniq',
  'cut',
  'awk',
  'sed',
  'git',
  'npm',
  'pnpm', // Appli-Picto utilise pnpm
  'node',
  'bun',
  'python',
  'pip',
  'source',
  'cd',
  'cp',
  'mv',
  'mkdir',
  'touch',
  'ln',
  'supabase', // Commande Supabase CLI
  'docker', // Docker pour Supabase local
  'curl',
  'pkill', // Pour kill dev servers
  'lsof', // Pour vérifier ports
]

class CommandValidator {
  constructor() {
    this.logFile =
      '/Users/accipiter_tell/projets/new_sup/appli-picto/.claude/scripts/security.log'
  }

  /**
   * Fonction validation principale
   */
  validate(command, toolName = 'Unknown') {
    const result = {
      isValid: true,
      severity: 'LOW',
      violations: [],
      sanitizedCommand: command,
    }

    if (!command || typeof command !== 'string') {
      result.isValid = false
      result.violations.push('Format commande invalide')
      return result
    }

    // Normaliser commande pour analyse
    const normalizedCmd = command.trim().toLowerCase()
    const cmdParts = normalizedCmd.split(/\s+/)
    const mainCommand = cmdParts[0]

    // Autoriser source et python inconditionnellement
    if (mainCommand === 'source' || mainCommand === 'python') {
      return result // Toujours autoriser
    }

    // Vérifier commandes critiques
    if (SECURITY_RULES.CRITICAL_COMMANDS.includes(mainCommand)) {
      result.isValid = false
      result.severity = 'CRITICAL'
      result.violations.push(`Commande dangereuse critique: ${mainCommand}`)
    }

    // Vérifier commandes escalade privilèges
    if (SECURITY_RULES.PRIVILEGE_COMMANDS.includes(mainCommand)) {
      result.isValid = false
      result.severity = 'HIGH'
      result.violations.push(`Commande escalade privilèges: ${mainCommand}`)
    }

    // Vérifier commandes réseau
    if (SECURITY_RULES.NETWORK_COMMANDS.includes(mainCommand)) {
      result.isValid = false
      result.severity = 'HIGH'
      result.violations.push(`Commande accès réseau/distant: ${mainCommand}`)
    }

    // Vérifier commandes système
    if (SECURITY_RULES.SYSTEM_COMMANDS.includes(mainCommand)) {
      result.isValid = false
      result.severity = 'HIGH'
      result.violations.push(`Commande manipulation système: ${mainCommand}`)
    }

    // Vérifier commandes rm -rf d'abord (gestion spéciale)
    if (/rm\s+.*-rf\s/.test(command)) {
      const isRmRfSafe = this.isRmRfCommandSafe(command)
      if (!isRmRfSafe) {
        result.isValid = false
        result.severity = 'CRITICAL'
        result.violations.push('Commande rm -rf ciblant chemin non-sûr')
      }
    }

    // Vérifier patterns dangereux (sauter patterns rm -rf car gérés ci-dessus)
    for (const pattern of SECURITY_RULES.DANGEROUS_PATTERNS) {
      if (pattern.test(command) && !/rm\s+.*-rf/.test(pattern.source)) {
        result.isValid = false
        result.severity = 'CRITICAL'
        result.violations.push(`Pattern dangereux détecté: ${pattern.source}`)
      }
    }

    // Autoriser chaînage && pour commandes sûres comme source et python
    if (command.includes('&&')) {
      const chainedCommands = this.splitCommandChain(command)
      let allSafe = true
      for (const chainedCmd of chainedCommands) {
        const trimmedCmd = chainedCmd.trim()
        const cmdParts = trimmedCmd.split(/\s+/)
        const mainCommand = cmdParts[0]

        // Autoriser source et python dans chaînes &&
        if (
          mainCommand === 'source' ||
          mainCommand === 'python' ||
          SAFE_COMMANDS.includes(mainCommand)
        ) {
          continue
        }

        const chainResult = this.validateSingleCommand(trimmedCmd, toolName)
        if (!chainResult.isValid) {
          result.isValid = false
          result.severity = chainResult.severity
          result.violations.push(
            `Violation commande chaînée: ${trimmedCmd} - ${chainResult.violations.join(
              ', '
            )}`
          )
          allSafe = false
        }
      }
      if (allSafe) {
        return result // Autoriser chaînes && sûres
      }
    }

    // Vérifier autre chaînage commandes (; et ||)
    if (command.includes(';') || command.includes('||')) {
      const chainedCommands = this.splitCommandChain(command)
      for (const chainedCmd of chainedCommands) {
        const chainResult = this.validateSingleCommand(
          chainedCmd.trim(),
          toolName
        )
        if (!chainResult.isValid) {
          result.isValid = false
          result.severity = chainResult.severity
          result.violations.push(
            `Violation commande chaînée: ${chainedCmd.trim()} - ${chainResult.violations.join(
              ', '
            )}`
          )
        }
      }
      return result
    }

    // Vérifier accès chemins protégés (mais autoriser redirections courantes comme /dev/null)
    for (const path of SECURITY_RULES.PROTECTED_PATHS) {
      if (command.includes(path)) {
        // Autoriser redirections sûres courantes
        if (
          path === '/dev/' &&
          (command.includes('/dev/null') ||
            command.includes('/dev/stderr') ||
            command.includes('/dev/stdout'))
        ) {
          continue
        }
        result.isValid = false
        result.severity = 'HIGH'
        result.violations.push(`Accès chemin protégé: ${path}`)
      }
    }

    // Vérifications sécurité additionnelles
    if (command.length > 2000) {
      result.isValid = false
      result.severity = 'MEDIUM'
      result.violations.push('Commande trop longue (potentiel buffer overflow)')
    }

    // Vérifier contenu binaire/encodé
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/.test(command)) {
      result.isValid = false
      result.severity = 'HIGH'
      result.violations.push('Contenu binaire ou encodé détecté')
    }

    return result
  }

  /**
   * Valider commande unique (sans logique chaînage pour éviter récursion)
   */
  validateSingleCommand(command, _toolName = 'Unknown') {
    const result = {
      isValid: true,
      severity: 'LOW',
      violations: [],
      sanitizedCommand: command,
    }

    if (!command || typeof command !== 'string') {
      result.isValid = false
      result.violations.push('Format commande invalide')
      return result
    }

    // Normaliser commande pour analyse
    const normalizedCmd = command.trim().toLowerCase()
    const cmdParts = normalizedCmd.split(/\s+/)
    const mainCommand = cmdParts[0]

    // Autoriser source et python inconditionnellement dans validation single aussi
    if (mainCommand === 'source' || mainCommand === 'python') {
      return result // Toujours autoriser
    }

    // Vérifier commandes critiques
    if (SECURITY_RULES.CRITICAL_COMMANDS.includes(mainCommand)) {
      result.isValid = false
      result.severity = 'CRITICAL'
      result.violations.push(`Commande dangereuse critique: ${mainCommand}`)
    }

    // Vérifier commandes escalade privilèges
    if (SECURITY_RULES.PRIVILEGE_COMMANDS.includes(mainCommand)) {
      result.isValid = false
      result.severity = 'HIGH'
      result.violations.push(`Commande escalade privilèges: ${mainCommand}`)
    }

    // Vérifier commandes réseau
    if (SECURITY_RULES.NETWORK_COMMANDS.includes(mainCommand)) {
      result.isValid = false
      result.severity = 'HIGH'
      result.violations.push(`Commande accès réseau/distant: ${mainCommand}`)
    }

    // Vérifier commandes système
    if (SECURITY_RULES.SYSTEM_COMMANDS.includes(mainCommand)) {
      result.isValid = false
      result.severity = 'HIGH'
      result.violations.push(`Commande manipulation système: ${mainCommand}`)
    }

    // Vérifier commandes rm -rf d'abord (gestion spéciale)
    if (/rm\s+.*-rf\s/.test(command)) {
      const isRmRfSafe = this.isRmRfCommandSafe(command)
      if (!isRmRfSafe) {
        result.isValid = false
        result.severity = 'CRITICAL'
        result.violations.push('Commande rm -rf ciblant chemin non-sûr')
      }
    }

    // Vérifier patterns dangereux (sauter patterns rm -rf car gérés ci-dessus)
    for (const pattern of SECURITY_RULES.DANGEROUS_PATTERNS) {
      if (pattern.test(command) && !/rm\s+.*-rf/.test(pattern.source)) {
        result.isValid = false
        result.severity = 'CRITICAL'
        result.violations.push(`Pattern dangereux détecté: ${pattern.source}`)
      }
    }

    // Vérifier accès chemins protégés
    for (const path of SECURITY_RULES.PROTECTED_PATHS) {
      if (command.includes(path)) {
        if (
          path === '/dev/' &&
          (command.includes('/dev/null') ||
            command.includes('/dev/stderr') ||
            command.includes('/dev/stdout'))
        ) {
          continue
        }
        result.isValid = false
        result.severity = 'HIGH'
        result.violations.push(`Accès chemin protégé: ${path}`)
      }
    }

    // Vérifications sécurité additionnelles
    if (command.length > 2000) {
      result.isValid = false
      result.severity = 'MEDIUM'
      result.violations.push('Commande trop longue (potentiel buffer overflow)')
    }

    // Vérifier contenu binaire/encodé
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/.test(command)) {
      result.isValid = false
      result.severity = 'HIGH'
      result.violations.push('Contenu binaire ou encodé détecté')
    }

    return result
  }

  /**
   * Diviser chaîne commandes en commandes individuelles
   */
  splitCommandChain(command) {
    // Division simple sur && ; ||
    // Basique - ne gère pas guillemets complexes, mais suffisant pour validation
    const commands = []
    let current = ''
    let inQuotes = false
    let quoteChar = ''

    for (let i = 0; i < command.length; i++) {
      const char = command[i]
      const nextChar = command[i + 1]

      // Gérer guillemets
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true
        quoteChar = char
        current += char
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false
        quoteChar = ''
        current += char
      } else if (inQuotes) {
        current += char
      } else if (char === '&' && nextChar === '&') {
        commands.push(current.trim())
        current = ''
        i++ // sauter prochain &
      } else if (char === '|' && nextChar === '|') {
        commands.push(current.trim())
        current = ''
        i++ // sauter prochain |
      } else if (char === ';') {
        commands.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    if (current.trim()) {
      commands.push(current.trim())
    }

    return commands.filter(cmd => cmd.length > 0)
  }

  /**
   * Logger événements sécurité
   */
  async logSecurityEvent(command, toolName, result, sessionId = null) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      sessionId,
      toolName,
      command: command.substring(0, 500), // Tronquer pour logs
      blocked: !result.isValid,
      severity: result.severity,
      violations: result.violations,
      source: 'claude-code-hook-appli-picto',
    }

    try {
      // Écrire dans fichier log
      const logLine = JSON.stringify(logEntry) + '\n'
      await Bun.write(this.logFile, logLine, { createPath: true, flag: 'a' })

      // Aussi output stderr pour visibilité immédiate
      console.error(
        `[SÉCURITÉ] ${
          result.isValid ? 'AUTORISÉ' : 'BLOQUÉ'
        }: ${command.substring(0, 100)}`
      )
    } catch (error) {
      console.error('Échec écriture log sécurité:', error)
    }
  }

  /**
   * Vérifier si commande rm -rf cible chemin sûr
   */
  isRmRfCommandSafe(command) {
    // Extraire chemin de commande rm -rf
    const rmRfMatch = command.match(/rm\s+.*-rf\s+([^\s;&|]+)/)
    if (!rmRfMatch) {
      return false // Impossible parser chemin, bloquer par sécurité
    }

    const targetPath = rmRfMatch[1]

    // Bloquer si ciblant root ou se terminant à root
    if (targetPath === '/' || targetPath.endsWith('/')) {
      return false
    }

    // Vérifier si chemin commence par préfixe sûr
    for (const safePath of SECURITY_RULES.SAFE_RM_PATHS) {
      if (targetPath.startsWith(safePath)) {
        return true
      }
    }

    // Vérifier si c'est chemin relatif (plus sûr)
    if (!targetPath.startsWith('/')) {
      return true
    }

    // Bloquer tous autres chemins absolus
    return false
  }

  /**
   * Vérifier si commande correspond patterns autorisés depuis settings
   */
  isExplicitlyAllowed(command, allowedPatterns = []) {
    for (const pattern of allowedPatterns) {
      // Convertir pattern permission Claude Code en regex
      // ex: "Bash(git *)" devient /^git\s+.*$/
      if (pattern.startsWith('Bash(') && pattern.endsWith(')')) {
        const cmdPattern = pattern.slice(5, -1) // Retirer "Bash(" et ")"
        const regex = new RegExp(
          '^' + cmdPattern.replace(/\*/g, '.*') + '$',
          'i'
        )
        if (regex.test(command)) {
          return true
        }
      }
    }
    return false
  }
}

/**
 * Fonction exécution principale
 */
async function main() {
  const validator = new CommandValidator()

  try {
    // Lire input hook depuis stdin
    const stdin = process.stdin
    const chunks = []

    for await (const chunk of stdin) {
      chunks.push(chunk)
    }

    const input = Buffer.concat(chunks).toString()

    if (!input.trim()) {
      console.error('Aucun input reçu depuis stdin')
      process.exit(1)
    }

    // Parser format JSON hook Claude Code
    let hookData
    try {
      hookData = JSON.parse(input)
    } catch (error) {
      console.error('Input JSON invalide:', error.message)
      process.exit(1)
    }

    const toolName = hookData.tool_name || 'Unknown'
    const toolInput = hookData.tool_input || {}
    const sessionId = hookData.session_id || null

    // Valider uniquement commandes Bash pour l'instant
    if (toolName !== 'Bash') {
      console.log(`Saut validation pour outil: ${toolName}`)
      process.exit(0)
    }

    const command = toolInput.command
    if (!command) {
      console.error('Aucune commande trouvée dans tool input')
      process.exit(1)
    }

    // Valider commande
    const result = validator.validate(command, toolName)

    // Logger événement sécurité
    await validator.logSecurityEvent(command, toolName, result, sessionId)

    // Output résultat et exit avec code approprié
    if (result.isValid) {
      console.log('Validation commande réussie')
      process.exit(0) // Autoriser exécution
    } else {
      // Au lieu de bloquer, demander confirmation utilisateur
      const confirmationMessage = `⚠️  Commande potentiellement dangereuse détectée!\n\nCommande: ${command}\nViolations: ${result.violations.join(
        ', '
      )}\nSévérité: ${
        result.severity
      }\n\nVoulez-vous procéder avec cette commande?`

      const hookOutput = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: confirmationMessage,
        },
      }

      console.log(JSON.stringify(hookOutput))
      process.exit(0) // Exit avec 0 pour déclencher prompt utilisateur
    }
  } catch (error) {
    console.error('Erreur script validation:', error)
    // Fail safe - bloquer exécution sur toute erreur script
    process.exit(2)
  }
}

// Exécuter fonction main
main().catch(error => {
  console.error('Erreur fatale:', error)
  process.exit(2)
})
