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
    expect(connectors).toEqual(['scripts/lib/db.mts']);
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
    const files = [
      ...trackedFiles('src/lib/ai/prompts/', ['.ts']).filter(
        (file) => !file.endsWith('terminology.ts'),
      ),
      'src/lib/workspace/copy.ts',
    ];
    expect(files.length).toBeGreaterThan(1);

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
