import type { KnowledgeItem, KnowledgeCategory, Ecosystem, PackageInfo } from '../types/index.js';
import { getAllKnownPackages } from '../ecosystem/analyzer.js';
import { getKnownCves, getAbandonedPackages } from '../security/index.js';
import { getDefaultPolicies } from '../policy/engine.js';

interface KnowledgeDb {
  items: KnowledgeItem[];
  packageIndex: Map<string, KnowledgeItem>;
  capabilityIndex: Map<string, KnowledgeItem[]>;
  lastUpdate: Date;
}

const db: KnowledgeDb = {
  items: [],
  packageIndex: new Map(),
  capabilityIndex: new Map(),
  lastUpdate: new Date(),
};

function generateId(): string {
  return `KI-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ingestPackageKnowledge(
  pkg: PackageInfo,
  source: string,
  category: KnowledgeCategory,
  capabilities: string[],
  alternativeLibraries: string[],
  confidenceScore: number,
): KnowledgeItem {
  const id = generateId();
  const item: KnowledgeItem = {
    id,
    source,
    category,
    capability: pkg.purpose,
    riskScore: 0,
    alternativeLibraries,
    confidenceScore,
    benchmarkImpact: 0,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.items.push(item);
  db.packageIndex.set(pkg.name, item);

  for (const cap of capabilities) {
    const existing = db.capabilityIndex.get(cap) ?? [];
    existing.push(item);
    db.capabilityIndex.set(cap, existing);
  }

  db.lastUpdate = new Date();
  return item;
}

export function ingestSecurityKnowledge(category: KnowledgeCategory): KnowledgeItem[] {
  const cves = getKnownCves();
  const abandoned = getAbandonedPackages();
  const items: KnowledgeItem[] = [];

  for (const [pkg, cveList] of Object.entries(cves)) {
    if (cveList.length === 0) continue;
    const id = generateId();
    const item: KnowledgeItem = {
      id,
      source: 'security-db',
      category,
      capability: 'vulnerability-tracking',
      riskScore: Math.min(cveList.length * 25, 100),
      alternativeLibraries: [],
      confidenceScore: 0.9,
      benchmarkImpact: cveList.length > 2 ? 10 : 3,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.items.push(item);
    db.packageIndex.set(`sec:${pkg}`, item);
    items.push(item);
  }

  for (const [pkg, _isAbandoned] of Object.entries(abandoned)) {
    const id = generateId();
    const item: KnowledgeItem = {
      id,
      source: 'security-db',
      category,
      capability: 'abandonment-tracking',
      riskScore: 80,
      alternativeLibraries: [],
      confidenceScore: 0.95,
      benchmarkImpact: 15,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.items.push(item);
    db.packageIndex.set(`abandoned:${pkg}`, item);
    items.push(item);
  }

  db.lastUpdate = new Date();
  return items;
}

export function ingestGovernanceKnowledge(): KnowledgeItem[] {
  const policies = getDefaultPolicies();
  const items: KnowledgeItem[] = [];

  for (const policy of policies) {
    const id = generateId();
    const item: KnowledgeItem = {
      id,
      source: 'policy-engine',
      category: 'dependency-governance',
      capability: 'policy-enforcement',
      riskScore: 0,
      alternativeLibraries: [],
      confidenceScore: 0.98,
      benchmarkImpact: 5,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.items.push(item);
    items.push(item);
  }

  db.lastUpdate = new Date();
  return items;
}

export function buildCapabilityMap(
  ecosystem?: Ecosystem,
): Record<string, string[]> {
  const packages = getAllKnownPackages(ecosystem);
  const capabilityMap: Record<string, string[]> = {};

  for (const pkg of packages) {
    const existing = capabilityMap[pkg.purpose] ?? [];
    existing.push(pkg.name);
    capabilityMap[pkg.purpose] = existing;
  }

  return capabilityMap;
}

export function searchByCapability(capability: string): KnowledgeItem[] {
  const results: KnowledgeItem[] = [];

  for (const [cap, items] of db.capabilityIndex.entries()) {
    if (cap.toLowerCase().includes(capability.toLowerCase())) {
      results.push(...items);
    }
  }

  return [...new Map(results.map(item => [item.id, item])).values()];
}

export function searchByPackage(name: string): KnowledgeItem | undefined {
  return db.packageIndex.get(name);
}

export function searchByCategory(category: KnowledgeCategory): KnowledgeItem[] {
  return db.items.filter(item => item.category === category);
}

export function getAllKnowledge(): KnowledgeItem[] {
  return [...db.items];
}

export function getKnowledgeStats(): {
  totalItems: number;
  byCategory: Record<string, number>;
  lastUpdate: Date;
} {
  const byCategory: Record<string, number> = {};
  for (const item of db.items) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  }

  return {
    totalItems: db.items.length,
    byCategory,
    lastUpdate: db.lastUpdate,
  };
}

export function initializeKnowledgeBase(): void {
  const packages = getAllKnownPackages();

  for (const pkg of packages) {
    const samePurpose = packages.filter(
      p => p.purpose === pkg.purpose && p.name !== pkg.name,
    );
    const alternatives = samePurpose.map(p => p.name);
    const capabilities = [pkg.purpose, ...pkg.apiSurface.map(api => `${pkg.purpose}:${api}`)];

    ingestPackageKnowledge(
      pkg,
      'ecosystem-analyzer',
      'dependency-governance',
      capabilities,
      alternatives,
      0.85,
    );
  }

  ingestSecurityKnowledge('supply-chain-security');
  ingestGovernanceKnowledge();
}
