import type { DatePrecision } from '@/lib/contracts/vocabulary';
import type { ImportWarningCode } from './types';

/**
 * Turning what an export says about time into what the archive is allowed to
 * claim (C04).
 *
 * The rule that shapes every branch below is that import time is never posting
 * time. A value this module cannot read becomes `unknown` with both date fields
 * null, and a value that fixes a day but not an instant stays `date_only` with
 * whatever timezone the source declared, rather than being promoted to an
 * instant by assuming midnight somewhere.
 */

export interface DateFields {
  datePrecision: DatePrecision;
  postedAt: string | null;
  postedDate: string | null;
  sourceTimezone: string | null;
  warnings: ImportWarningCode[];
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATETIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;
const ZONED_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

export const UNKNOWN_DATE: Readonly<DateFields> = Object.freeze({
  datePrecision: 'unknown',
  postedAt: null,
  postedDate: null,
  sourceTimezone: null,
  warnings: ['unknown_date'] as ImportWarningCode[],
});

function unknown(warning: ImportWarningCode): DateFields {
  return {
    datePrecision: 'unknown',
    postedAt: null,
    postedDate: null,
    sourceTimezone: null,
    warnings: [warning],
  };
}

/**
 * Reads a date value from an export.
 *
 * `declaredTimezone` is the zone the source itself stated, not the app's zone and
 * not the machine's. Passing the app default in here would make an undated record
 * look like a Taipei record, which is exactly the day a counter would then be
 * wrong about.
 */
export function classifyDate(
  value: string | null | undefined,
  declaredTimezone: string | null = null,
): DateFields {
  const raw = (value ?? '').trim();
  if (raw === '') return { ...UNKNOWN_DATE, warnings: [...UNKNOWN_DATE.warnings] };

  const dateOnly = DATE_ONLY.exec(raw);
  if (dateOnly) {
    return {
      datePrecision: 'date_only',
      postedAt: null,
      postedDate: raw,
      sourceTimezone: declaredTimezone,
      warnings: declaredTimezone ? [] : ['date_only_unknown_timezone'],
    };
  }

  if (ZONED_DATETIME.test(raw)) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return unknown('unparsable_date');
    return {
      datePrecision: 'timestamp',
      postedAt: parsed.toISOString(),
      postedDate: null,
      // The offset in the value fixes the instant; it does not name a zone, and
      // guessing one from an offset would invent a fact the export did not state.
      sourceTimezone: declaredTimezone,
      warnings: [],
    };
  }

  const local = LOCAL_DATETIME.exec(raw);
  if (local) {
    // A wall-clock time with no offset is not an instant. The day it names is
    // real, so the day is kept and the precision says what was actually known.
    return {
      datePrecision: 'date_only',
      postedAt: null,
      postedDate: local[1]!,
      sourceTimezone: declaredTimezone,
      warnings: declaredTimezone ? [] : ['date_only_unknown_timezone'],
    };
  }

  return unknown('unparsable_date');
}

const TWITTER_MONTHS: Readonly<Record<string, string>> = Object.freeze({
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
});

const TWITTER_CREATED_AT =
  /^[A-Z][a-z]{2} ([A-Z][a-z]{2}) (\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{4}) (\d{4})$/;

/**
 * Reads the archive's own timestamp format, which is not ISO 8601.
 *
 * Handing this string to `new Date()` and hoping works on some runtimes and not
 * others, and a runtime-dependent date in an archive is worse than no date, so
 * the shape is matched explicitly and anything else is `unknown`.
 */
export function classifyTwitterDate(value: string | null | undefined): DateFields {
  const raw = (value ?? '').trim();
  if (raw === '') return { ...UNKNOWN_DATE, warnings: [...UNKNOWN_DATE.warnings] };

  const match = TWITTER_CREATED_AT.exec(raw);
  if (!match) return unknown('unparsable_date');

  const month = TWITTER_MONTHS[match[1]!];
  if (!month) return unknown('unparsable_date');

  const offset = `${match[6]!.slice(0, 3)}:${match[6]!.slice(3)}`;
  const iso = `${match[7]!}-${month}-${match[2]!}T${match[3]!}:${match[4]!}:${match[5]!}${offset}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return unknown('unparsable_date');

  return {
    datePrecision: 'timestamp',
    postedAt: parsed.toISOString(),
    postedDate: null,
    sourceTimezone: null,
    warnings: [],
  };
}
