import { parseCsv, pickField } from '../csv';
import { classifyDate } from '../dates';
import type {
  AdapterInput,
  AdapterInspection,
  ImportAdapter,
  ImportRecord,
  ImportWarningCode,
  ParsedRecord,
} from '../types';

/**
 * LinkedIn comments, read from a CSV export.
 *
 * NOTHING HERE HAS BEEN CHECKED AGAINST A REAL LINKEDIN EXPORT. The column names
 * below are written against the synthetic sample in `tests/fixtures/imports/`,
 * and the aliases are plausible guesses rather than observed headings. That is
 * why `validationStatus` is 'synthetic-tested' and must stay there until somebody
 * opens the genuine file and confirms the mapping. A parser that quietly assumed
 * it was right would produce an archive that looked complete and was not.
 *
 * Where the export is silent, this adapter is silent: no invented parent text, no
 * assembled reply URL and no date derived from the import clock.
 */

const COLUMNS = {
  commentId: ['comment_id', 'commentid', 'comment id'],
  commentUrl: ['comment_url', 'commenturl', 'comment url', 'link'],
  postedAt: ['posted_at', 'date', 'created_at', 'time'],
  timezone: ['timezone', 'time_zone', 'tz'],
  postUrl: ['post_url', 'posturl', 'post link', 'parent_url'],
  postText: ['post_text', 'parent_text', 'post', 'context'],
  author: ['comment_author', 'author', 'member', 'from'],
  text: ['comment_text', 'message', 'comment', 'text'],
} as const;

const SCHEMA_SIGNATURE = 'csv:comment_id,comment_url,posted_at,post_url,comment_author,comment_text';

function headerSignature(header: readonly string[]): string {
  return `csv:${[...header].sort().join(',')}`;
}

export const linkedInAdapter: ImportAdapter = {
  sourceType: 'linkedin',
  adapterVersion: 'linkedin-0.1.0',
  schemaSignature: SCHEMA_SIGNATURE,
  validationStatus: 'synthetic-tested',
  schemaNote:
    'Schema unconfirmed. Written against a synthetic CSV sample; the delivered LinkedIn export has not been inspected, so the real backfill is still pending.',

  inspect(input: AdapterInput): AdapterInspection {
    const { header } = parseCsv(input.text);
    const hasText = COLUMNS.text.some((name) => header.includes(name));
    const hasIdentity =
      COLUMNS.commentId.some((name) => header.includes(name)) ||
      COLUMNS.commentUrl.some((name) => header.includes(name));
    return {
      matches: hasText && hasIdentity,
      observedSignature: headerSignature(header),
      notes: [
        'Column names are guesses against a synthetic sample, not observed headings.',
      ],
    };
  },

  *parse(input: AdapterInput): Generator<ParsedRecord> {
    const document = parseCsv(input.text);
    const inspection = this.inspect(input);
    if (!inspection.matches) {
      yield { outcome: 'invalid', locator: 'header', warnings: ['unsupported_schema'] };
      return;
    }

    for (const row of document.rows) {
      const locator = `row:${row.line}`;
      if (!row.ok) {
        // One broken row is reported and the rest of the file continues.
        yield { outcome: 'invalid', locator, warnings: ['malformed_record'] };
        continue;
      }

      const text = pickField(row.fields, COLUMNS.text);
      if (text === null) {
        yield { outcome: 'invalid', locator, warnings: ['empty_text'] };
        continue;
      }

      const author = pickField(row.fields, COLUMNS.author);
      const owners = input.ownerAuthorIds ?? [];
      const warnings: ImportWarningCode[] = [];
      if (author !== null) {
        if (owners.length === 0) {
          // The file names an author and nobody has said which author is the
          // owner, so authorship is unproven rather than assumed.
          yield { outcome: 'needs_review', locator, warnings: ['unverified_author'] };
          continue;
        }
        if (!owners.includes(author)) {
          yield { outcome: 'needs_review', locator, warnings: ['other_author'] };
          continue;
        }
      }

      const commentId = pickField(row.fields, COLUMNS.commentId);
      const commentUrl = pickField(row.fields, COLUMNS.commentUrl);
      const postUrl = pickField(row.fields, COLUMNS.postUrl);
      const dates = classifyDate(
        pickField(row.fields, COLUMNS.postedAt),
        pickField(row.fields, COLUMNS.timezone),
      );
      warnings.push(...dates.warnings);
      if (commentId === null) warnings.push('missing_native_id');

      const record: ImportRecord = {
        platform: 'linkedin',
        sourceType: 'linkedin',
        exactText: text,
        targetKind: 'post',
        targetText: pickField(row.fields, COLUMNS.postText),
        parentText: null,
        targetRef: postUrl,
        sourceUrl: postUrl,
        replyUrl: commentUrl,
        // The export supplies this as the comment's own address, so it is treated
        // as canonical. It is never assembled from an id and a profile name.
        replyUrlVerified: commentUrl !== null,
        nativeReplyId: commentId,
        sourceRecordId: commentId ?? commentUrl,
        provenance: 'posted_confirmed',
        publicationEvidence: 'platform_export',
        datePrecision: dates.datePrecision,
        postedAt: dates.postedAt,
        postedDate: dates.postedDate,
        sourceTimezone: dates.sourceTimezone,
        sourceFileHash: input.sourceFileHash,
        locator,
        warnings,
      };
      yield { outcome: 'record', locator, record };
    }
  },
};
