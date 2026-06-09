import type { DependencyRequest, Ecosystem } from '../types/index.js';

export interface InterceptedCommand {
  ecosystem: Ecosystem;
  rawCommand: string;
  packageName: string;
  version?: string;
  isInstall: boolean;
  isGlobal: boolean;
  isDev: boolean;
  timestamp: Date;
}

const ECOSYSTEM_INSTALL_PATTERNS: Record<Ecosystem, RegExp[]> = {
  npm: [
    /^npm\s+install\s+(?:-g\s+|--global\s+)?(?:-D\s+|--save-dev\s+)?(?:--save\s+)?(\S+?)(?:\s|$)/,
    /^npm\s+i\s+(?:-g\s+|--global\s+)?(?:-D\s+|--save-dev\s+)?(\S+?)(?:\s|$)/,
    /^npm\s+add\s+(?:-g\s+|--global\s+)?(?:-D\s+|--save-dev\s+)?(\S+?)(?:\s|$)/,
    /^yarn\s+add\s+(?:--dev\s+|--global\s+)?(\S+?)(?:\s|$)/,
    /^pnpm\s+(?:add|install)\s+(?:-g\s+|--global\s+)?(?:-D\s+|--save-dev\s+)?(\S+?)(?:\s|$)/,
    /^npx\s+--yes\s+(\S+?)(?:\s|$)/,
  ],
  pip: [
    /^pip\s+install\s+(?:--user\s+)?(\S+?)(?:\s|$)/,
    /^pip3\s+install\s+(?:--user\s+)?(\S+?)(?:\s|$)/,
    /^python\s+-m\s+pip\s+install\s+(?:--user\s+)?(\S+?)(?:\s|$)/,
  ],
  cargo: [
    /^cargo\s+add\s+(\S+?)(?:\s|$)/,
    /^cargo\s+install\s+(\S+?)(?:\s|$)/,
  ],
  go: [
    /^go\s+get\s+(\S+?)(?:\s|$)/,
    /^go\s+install\s+(\S+?)(?:\s|$)/,
  ],
};

function extractPackageName(rawCommand: string, ecosystem: Ecosystem): { name: string; version?: string } | null {
  const patterns = ECOSYSTEM_INSTALL_PATTERNS[ecosystem];
  for (const pattern of patterns) {
    const match = rawCommand.match(pattern);
    if (match) {
      let pkgSpec = match[1];
      pkgSpec = pkgSpec.replace(/["']/g, '');

      if (ecosystem === 'npm' || ecosystem === 'pip') {
        const versionMatch = pkgSpec.match(/^(.+?)@(.+)$/);
        if (versionMatch) {
          return { name: versionMatch[1], version: versionMatch[2] };
        }

        const eqMatch = pkgSpec.match(/^(.+?)==(.+)$/);
        if (eqMatch) {
          return { name: eqMatch[1], version: eqMatch[2] };
        }
      }

      if (ecosystem === 'cargo') {
        const versionMatch = pkgSpec.match(/^(.+?)@(.+)$/);
        if (versionMatch) {
          return { name: versionMatch[1], version: versionMatch[2] };
        }
      }

      if (ecosystem === 'go') {
        const versionMatch = pkgSpec.match(/^(.+?)@(.+)$/);
        if (versionMatch) {
          return { name: versionMatch[1], version: versionMatch[2] };
        }
      }

      return { name: pkgSpec };
    }
  }
  return null;
}

function detectCommandType(rawCommand: string): { isGlobal: boolean; isDev: boolean } {
  const isGlobal = /\s+-g\s+|\s+--global\s+/.test(rawCommand) ||
    (rawCommand.includes('pip install') && rawCommand.includes('--user'));
  const isDev = /\s+--save-dev\s+|\s+-D\s+|\s+--dev\s+/.test(rawCommand) ||
    (rawCommand.includes('npm install') && rawCommand.includes('--save-dev'));
  return { isGlobal, isDev };
}

export function interceptCommand(rawCommand: string): InterceptedCommand[] {
  const results: InterceptedCommand[] = [];
  const trimmed = rawCommand.trim();

  for (const ecosystem of Object.keys(ECOSYSTEM_INSTALL_PATTERNS) as Ecosystem[]) {
    const packageInfo = extractPackageName(trimmed, ecosystem);
    if (packageInfo) {
      const { isGlobal, isDev } = detectCommandType(trimmed);
      results.push({
        ecosystem,
        rawCommand: trimmed,
        packageName: packageInfo.name,
        version: packageInfo.version,
        isInstall: true,
        isGlobal,
        isDev,
        timestamp: new Date(),
      });
    }
  }

  return results;
}

export function detectEcosystemFromCommand(rawCommand: string): Ecosystem | null {
  const trimmed = rawCommand.trim();
  if (/^npm\s|^npx\s|^yarn\s|^pnpm\s/.test(trimmed)) return 'npm';
  if (/^pip\s|^pip3\s|^python\s+-m\s+pip\s/.test(trimmed)) return 'pip';
  if (/^cargo\s/.test(trimmed)) return 'cargo';
  if (/^go\s+(get|install)\s/.test(trimmed)) return 'go';
  return null;
}

export function buildDependencyRequest(intercepted: InterceptedCommand): DependencyRequest {
  return {
    packageName: intercepted.packageName,
    version: intercepted.version,
    ecosystem: intercepted.ecosystem,
    requestedBy: 'cli',
    context: {
      reason: `Manual installation via: ${intercepted.rawCommand}`,
    },
  };
}

export function isInstallCommand(rawCommand: string): boolean {
  return interceptCommand(rawCommand).length > 0;
}

export function validateCommand(rawCommand: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rawCommand || rawCommand.trim().length === 0) {
    errors.push('Empty command');
    return { valid: false, errors };
  }

  const ecosystem = detectEcosystemFromCommand(rawCommand);
  if (!ecosystem) {
    errors.push('Unrecognized package manager — supported: npm, pip, cargo, go');
    return { valid: false, errors };
  }

  const packageInfo = extractPackageName(rawCommand, ecosystem);
  if (!packageInfo) {
    errors.push('Could not extract package name from command');
    return { valid: false, errors };
  }

  if (packageInfo.name.length === 0) {
    errors.push('Package name is empty');
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

export function wrapCommand(rawCommand: string, enforceGovernance: boolean = true): string {
  if (!enforceGovernance) return rawCommand;

  const ecosystem = detectEcosystemFromCommand(rawCommand);
  if (!ecosystem) return rawCommand;

  return `vibe-guard intercept -- "${rawCommand}"`;
}
