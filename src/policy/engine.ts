import type {
  PolicyRule,
  PolicyEvaluation,
  PolicyViolation,
  PolicyCondition,
  Ecosystem,
  DependencyRequest,
  PackageInfo,
  SecurityReport,
  CapabilityProfile,
  ApprovalDecision,
} from '../types/index.js';

const DEFAULT_POLICIES: PolicyRule[] = [
  {
    id: 'POL-001',
    name: 'No abandoned packages',
    description: 'Block packages that are abandoned or unmaintained',
    type: 'block',
    conditions: [
      { field: 'securityReport.lastReleaseActivity', operator: 'equals', value: 'abandoned' },
    ],
  },
  {
    id: 'POL-002',
    name: 'No critical supply chain risk',
    description: 'Block packages with critical supply chain risk',
    type: 'block',
    conditions: [
      { field: 'securityReport.supplyChainRisk', operator: 'equals', value: 'critical' },
    ],
  },
  {
    id: 'POL-003',
    name: 'High risk requires justification',
    description: 'Packages with risk score > 70 require written justification',
    type: 'require-justification',
    conditions: [
      { field: 'securityReport.riskScore', operator: 'gt', value: 70 },
    ],
  },
  {
    id: 'POL-004',
    name: 'No typosquatting risk',
    description: 'Block packages with known typosquatting or confusion risks',
    type: 'block',
    conditions: [
      { field: 'securityReport.hasTyposquattingRisk', operator: 'equals', value: true },
    ],
  },
  {
    id: 'POL-005',
    name: 'Prefer approved core stack',
    description: 'Warn when a package duplicates functionality already in the approved core stack',
    type: 'warn',
    conditions: [
      { field: 'capabilityProfile.isRedundant', operator: 'equals', value: true },
    ],
  },
  {
    id: 'POL-006',
    name: 'No duplicate functionality',
    description: 'Reject packages that duplicate existing project dependencies',
    type: 'require-review',
    conditions: [
      { field: 'capabilityProfile.redundancyScore', operator: 'gt', value: 60 },
    ],
  },
  {
    id: 'POL-007',
    name: 'Medium risk requires review',
    description: 'Packages with risk score > 40 require governance review',
    type: 'require-review',
    conditions: [
      { field: 'securityReport.riskScore', operator: 'gt', value: 40 },
    ],
  },
  {
    id: 'POL-008',
    name: 'Known CVEs require review',
    description: 'Packages with known CVEs require careful review',
    type: 'require-review',
    conditions: [
      { field: 'securityReport.knownCves.length', operator: 'gt', value: 0 },
    ],
  },
];

function evaluateCondition(condition: PolicyCondition, value: unknown): boolean {
  switch (condition.operator) {
    case 'equals': return value === condition.value;
    case 'not-equals': return value !== condition.value;
    case 'gt': return (typeof value === 'number' && typeof condition.value === 'number') ? value > condition.value : false;
    case 'lt': return (typeof value === 'number' && typeof condition.value === 'number') ? value < condition.value : false;
    case 'contains': {
      if (typeof value === 'string' && typeof condition.value === 'string') return value.includes(condition.value);
      if (Array.isArray(value) && typeof condition.value === 'string') return value.includes(condition.value);
      return false;
    }
    case 'not-contains': {
      if (typeof value === 'string' && typeof condition.value === 'string') return !value.includes(condition.value);
      if (Array.isArray(value) && typeof condition.value === 'string') return !value.includes(condition.value);
      return true;
    }
    case 'matches-regex': {
      if (typeof value === 'string' && typeof condition.value === 'string') {
        return new RegExp(condition.value).test(value);
      }
      return false;
    }
    default: return false;
  }
}

function resolveField(obj: Record<string, unknown>, fieldPath: string): unknown {
  const parts = fieldPath.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function buildEvaluationContext(
  request: DependencyRequest,
  packageInfo: PackageInfo | null,
  capabilityProfile: CapabilityProfile | null,
  securityReport: SecurityReport | null,
): Record<string, unknown> {
  return {
    request: {
      packageName: request.packageName,
      version: request.version,
      ecosystem: request.ecosystem,
      requestedBy: request.requestedBy,
      reason: request.context?.reason ?? '',
      existingDependencies: request.context?.existingDependencies ?? [],
    },
    packageInfo: packageInfo ?? {},
    capabilityProfile: capabilityProfile ?? { isRedundant: false, redundancyScore: 0 },
    securityReport: securityReport ?? {
      riskScore: 0,
      knownCves: [],
      supplyChainRisk: 'low',
      lastReleaseActivity: 'active',
      hasTyposquattingRisk: false,
      hasDependencyConfusionRisk: false,
    },
  };
}

export function evaluatePolicy(
  request: DependencyRequest,
  packageInfo: PackageInfo | null,
  capabilityProfile: CapabilityProfile | null,
  securityReport: SecurityReport | null,
  customPolicies?: PolicyRule[],
): PolicyEvaluation {
  const policies = customPolicies ?? DEFAULT_POLICIES;
  const context = buildEvaluationContext(request, packageInfo, capabilityProfile, securityReport);
  const violations: PolicyViolation[] = [];
  const warnings: PolicyViolation[] = [];

  for (const rule of policies) {
    if (rule.ecosystem && rule.ecosystem !== request.ecosystem) continue;

    const allConditionsMet = rule.conditions.every(condition => {
      const value = resolveField(context, condition.field);
      return evaluateCondition(condition, value);
    });

    if (!allConditionsMet) continue;

    const violation: PolicyViolation = {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.type === 'block' ? 'block' : rule.type === 'warn' ? 'warn' : 'info',
      policyType: rule.type,
      message: rule.description,
      suggestedAction: rule.type === 'block'
        ? 'Choose an alternative package or seek governance exception'
        : rule.type === 'require-justification'
          ? 'Provide written justification for this dependency'
          : rule.type === 'require-review'
            ? 'Submit for governance review before installation'
            : 'Proceed with caution',
    };

    if (rule.type === 'block') {
      violations.push(violation);
    } else if (rule.type === 'warn') {
      warnings.push(violation);
    } else {
      violations.push(violation);
    }
  }

  const blockingViolations = violations.filter(v => v.severity === 'block');
  const passed = blockingViolations.length === 0;

  return {
    passed,
    violations,
    warnings,
    justifications: request.context?.reason ? [request.context.reason] : [],
  };
}

export function getDecision(
  evaluation: PolicyEvaluation,
  securityReport: SecurityReport | null,
  capabilityProfile: CapabilityProfile | null,
): { decision: ApprovalDecision; reason: string } {
  const blockingViolations = evaluation.violations.filter(v => v.severity === 'block');

  if (blockingViolations.length > 0) {
    return {
      decision: 'rejected',
      reason: `Blocked by policies: ${blockingViolations.map(v => v.ruleName).join(', ')}`,
    };
  }

  const justificationsNeeded = evaluation.violations.filter(
    v => v.policyType === 'require-justification',
  );

  if (justificationsNeeded.length > 0 && evaluation.justifications.length === 0) {
    return {
      decision: 'needs-justification',
      reason: `Justification required for: ${justificationsNeeded.map(v => v.ruleName).join(', ')}`,
    };
  }

  const requiresReview = evaluation.violations.filter(
    v => v.policyType === 'require-review',
  );

  if (requiresReview.length > 0) {
    return {
      decision: 'needs-review',
      reason: `Review required for: ${requiresReview.map(v => v.ruleName).join(', ')}`,
    };
  }

  if (capabilityProfile?.isRedundant && capabilityProfile.redundancyScore > 80) {
    return {
      decision: 'needs-review',
      reason: `High redundancy detected (${capabilityProfile.redundancyScore}%) — overlaps with: ${capabilityProfile.overlaps.join(', ')}`,
    };
  }

  if (securityReport && securityReport.riskScore > 50) {
    return {
      decision: 'needs-review',
      reason: `Elevated security risk (${securityReport.riskScore}/100)`,
    };
  }

  return {
    decision: 'approved',
    reason: 'Package meets all governance requirements',
  };
}

export function getDefaultPolicies(): PolicyRule[] {
  return [...DEFAULT_POLICIES];
}

export function registerPolicy(policy: PolicyRule): void {
  const existingIndex = DEFAULT_POLICIES.findIndex(p => p.id === policy.id);
  if (existingIndex >= 0) {
    DEFAULT_POLICIES[existingIndex] = policy;
  } else {
    DEFAULT_POLICIES.push(policy);
  }
}
