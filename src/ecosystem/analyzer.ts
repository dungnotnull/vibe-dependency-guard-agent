import type { Ecosystem, PackageInfo, DependencyRequest, CapabilityProfile } from '../types/index.js';

const ECOSYSTEM_KNOWN_PACKAGES: Record<string, PackageInfo[]> = {
  npm: [
    {
      name: 'axios',
      version: '1.7.0',
      ecosystem: 'npm',
      description: 'Promise based HTTP client for the browser and node.js',
      purpose: 'HTTP client',
      apiSurface: ['get', 'post', 'put', 'delete', 'patch', 'create', 'interceptors'],
      dependencies: ['form-data'],
      downloads: 48000000,
      license: 'MIT',
      repository: 'https://github.com/axios/axios',
      maintainers: [{ name: 'axios-core', email: undefined, reputation: 'high' }],
    },
    {
      name: 'node-fetch',
      version: '3.3.2',
      ecosystem: 'npm',
      description: 'A light-weight module that brings Fetch API to Node.js',
      purpose: 'HTTP client',
      apiSurface: ['fetch', 'Request', 'Response', 'Headers'],
      dependencies: ['data-uri-to-buffer'],
      downloads: 35000000,
      license: 'MIT',
      repository: 'https://github.com/node-fetch/node-fetch',
      maintainers: [{ name: 'node-fetch-maintainers', email: undefined, reputation: 'high' }],
    },
    {
      name: 'lodash',
      version: '4.17.21',
      ecosystem: 'npm',
      description: 'Lodash modular utilities',
      purpose: 'Utility library',
      apiSurface: ['_.get', '_.set', '_.merge', '_.cloneDeep', '_.debounce', '_.throttle', '_.sortBy'],
      dependencies: [],
      downloads: 55000000,
      license: 'MIT',
      repository: 'https://github.com/lodash/lodash',
      maintainers: [{ name: 'lodash-team', email: undefined, reputation: 'high' }],
    },
    {
      name: 'zod',
      version: '3.23.0',
      ecosystem: 'npm',
      description: 'TypeScript-first schema validation with static type inference',
      purpose: 'Schema validation',
      apiSurface: ['z.object', 'z.string', 'z.number', 'z.array', 'z.enum', 'z.infer', 'z.parse', 'z.safeParse'],
      dependencies: [],
      downloads: 25000000,
      license: 'MIT',
      repository: 'https://github.com/colinhacks/zod',
      maintainers: [{ name: 'colinhacks', email: undefined, reputation: 'high' }],
    },
    {
      name: 'yup',
      version: '1.4.0',
      ecosystem: 'npm',
      description: 'Dead simple Object schema validation',
      purpose: 'Schema validation',
      apiSurface: ['object', 'string', 'number', 'array', 'shape', 'validate', 'validateSync'],
      dependencies: [],
      downloads: 18000000,
      license: 'MIT',
      repository: 'https://github.com/jquense/yup',
      maintainers: [{ name: 'jquense', email: undefined, reputation: 'medium' }],
    },
    {
      name: 'dayjs',
      version: '2.0.0',
      ecosystem: 'npm',
      description: '2KB immutable date library alternative to Moment.js',
      purpose: 'Date manipulation',
      apiSurface: ['dayjs', 'format', 'add', 'subtract', 'diff', 'isBefore', 'isAfter', 'utc'],
      dependencies: [],
      downloads: 30000000,
      license: 'MIT',
      repository: 'https://github.com/iamkun/dayjs',
      maintainers: [{ name: 'iamkun', email: undefined, reputation: 'high' }],
    },
    {
      name: 'moment',
      version: '2.30.1',
      ecosystem: 'npm',
      description: 'Parse, validate, manipulate, and display dates',
      purpose: 'Date manipulation',
      apiSurface: ['moment', 'format', 'add', 'subtract', 'diff', 'isBefore', 'isAfter', 'utc'],
      dependencies: [],
      downloads: 20000000,
      license: 'MIT',
      repository: 'https://github.com/moment/moment',
      maintainers: [{ name: 'moment-team', email: undefined, reputation: 'high' }],
    },
    {
      name: 'prisma',
      version: '5.14.0',
      ecosystem: 'npm',
      description: 'Next-generation ORM for Node.js & TypeScript',
      purpose: 'Database ORM',
      apiSurface: ['prisma', 'PrismaClient', 'model', 'findMany', 'findUnique', 'create', 'update', 'delete', 'connect'],
      dependencies: ['@prisma/client'],
      downloads: 12000000,
      license: 'Apache-2.0',
      repository: 'https://github.com/prisma/prisma',
      maintainers: [{ name: 'prisma-team', email: undefined, reputation: 'high' }],
    },
    {
      name: 'typeorm',
      version: '0.3.20',
      ecosystem: 'npm',
      description: 'ORM for TypeScript and JavaScript',
      purpose: 'Database ORM',
      apiSurface: ['Entity', 'Repository', 'findOne', 'find', 'save', 'remove', 'createQueryBuilder'],
      dependencies: [],
      downloads: 5000000,
      license: 'MIT',
      repository: 'https://github.com/typeorm/typeorm',
      maintainers: [{ name: 'typeorm-team', email: undefined, reputation: 'medium' }],
    },
  ],
  pip: [
    {
      name: 'requests',
      version: '2.32.0',
      ecosystem: 'pip',
      description: 'Python HTTP for Humans',
      purpose: 'HTTP client',
      apiSurface: ['requests.get', 'requests.post', 'requests.Session', 'requests.Response'],
      dependencies: ['urllib3', 'certifi', 'idna'],
      downloads: 450000000,
      license: 'Apache-2.0',
      repository: 'https://github.com/psf/requests',
      maintainers: [{ name: 'psf', email: undefined, reputation: 'high' }],
    },
    {
      name: 'httpx',
      version: '0.27.0',
      ecosystem: 'pip',
      description: 'The next generation HTTP client for Python',
      purpose: 'HTTP client',
      apiSurface: ['httpx.get', 'httpx.post', 'httpx.AsyncClient', 'httpx.Client'],
      dependencies: ['httpcore', 'certifi'],
      downloads: 120000000,
      license: 'BSD',
      repository: 'https://github.com/encode/httpx',
      maintainers: [{ name: 'encode', email: undefined, reputation: 'high' }],
    },
    {
      name: 'pydantic',
      version: '2.7.0',
      ecosystem: 'pip',
      description: 'Data validation using Python type hints',
      purpose: 'Schema validation',
      apiSurface: ['BaseModel', 'Field', 'validator', 'model_validate', 'model_dump'],
      dependencies: ['pydantic-core'],
      downloads: 180000000,
      license: 'MIT',
      repository: 'https://github.com/pydantic/pydantic',
      maintainers: [{ name: 'samuelcolvin', email: undefined, reputation: 'high' }],
    },
    {
      name: 'marshmallow',
      version: '3.21.0',
      ecosystem: 'pip',
      description: 'A lightweight library for converting complex datatypes',
      purpose: 'Schema validation',
      apiSurface: ['Schema', 'fields', 'validate', 'dump', 'load'],
      dependencies: [],
      downloads: 30000000,
      license: 'MIT',
      repository: 'https://github.com/marshmallow-code/marshmallow',
      maintainers: [{ name: 'marshmallow-code', email: undefined, reputation: 'high' }],
    },
    {
      name: 'pendulum',
      version: '3.0.0',
      ecosystem: 'pip',
      description: 'Python datetimes made easy',
      purpose: 'Date manipulation',
      apiSurface: ['pendulum.now', 'pendulum.parse', 'add', 'subtract', 'diff', 'diff_for_humans'],
      dependencies: [],
      downloads: 15000000,
      license: 'MIT',
      repository: 'https://github.com/sdispater/pendulum',
      maintainers: [{ name: 'sdispater', email: undefined, reputation: 'high' }],
    },
    {
      name: 'python-dateutil',
      version: '2.9.0',
      ecosystem: 'pip',
      description: 'Useful extensions to the standard Python datetime features',
      purpose: 'Date manipulation',
      apiSurface: ['parser', 'relativedelta', 'rrule', 'tz'],
      dependencies: ['six'],
      downloads: 350000000,
      license: 'Apache-2.0',
      repository: 'https://github.com/dateutil/dateutil',
      maintainers: [{ name: 'dateutil-team', email: undefined, reputation: 'high' }],
    },
  ],
  cargo: [
    {
      name: 'serde',
      version: '1.0.200',
      ecosystem: 'cargo',
      description: 'Serialization framework for Rust',
      purpose: 'Serialization/deserialization',
      apiSurface: ['Serialize', 'Deserialize', 'serde_json', 'serde_yaml'],
      dependencies: ['serde_derive'],
      downloads: 280000000,
      license: 'MIT',
      repository: 'https://github.com/serde-rs/serde',
      maintainers: [{ name: 'dtolnay', reputation: 'high' }],
    },
    {
      name: 'reqwest',
      version: '0.12.0',
      ecosystem: 'cargo',
      description: 'Higher level HTTP client for Rust',
      purpose: 'HTTP client',
      apiSurface: ['reqwest::Client', 'reqwest::get', 'reqwest::Response'],
      dependencies: ['tokio', 'hyper', 'h2'],
      downloads: 120000000,
      license: 'MIT',
      repository: 'https://github.com/seanmonstar/reqwest',
      maintainers: [{ name: 'seanmonstar', email: undefined, reputation: 'high' }],
    },
    {
      name: 'hyper',
      version: '1.3.0',
      ecosystem: 'cargo',
      description: 'A fast and correct HTTP implementation for Rust',
      purpose: 'HTTP client/server',
      apiSurface: ['hyper::Client', 'hyper::Server', 'hyper::Request', 'hyper::Response'],
      dependencies: ['tokio', 'http-body-util'],
      downloads: 90000000,
      license: 'MIT',
      repository: 'https://github.com/hyperium/hyper',
      maintainers: [{ name: 'hyperium', email: undefined, reputation: 'high' }],
    },
    {
      name: 'chrono',
      version: '0.4.38',
      ecosystem: 'cargo',
      description: 'Date and time library for Rust',
      purpose: 'Date manipulation',
      apiSurface: ['chrono::Utc', 'chrono::DateTime', 'chrono::NaiveDate', 'chrono::Duration'],
      dependencies: [],
      downloads: 100000000,
      license: 'MIT',
      repository: 'https://github.com/chronotope/chrono',
      maintainers: [{ name: 'chronotope', email: undefined, reputation: 'high' }],
    },
    {
      name: 'time',
      version: '0.3.36',
      ecosystem: 'cargo',
      description: 'Date and time library wrapping platform APIs',
      purpose: 'Date manipulation',
      apiSurface: ['time::OffsetDateTime', 'time::PrimitiveDateTime', 'time::Date', 'time::Duration'],
      dependencies: [],
      downloads: 70000000,
      license: 'MIT',
      repository: 'https://github.com/time-rs/time',
      maintainers: [{ name: 'jhpratt', email: undefined, reputation: 'high' }],
    },
  ],
  go: [
    {
      name: 'gorilla/mux',
      version: '1.8.1',
      ecosystem: 'go',
      description: 'A powerful URL router and dispatcher for golang',
      purpose: 'HTTP router',
      apiSurface: ['mux.NewRouter', 'mux.Vars', 'mux.NewRouter().HandleFunc'],
      dependencies: [],
      downloads: 0,
      license: 'BSD-3-Clause',
      repository: 'https://github.com/gorilla/mux',
      maintainers: [{ name: 'gorilla', email: undefined, reputation: 'high' }],
    },
    {
      name: 'chi',
      version: '5.1.0',
      ecosystem: 'go',
      description: 'Lightweight, idiomatic and composable router for building Go HTTP services',
      purpose: 'HTTP router',
      apiSurface: ['chi.NewRouter', 'chi.URLParam', 'chi.RouteContext'],
      dependencies: [],
      downloads: 0,
      license: 'MIT',
      repository: 'https://github.com/go-chi/chi',
      maintainers: [{ name: 'pkieltyka', email: undefined, reputation: 'high' }],
    },
    {
      name: 'gin',
      version: '1.10.0',
      ecosystem: 'go',
      description: 'HTTP web framework written in Go',
      purpose: 'HTTP framework',
      apiSurface: ['gin.Default', 'gin.Context', 'gin.H', 'gin.Engine'],
      dependencies: [],
      downloads: 0,
      license: 'MIT',
      repository: 'https://github.com/gin-gonic/gin',
      maintainers: [{ name: 'gin-gonic', email: undefined, reputation: 'high' }],
    },
    {
      name: 'database/sql',
      version: 'go1.22',
      ecosystem: 'go',
      description: 'Go standard library SQL interface',
      purpose: 'Database interface',
      apiSurface: ['sql.Open', 'sql.DB', 'sql.Query', 'sql.QueryRow', 'sql.Exec', 'sql.Tx'],
      dependencies: [],
      downloads: 0,
      license: 'BSD',
      repository: 'https://github.com/golang/go/tree/master/src/database/sql',
      maintainers: [{ name: 'golang-team', email: undefined, reputation: 'high' }],
    },
  ],
};

export function analyzePackage(request: DependencyRequest): PackageInfo | null {
  const packages = ECOSYSTEM_KNOWN_PACKAGES[request.ecosystem] ?? [];
  return packages.find(p => p.name === request.packageName) ?? null;
}

export function classifyPackage(pkg: PackageInfo): string {
  return pkg.purpose;
}

export function buildCapabilityProfile(
  pkg: PackageInfo,
  allPackages: PackageInfo[],
): CapabilityProfile {
  const samePurpose = allPackages.filter(
    p => p.purpose === pkg.purpose && p.name !== pkg.name,
  );

  const capabilities = [
    pkg.purpose,
    ...pkg.apiSurface.map(api => `${pkg.purpose}:${api}`),
  ];

  const similarTo = samePurpose.map(p => p.name);
  const overlaps = samePurpose.flatMap(p =>
    pkg.apiSurface.filter(api => p.apiSurface.includes(api)).map(() => p.name),
  );

  const uniqueOverlaps = [...new Set(overlaps)];
  const isRedundant = uniqueOverlaps.length > 0;
  const redundancyScore = samePurpose.length > 0
    ? Math.min(100, Math.round((uniqueOverlaps.length / pkg.apiSurface.length) * 100))
    : 0;

  return {
    packageName: pkg.name,
    ecosystem: pkg.ecosystem,
    capabilities,
    similarTo,
    overlaps: uniqueOverlaps,
    isRedundant,
    redundancyScore,
  };
}

export function detectDuplicateFunctionality(
  requestPackage: PackageInfo,
  existingDependencies: string[],
): string[] {
  const ecosystemPackages = ECOSYSTEM_KNOWN_PACKAGES[requestPackage.ecosystem] ?? [];

  return existingDependencies.filter(existingName => {
    const existingPkg = ecosystemPackages.find(p => p.name === existingName);
    if (!existingPkg) return false;
    return existingPkg.purpose === requestPackage.purpose;
  });
}

export function getApprovedCoreStack(ecosystem: Ecosystem): Record<string, string> {
  const coreStacks: Record<Ecosystem, Record<string, string>> = {
    npm: {
      HTTP: 'axios',
      Validation: 'zod',
      Dates: 'dayjs',
      Database: 'prisma',
    },
    pip: {
      HTTP: 'requests',
      Validation: 'pydantic',
      Dates: 'pendulum',
      Database: 'sqlalchemy',
    },
    cargo: {
      Serialization: 'serde',
      HTTP: 'reqwest',
      Dates: 'chrono',
      Database: 'diesel',
    },
    go: {
      HTTP: 'gin',
      Database: 'database/sql',
    },
  };

  return coreStacks[ecosystem] ?? {};
}

export function getAllKnownPackages(ecosystem?: Ecosystem): PackageInfo[] {
  if (ecosystem) {
    return [...(ECOSYSTEM_KNOWN_PACKAGES[ecosystem] ?? [])];
  }
  return Object.values(ECOSYSTEM_KNOWN_PACKAGES).flat();
}

export function getRegistry(): Record<Ecosystem, string[]> {
  const result: Record<Ecosystem, string[]> = { npm: [], pip: [], cargo: [], go: [] };
  for (const eco of Object.keys(ECOSYSTEM_KNOWN_PACKAGES) as Ecosystem[]) {
    result[eco] = ECOSYSTEM_KNOWN_PACKAGES[eco].map(p => p.name);
  }
  return result;
}
