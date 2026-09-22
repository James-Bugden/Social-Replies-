import { describe, expect, it } from 'vitest';
import { searchReplies } from '@/lib/retrieval/search';
import type { CandidateSource } from '@/lib/retrieval/candidates';
import type { LexicalRow } from '@/lib/retrieval/lexical';

function row(i: number): LexicalRow {
  return {
    id: `r${i}`,
    platform: 'threads',
    final_text: `negotiation advice number ${i}`,
    provenance: 'posted_confirmed',
    publication_evidence: 'url_confirmed',
    posted_at: `2026-01-0${i}T00:00:00Z`,
    posted_date: null,
    date_precision: 'exact',
    recorded_at: `2026-01-0${i}T00:00:00Z`,
    score: 1 / i,
  };
}

const rows = [1, 2, 3, 4, 5, 6].map(row);
const source: CandidateSource = {
  async fullText() { return rows; },
  async trigram() { return rows; },
};

describe('analyse cursor replayed by library search', () => {
  it('page 1 as analyse does it', async () => {
    const page1 = await searchReplies(source, {
      query: 'negotiation advice',
      includeAiDrafts: false,
      cursor: null,
      limit: 3,
    });
    expect(page1.items.length).toBe(3);
    expect(page1.next_cursor).toBeTruthy();
    console.log('PAGE1 cursor:', page1.next_cursor);

    // Same cursor, replayed exactly as searchLibrary does it.
    let thrown: unknown = null;
    try {
      await searchReplies(source, {
        query: 'negotiation advice',
        includeAiDrafts: true,
        includeUnknownDates: true,
        cursor: page1.next_cursor,
        limit: 5,
      });
    } catch (e) { thrown = e; }
    console.log('LIBRARY REPLAY THREW:', thrown && (thrown as Error).message, (thrown as { code?: string })?.code);

    // Control: same cursor with includeAiDrafts:false works.
    const ok = await searchReplies(source, {
      query: 'negotiation advice',
      includeAiDrafts: false,
      includeUnknownDates: true,
      cursor: page1.next_cursor,
      limit: 5,
    });
    console.log('CONTROL page2 items:', ok.items.length, ok.state);
  });
});
