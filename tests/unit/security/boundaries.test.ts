import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/**
 * Architectural boundaries, enforced rather than documented (C01, C08, C10).
 *
 * Each of these is a rule that is easy to state, easy to agree with, and easy to
 * break six months later in a hurry. A comment does not survive that; a failing
 * test does.
 */

const NUL = String.fromCharCode(0);

function trackedFiles(prefix: string, extensions: string[]): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split(NUL)
    .filter(Boolean)
    .filter((file) => file.startsWith(prefix))
    .filter((file) => extensions.some((extension) => file.endsWith(extension)));
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

describe('the request path never holds a database connection', () => {
  it('nothing under src/ imports pg', () => {
    const offenders = trackedFiles('src/', ['.ts', '.tsx']).filter((file) =>
      /from\s+['"]pg['"]|require\(['"]pg['"]\)/.test(read(file)),
    );

    // An ordinary request runs under the owner's session through PostgREST, so
    // row-level security is the boundary. A direct connection would bypass it.
    expect(offenders).toEqual([]);
  });

  it('only the administrative script helper connects directly', () => {
    const connectors = trackedFiles('scripts/', ['.ts', '.mts', '.mjs']).filter((file) =>
      /new Client\(|new Pool\(/.test(read(file)),
    );
    expect(connectors).toEqual(['scripts/lib/db.ts']);
  });
});

describe('the typecheck gate is not blind to any source file', () => {
  it('no tracked source file uses an extension tsconfig does not include', () => {
    // `include` uses `**/*.ts`, which does **not** match `.mts` or `.cts`. Two
    // scripts sat outside `npm run typecheck` for a while because of exactly this,
    // and nothing went red: a gate that silently skips files reads as a pass.
    // The project standardises on `.ts`, and this is what keeps it that way.
    const stragglers = trackedFiles('', ['.mts', '.cts']);
    expect(stragglers).toEqual([]);
  });

  it('every tracked TypeScript file is one tsc actually reads', () => {
    // Asks the compiler what it read, rather than trusting the include globs to
    // mean what they look like they mean.
    const toPosix = (value: string) => value.split(String.fromCharCode(92)).join('/');
    const root = `${toPosix(process.cwd())}/`;

    const listed = new Set(
      execFileSync('npx', ['tsc', '--noEmit', '--listFilesOnly'], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        shell: true,
      })
        .split(String.fromCharCode(10))
        .map((line) => toPosix(line.trim()))
        .filter(Boolean)
        .map((absolute) => (absolute.startsWith(root) ? absolute.slice(root.length) : absolute)),
    );

    const unchecked = trackedFiles('', ['.ts', '.tsx']).filter((file) => !listed.has(file));
    expect(unchecked).toEqual([]);
  }, 180_000);
});

describe('error identity survives module duplication', () => {
  it('nothing uses instanceof on AppError', () => {
    // Next hands a server component and a route handler separate copies of the
    // same module, so `instanceof` compares against the wrong class object and
    // quietly turns a deliberate 409 into an unexplained 500. A branded symbol
    // is the same brand in every copy; `isAppError` is the only safe check.
    const offenders = trackedFiles('src/', ['.ts', '.tsx']).filter((file) =>
      /instanceof\s+AppError/.test(read(file).replace(/\/\*[\s\S]*?\*\//g, '')),
    );
    expect(offenders).toEqual([]);
  });

  it('an AppError from a different module copy is still recognised', async () => {
    const { AppError, isAppError } = await import('@/lib/contracts/errors');

    expect(isAppError(new AppError('version_conflict', 'x'))).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError(null)).toBe(false);

    // A hand-built object carrying the same registered brand passes, which is
    // exactly the cross-chunk case: same brand, different class object.
    const fromAnotherCopy = Object.assign(new Error('from elsewhere'), {
      [Symbol.for('social-replies.AppError')]: true,
      code: 'version_conflict',
    });
    expect(isAppError(fromAnotherCopy)).toBe(true);
    expect(fromAnotherCopy instanceof AppError).toBe(false);
  });
});

describe('test-only routes cannot exist in production', () => {
  it('every route under api/test checks the test-mode switch first', () => {
    const routes = trackedFiles('src/app/api/test/', ['.ts']);
    // If this list is ever empty the test is vacuous, so say so rather than pass.
    expect(routes.length).toBeGreaterThan(0);

    for (const file of routes) {
      const source = read(file);
      expect(source.includes('isTestMode'), `${file} does not check test mode`).toBe(true);
      // A 404 rather than a 403: an unrouted path is what a production deployment
      // should look like, not a locked door that advertises there is a room.
      expect(source.includes('404') || source.includes('status: 404'), `${file} does not 404`).toBe(
        true,
      );
    }
  });
});

describe('the service-role key never reaches a request', () => {
  it('no route or component reads SUPABASE_SECRET_KEY', () => {
    const offenders = trackedFiles('src/', ['.ts', '.tsx']).filter((file) =>
      read(file).includes('SUPABASE_SECRET_KEY'),
    );
    expect(offenders).toEqual([]);
  });

  it('no client component reads a server-only credential', () => {
    const clientFiles = trackedFiles('src/', ['.ts', '.tsx']).filter((file) =>
      read(file).startsWith("'use client'"),
    );

    for (const file of clientFiles) {
      const source = read(file);
      for (const name of ['AI_API_KEY', 'EMBEDDING_API_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_DB_URL']) {
        expect(source.includes(name), `${file} reads ${name}`).toBe(false);
      }
      // `serverConfig()` returns credentials. A client component importing it
      // would pull them into the browser bundle.
      expect(source.includes('serverConfig'), `${file} imports serverConfig`).toBe(false);
    }
  });
});

describe('the generation service has no capabilities', () => {
  it('no provider adapter defines a tool, a function call or a browsing action', () => {
    for (const file of trackedFiles('src/lib/ai/', ['.ts'])) {
      const source = read(file);
      expect(/\btools\s*:/.test(source), `${file} defines tools`).toBe(false);
      expect(/\btool_choice\b/.test(source), `${file} sets tool_choice`).toBe(false);
      expect(/\bfunction_call\b/.test(source), `${file} sets function_call`).toBe(false);
    }
  });

  it('only the provider adapters reach the network', () => {
    const callers = trackedFiles('src/lib/ai/', ['.ts']).filter((file) =>
      /\bfetch\(|doFetch\(/.test(read(file)),
    );
    expect(callers.sort()).toEqual(['src/lib/ai/providers/anthropic.ts']);
  });
});

describe('copy lives in one place', () => {
  it('the workspace components do not inline user-facing strings for known states', () => {
    // A string duplicated into a component drifts from the specification, and
    // D12 is a table this app is meant to be diffable against.
    const phrases = [
      'No matching past replies yet.',
      'Nothing worth linking for this one.',
      'Your reply changed. Refresh the English meaning.',
      "Couldn't save your reply. Your text is still here.",
    ];
    const copy = read('src/lib/workspace/copy.ts');
    for (const phrase of phrases) {
      expect(copy.includes(phrase), `copy.ts is missing: ${phrase}`).toBe(true);
    }

    for (const file of trackedFiles('src/components/', ['.tsx'])) {
      const source = read(file);
      for (const phrase of phrases) {
        expect(source.includes(phrase), `${file} inlines: ${phrase}`).toBe(false);
      }
    }
  });
});

describe('generated social text avoids the owner’s banned punctuation', () => {
  it('no prompt or copy module contains an em dash', () => {
    // terminology.ts is the one file that must contain the character: it is the
    // detector. Exempting the detector is not the same as exempting the rule,
    // and the case below proves the rule still fires.
    // Widened from the prompt modules to the whole of src/. The owner does not
    // use this character, so a comment that contains one is a comment written in
    // someone else's voice, and prose has a way of migrating into strings.
    const files = trackedFiles('src/', ['.ts', '.tsx']).filter(
      (file) => !file.endsWith('terminology.ts'),
    );
    expect(files.length).toBeGreaterThan(20);

    for (const file of files) {
      expect(read(file).includes('—'), `${file} contains an em dash`).toBe(false);
    }
  });

  it('the detector actually fires on one', async () => {
    const { findAiTells } = await import('@/lib/ai/prompts/terminology');
    expect(findAiTells('Skim the opening — then decide.')).toContain('em dash');
    expect(findAiTells('Skim the opening, then decide.')).not.toContain('em dash');
  });
});
