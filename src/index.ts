export type {
  Ecosystem,
  DependencyRequest,
  PackageInfo,
  MaintainerInfo,
  CapabilityProfile,
  SecurityReport,
  PolicyRule,
  PolicyCondition,
  PolicyEvaluation,
  PolicyViolation,
  ApprovalDecision,
  GovernanceReport,
  AlternativeRecommendation,
  KnowledgeItem,
  KnowledgeCategory,
  EcosystemRegistry,
} from './types/index.js';

export { govern, governBatch, isApproved, getApprovedStack, initializeKnowledgeBase } from './orchestrator.js';
export type { GovernanceOptions } from './orchestrator.js';

export {
  analyzePackage,
  classifyPackage,
  buildCapabilityProfile,
  detectDuplicateFunctionality,
  getApprovedCoreStack,
  getAllKnownPackages,
  getRegistry,
} from './ecosystem/analyzer.js';

export {
  interceptCommand,
  detectEcosystemFromCommand,
  buildDependencyRequest,
  isInstallCommand,
  validateCommand,
  wrapCommand,
} from './ecosystem/interceptor.js';
export type { InterceptedCommand } from './ecosystem/interceptor.js';

export {
  analyzeSecurity,
  getSecuritySummary,
  getKnownCves,
  getAbandonedPackages,
} from './security/index.js';

export {
  evaluatePolicy,
  getDecision,
  getDefaultPolicies,
  registerPolicy,
} from './policy/engine.js';

export {
  recordGovernanceReport,
  recordFeedback,
  generateComplianceReport,
  getDecisionHistory,
  getGovernanceStats,
  getApprovedDeps,
  getTracker,
  resetTracker,
} from './policy/governance.js';

export {
  searchSimilarPackages,
  generateAlternativeRecommendations,
  getCapabilitySearch,
  getEmbeddingStore,
} from './knowledge/rag.js';

export {
  detectNativeAlternatives,
  generateRefactoringSuggestions,
  shouldSuggestRefactoring,
  getAllNativeApiMappings,
  getNativeAlternativesForEcosystem,
} from './knowledge/refactoring.js';

export {
  ingestPackageKnowledge,
  ingestSecurityKnowledge,
  ingestGovernanceKnowledge,
  buildCapabilityMap,
  searchByCapability,
  searchByPackage,
  searchByCategory,
  getAllKnowledge,
  getKnowledgeStats,
} from './knowledge/base.js';
