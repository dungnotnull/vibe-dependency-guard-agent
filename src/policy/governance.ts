import type {
  GovernanceReport,
  DependencyRequest,
  Ecosystem,
  PackageInfo,
  CapabilityProfile,
  SecurityReport,
  PolicyEvaluation,
  AlternativeRecommendation,
  ApprovalDecision,
} from '../types/index.js';

interface DependencyGrowthRecord {
  date: Date;
  ecosystem: Ecosystem;
  packageCount: number;
  newPackages: string[];
  removedPackages: string[];
}

interface FeedbackRecord {
  id: string;
  request: DependencyRequest;
  systemDecision: ApprovalDecision;
  actualDecision: ApprovalDecision;
  wasCorrect: boolean;
  notes: string;
  timestamp: Date;
}

interface ComplianceRecord {
  timestamp: Date;
  ecosystem: Ecosystem;
  totalPackages: number;
  approvedPackages: number;
  bannedPackages: number;
  needsReview: number;
  complianceRate: number;
}

class GovernanceTracker {
  private reports: GovernanceReport[] = [];
  private growthHistory: DependencyGrowthRecord[] = [];
  private feedbackHistory: FeedbackRecord[] = [];
  private complianceHistory: ComplianceRecord[] = [];
  private approvedDeps: Map<string, Set<string>> = new Map();

  constructor() {
    for (const eco of ['npm', 'pip', 'cargo', 'go'] as Ecosystem[]) {
      this.approvedDeps.set(eco, new Set());
    }
  }

  recordReport(report: GovernanceReport): void {
    this.reports.push(report);

    if (report.decision === 'approved') {
      const deps = this.approvedDeps.get(report.request.ecosystem);
      if (deps) {
        deps.add(report.request.packageName);
      }
    }
  }

  getApprovedDependencies(ecosystem?: Ecosystem): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [eco, deps] of this.approvedDeps.entries()) {
      if (ecosystem && eco !== ecosystem) continue;
      result[eco] = [...deps].sort();
    }
    return result;
  }

  isApproved(ecosystem: Ecosystem, packageName: string): boolean {
    const deps = this.approvedDeps.get(ecosystem);
    return deps ? deps.has(packageName) : false;
  }

  recordGrowth(record: DependencyGrowthRecord): void {
    this.growthHistory.push(record);
  }

  getGrowthTrend(ecosystem?: Ecosystem): {
    history: DependencyGrowthRecord[];
    trend: 'growing' | 'stable' | 'shrinking';
    growthRate: number;
  } {
    const filtered = ecosystem
      ? this.growthHistory.filter(r => r.ecosystem === ecosystem)
      : this.growthHistory;

    if (filtered.length < 2) {
      return { history: filtered, trend: 'stable', growthRate: 0 };
    }

    const first = filtered[0].packageCount;
    const last = filtered[filtered.length - 1].packageCount;
    const growthRate = first > 0 ? ((last - first) / first) * 100 : 0;

    const trend = growthRate > 5 ? 'growing' : growthRate < -5 ? 'shrinking' : 'stable';

    return { history: filtered, trend, growthRate };
  }

  recordFeedback(feedback: FeedbackRecord): void {
    this.feedbackHistory.push(feedback);
  }

  getFeedbackStats(): {
    total: number;
    accuracy: number;
    falsePositives: number;
    falseNegatives: number;
  } {
    if (this.feedbackHistory.length === 0) {
      return { total: 0, accuracy: 0, falsePositives: 0, falseNegatives: 0 };
    }

    const correct = this.feedbackHistory.filter(f => f.wasCorrect).length;
    const falsePositives = this.feedbackHistory.filter(
      f => f.systemDecision === 'rejected' && f.actualDecision === 'approved',
    ).length;
    const falseNegatives = this.feedbackHistory.filter(
      f => f.systemDecision === 'approved' && f.actualDecision === 'rejected',
    ).length;

    return {
      total: this.feedbackHistory.length,
      accuracy: Math.round((correct / this.feedbackHistory.length) * 100),
      falsePositives,
      falseNegatives,
    };
  }

  generateComplianceReport(): ComplianceRecord {
    const ecosystemCounts: Record<Ecosystem, {
      total: number;
      approved: number;
      banned: number;
    }> = { npm: { total: 0, approved: 0, banned: 0 }, pip: { total: 0, approved: 0, banned: 0 }, cargo: { total: 0, approved: 0, banned: 0 }, go: { total: 0, approved: 0, banned: 0 } };

    for (const report of this.reports) {
      const eco = report.request.ecosystem;
      ecosystemCounts[eco].total++;

      if (report.decision === 'approved') ecosystemCounts[eco].approved++;
      if (report.decision === 'rejected') ecosystemCounts[eco].banned++;
    }

    const allTotals = Object.values(ecosystemCounts).reduce(
      (sum, c) => ({ total: sum.total + c.total, approved: sum.approved + c.approved, banned: sum.banned + c.banned }),
      { total: 0, approved: 0, banned: 0 },
    );

    const complianceRate = allTotals.total > 0
      ? Math.round(((allTotals.approved + allTotals.banned) / allTotals.total) * 100)
      : 100;

    const record: ComplianceRecord = {
      timestamp: new Date(),
      ecosystem: 'npm' as Ecosystem,
      totalPackages: allTotals.total,
      approvedPackages: allTotals.approved,
      bannedPackages: allTotals.banned,
      needsReview: allTotals.total - allTotals.approved - allTotals.banned,
      complianceRate,
    };

    this.complianceHistory.push(record);
    return record;
  }

  getReportHistory(): GovernanceReport[] {
    return [...this.reports];
  }

  getStats(): {
    totalDecisions: number;
    approved: number;
    rejected: number;
    needsReview: number;
    needsJustification: number;
    averageRiskScore: number;
    topBlockedPackages: { name: string; count: number }[];
    ecosystems: Record<string, number>;
  } {
    const decisionCounts = { approved: 0, rejected: 0, 'needs-review': 0, 'needs-justification': 0 };
    const riskScores: number[] = [];
    const blockedCount: Record<string, number> = {};
    const ecoCounts: Record<string, number> = {};

    for (const report of this.reports) {
      decisionCounts[report.decision]++;
      if (report.securityReport) {
        riskScores.push(report.securityReport.riskScore);
      }
      if (report.decision === 'rejected') {
        blockedCount[report.request.packageName] =
          (blockedCount[report.request.packageName] ?? 0) + 1;
      }
      ecoCounts[report.request.ecosystem] =
        (ecoCounts[report.request.ecosystem] ?? 0) + 1;
    }

    const topBlocked = Object.entries(blockedCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const avgRisk = riskScores.length > 0
      ? Math.round(riskScores.reduce((a, b) => a + b, 0) / riskScores.length)
      : 0;

    return {
      totalDecisions: this.reports.length,
      ...decisionCounts,
      needsReview: decisionCounts['needs-review'],
      needsJustification: decisionCounts['needs-justification'],
      averageRiskScore: avgRisk,
      topBlockedPackages: topBlocked,
      ecosystems: ecoCounts,
    };
  }

  clear(): void {
    this.reports = [];
    this.growthHistory = [];
    this.feedbackHistory = [];
    this.complianceHistory = [];
    for (const deps of this.approvedDeps.values()) {
      deps.clear();
    }
  }
}

const tracker = new GovernanceTracker();

export function getTracker(): GovernanceTracker {
  return tracker;
}

export function recordGovernanceReport(report: GovernanceReport): void {
  tracker.recordReport(report);
}

export function recordFeedback(
  request: DependencyRequest,
  systemDecision: ApprovalDecision,
  actualDecision: ApprovalDecision,
  notes: string = '',
): void {
  tracker.recordFeedback({
    id: `FB-${Date.now()}`,
    request,
    systemDecision,
    actualDecision,
    wasCorrect: systemDecision === actualDecision,
    notes,
    timestamp: new Date(),
  });
}

export function generateComplianceReport(): ComplianceRecord {
  return tracker.generateComplianceReport();
}

export function getDecisionHistory(): GovernanceReport[] {
  return tracker.getReportHistory();
}

export function getGovernanceStats() {
  return tracker.getStats();
}

export function getApprovedDeps(ecosystem?: Ecosystem): Record<string, string[]> {
  return tracker.getApprovedDependencies(ecosystem);
}

export function resetTracker(): void {
  tracker.clear();
}
