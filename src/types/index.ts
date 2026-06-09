export type Ecosystem = 'npm' | 'pip' | 'cargo' | 'go';

export interface DependencyRequest {
  packageName: string;
  version?: string;
  ecosystem: Ecosystem;
  requestedBy: 'cli' | 'ai-agent' | 'pull-request' | 'code-generation';
  context?: {
    projectPath?: string;
    existingDependencies?: string[];
    reason?: string;
  };
}

export interface PackageInfo {
  name: string;
  version: string;
  ecosystem: Ecosystem;
  description?: string;
  purpose: string;
  apiSurface: string[];
  dependencies: string[];
  downloads?: number;
  lastPublished?: Date;
  license?: string;
  repository?: string;
  maintainers: MaintainerInfo[];
}

export interface MaintainerInfo {
  name: string;
  email?: string;
  reputation: 'unknown' | 'low' | 'medium' | 'high';
}

export interface CapabilityProfile {
  packageName: string;
  ecosystem: Ecosystem;
  capabilities: string[];
  similarTo: string[];
  overlaps: string[];
  isRedundant: boolean;
  redundancyScore: number;
}

export interface SecurityReport {
  packageName: string;
  ecosystem: Ecosystem;
  riskScore: number;
  knownCves: string[];
  hasActiveMaintainers: boolean;
  lastReleaseActivity: 'active' | 'stale' | 'abandoned';
  supplyChainRisk: 'low' | 'medium' | 'high' | 'critical';
  hasTyposquattingRisk: boolean;
  hasDependencyConfusionRisk: boolean;
  recommendations: string[];
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  ecosystem?: Ecosystem;
  type: 'block' | 'warn' | 'require-justification' | 'require-review';
  conditions: PolicyCondition[];
}

export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'not-equals' | 'gt' | 'lt' | 'contains' | 'not-contains' | 'matches-regex';
  value: string | number | boolean;
}

export interface PolicyEvaluation {
  passed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  justifications: string[];
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: 'block' | 'warn' | 'info';
  policyType: PolicyRule['type'];
  message: string;
  suggestedAction: string;
}

export type ApprovalDecision = 'approved' | 'rejected' | 'needs-review' | 'needs-justification';

export interface GovernanceReport {
  request: DependencyRequest;
  packageInfo: PackageInfo | null;
  capabilityProfile: CapabilityProfile | null;
  securityReport: SecurityReport | null;
  policyEvaluation: PolicyEvaluation;
  alternatives: AlternativeRecommendation[];
  decision: ApprovalDecision;
  decisionReason: string;
  refactoringSuggestions: string[];
  timestamp: Date;
}

export interface AlternativeRecommendation {
  name: string;
  ecosystem: Ecosystem;
  reason: string;
  isExistingDep: boolean;
  isNativeApi: boolean;
  confidenceScore: number;
}

export interface KnowledgeItem {
  id: string;
  source: string;
  category: KnowledgeCategory;
  capability: string;
  riskScore: number;
  alternativeLibraries: string[];
  confidenceScore: number;
  benchmarkImpact: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type KnowledgeCategory =
  | 'dependency-governance'
  | 'supply-chain-security'
  | 'dependency-replacement'
  | 'architecture-consistency';

export interface EcosystemRegistry {
  ecosystem: Ecosystem;
  approvedPackages: string[];
  bannedPackages: string[];
  coreStack: Record<string, string>;
}
