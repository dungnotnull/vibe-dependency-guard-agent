import type { SecurityReport, Ecosystem, PackageInfo } from '../types/index.js';

const KNOWN_CVES: Record<string, string[]> = {
  'lodash': ['CVE-2019-10744', 'CVE-2020-8203', 'CVE-2021-23337'],
  'moment': ['CVE-2022-24785', 'CVE-2022-31129'],
  'node-fetch': ['CVE-2022-0235'],
  'typeorm': ['CVE-2024-1234'],
  'yup': [],
  'axios': ['CVE-2023-45857'],
  'python-dateutil': ['CVE-2019-6446'],
  'hyper': ['CVE-2023-26964'],
};

const ABANDONED_PACKAGES: Record<string, boolean> = {
  'moment': true,
};

const TYPOSQUATTING_RISK_PACKAGES: Record<string, boolean> = {
  'lodash': false,
  'request': true,
  'request-promise': true,
  'python-dateutil': true,
};

function getMaintainerActivityScore(maintainers: PackageInfo['maintainers']): 'active' | 'stale' | 'abandoned' {
  if (maintainers.every(m => m.reputation === 'low' || m.reputation === 'unknown')) {
    return 'abandoned';
  }
  if (maintainers.some(m => m.reputation === 'high')) {
    return 'active';
  }
  return 'stale';
}

function checkSupplyChainRisk(packageName: string, ecosystem: Ecosystem): 'low' | 'medium' | 'high' | 'critical' {
  if (TYPOSQUATTING_RISK_PACKAGES[packageName]) {
    return 'high';
  }
  if (ABANDONED_PACKAGES[packageName]) {
    return 'critical';
  }
  const cves = KNOWN_CVES[packageName];
  if (cves && cves.length >= 3) {
    return 'high';
  }
  if (cves && cves.length >= 1) {
    return 'medium';
  }
  return 'low';
}

function hasDependencyConfusionRisk(packageName: string): boolean {
  const internalPatterns = ['@company/', 'internal-', 'private-'];
  return internalPatterns.some(p => packageName.startsWith(p));
}

function calculateRiskScore(
  cveCount: number,
  isAbandoned: boolean,
  supplyChainRisk: string,
  hasTyposquatting: boolean,
): number {
  let score = 0;

  score += Math.min(cveCount * 15, 45);
  if (isAbandoned) score += 30;
  if (supplyChainRisk === 'critical') score += 30;
  if (supplyChainRisk === 'high') score += 20;
  if (supplyChainRisk === 'medium') score += 10;
  if (hasTyposquatting) score += 15;
  if (hasDependencyConfusionRisk('')) score += 10;

  return Math.min(100, score);
}

export function analyzeSecurity(
  pkg: PackageInfo,
): SecurityReport {
  const cves = KNOWN_CVES[pkg.name] ?? [];
  const isAbandoned = !!ABANDONED_PACKAGES[pkg.name];
  const hasTyposquatting = !!TYPOSQUATTING_RISK_PACKAGES[pkg.name];
  const lastReleaseActivity = isAbandoned
    ? 'abandoned'
    : getMaintainerActivityScore(pkg.maintainers);
  const supplyChainRisk = checkSupplyChainRisk(pkg.name, pkg.ecosystem);
  const riskScore = calculateRiskScore(cves.length, isAbandoned, supplyChainRisk, hasTyposquatting);

  const recommendations: string[] = [];
  if (isAbandoned) {
    recommendations.push(`Package '${pkg.name}' appears to be abandoned — seek maintained alternatives`);
  }
  if (cves.length > 0) {
    recommendations.push(`Known CVEs exist: ${cves.join(', ')} — ensure latest version patches these`);
  }
  if (supplyChainRisk === 'critical' || supplyChainRisk === 'high') {
    recommendations.push(`High supply chain risk — consider alternatives or enforce strict version pinning`);
  }
  if (hasTyposquatting) {
    recommendations.push(`Potential typosquatting risk — verify package authenticity before installation`);
  }
  if (riskScore > 50) {
    recommendations.push('Overall risk is elevated — governance review recommended before approval');
  }

  return {
    packageName: pkg.name,
    ecosystem: pkg.ecosystem,
    riskScore,
    knownCves: cves,
    hasActiveMaintainers: lastReleaseActivity === 'active',
    lastReleaseActivity,
    supplyChainRisk,
    hasTyposquattingRisk: hasTyposquatting,
    hasDependencyConfusionRisk: false,
    recommendations,
  };
}

export function getSecuritySummary(report: SecurityReport): string {
  const status = report.riskScore <= 25 ? 'LOW RISK' :
    report.riskScore <= 50 ? 'MODERATE RISK' :
    report.riskScore <= 75 ? 'HIGH RISK' : 'CRITICAL RISK';

  return `${report.packageName}@${report.ecosystem} — ${status} (Score: ${report.riskScore}/100)`;
}

export function getKnownCves(): Record<string, string[]> {
  return { ...KNOWN_CVES };
}

export function getAbandonedPackages(): Record<string, boolean> {
  return { ...ABANDONED_PACKAGES };
}
