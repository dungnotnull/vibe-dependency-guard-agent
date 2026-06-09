import type { Ecosystem, PackageInfo, AlternativeRecommendation, CapabilityProfile } from '../types/index.js';
import { getAllKnownPackages, buildCapabilityProfile } from '../ecosystem/analyzer.js';
import { searchByCapability, buildCapabilityMap } from '../knowledge/base.js';
import { getApprovedCoreStack } from '../ecosystem/analyzer.js';

interface EmbeddingVector {
  packageName: string;
  ecosystem: Ecosystem;
  vector: number[];
  capabilities: string[];
}

interface SearchResult {
  packageName: string;
  ecosystem: Ecosystem;
  similarityScore: number;
  capabilities: string[];
  reason: string;
}

class EmbeddingStore {
  private embeddings: EmbeddingVector[] = [];

  constructor() {
    this.buildFromKnownPackages();
  }

  private buildFromKnownPackages(): void {
    const packages = getAllKnownPackages();
    for (const pkg of packages) {
      const capabilities = [pkg.purpose, ...pkg.apiSurface];
      this.embeddings.push({
        packageName: pkg.name,
        ecosystem: pkg.ecosystem,
        vector: this.generateVector(capabilities),
        capabilities,
      });
    }
  }

  private generateVector(capabilities: string[]): number[] {
    let hash = 0;
    for (const cap of capabilities) {
      for (let i = 0; i < cap.length; i++) {
        const char = cap.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
    }

    const vector: number[] = [];
    const seed = Math.abs(hash);
    for (let i = 0; i < 64; i++) {
      const val = Math.sin(seed * (i + 1) * 0.01 + i * 0.7);
      vector.push(val);
    }

    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  search(queryCapabilities: string[], ecosystem?: Ecosystem, topK: number = 5): SearchResult[] {
    const queryVector = this.generateVector(queryCapabilities);
    const candidates = ecosystem
      ? this.embeddings.filter(e => e.ecosystem === ecosystem)
      : this.embeddings;

    const scored = candidates.map(candidate => ({
      packageName: candidate.packageName,
      ecosystem: candidate.ecosystem,
      similarityScore: this.cosineSimilarity(queryVector, candidate.vector),
      capabilities: candidate.capabilities,
      reason: '',
    }));

    scored.sort((a, b) => b.similarityScore - a.similarityScore);

    const top = scored.slice(0, topK);

    for (const result of top) {
      const overlappingCaps = queryCapabilities.filter(qc =>
        result.capabilities.some(cc =>
          cc.toLowerCase().includes(qc.toLowerCase()) ||
          qc.toLowerCase().includes(cc.toLowerCase()),
        ),
      );
      if (overlappingCaps.length > 0) {
        result.reason = `Shared capabilities: ${overlappingCaps.join(', ')}`;
      } else {
        result.reason = `Similar purpose based on capability embedding`;
      }
    }

    return top;
  }

  add(packageName: string, ecosystem: Ecosystem, capabilities: string[]): void {
    const exists = this.embeddings.some(
      e => e.packageName === packageName && e.ecosystem === ecosystem,
    );
    if (!exists) {
      this.embeddings.push({
        packageName,
        ecosystem,
        vector: this.generateVector(capabilities),
        capabilities,
      });
    }
  }

  getStats(): { totalEmbeddings: number; byEcosystem: Record<string, number> } {
    const byEcosystem: Record<string, number> = {};
    for (const e of this.embeddings) {
      byEcosystem[e.ecosystem] = (byEcosystem[e.ecosystem] ?? 0) + 1;
    }
    return { totalEmbeddings: this.embeddings.length, byEcosystem };
  }
}

let embeddingStore: EmbeddingStore | null = null;

export function getEmbeddingStore(): EmbeddingStore {
  if (!embeddingStore) {
    embeddingStore = new EmbeddingStore();
  }
  return embeddingStore;
}

export function searchSimilarPackages(
  pkg: PackageInfo,
  allPackages: PackageInfo[],
  existingDependencies: string[] = [],
): AlternativeRecommendation[] {
  const profile = buildCapabilityProfile(pkg, allPackages);
  const store = getEmbeddingStore();

  const searchResults = store.search(
    profile.capabilities,
    pkg.ecosystem,
    10,
  );

  const recommendations: AlternativeRecommendation[] = [];
  const seen = new Set<string>();
  seen.add(pkg.name);

  const coreStack = getApprovedCoreStack(pkg.ecosystem);
  for (const [_category, approvedPkg] of Object.entries(coreStack)) {
    if (approvedPkg !== pkg.name && !seen.has(approvedPkg)) {
      const approvedInfo = allPackages.find(ap => ap.name === approvedPkg);
      if (approvedInfo && approvedInfo.purpose === pkg.purpose) {
        seen.add(approvedPkg);
        recommendations.push({
          name: approvedPkg,
          ecosystem: pkg.ecosystem,
          reason: `Approved core stack package for: ${approvedInfo.purpose}`,
          isExistingDep: existingDependencies.includes(approvedPkg),
          isNativeApi: false,
          confidenceScore: 0.95,
        });
      }
    }
  }

  for (const result of searchResults) {
    if (result.packageName === pkg.name || seen.has(result.packageName)) continue;
    seen.add(result.packageName);

    const altPkg = allPackages.find(ap => ap.name === result.packageName);
    if (!altPkg) continue;

    if (altPkg.purpose !== pkg.purpose) continue;

    recommendations.push({
      name: result.packageName,
      ecosystem: result.ecosystem,
      reason: result.reason,
      isExistingDep: existingDependencies.includes(result.packageName),
      isNativeApi: result.packageName.startsWith('@types/') ||
        (pkg.ecosystem === 'go' && !result.packageName.includes('/')),
      confidenceScore: Math.round(result.similarityScore * 100) / 100,
    });
  }

  recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return recommendations;
}

export function getCapabilitySearch(query: string, ecosystem?: Ecosystem): SearchResult[] {
  const store = getEmbeddingStore();
  const capabilities = [query];
  return store.search(capabilities, ecosystem, 10);
}

export function generateAlternativeRecommendations(
  requestPackage: PackageInfo,
  existingDependencies: string[] = [],
): AlternativeRecommendation[] {
  const allPackages = getAllKnownPackages(requestPackage.ecosystem);
  return searchSimilarPackages(requestPackage, allPackages, existingDependencies);
}
