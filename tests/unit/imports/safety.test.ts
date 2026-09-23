import { describe, it, expect, afterEach } from 'vitest';
import {
  IMPORT_LIMITS,
  inspectArchive,
  inspectArchiveEntry,
  parseArchivePayload,
  resolveWithinRoot,
  unsafeArchivePath,
} from '@/lib/imports/safety';
import { fixture } from './helpers';

/**
 * IMP-04: what an archive is allowed to do before anything is parsed.
 *
 * Each case plants the hostile artefact and then asserts that it was refused
 * without a side effect, rather than asserting that a well-formed archive was
 * accepted.
 */

const EVAL_MARKER = 'SOCIAL_REPLIES_IMPORT_WAS_EVALUATED';

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[EVAL_MARKER];
});

describe('unsafeArchivePath', () => {
  it('rejects a traversal entry written with either separator', () => {
    expect(unsafeArchivePath('data/../../etc/passwd')).toBe('archive_path_traversal');
    expect(unsafeArchivePath('data\\..\\..\\windows\\system32\\a.txt')).toBe(
      'archive_path_traversal',
    );
  });

  it('rejects an absolute path and a Windows drive letter', () => {
    expect(unsafeArchivePath('/etc/passwd')).toBe('archive_absolute_path');
    expect(unsafeArchivePath('C:\\Users\\someone\\a.txt')).toBe('archive_absolute_path');
  });

  it('accepts an ordinary relative entry, including one that merely contains dots', () => {
    expect(unsafeArchivePath('data/tweets.part0.js')).toBeNull();
    expect(unsafeArchivePath('data/..hidden/notes.json')).toBeNull();
  });
});

describe('inspectArchiveEntry', () => {
  it('rejects a symlink, whose path resolves somewhere else at read time', () => {
    const verdict = inspectArchiveEntry({
      path: 'data/link.json',
      compressedBytes: 10,
      declaredUncompressedBytes: 10,
      isSymlink: true,
    });
    expect(verdict.warnings).toContain('archive_symlink');
  });

  it('rejects an executable wrapper', () => {
    for (const path of ['data/setup.exe', 'data/run.ps1', 'data/install.sh']) {
      const verdict = inspectArchiveEntry({
        path,
        compressedBytes: 10,
        declaredUncompressedBytes: 10,
      });
      expect(verdict.warnings).toContain('archive_executable_entry');
    }
  });

  it('allows the archive\u2019s own .js data file, which is read and never run', () => {
    const verdict = inspectArchiveEntry({
      path: 'data/tweets.js',
      compressedBytes: 10,
      declaredUncompressedBytes: 10,
    });
    expect(verdict.safe).toBe(true);
  });
});

describe('inspectArchive', () => {
  it('rejects the whole archive when one entry would escape the directory', () => {
    const verdict = inspectArchive({
      archiveBytes: 4096,
      entries: [
        { path: 'data/tweets.js', compressedBytes: 1000, declaredUncompressedBytes: 4000 },
        { path: '../outside.json', compressedBytes: 10, declaredUncompressedBytes: 40 },
      ],
    });
    expect(verdict.safe).toBe(false);
    expect(verdict.warnings).toContain('archive_path_traversal');
    // Nothing is offered for reading, because a partly hostile archive is hostile.
    expect(verdict.readable).toEqual([]);
  });

  it('rejects a decompression bomb by its expansion ratio', () => {
    const verdict = inspectArchive({
      archiveBytes: 1024,
      entries: [
        { path: 'data/replies.json', compressedBytes: 1024, declaredUncompressedBytes: 1024 * 1024 },
      ],
    });
    expect(verdict.safe).toBe(false);
    expect(verdict.warnings).toContain('archive_expansion_ratio');
  });

  it('rejects an oversized archive before opening it', () => {
    const verdict = inspectArchive({
      archiveBytes: IMPORT_LIMITS.maxArchiveBytes + 1,
      entries: [{ path: 'data/a.json', compressedBytes: 10, declaredUncompressedBytes: 20 }],
    });
    expect(verdict.warnings).toContain('archive_too_large');
  });

  it('accepts an ordinary archive and lists only the entries an adapter can read', () => {
    const verdict = inspectArchive({
      archiveBytes: 8000,
      entries: [
        { path: 'data/tweets.js', compressedBytes: 2000, declaredUncompressedBytes: 6000 },
        { path: 'assets/avatar.png', compressedBytes: 1000, declaredUncompressedBytes: 1200 },
      ],
    });
    expect(verdict.safe).toBe(true);
    expect(verdict.readable).toEqual(['data/tweets.js']);
    expect(verdict.rejected.map((entry) => entry.warnings[0])).toEqual([
      'archive_unsupported_entry',
    ]);
  });
});

describe('parseArchivePayload', () => {
  it('reads the JavaScript wrapper as data', () => {
    const parsed = parseArchivePayload(fixture('x-tweets.sample.js'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(Array.isArray(parsed.data)).toBe(true);
    expect(parsed.warnings).toContain('archive_js_wrapper_parsed_as_data');
  });

  it('IMP-04: a payload that would be dangerous if evaluated leaves no side effect', () => {
    expect((globalThis as Record<string, unknown>)[EVAL_MARKER]).toBeUndefined();

    const parsed = parseArchivePayload(fixture('x-tweets-dangerous.sample.js'));

    // The assertion that matters, checked before anything else so that it cannot
    // be skipped by an early return: the assignment inside the payload never ran.
    expect((globalThis as Record<string, unknown>)[EVAL_MARKER]).toBeUndefined();
    expect(parsed.ok).toBe(false);
    expect(parsed.ok ? [] : parsed.warnings).toContain('unsupported_schema');
  });

  it('rejects a payload that is not JSON once the assignment is removed', () => {
    const parsed = parseArchivePayload('window.YTD.tweets.part0 = [ {oops} ]');
    expect(parsed.ok).toBe(false);
  });
});

describe('resolveWithinRoot', () => {
  const root = process.platform === 'win32' ? 'C:\\private\\staging' : '/private/staging';

  it('rejects a path that climbs out of the staging root', () => {
    expect(resolveWithinRoot(root, '../../etc/passwd')).toBeNull();
    expect(resolveWithinRoot(root, 'exports/../../secrets.json')).toBeNull();
  });

  it('rejects an absolute path supplied in place of a relative one', () => {
    expect(resolveWithinRoot(root, process.platform === 'win32' ? 'D:\\x.json' : '/x.json')).toBeNull();
  });

  it('resolves an ordinary relative path inside the root', () => {
    const resolved = resolveWithinRoot(root, 'exports/history.jsonl');
    expect(resolved).not.toBeNull();
    expect(resolved?.startsWith(root)).toBe(true);
  });
});
