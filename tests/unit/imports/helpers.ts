import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ImportRecord, ParsedRecord } from '@/lib/imports/types';

/** Shared synthetic builders. Nothing here touches a real export or a real name. */

export const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'imports');

export function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

export const FILE_HASH_A = 'a'.repeat(64);
export const FILE_HASH_B = 'b'.repeat(64);

export function makeRecord(overrides: Partial<ImportRecord> = {}): ImportRecord {
  return {
    platform: 'linkedin',
    sourceType: 'linkedin',
    exactText: 'Synthetic reply text.',
    targetKind: 'post',
    targetText: 'A synthetic post.',
    parentText: null,
    targetRef: 'post-1',
    sourceUrl: 'https://example.com/feed/post/1',
    replyUrl: null,
    replyUrlVerified: false,
    nativeReplyId: 'native-1',
    sourceRecordId: 'rec-1',
    provenance: 'posted_confirmed',
    publicationEvidence: 'platform_export',
    datePrecision: 'timestamp',
    postedAt: '2026-03-04T01:12:00.000Z',
    postedDate: null,
    sourceTimezone: 'Asia/Taipei',
    sourceFileHash: FILE_HASH_A,
    locator: 'row:2',
    warnings: [],
    ...overrides,
  };
}

export function asParsed(records: readonly ImportRecord[]): ParsedRecord[] {
  return records.map((record) => ({ outcome: 'record', locator: record.locator, record }));
}
