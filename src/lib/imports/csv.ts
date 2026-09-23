/**
 * A small RFC 4180 reader, written here rather than added as a dependency.
 *
 * Two properties matter for an import and are why the platform `split(',')` is
 * not enough: a reply routinely contains a comma, and a reply routinely contains
 * a newline. Both appear inside quotes in a correct export, and a naive split
 * turns one reply into several records that each look plausible.
 *
 * A row whose field count disagrees with the header is returned as `malformed`
 * rather than thrown, so that one bad row does not discard the rows around it
 * (IMP-04).
 */

export type CsvRow =
  | { ok: true; line: number; fields: Record<string, string> }
  | { ok: false; line: number; reason: 'field_count' | 'unterminated_quote' };

export interface CsvDocument {
  header: string[];
  rows: CsvRow[];
}

interface RawRow {
  line: number;
  values: string[];
  unterminated: boolean;
}

function readRows(text: string): RawRow[] {
  const rows: RawRow[] = [];
  let values: string[] = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;
  let started = false;

  const endField = (): void => {
    values.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    rows.push({ line: rowLine, values, unterminated: false });
    values = [];
    started = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (!started) {
      rowLine = line;
      started = true;
    }

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"' && field === '') {
      inQuotes = true;
    } else if (char === ',') {
      endField();
    } else if (char === '\r') {
      // A lone CR is treated as a line ending too; exports disagree about this.
      if (text[i + 1] === '\n') i += 1;
      line += 1;
      endRow();
    } else if (char === '\n') {
      line += 1;
      endRow();
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    values.push(field);
    rows.push({ line: rowLine, values, unterminated: true });
  } else if (started || field !== '') {
    endField();
    rows.push({ line: rowLine, values, unterminated: false });
  }

  return rows;
}

export function parseCsv(text: string): CsvDocument {
  const raw = readRows(text.replace(/^﻿/, ''));
  const headerRow = raw.shift();
  if (!headerRow) return { header: [], rows: [] };

  const header = headerRow.values.map((name) => name.trim().toLowerCase());
  const rows: CsvRow[] = [];

  for (const row of raw) {
    // A trailing newline produces one empty row. It is not a malformed record.
    if (row.values.length === 1 && row.values[0] === '') continue;

    if (row.unterminated) {
      rows.push({ ok: false, line: row.line, reason: 'unterminated_quote' });
      continue;
    }
    if (row.values.length !== header.length) {
      rows.push({ ok: false, line: row.line, reason: 'field_count' });
      continue;
    }
    const fields: Record<string, string> = {};
    header.forEach((name, index) => {
      fields[name] = row.values[index] ?? '';
    });
    rows.push({ ok: true, line: row.line, fields });
  }

  return { header, rows };
}

/** Picks the first header present, so a plausible alias does not need a new parser. */
export function pickField(
  fields: Record<string, string>,
  names: readonly string[],
): string | null {
  for (const name of names) {
    const value = fields[name];
    if (value !== undefined && value.trim() !== '') return value;
  }
  return null;
}
