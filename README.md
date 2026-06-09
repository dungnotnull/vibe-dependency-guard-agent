<p align="center">
  <img src="https://img.shields.io/badge/phase-production-22c55e" alt="Production Ready">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node >= 18">
  <img src="https://img.shields.io/badge/ecosystems-npm%20%7C%20pip%20%7C%20cargo%20%7C%20go-8b5cf6" alt="npm | pip | cargo | go">
</p>

<h1 align="center">Vibe Dependency Guard</h1>
<h3 align="center">AI Dependency Governance Platform</h3>

---

## The Problem

AI coding agents install packages without hesitation. Left unchecked, this creates a quiet disaster:

- **Dependency sprawl** — 10 HTTP clients when 1 would do
- **Duplicate functionality** — Two schema validators, three date libraries, four ORMs
- **Supply chain bloat** — Every new package is a new attack vector
- **Maintenance debt** — Someone has to update, audit, and migrate all of them
- **Architecture erosion** — The stack drifts from coherent design to patchwork chaos

**Developers lose control of their own architecture.**

---

## The Solution

Vibe Dependency Guard is the governance layer between your AI and your package manager. It intercepts every installation attempt, analyzes the package against your existing stack, checks security posture, searches for alternatives you already have, and returns a governed decision: approve, reject, or require review.

```
npm install left-pad
          │
          ▼
┌─────────────────────────────────┐
│  Vibe Dependency Guard          │
│                                 │
│  Layer 1: Intercept request     │
│  Layer 2: Classify purpose      │
│  Layer 3: Check core stack      │
│  Layer 4: Search alternatives   │
│  Layer 5: Detect native APIs    │
│  Layer 6: Score security risk   │
│  Layer 7: Evaluate policies     │
│  Layer 8: Govern and report     │
│                                 │
│  Decision: REJECTED             │
│  Reason: Duplicate functionality │
│  Alternative: Use existing padLeft│
└─────────────────────────────────┘
          │
          ▼
  Governance Report
```

---

## Architecture — 8 Defense Layers

| # | Layer | Description |
|---|-------|-------------|
| **1** | **Installation Interceptor** | Hooks `npm install`, `yarn add`, `pnpm add`, `pip install`, `cargo add`, `go get` — governs before bytes touch disk |
| **2** | **Dependency Intelligence Engine** | Classifies packages by functional purpose (HTTP client, date manipulation, schema validation, ORM), maps API surfaces, detects overlapping capabilities |
| **3** | **Core Stack Knowledge Base** | Maintains golden-path approved stacks per ecosystem. HTTP → axios. Validation → zod. Dates → dayjs. Database → prisma. Always checks existing tools first |
| **4** | **Agentic RAG Engine** | 64-dimensional vector embeddings of package capabilities. Cosine similarity search across the entire known package registry. Answers: _Can an already-approved package solve this?_ |
| **5** | **Automated Refactoring Engine** | Detects when native language APIs can replace a dependency entirely — lodash → `structuredClone`/`??`/`?.`, moment → `Intl.DateTimeFormat`, node-fetch → global `fetch` |
| **6** | **Security Intelligence** | Cross-references known CVEs, tracks abandonment status, scores supply chain risk on a 0-100 scale, flags typosquatting and dependency confusion patterns |
| **7** | **Governance Engine** | Applies 8 configurable policies (block abandoned, warn on redundancy, require-review for high risk, require-justification for CVEs). Generates compliance reports, tracks dependency growth trends, maintains full audit trail |
| **8** | **Knowledge Brain** | Self-improving ingestion pipeline. Learns from every governance decision, feedback loop, and security advisory. Builds an ever-sharper capability map over time |

---

## Quick Start

```bash
# Analyze any package before installation
npx vibe-guard@latest check lodash --ecosystem npm

# Or install globally
npm install -g vibe-dependency-guard
vibe-guard check lodash -e npm
```

---

## CLI Reference

```
vibe-guard <command> [options]

Commands:
  check <pkg> [--ecosystem <eco>]     Analyze and govern a package installation
  intercept "<command>"               Intercept and govern a raw install command
  stats                               Show governance statistics
  compliance                          Generate compliance report
  approved [--ecosystem <eco>]        List approved dependencies
  search <query> [--ecosystem <eco>]  Search packages by capability
  natives <ecosystem>                 List packages with native alternatives
  knowledge-stats                     Show knowledge base statistics
  help                                Show this help

Options:
  --ecosystem, -e   npm | pip | cargo | go
  --json            Output as JSON
  --strict          Enable strict mode
  --allow-unlisted  Allow unlisted packages
  --auto-approve-low-risk  Auto-approve low risk packages (score ≤ 20)

Examples:
  vibe-guard check lodash -e npm
  vibe-guard intercept "npm install axios"
  vibe-guard search "HTTP client" -e pip
  vibe-guard stats
  vibe-guard compliance
```

---

## Programmatic API

```typescript
import { govern } from 'vibe-dependency-guard';

// Full governance workflow in one call
const report = govern({
  packageName: 'lodash',
  version: '4.17.21',
  ecosystem: 'npm',
  requestedBy: 'ai-agent',
  context: {
    projectPath: '/my-project',
    existingDependencies: ['axios', 'zod', 'dayjs', 'prisma'],
    reason: 'Need deep clone and object merge utilities',
  },
});

console.log(report.decision);
// → 'rejected' | 'needs-review' | 'needs-justification' | 'approved'

console.log(report.decisionReason);
// → "Blocked by policies: No duplicate functionality. High redundancy (87%)"

console.log(report.alternatives);
// → [
//     { name: 'structuredClone', isNativeApi: true, confidenceScore: 0.95 },
//     { name: 'Object.assign', isNativeApi: true, confidenceScore: 0.9 }
//   ]

console.log(report.refactoringSuggestions);
// → [
//     "Replace _.cloneDeep(obj) → structuredClone(obj)",
//     "Replace _.merge(target, ...sources) → Object.assign(target, ...sources)"
//   ]

console.log(report.securityReport);
// → { riskScore: 65, knownCves: ['CVE-2019-10744', 'CVE-2020-8203', 'CVE-2021-23337'], ... }

console.log(report.policyEvaluation);
// → { passed: false, violations: [{ ruleName: 'No duplicate functionality', severity: 'block' }], ... }
```

### Advanced: Custom Policies

```typescript
import { govern, registerPolicy } from 'vibe-dependency-guard';

registerPolicy({
  id: 'POL-CUSTOM-001',
  name: 'Block unlicensed packages',
  description: 'Reject packages without a recognized open-source license',
  type: 'block',
  ecosystem: 'npm',
  conditions: [
    { field: 'packageInfo.license', operator: 'not-contains', value: 'MIT' },
  ],
});

const report = govern({
  packageName: 'some-proprietary-lib',
  ecosystem: 'npm',
  requestedBy: 'cli',
});
```

### Batch Governance

```typescript
import { governBatch } from 'vibe-dependency-guard';

const requests = [
  { packageName: 'lodash', ecosystem: 'npm', requestedBy: 'ai-agent' as const },
  { packageName: 'requests', ecosystem: 'pip', requestedBy: 'ai-agent' as const },
  { packageName: 'serde', ecosystem: 'cargo', requestedBy: 'ai-agent' as const },
];

const reports = governBatch(requests);
```

### Governance Stats & Compliance

```typescript
import { getGovernanceStats, generateComplianceReport, getApprovedDeps } from 'vibe-dependency-guard';

const stats = getGovernanceStats();
// { totalDecisions: 142, approved: 89, rejected: 23, needsReview: 30, averageRiskScore: 42, ... }

const compliance = generateComplianceReport();
// { complianceRate: 78, approvedPackages: 89, bannedPackages: 23, ... }

const deps = getApprovedDeps('npm');
// { npm: ['axios', 'dayjs', 'prisma', 'zod'] }
```

---

## The 8 Default Policies

| ID | Policy | Type | Threshold |
|----|--------|------|-----------|
| POL-001 | No abandoned packages | `block` | `lastReleaseActivity === abandoned` |
| POL-002 | No critical supply chain risk | `block` | `supplyChainRisk === critical` |
| POL-003 | High risk requires justification | `require-justification` | `riskScore > 70` |
| POL-004 | No typosquatting risk | `block` | `hasTyposquattingRisk === true` |
| POL-005 | Prefer approved core stack | `warn` | `isRedundant === true` |
| POL-006 | No duplicate functionality | `require-review` | `redundancyScore > 60` |
| POL-007 | Medium risk requires review | `require-review` | `riskScore > 40` |
| POL-008 | Known CVEs require review | `require-review` | `knownCves.length > 0` |

Every policy is configurable. Register, override, or remove policies programmatically.

---

## Core Stacks — The Golden Path

| Purpose | npm | pip | cargo | go |
|---------|-----|-----|-------|----|
| HTTP Client | `axios` | `requests` | `reqwest` | `gin` |
| Validation | `zod` | `pydantic` | `serde` | — |
| Dates | `dayjs` | `pendulum` | `chrono` | — |
| Database | `prisma` | `sqlalchemy` | `diesel` | `database/sql` |

The system routes governance decisions through these approved stacks first. Everything else must justify its existence.

---

## Native API Migrations — Kill Dependencies

Vibe Guard doesn't just block — it tells you how to **eliminate** the dependency entirely:

| Package | Ecosystem | Native Replacement |
|---------|-----------|-------------------|
| `lodash` | npm | `structuredClone()`, `?.`, `??`, `Object.assign()`, `Array.sort()` |
| `node-fetch` | npm | Global `fetch()` (Node 18+) |
| `moment` | npm | `Intl.DateTimeFormat`, `dayjs` |
| `python-dateutil` | pip | `datetime.fromisoformat()`, `timedelta`, `zoneinfo` |
| `requests` | pip | `urllib.request` (stdlib) |
| `time` | cargo | `std::time::SystemTime` |

---

## Security Intelligence

- **CVE Database** — Known vulnerabilities for major packages, cross-referenced on every check
- **Risk Scoring** — 0-100 composite score: CVE count × 15, abandonment +30, critical supply chain +30, typosquatting +15
- **Maintainer Reputation** — Active / stale / abandoned classification based on maintainer activity
- **Supply Chain Risk** — Detects typosquatting patterns, dependency confusion vectors, internal package name collisions
- **Recommendation Engine** — Actionable security guidance on every report

---

## Supported Ecosystems

| Ecosystem | Package Managers | Commands Intercepted |
|-----------|-----------------|---------------------|
| **npm** | npm, yarn, pnpm, npx | `install`, `i`, `add` (with `-g`, `-D`, `--save-dev` support) |
| **pip** | pip, pip3 | `install` (with `--user` support) |
| **cargo** | cargo | `add`, `install` |
| **go** | go | `get`, `install` |

---

## Project Structure

```
vibe-dependency-guard-agent/
├── src/
│   ├── index.ts                    # Public API barrel export (80+ exports)
│   ├── orchestrator.ts             # End-to-end governance workflow (govern / governBatch)
│   ├── cli/
│   │   └── main.ts                 # CLI: check, intercept, stats, compliance, approved, search, natives, knowledge-stats
│   ├── types/
│   │   └── index.ts                # 15 TypeScript interfaces (full type system)
│   ├── ecosystem/
│   │   ├── analyzer.ts             # Package analysis, capability profiling, core stacks, duplicate detection
│   │   └── interceptor.ts          # Install command interception for npm/yarn/pnpm/pip/cargo/go
│   ├── security/
│   │   └── index.ts                # CVE database, risk scoring (0-100), supply chain analysis, abandonment tracking
│   ├── policy/
│   │   ├── engine.ts               # 8 default policies, condition evaluation engine, decision routing
│   │   └── governance.ts           # Compliance reports, feedback loops, dependency growth tracking, audit trail
│   └── knowledge/
│       ├── base.ts                 # Knowledge ingestion pipeline, capability map, search indexes
│       ├── rag.ts                  # 64-dim vector embedding store, cosine similarity search, alternative discovery
│       └── refactoring.ts          # Native API detection, rewrite pattern generation, per-ecosystem mappings
├── dist/                           # Compiled output (.js + .d.ts + .d.ts.map + .js.map)
├── package.json                    # bin: vibe-guard, engines: node>=18
├── tsconfig.json                   # ES2022, NodeNext, strict mode
├── README.md                       # This file
├── LICENSE                         # MIT
├── CLAUDE.md                       # Agent context file
├── PROJECT-DETAIL.md               # Full architecture vision and competitive moat
├── SECOND-KNOWLEDGE-BRAIN.md       # Knowledge ingestion pipeline and self-improvement rules
└── PROJECT-DEVELOPMENT-PHASE-TRACKING.md  # Development roadmap — Phases 0-7 complete
```

---

## Requirements

- **Node.js** >= 18.0.0
- **TypeScript** 5.5+ (if using programmatic API)

---

## Development

```bash
# Clone
git clone https://github.com/dungnotnull/vibe-dependency-guard-agent.git
cd vibe-dependency-guard-agent

# Install
npm install

# Typecheck
npm run typecheck

# Build
npm run build

# Development (ts-node)
npm run dev check zod -e npm
```

---

## Contributing

Vibe Dependency Guard is open-source under MIT. The core architecture follows 5 principles:

1. **Prefer existing solutions** — Never add what already exists
2. **Minimize dependency count** — Every dependency is a liability
3. **Minimize supply-chain risk** — Proven maintainers, active releases, audited code
4. **Prefer proven libraries** — Battle-tested over bleeding-edge
5. **Every dependency must justify its existence** — No defaults, no assumptions

Contributions that advance these principles are welcome. Open an issue or PR at [github.com/dungnotnull/vibe-dependency-guard-agent](https://github.com/dungnotnull/vibe-dependency-guard-agent).

---

## License

MIT © [claude](https://github.com/dungnotnull)

---

## Star History

If this project helps you govern your AI-driven development, consider giving it a ⭐

---

<p align="center">
  <sub>No dependency enters production without validation, justification, and governance review.</sub>
</p>
