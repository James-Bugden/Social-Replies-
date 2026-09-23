import type { ImportSourceType } from '@/lib/contracts/vocabulary';
import { driveAdapter } from './adapters/drive';
import { linkedInAdapter } from './adapters/linkedin';
import { threadsAdapter } from './adapters/threads';
import { xAdapter } from './adapters/x';
import type { ImportAdapter } from './types';

/**
 * The public surface of the private importer (SR-007, SR-008).
 *
 * Every adapter here is 'synthetic-tested'. No real export has been inspected,
 * so no source's backfill can be called done, and the coverage report says so
 * rather than leaving the reader to infer it from a row count.
 */

export const ADAPTERS: Readonly<Record<ImportSourceType, ImportAdapter>> = Object.freeze({
  linkedin: linkedInAdapter,
  x: xAdapter,
  threads: threadsAdapter,
  drive: driveAdapter,
});

export function adapterFor(source: ImportSourceType): ImportAdapter {
  return ADAPTERS[source];
}

export { driveAdapter, linkedInAdapter, threadsAdapter, xAdapter };

export { runImport, transactionalDatabase } from './batch';
export type { ImportCounts, ImportRunOptions, ImportRunResult } from './batch';

export {
  candidateIdentities,
  normaliseReplyUrl,
  reconcile,
  recordIdentity,
  sameEvent,
  IDENTITY_RANKS,
} from './identity';
export type { IdentityTier, ReconcilableReply, Reconciliation, RecordIdentity } from './identity';

export {
  inspectArchive,
  inspectArchiveEntry,
  parseArchivePayload,
  resolveWithinRoot,
  unsafeArchivePath,
} from './safety';
export type { ArchiveDescriptor, ArchiveEntry, ArchiveVerdict, PayloadParse } from './safety';

export { buildCoverageReport, formatCoverageReport, loadCoverage } from './report';
export type { CoverageReport, SourceCoverage } from './report';

export { classifyDate, classifyTwitterDate } from './dates';
export type { DateFields } from './dates';

export { parseCsv, pickField } from './csv';
export type { CsvDocument, CsvRow } from './csv';

export { IMPORT_WARNING_CODES } from './types';
export type {
  AdapterInput,
  AdapterInspection,
  AdapterValidationStatus,
  ImportAdapter,
  ImportDatabase,
  ImportRecord,
  ImportWarningCode,
  ParsedRecord,
  SqlRunner,
} from './types';
