import type {
  DependencyRequest,
  GovernanceReport,
  PackageInfo,
  CapabilityProfile,
  SecurityReport,
  PolicyEvaluation,
  AlternativeRecommendation,
  ApprovalDecision,
  Ecosystem,
} from './types/index.js';
import { analyzePackage, buildCapabilityProfile, detectDuplicateFunctionality, getAllKnownPackages, classifyPackage, getApprovedCoreStack } from './ecosystem/analyzer.js';
import { analyzeSecurity, getSecuritySummary } from './security/index.js';
import { evaluatePolicy, getDecision } from './policy/engine.js';
import { recordGovernanceReport, getTracker } from './policy/governance.js';
import { searchSimilarPackages } from './knowledge/rag.js';
import { generateRefactoringSuggestions, shouldSuggestRefactoring, detectNativeAlternatives } from './knowledge/refactoring.js';
import { initializeKnowledgeBase } from './knowledge/base.js';

let initialized = false;

function ensureInitialized(): void {
  if (!initialized) {
    initializeKnowledgeBase();
    initialized = true;
  }
}

export interface GovernanceOptions {
  strictMode?: boolean;
  allowUnlistedPackages?: boolean;
  skipSecurityAnalysis?: boolean;
  skipCapabilityAnalysis?: boolean;
  autoApproveLowRisk?: boolean;
}

export function govern(
  request: DependencyRequest,
  options: GovernanceOptions = {},
): GovernanceReport {
  ensureInitialized();

  const allPackages = getAllKnownPackages();

  let packageInfo: PackageInfo | null = null;
  let capabilityProfile: CapabilityProfile | null = null;
  let securityReport: SecurityReport | null = null;
  let alternatives: AlternativeRecommendation[] = [];
  let refactoringSuggestions: string[] = [];

  packageInfo = analyzePackage(request);

  if (!packageInfo && !options.allowUnlistedPackages) {
    packageInfo = {
      name: request.packageName,
      version: request.version ?? 'unknown',
      ecosystem: request.ecosystem,
      description: 'Unlisted package — limited analysis available',
      purpose: 'unknown',
      apiSurface: [],
      dependencies: [],
      maintainers: [{ name: 'unknown', reputation: 'unknown' }],
    };
  }

  if (packageInfo && !options.skipCapabilityAnalysis) {
    capabilityProfile = buildCapabilityProfile(packageInfo, allPackages);
  }

  if (packageInfo && !options.skipSecurityAnalysis) {
    securityReport = analyzeSecurity(packageInfo);
  }

  const policyEvaluation = evaluatePolicy(
    request,
    packageInfo,
    capabilityProfile,
    securityReport,
  );

  const decisionResult = getDecision(policyEvaluation, securityReport, capabilityProfile);

  if (packageInfo) {
    const existingDeps = request.context?.existingDependencies ?? [];
    alternatives = searchSimilarPackages(
      packageInfo,
      allPackages,
      existingDeps,
    );

    if (shouldSuggestRefactoring(packageInfo, alternatives)) {
      refactoringSuggestions = generateRefactoringSuggestions(packageInfo);
    }

    const duplicates = detectDuplicateFunctionality(packageInfo, existingDeps);
    if (duplicates.length > 0) {
      for (const dup of duplicates) {
        if (!alternatives.some(a => a.name === dup)) {
          alternatives.unshift({
            name: dup,
            ecosystem: request.ecosystem,
            reason: `Already in your project as: ${dup}`,
            isExistingDep: true,
            isNativeApi: false,
            confidenceScore: 1.0,
          });
        }
      }
    }

    const coreStack = getApprovedCoreStack(request.ecosystem);
    const purpose = classifyPackage(packageInfo);
    const coreAlternative = Object.entries(coreStack).find(
      ([category]) => category.toLowerCase() === purpose.toLowerCase(),
    );

    if (coreAlternative && coreAlternative[1] !== packageInfo.name) {
      const alreadySuggested = alternatives.some(a => a.name === coreAlternative[1]);
      if (!alreadySuggested) {
        alternatives.push({
          name: coreAlternative[1],
          ecosystem: request.ecosystem,
          reason: `Approved core stack package for ${purpose} (${coreAlternative[0]})`,
          isExistingDep: false,
          isNativeApi: false,
          confidenceScore: 0.9,
        });
      }
    }
  }

  let finalDecision = decisionResult.decision;
  let finalReason = decisionResult.reason;

  if (options.autoApproveLowRisk && securityReport && securityReport.riskScore <= 20) {
    if (finalDecision === 'needs-review') {
      finalDecision = 'approved';
      finalReason = `Auto-approved: low risk (${securityReport.riskScore}/100)`;
    }
  }

  const report: GovernanceReport = {
    request,
    packageInfo,
    capabilityProfile,
    securityReport,
    policyEvaluation,
    alternatives: alternatives.slice(0, 5),
    decision: finalDecision,
    decisionReason: finalReason,
    refactoringSuggestions,
    timestamp: new Date(),
  };

  recordGovernanceReport(report);

  return report;
}

export function governBatch(
  requests: DependencyRequest[],
  options: GovernanceOptions = {},
): GovernanceReport[] {
  return requests.map(req => govern(req, options));
}

export function isApproved(ecosystem: Ecosystem, packageName: string): boolean {
  ensureInitialized();
  return getTracker().isApproved(ecosystem, packageName);
}

export function getApprovedStack(): Record<string, string[]> {
  ensureInitialized();
  return getTracker().getApprovedDependencies();
}

export { initializeKnowledgeBase };
