import type { Ecosystem, PackageInfo, AlternativeRecommendation } from '../types/index.js';
import { getAllKnownPackages } from '../ecosystem/analyzer.js';

interface NativeApi {
  ecosystem: Ecosystem;
  packageName: string;
  purpose: string;
  nativeEquivalent: string;
  rewritePattern: {
    target: string;
    replacement: string;
    description: string;
  }[];
}

const NATIVE_API_MAP: NativeApi[] = [
  {
    ecosystem: 'npm',
    packageName: 'lodash',
    purpose: 'Utility library',
    nativeEquivalent: 'JavaScript native APIs (ES2020+)',
    rewritePattern: [
      {
        target: '_.get(obj, path, defaultValue)',
        replacement: 'obj?.path ?? defaultValue  // Optional chaining + nullish coalescing',
        description: 'Replace _.get with optional chaining and nullish coalescing',
      },
      {
        target: '_.merge(target, ...sources)',
        replacement: 'Object.assign(target, ...sources)  // or spread: { ...target, ...source }',
        description: 'Replace _.merge with Object.assign or spread operator',
      },
      {
        target: '_.cloneDeep(obj)',
        replacement: 'structuredClone(obj)',
        description: 'Replace _.cloneDeep with structuredClone (Node 17+)',
      },
      {
        target: '_.sortBy(arr, iteratee)',
        replacement: '[...arr].sort((a, b) => a.field - b.field)',
        description: 'Replace _.sortBy with native Array.sort',
      },
      {
        target: '_.debounce(fn, wait)',
        replacement: 'Custom debounce implementation or use lightweight alternative',
        description: 'Replace _.debounce - consider if debouncing is truly needed',
      },
      {
        target: '_.throttle(fn, wait)',
        replacement: 'Custom throttle implementation or use lightweight alternative',
        description: 'Replace _.throttle - consider if throttling is truly needed',
      },
    ],
  },
  {
    ecosystem: 'npm',
    packageName: 'node-fetch',
    purpose: 'HTTP client',
    nativeEquivalent: 'Node.js native fetch (Node 18+)',
    rewritePattern: [
      {
        target: "import fetch from 'node-fetch'",
        replacement: "// Use global fetch (Node 18+ built-in)",
        description: 'Remove node-fetch — global fetch is available in Node 18+',
      },
      {
        target: 'const fetch = require(\'node-fetch\')',
        replacement: '// Use global fetch (Node 18+ built-in)',
        description: 'Remove node-fetch require — global fetch is available in Node 18+',
      },
    ],
  },
  {
    ecosystem: 'npm',
    packageName: 'moment',
    purpose: 'Date manipulation',
    nativeEquivalent: 'Intl.DateTimeFormat or date-fns/dayjs',
    rewritePattern: [
      {
        target: "moment().format('YYYY-MM-DD')",
        replacement: "new Intl.DateTimeFormat('en-CA').format(new Date())  // ISO date",
        description: 'Replace moment format with Intl.DateTimeFormat',
      },
      {
        target: 'moment(date).add(n, unit)',
        replacement: '// Use Date.setHours etc. or switch to dayjs',
        description: 'Replace moment add/subtract — use native Date methods or lightweight alternative',
      },
    ],
  },
  {
    ecosystem: 'pip',
    packageName: 'python-dateutil',
    purpose: 'Date manipulation',
    nativeEquivalent: 'Python datetime + zoneinfo (Python 3.9+)',
    rewritePattern: [
      {
        target: 'from dateutil.parser import parse',
        replacement: 'from datetime import datetime  # datetime.fromisoformat() for ISO strings',
        description: 'Replace dateutil.parser with datetime.fromisoformat',
      },
      {
        target: 'from dateutil.relativedelta import relativedelta',
        replacement: 'from datetime import timedelta  # for basic date arithmetic',
        description: 'Replace relativedelta with timedelta for basic operations',
      },
    ],
  },
  {
    ecosystem: 'pip',
    packageName: 'requests',
    purpose: 'HTTP client',
    nativeEquivalent: 'urllib.request (stdlib)',
    rewritePattern: [
      {
        target: 'requests.get(url)',
        replacement: 'urllib.request.urlopen(url) — but consider keeping requests for convenience',
        description: 'requests is generally worth keeping — high convenience value',
      },
    ],
  },
  {
    ecosystem: 'cargo',
    packageName: 'time',
    purpose: 'Date manipulation',
    nativeEquivalent: 'std::time (stdlib)',
    rewritePattern: [
      {
        target: 'use time::OffsetDateTime',
        replacement: '// Use std::time::SystemTime for basic time ops',
        description: 'Replace time crate with std::time for basic operations',
      },
    ],
  },
];

export function detectNativeAlternatives(pkg: PackageInfo): {
  hasNativeAlternative: boolean;
  nativeEquivalent: string;
  rewritePatterns: { target: string; replacement: string; description: string }[];
  confidence: number;
} {
  const match = NATIVE_API_MAP.find(
    n => n.ecosystem === pkg.ecosystem && n.packageName === pkg.name,
  );

  if (!match) {
    return {
      hasNativeAlternative: false,
      nativeEquivalent: '',
      rewritePatterns: [],
      confidence: 0,
    };
  }

  return {
    hasNativeAlternative: true,
    nativeEquivalent: match.nativeEquivalent,
    rewritePatterns: match.rewritePattern,
    confidence: match.rewritePattern.length > 3 ? 0.9 : 0.7,
  };
}

export function generateRefactoringSuggestions(
  pkg: PackageInfo,
): string[] {
  const nativeInfo = detectNativeAlternatives(pkg);
  const suggestions: string[] = [];

  if (nativeInfo.hasNativeAlternative) {
    suggestions.push(
      `Native alternative exists: ${nativeInfo.nativeEquivalent} (confidence: ${Math.round(nativeInfo.confidence * 100)}%)`,
    );
    for (const pattern of nativeInfo.rewritePatterns) {
      suggestions.push(`  → ${pattern.description}`);
      suggestions.push(`    Target:      ${pattern.target}`);
      suggestions.push(`    Replacement: ${pattern.replacement}`);
    }
  }

  return suggestions;
}

export function shouldSuggestRefactoring(
  pkg: PackageInfo,
  alternatives: AlternativeRecommendation[],
): boolean {
  if (alternatives.some(a => a.isNativeApi)) return true;

  const nativeInfo = detectNativeAlternatives(pkg);
  if (nativeInfo.hasNativeAlternative && nativeInfo.confidence >= 0.7) {
    return true;
  }

  return false;
}

export function getAllNativeApiMappings(): NativeApi[] {
  return [...NATIVE_API_MAP];
}

export function getNativeAlternativesForEcosystem(ecosystem: Ecosystem): {
  packageName: string;
  nativeEquivalent: string;
  purpose: string;
}[] {
  return NATIVE_API_MAP
    .filter(n => n.ecosystem === ecosystem)
    .map(n => ({
      packageName: n.packageName,
      nativeEquivalent: n.nativeEquivalent,
      purpose: n.purpose,
    }));
}
