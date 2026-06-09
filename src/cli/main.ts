import type { DependencyRequest, Ecosystem, GovernanceReport } from '../types/index.js';
import { govern, governBatch } from '../orchestrator.js';
import { interceptCommand, buildDependencyRequest, detectEcosystemFromCommand } from '../ecosystem/interceptor.js';
import { getSecuritySummary } from '../security/index.js';
import { getGovernanceStats, generateComplianceReport, getApprovedDeps } from '../policy/governance.js';
import { getEmbeddingStore } from '../knowledge/rag.js';
import { getNativeAlternativesForEcosystem } from '../knowledge/refactoring.js';
import { getKnowledgeStats } from '../knowledge/base.js';

function formatReport(report: GovernanceReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('═══════════════════════════════════════════════');
  lines.push('  VIBE DEPENDENCY GUARD — GOVERNANCE REPORT');
  lines.push('═══════════════════════════════════════════════');
  lines.push('');
  lines.push(`  Package:     ${report.request.packageName}${report.request.version ? `@${report.request.version}` : ''}`);
  lines.push(`  Ecosystem:   ${report.request.ecosystem}`);
  lines.push(`  Requested:   ${report.request.requestedBy}`);
  lines.push(`  Time:        ${report.timestamp.toISOString()}`);
  lines.push('');

  if (report.packageInfo) {
    const pkg = report.packageInfo;
    lines.push('  📦 PACKAGE INFO');
    lines.push(`    Purpose:     ${pkg.purpose}`);
    lines.push(`    Description: ${pkg.description ?? 'N/A'}`);
    lines.push(`    License:     ${pkg.license ?? 'N/A'}`);
    lines.push(`    Maintainers: ${pkg.maintainers.map(m => `${m.name} (${m.reputation})`).join(', ')}`);
    lines.push('');
  }

  if (report.securityReport) {
    const sec = report.securityReport;
    lines.push('  🔒 SECURITY ASSESSMENT');
    lines.push(`    ${getSecuritySummary(sec)}`);
    lines.push(`    Activity:        ${sec.lastReleaseActivity}`);
    lines.push(`    Supply Chain:    ${sec.supplyChainRisk}`);
    if (sec.knownCves.length > 0) {
      lines.push(`    Known CVEs:      ${sec.knownCves.join(', ')}`);
    }
    if (sec.recommendations.length > 0) {
      lines.push(`    Recommendations: ${sec.recommendations.join('; ')}`);
    }
    lines.push('');
  }

  if (report.capabilityProfile) {
    const prof = report.capabilityProfile;
    lines.push('  🔍 CAPABILITY ANALYSIS');
    lines.push(`    Capabilities: ${prof.capabilities.slice(0, 5).join(', ')}`);
    if (prof.similarTo.length > 0) {
      lines.push(`    Similar to:   ${prof.similarTo.join(', ')}`);
    }
    if (prof.isRedundant) {
      lines.push(`    ⚠ REDUNDANT — Score: ${prof.redundancyScore}%`);
      lines.push(`    Overlaps with: ${prof.overlaps.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('  📋 POLICY EVALUATION');
  lines.push(`    Result: ${report.policyEvaluation.passed ? '✅ PASSED' : '❌ FAILED'}`);
  if (report.policyEvaluation.violations.length > 0) {
    for (const v of report.policyEvaluation.violations) {
      lines.push(`    [${v.severity.toUpperCase()}] ${v.ruleName}: ${v.message}`);
    }
  }
  if (report.policyEvaluation.warnings.length > 0) {
    for (const w of report.policyEvaluation.warnings) {
      lines.push(`    [WARN] ${w.ruleName}: ${w.message}`);
    }
  }
  lines.push('');

  if (report.alternatives.length > 0) {
    lines.push('  🔄 ALTERNATIVES');
    for (const alt of report.alternatives) {
      const tag = alt.isExistingDep ? '[EXISTING]' : alt.isNativeApi ? '[NATIVE]' : '';
      lines.push(`    • ${alt.name} (${alt.ecosystem}) ${tag}`);
      lines.push(`      ${alt.reason}`);
      lines.push(`      Confidence: ${Math.round(alt.confidenceScore * 100)}%`);
    }
    lines.push('');
  }

  if (report.refactoringSuggestions.length > 0) {
    lines.push('  ✂ REFACTORING SUGGESTIONS');
    for (const s of report.refactoringSuggestions) {
      lines.push(`    ${s}`);
    }
    lines.push('');
  }

  const decisionIcons: Record<string, string> = {
    approved: '✅ APPROVED',
    rejected: '❌ REJECTED',
    'needs-review': '🔍 NEEDS REVIEW',
    'needs-justification': '📝 NEEDS JUSTIFICATION',
  };

  lines.push(`  DECISION: ${decisionIcons[report.decision] ?? report.decision}`);
  lines.push(`  Reason: ${report.decisionReason}`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

function printHelp(): void {
  console.log(`
VIBE DEPENDENCY GUARD — AI Dependency Governance Platform

USAGE:
  vibe-guard <command> [options]

COMMANDS:
  check <pkg> [--ecosystem <eco>]  Analyze and govern a package installation
  intercept <command>              Intercept and govern a raw install command
  stats                            Show governance statistics
  compliance                       Generate compliance report
  approved [--ecosystem <eco>]     List approved dependencies
  search <query> [--ecosystem <eco>]  Search packages by capability
  natives <ecosystem>              List packages with native alternatives
  knowledge-stats                  Show knowledge base statistics
  help                             Show this help message

OPTIONS:
  --ecosystem, -e   npm | pip | cargo | go
  --json            Output as JSON
  --strict          Enable strict mode
  --allow-unlisted  Allow unlisted packages
  --auto-approve-low-risk  Auto-approve low risk packages (score <= 20)

EXAMPLES:
  vibe-guard check lodash -e npm
  vibe-guard intercept "npm install axios"
  vibe-guard search "HTTP client" -e python
  vibe-guard stats
  vibe-guard compliance

For more: https://github.com/vibe-dependency-guard
`);
}

function parseArgs(args: string[]): {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

function buildRequestFromCheck(
  packageName: string,
  ecosystem: Ecosystem,
  version?: string,
  reason?: string,
): DependencyRequest {
  return {
    packageName,
    version,
    ecosystem,
    requestedBy: 'cli',
    context: { reason },
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, positional, flags } = parseArgs(args);

  if (!command || command === 'help') {
    printHelp();
    return;
  }

  const ecosystem = (flags.ecosystem || flags.e || flags.eco) as Ecosystem | undefined;
  const useJson = !!flags.json;

  try {
    switch (command) {
      case 'check': {
        const packageName = positional[0];
        if (!packageName) {
          console.error('Error: Package name required. Usage: vibe-guard check <package> [--ecosystem <eco>]');
          process.exit(1);
        }
        const eco = ecosystem ?? detectEcosystemFromCommand(packageName) ?? 'npm';
        const request = buildRequestFromCheck(packageName, eco, flags.version as string | undefined, flags.reason as string | undefined);
        const report = govern(request, {
          strictMode: !!flags.strict,
          allowUnlistedPackages: !!flags['allow-unlisted'],
          autoApproveLowRisk: !!flags['auto-approve-low-risk'],
        });
        if (useJson) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(formatReport(report));
        }
        process.exit(report.decision === 'rejected' ? 1 : 0);
        break;
      }

      case 'intercept': {
        const rawCommand = positional[0] || flags['command'] as string;
        if (!rawCommand) {
          console.error('Error: Command required. Usage: vibe-guard intercept "<install command>"');
          process.exit(1);
        }
        const intercepted = interceptCommand(rawCommand);
        if (intercepted.length === 0) {
          console.log('No install commands detected. Command passed through without governance.');
          process.exit(0);
        }
        const requests = intercepted.map(i => buildDependencyRequest(i));
        const reports = governBatch(requests, {
          strictMode: !!flags.strict,
          allowUnlistedPackages: !!flags['allow-unlisted'],
          autoApproveLowRisk: !!flags['auto-approve-low-risk'],
        });
        for (const report of reports) {
          if (useJson) {
            console.log(JSON.stringify(report, null, 2));
          } else {
            console.log(formatReport(report));
          }
        }
        const anyBlocked = reports.some(r => r.decision === 'rejected');
        process.exit(anyBlocked ? 1 : 0);
        break;
      }

      case 'stats': {
        const stats = getGovernanceStats();
        if (useJson) {
          console.log(JSON.stringify(stats, null, 2));
        } else {
          console.log('\n══════════════════════  GOVERNANCE STATISTICS  ══════════════════════');
          console.log(`  Total Decisions:  ${stats.totalDecisions}`);
          console.log(`  Approved:         ${stats.approved}`);
          console.log(`  Rejected:         ${stats.rejected}`);
          console.log(`  Needs Review:     ${stats.needsReview}`);
          console.log(`  Needs Justify:    ${stats.needsJustification}`);
          console.log(`  Avg Risk Score:   ${stats.averageRiskScore}/100`);
          console.log('');
          console.log('  By Ecosystem:');
          for (const [eco, count] of Object.entries(stats.ecosystems)) {
            console.log(`    ${eco}: ${count}`);
          }
          if (stats.topBlockedPackages.length > 0) {
            console.log('\n  Top Blocked Packages:');
            for (const pkg of stats.topBlockedPackages) {
              console.log(`    ${pkg.name}: ${pkg.count}x`);
            }
          }
          console.log('═══════════════════════════════════════════════════════════════════\n');
        }
        break;
      }

      case 'compliance': {
        const compliance = generateComplianceReport();
        if (useJson) {
          console.log(JSON.stringify(compliance, null, 2));
        } else {
          console.log('\n══════════════════════  COMPLIANCE REPORT  ═══════════════════════');
          console.log(`  Generated:        ${compliance.timestamp.toISOString()}`);
          console.log(`  Total Packages:   ${compliance.totalPackages}`);
          console.log(`  Approved:         ${compliance.approvedPackages}`);
          console.log(`  Banned:           ${compliance.bannedPackages}`);
          console.log(`  Needs Review:     ${compliance.needsReview}`);
          console.log(`  Compliance Rate:  ${compliance.complianceRate}%`);
          console.log('══════════════════════════════════════════════════════════════\n');
        }
        break;
      }

      case 'approved': {
        const deps = getApprovedDeps(ecosystem);
        if (useJson) {
          console.log(JSON.stringify(deps, null, 2));
        } else {
          console.log('\n══════════════════════  APPROVED DEPENDENCIES  ═══════════════════════');
          for (const [eco, packages] of Object.entries(deps)) {
            if (packages.length === 0) continue;
            console.log(`  ${eco}:`);
            for (const pkg of packages) {
              console.log(`    ✓ ${pkg}`);
            }
          }
          if (Object.values(deps).every(v => v.length === 0)) {
            console.log('  No approved dependencies yet.');
          }
          console.log('══════════════════════════════════════════════════════════════════\n');
        }
        break;
      }

      case 'search': {
        const query = positional[0];
        if (!query) {
          console.error('Error: Search query required. Usage: vibe-guard search <query> [--ecosystem <eco>]');
          process.exit(1);
        }
        const store = getEmbeddingStore();
        const results = store.search([query], ecosystem, 10);
        if (useJson) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          console.log(`\n══════════════════  SEARCH: "${query}"  ══════════════════`);
          for (const r of results) {
            console.log(`  • ${r.packageName} (${r.ecosystem}) — ${Math.round(r.similarityScore * 100)}%`);
            console.log(`    ${r.reason}`);
          }
          if (results.length === 0) {
            console.log('  No results found.');
          }
          console.log('═══════════════════════════════════════════════════════\n');
        }
        break;
      }

      case 'natives': {
        const eco = ecosystem ?? 'npm';
        const natives = getNativeAlternativesForEcosystem(eco);
        if (useJson) {
          console.log(JSON.stringify(natives, null, 2));
        } else {
          console.log(`\n══════════════  NATIVE ALTERNATIVES (${eco})  ══════════════`);
          for (const n of natives) {
            console.log(`  • ${n.packageName} (${n.purpose})`);
            console.log(`    → ${n.nativeEquivalent}`);
          }
          if (natives.length === 0) {
            console.log('  No native alternatives found for this ecosystem.');
          }
          console.log('═══════════════════════════════════════════════════════\n');
        }
        break;
      }

      case 'knowledge-stats': {
        const ks = getKnowledgeStats();
        if (useJson) {
          console.log(JSON.stringify(ks, null, 2));
        } else {
          console.log('\n══════════════════  KNOWLEDGE BASE  ══════════════════');
          console.log(`  Total Items:  ${ks.totalItems}`);
          console.log(`  Last Update:  ${ks.lastUpdate.toISOString()}`);
          console.log('  By Category:');
          for (const [cat, count] of Object.entries(ks.byCategory)) {
            console.log(`    ${cat}: ${count}`);
          }
          console.log('══════════════════════════════════════════════════\n');
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
