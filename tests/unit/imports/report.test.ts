import { describe, it, expect } from 'vitest';
import { buildCoverageReport, formatCoverageReport } from '@/lib/imports/report';
import type { ImportRunResult } from '@/lib/imports/batch';

/**
 * The coverage ledger.
 *
 * The two things worth testing are that partial coverage still reads as partial,
 * and that nothing private can reach the printed lines. The second one is why the
 * report carries counts and codes rather than the records they came from.
 */

function result(overrides: Partial<ImportRunResult> = {}): ImportRunResult {
  return {
    batchId: 'batch-1',
    sourceType: 'linkedin',
    adapterVersion: 'linkedin-0.1.0',
    adapterStatus: 'synthetic-tested',
    status: 'completed',
    resumedAfterOrdinal: 0,
    counts: { seen: 10, imported: 7, duplicate: 1, needsReview: 1, invalid: 1 },
    warningCodes: { unknown_date: 2, other_author: 1 },
    dateRange: { earliest: '2025-11-02', latest: '2026-03-04' },
    unknownDates: 2,
    missingContext: 3,
    ...overrides,
  };
}

describe('buildCoverageReport', () => {
  it('names the sources that produced nothing rather than leaving them out', () => {
    const report = buildCoverageReport([result()]);
    expect(report.unavailableSources.sort()).toEqual(['drive', 'threads', 'x']);
  });

  it('adds a second file to the same source instead of replacing it', () => {
    const report = buildCoverageReport([
      result(),
      result({
        counts: { seen: 4, imported: 4, duplicate: 0, needsReview: 0, invalid: 0 },
        dateRange: { earliest: '2024-02-01', latest: '2024-06-01' },
        warningCodes: { unknown_date: 1 },
        unknownDates: 1,
        missingContext: 0,
      }),
    ]);
    const linkedin = report.sources[0]!;
    expect(linkedin.filesInspected).toBe(2);
    expect(linkedin.recordsSeen).toBe(14);
    expect(linkedin.warningCodes.unknown_date).toBe(3);
    expect(linkedin.earliestKnownDate).toBe('2024-02-01');
    expect(linkedin.latestKnownDate).toBe('2026-03-04');
  });

  it('carries the adapter status through, so synthetic stays synthetic', () => {
    const report = buildCoverageReport([result()]);
    expect(report.sources[0]?.adapterStatus).toBe('synthetic-tested');
  });
});

describe('formatCoverageReport', () => {
  it('prints counts and codes and nothing that could identify a record', () => {
    const lines = formatCoverageReport(buildCoverageReport([result()]));
    const text = lines.join('\n');

    expect(text).toContain('files_inspected=1');
    expect(text).toContain('needs_review=1');
    expect(text).toContain('unknown_date=2');
    expect(text).toContain('status=synthetic-tested');
    expect(text).toContain('unavailable_sources: drive threads x');

    // Nothing that names a file, a person, an address or a reply.
    expect(text).not.toMatch(/https?:\/\//);
    expect(text).not.toMatch(/\.(csv|json|jsonl|js|zip)\b/);
    expect(text).not.toMatch(/[/\\][A-Za-z0-9_-]+[/\\]/);
  });

  it('prints an absent date range as none rather than as today', () => {
    const lines = formatCoverageReport(
      buildCoverageReport([result({ dateRange: { earliest: null, latest: null } })]),
    );
    expect(lines.join('\n')).toContain('known_range=none..none');
  });
});
