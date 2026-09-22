#!/usr/bin/env node
/**
 * Tracked-private-data policy check (SR-001, SEC-03).
 *
 * Three separate guarantees:
 *  1. No Git-tracked file sits on a private path (corpora, exports, auth state, traces).
 *  2. `.gitignore` still covers every private pattern this policy depends on.
 *  3. `.env.example` lists names only: every secret or private name has a blank value.
 *
 * This is a policy check, not a secret scanner. `scripts/scan-secrets.mjs` inspects
 * file contents; this one inspects what is tracked and how the repo is configured.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const NUL = String.fromCharCode(0);

const FORBIDDEN_TRACKED = [
  { id: 'private-dir', re: /(^|\/)private\// },
  { id: 'local-data', re: /^local-data\// },
  { id: 'private-imports', re: /^(imports|exports|data)\/private\// },
  { id: 'private-eval-set', re: /^tests\/evals\/private\// },
  { id: 'auth-state', re: /(^|\/)(playwright\/\.auth|\.auth)\// },
  { id: 'storage-state', re: /(^|\/)(storage-state|cookies)[^/]*\.json$/ },
  { id: 'env-file', re: /(^|\/)\.env(\.|$)(?!example)/ },
  { id: 'key-material', re: /\.(pem|key|p12|pfx)$/ },
  { id: 'sqlite-db', re: /\.sqlite3?$/ },
  { id: 'test-artifacts', re: /^(test-results|playwright-report|traces|artifacts)\// },
];

const REQUIRED_IGNORES = [
  '.env',
  '.env.*',
  'private/',
  '**/private/',
  'local-data/',
  'imports/private/',
  'tests/evals/private/',
  'playwright/.auth/',
  'test-results/',
  'playwright-report/',
  'traces/',
  '*.pem',
  '*.key',
];

// Names in .env.example that must never carry a value in a public repository.
const MUST_BE_BLANK = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'AI_API_KEY',
  'EMBEDDING_API_KEY',
  'PRIVATE_SOURCE_ROOT',
  'PRIVATE_EVAL_SET_PATH',
  'RESOURCE_BASE_URL',
];

// Every name C10 requires the template to declare.
const REQUIRED_ENV_NAMES = [
  'APP_BASE_URL',
  'RESOURCE_BASE_URL',
  'APP_TIMEZONE',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'AI_PROVIDER',
  'AI_MODEL',
  'AI_API_KEY',
  'EMBEDDING_PROVIDER',
  'EMBEDDING_MODEL',
  'EMBEDDING_API_KEY',
  'PRIVATE_SOURCE_ROOT',
  'PRIVATE_EVAL_SET_PATH',
  'SUPABASE_DB_URL',
  'PRIVATE_OWNER_AUTHOR_IDS',
];

const problems = [];

const tracked = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
  .split(NUL)
  .filter(Boolean);

for (const file of tracked) {
  for (const rule of FORBIDDEN_TRACKED) {
    if (rule.re.test(file)) problems.push(`tracked private path (${rule.id}): ${file}`);
  }
}

const gitignore = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8').split('\n').map((l) => l.trim()) : [];
for (const pattern of REQUIRED_IGNORES) {
  if (!gitignore.includes(pattern)) problems.push(`.gitignore is missing required pattern: ${pattern}`);
}

if (!existsSync('.env.example')) {
  problems.push('.env.example is missing: it is the canonical name list (C10)');
} else {
  const lines = readFileSync('.env.example', 'utf8').split('\n');
  const declared = new Set();
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) {
      problems.push(`.env.example line is not NAME=value: ${line}`);
      continue;
    }
    const name = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    declared.add(name);
    if (MUST_BE_BLANK.includes(name) && value !== '') {
      problems.push(`.env.example must leave ${name} blank in a public repository`);
    }
  }
  for (const name of REQUIRED_ENV_NAMES) {
    if (!declared.has(name)) problems.push(`.env.example does not declare required name: ${name}`);
  }
}

if (problems.length > 0) {
  console.error(`private-path policy: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`private-path policy: clean (${tracked.length} tracked files)`);
