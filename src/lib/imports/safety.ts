// IMPORT_LIMITS lives in contracts/limits.ts with every other bound the app
// enforces, so there is one place to look and one place to change.
import { IMPORT_LIMITS } from '@/lib/contracts/limits';

export { IMPORT_LIMITS };
import { isAbsolute, resolve, sep } from 'node:path';
import type { ImportWarningCode } from './types';

/**
 * Everything checked before a single record is parsed (C04, IMP-04).
 *
 * The threat here is not an attacker on a network. It is an archive downloaded
 * from a platform, or copied off a drive, that contains something other than
 * what its name suggests: an entry that writes outside the staging directory, a
 * wrapper that wants to be executed, or a small file that expands into a large
 * one. Each of those is cheap to check and expensive to discover afterwards.
 */

/**
 * Wrappers that exist to be run.
 *
 * `.js` is deliberately not on this list: X's own archive stores its data in
 * files with that extension, and the protection against them is that this code
 * never evaluates an archive file, not that it refuses to read one. See
 * `parseArchivePayload`.
 */
const EXECUTABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  'exe', 'dll', 'so', 'dylib', 'bat', 'cmd', 'com', 'scr', 'ps1', 'psm1', 'psd1',
  'vbs', 'vbe', 'wsf', 'wsh', 'jar', 'msi', 'msp', 'lnk', 'sh', 'bash', 'zsh',
  'app', 'deb', 'rpm', 'apk', 'pkg', 'dmg', 'reg', 'hta', 'cpl', 'scf', 'inf',
  'py', 'rb', 'php', 'pl', 'jse', 'vbscript',
]);

/** Extensions an adapter can actually read. Anything else is skipped, not run. */
const DATA_EXTENSIONS: ReadonlySet<string> = new Set([
  'json', 'jsonl', 'ndjson', 'js', 'csv', 'tsv', 'txt', 'md', 'html', 'htm', 'xml',
]);

export interface ArchiveEntry {
  path: string;
  compressedBytes: number;
  /** What the archive's own header claims the entry expands to. */
  declaredUncompressedBytes: number;
  isSymlink?: boolean;
}

export interface ArchiveDescriptor {
  archiveBytes: number;
  entries: readonly ArchiveEntry[];
}

export interface EntryVerdict {
  path: string;
  safe: boolean;
  warnings: ImportWarningCode[];
}

export interface ArchiveVerdict {
  safe: boolean;
  warnings: ImportWarningCode[];
  /** Entries an adapter may read. Empty whenever `safe` is false. */
  readable: string[];
  rejected: EntryVerdict[];
}

function extensionOf(path: string): string {
  const name = path.replace(/\\/g, '/').split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/**
 * Whether an entry path would escape the directory it is extracted into.
 *
 * Checked against both separators and against a Windows drive letter, because an
 * archive built on one platform is routinely opened on the other and a check
 * that only understands `/` is no check at all here.
 */
export function unsafeArchivePath(path: string): ImportWarningCode | null {
  if (path.includes('\0')) return 'archive_path_traversal';
  if (/^[A-Za-z]:/.test(path)) return 'archive_absolute_path';

  const unified = path.replace(/\\/g, '/');
  if (unified.startsWith('/')) return 'archive_absolute_path';
  if (unified.split('/').some((segment) => segment === '..')) return 'archive_path_traversal';
  return null;
}

export function inspectArchiveEntry(entry: ArchiveEntry): EntryVerdict {
  const warnings: ImportWarningCode[] = [];

  const pathProblem = unsafeArchivePath(entry.path);
  if (pathProblem) warnings.push(pathProblem);

  // A symlink is a path that resolves somewhere else at read time, so it defeats
  // the path check above no matter how carefully that check is written.
  if (entry.isSymlink) warnings.push('archive_symlink');

  const extension = extensionOf(entry.path);
  if (EXECUTABLE_EXTENSIONS.has(extension)) warnings.push('archive_executable_entry');
  if (entry.declaredUncompressedBytes > IMPORT_LIMITS.maxFileBytes) {
    warnings.push('archive_entry_too_large');
  }

  return { path: entry.path, safe: warnings.length === 0, warnings };
}

/**
 * Validates an archive from its table of contents, before extracting anything.
 *
 * Any unsafe entry rejects the whole archive rather than being skipped. An
 * archive that contains a traversal entry is not a partly trustworthy archive.
 */
export function inspectArchive(descriptor: ArchiveDescriptor): ArchiveVerdict {
  const warnings: ImportWarningCode[] = [];
  const rejected: EntryVerdict[] = [];
  const readable: string[] = [];

  if (descriptor.archiveBytes > IMPORT_LIMITS.maxArchiveBytes) {
    warnings.push('archive_too_large');
  }
  if (descriptor.entries.length > IMPORT_LIMITS.maxEntries) {
    warnings.push('archive_too_many_entries');
  }

  let declaredTotal = 0;
  let compressedTotal = 0;
  for (const entry of descriptor.entries) {
    declaredTotal += entry.declaredUncompressedBytes;
    compressedTotal += entry.compressedBytes;

    const verdict = inspectArchiveEntry(entry);
    if (!verdict.safe) {
      rejected.push(verdict);
      continue;
    }
    if (DATA_EXTENSIONS.has(extensionOf(entry.path))) {
      readable.push(entry.path);
    } else {
      rejected.push({
        path: entry.path,
        safe: false,
        warnings: ['archive_unsupported_entry'],
      });
    }
  }

  if (declaredTotal > IMPORT_LIMITS.maxDeclaredUncompressedBytes) {
    warnings.push('archive_too_large');
  }
  // The ratio is what catches an archive whose declared size is modest but whose
  // compressed size is tiny, which is the shape of a bomb rather than of data.
  if (compressedTotal > 0 && declaredTotal / compressedTotal > IMPORT_LIMITS.maxExpansionRatio) {
    warnings.push('archive_expansion_ratio');
  }

  const fatal = rejected.filter((entry) =>
    entry.warnings.some((code) => code !== 'archive_unsupported_entry'),
  );
  for (const entry of fatal) {
    for (const code of entry.warnings) {
      if (!warnings.includes(code)) warnings.push(code);
    }
  }

  const safe = warnings.length === 0;
  return { safe, warnings, readable: safe ? readable : [], rejected };
}

export type PayloadParse =
  | { ok: true; data: unknown; warnings: ImportWarningCode[] }
  | { ok: false; warnings: ImportWarningCode[] };

/**
 * An X archive file is a JavaScript assignment whose right-hand side is JSON:
 *
 *   window.YTD.tweets.part0 = [ { "tweet": { ... } } ]
 *
 * It is read by removing the assignment and calling `JSON.parse` on what is
 * left. There is no `eval` and no `new Function` here, and there must never be:
 * the file comes from outside and the difference between parsing it and running
 * it is the difference between reading an archive and executing whatever the
 * archive contains. Anything that is not plain JSON after the prefix is removed
 * is rejected, which is exactly what makes the absence of an evaluator safe
 * rather than merely tidy.
 */
const ASSIGNMENT_PREFIX = /^\s*(?:window\s*\.\s*)?YTD\s*\.[A-Za-z0-9_$]+(?:\s*\.\s*[A-Za-z0-9_$]+)*\s*=\s*/;

export function parseArchivePayload(text: string): PayloadParse {
  const warnings: ImportWarningCode[] = [];
  // A byte order mark would make JSON.parse fail on an otherwise valid file.
  let body = text.replace(/^﻿/, '');

  const match = ASSIGNMENT_PREFIX.exec(body);
  if (match) {
    body = body.slice(match[0].length);
    warnings.push('archive_js_wrapper_parsed_as_data');
  }

  body = body.trim().replace(/;+\s*$/, '').trim();

  // JSON documents start with one of these two characters. Refusing anything
  // else turns an expression such as `(globalThis.x = 1, [])` into a rejection
  // with a clear code rather than a JSON.parse message about an unexpected token.
  if (!body.startsWith('[') && !body.startsWith('{')) {
    return { ok: false, warnings: [...warnings, 'unsupported_schema'] };
  }

  try {
    return { ok: true, data: JSON.parse(body) as unknown, warnings };
  } catch {
    return { ok: false, warnings: [...warnings, 'malformed_record'] };
  }
}

/**
 * Resolves a caller-supplied path inside the private staging root.
 *
 * Returns null rather than throwing, because the caller must not print the
 * rejected path: the whole reason this function exists is that the path came
 * from somewhere the process does not control.
 */
export function resolveWithinRoot(root: string, candidate: string): string | null {
  if (candidate.includes('\0')) return null;
  if (isAbsolute(candidate) || /^[A-Za-z]:/.test(candidate)) return null;

  const base = resolve(root);
  const target = resolve(base, candidate);
  if (target !== base && !target.startsWith(base + sep)) return null;
  return target;
}
