import 'server-only';
import { randomUUID } from 'node:crypto';
import { contentHash, searchText } from '@/lib/contracts/text';
import { APP, RETRIEVAL, RESOURCES as RESOURCE_LIMITS } from '@/lib/contracts/limits';
import { AppError } from '@/lib/contracts/errors';
import type { PastReply, Progress, QualifiedResource, ReplyIdea } from '@/lib/contracts/api';
import type { Platform, Provenance } from '@/lib/contracts/vocabulary';
import type {
  AnalyseInput,
  AnalyseResult,
  GenerationRunInput,
  LibrarySearchInput,
  ManualReplyInput,
  RecordReplyInput,
  RecordResult,
  SessionRow,
  Store,
} from './store';

/**
 * The in-memory store used by the deterministic browser journeys (T1).
 *
 * It is a test double. It is reachable only when `SR_TEST_MODE=e2e`, it holds
 * obviously synthetic seed data, and it is never bundled into a request path that
 * a real owner can reach.
 *
 * It implements the *rules* rather than approximating them, because a double that
 * is lenient where the database is strict turns a browser journey into a test of
 * the double. So the idempotency ledger, the editor version check, the one reply
 * per session rule and the "a day only counts when it is proven" rule are all here
 * in the same shape the SQL uses.
 */

interface MemoryReply {
  id: string;
  platform: Platform;
  finalText: string;
  searchText: string;
  provenance: Provenance;
  postedAt: string | null;
  postedDate: string | null;
  datePrecision: 'timestamp' | 'date_only' | 'unknown';
  sourceTimezone: string | null;
  contentHash: string;
  sessionId: string | null;
  withdrawnAt: string | null;
  revision: number;
  recordedAt: string;
}

interface MemoryResource {
  id: string;
  version: number;
  type: 'guide' | 'tool' | 'article' | 'book';
  ownership: 'own' | 'book';
  title: string;
  url: string | null;
  tags: string[];
  description: string;
  allowedPlatforms: Platform[];
  active: boolean;
  verified: boolean;
  cta: string;
}

interface MutationRecord {
  fingerprint: string;
  replyId: string;
  recordedAt: string;
}

/** Obviously synthetic. Nothing here resembles a real person's writing. */
const SEED_REPLIES: Omit<MemoryReply, 'id' | 'recordedAt'>[] = [
  {
    platform: 'linkedin',
    finalText:
      'Example past reply. Most hiring managers skim the opening line, so put the problem you solved first.',
    searchText: 'example past reply most hiring managers skim the opening line so put the problem you solved first',
    provenance: 'posted_confirmed',
    postedAt: '2026-01-14T02:00:00.000Z',
    postedDate: null,
    datePrecision: 'timestamp',
    sourceTimezone: null,
    contentHash: 'seed-1',
    sessionId: null,
    withdrawnAt: null,
    revision: 0,
  },
  {
    platform: 'linkedin',
    finalText:
      'Example past reply. A cover letter earns its place when it answers the one question the advert is really asking.',
    searchText:
      'example past reply a cover letter earns its place when it answers the one question the advert is really asking',
    provenance: 'posted_confirmed',
    postedAt: null,
    postedDate: null,
    datePrecision: 'unknown',
    sourceTimezone: null,
    contentHash: 'seed-2',
    sessionId: null,
    withdrawnAt: null,
    revision: 0,
  },
  {
    platform: 'threads',
    finalText: '範例回覆。履歷的第一行最好直接寫出你解決過的問題。',
    searchText: '範例回覆。履歷的第一行最好直接寫出你解決過的問題。',
    provenance: 'posted_confirmed',
    postedAt: '2026-02-03T05:00:00.000Z',
    postedDate: null,
    datePrecision: 'timestamp',
    sourceTimezone: null,
    contentHash: 'seed-3',
    sessionId: null,
    withdrawnAt: null,
    revision: 0,
  },
  {
    platform: 'x',
    finalText: 'Example AI draft that was never posted. It must never be shown as something the owner said.',
    searchText: 'example ai draft that was never posted it must never be shown as something the owner said',
    provenance: 'ai_draft',
    postedAt: null,
    postedDate: null,
    datePrecision: 'unknown',
    sourceTimezone: null,
    contentHash: 'seed-4',
    sessionId: null,
    withdrawnAt: null,
    revision: 0,
  },
];

const SEED_RESOURCES: MemoryResource[] = [
  {
    id: '55555555-5555-4555-8555-000000000001',
    version: 1,
    type: 'guide',
    ownership: 'own',
    title: 'Example cover letter guide',
    url: 'https://resources.example.com/guides/cover-letters',
    tags: ['cover letter', 'application', 'opening line'],
    description: 'How to open a cover letter so it answers the advert.',
    allowedPlatforms: ['linkedin', 'x', 'threads'],
    active: true,
    verified: true,
    cta: 'I wrote something on this.',
  },
  {
    id: '55555555-5555-4555-8555-000000000002',
    version: 1,
    type: 'book',
    ownership: 'book',
    title: 'Example book with no approved link',
    url: null,
    tags: ['interview', 'preparation'],
    description: 'A book recommendation with no verified URL.',
    allowedPlatforms: ['linkedin', 'x', 'threads'],
    active: true,
    verified: true,
    cta: 'Worth reading if you want more on this.',
  },
];

function localDay(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function createMemoryStore(): Store {
  const replies: MemoryReply[] = SEED_REPLIES.map((seed) => ({
    ...seed,
    id: randomUUID(),
    recordedAt: new Date().toISOString(),
  }));
  const sessions = new Map<string, SessionRow & { sourceText: string; parentText: string | null }>();
  const mutations = new Map<string, MutationRecord>();
  const runs: { id: string; sessionId: string; createdAt: number }[] = [];
  const suggestions = new Map<string, ReplyIdea[]>();

  function toPastReply(reply: MemoryReply): PastReply {
    return {
      id: reply.id,
      platform: reply.platform,
      excerpt: reply.finalText.length > 160 ? `${reply.finalText.slice(0, 160)}...` : reply.finalText,
      full_text: reply.finalText,
      provenance: reply.provenance,
      publication_evidence: reply.provenance === 'posted_confirmed' ? 'user_confirmed' : 'unknown',
      posted_at: reply.postedAt,
      posted_date: reply.postedDate,
      date_precision: reply.datePrecision,
    };
  }

  function lexicalMatches(query: string, includeAiDrafts: boolean): MemoryReply[] {
    const needle = searchText(query);
    const terms = needle.split(' ').filter((t) => t.length > 2);

    return replies
      .filter((reply) => reply.withdrawnAt === null)
      .filter((reply) => includeAiDrafts || reply.provenance !== 'ai_draft')
      .map((reply) => {
        const hay = reply.searchText;
        const hits = terms.filter((term) => hay.includes(term)).length;
        // Chinese has no spaces, so a substring check is the only signal that works.
        const substring = needle.length >= 2 && hay.includes(needle.slice(0, 6)) ? 1 : 0;
        return { reply, score: hits + substring };
      })
      .filter((scored) => scored.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((scored) => scored.reply);
  }

  function qualifyResources(query: string, platform: Platform): QualifiedResource[] {
    const needle = searchText(query);
    return SEED_RESOURCES.filter((r) => r.active && r.verified && r.allowedPlatforms.includes(platform))
      .filter((r) => r.tags.some((tag) => needle.includes(tag)) || needle.includes(searchText(r.title)))
      .slice(0, RESOURCE_LIMITS.maxQualified)
      .map((r) => ({
        id: r.id,
        version: r.version,
        type: r.type,
        ownership: r.ownership,
        title: r.title,
        url: r.url,
        locale: platform === 'threads' ? ('zh-TW' as const) : ('en' as const),
        english_fallback: platform === 'threads',
        why_it_fits: `It covers ${r.tags[0] ?? 'this topic'}, which the post is asking about.`,
        access_notes: null,
        cta_text: r.cta,
      }));
  }

  return {
    kind: 'memory',

    async dailyCounts(timezone) {
      const today = localDay(new Date(), timezone);
      const counts = { linkedin: 0, x: 0, threads: 0 };

      for (const reply of replies) {
        if (reply.provenance !== 'posted_confirmed' || reply.withdrawnAt !== null) continue;
        const proven =
          (reply.datePrecision === 'timestamp' &&
            reply.postedAt !== null &&
            localDay(new Date(reply.postedAt), timezone) === today) ||
          (reply.datePrecision === 'date_only' &&
            reply.postedDate === today &&
            reply.sourceTimezone === timezone);
        if (proven) counts[reply.platform] += 1;
      }

      const target = APP.defaultDailyTarget;
      return {
        local_day: today,
        timezone,
        counts,
        targets: { linkedin: target, x: target, threads: target },
      } satisfies Progress;
    },

    async getSession(sessionId) {
      return sessions.get(sessionId) ?? null;
    },

    async updateSessionDraft(sessionId, expectedEditorVersion, draftText, draftHash) {
      const session = sessions.get(sessionId);
      if (!session) throw new AppError('not_found', 'That is not available.');
      if (session.state !== 'draft') {
        throw new AppError('version_conflict', 'This reply was already recorded.');
      }
      if (session.editor_version !== expectedEditorVersion) {
        throw new AppError(
          'version_conflict',
          'This changed somewhere else. Check the latest version before saving.',
        );
      }
      session.editor_version += 1;
      session.draft_text = draftText;
      session.draft_hash = draftHash;
      return {
        editorVersion: session.editor_version,
        meaningIsStale:
          session.meaning_source_hash !== null && session.meaning_source_hash !== draftHash,
      };
    },

    async setSessionMeaning(sessionId, meaning, sourceHash) {
      const session = sessions.get(sessionId);
      if (!session) throw new AppError('not_found', 'That is not available.');
      session.english_meaning = meaning;
      session.meaning_source_hash = sourceHash;
    },

    async analyse(input: AnalyseInput): Promise<AnalyseResult> {
      const sessionId = randomUUID();
      sessions.set(sessionId, {
        id: sessionId,
        platform: input.platform,
        source_post_id: null,
        source_version: 1,
        editor_version: 0,
        draft_text: '',
        draft_hash: contentHash(''),
        state: 'draft',
        english_meaning: null,
        meaning_source_hash: null,
        sourceText: input.sourceText,
        parentText: input.parentText,
      });

      const matches = lexicalMatches(input.sourceText, false);
      const qualified = qualifyResources(input.sourceText, input.platform);

      return {
        sessionId,
        sourcePostId: null,
        sourceVersion: 1,
        contextVersion: 1,
        editorVersion: 0,
        history: {
          state: matches.length > 0 ? 'ready' : 'empty',
          items: matches.slice(0, RETRIEVAL.initialResults).map(toPastReply),
          nextCursor: matches.length > RETRIEVAL.initialResults ? 'page-2' : null,
          reason: matches.length > 0 ? null : 'no_match',
        },
        resources: {
          state: qualified.length > 0 ? 'ready' : 'empty',
          items: qualified,
          reason: qualified.length > 0 ? null : 'no_match',
        },
      };
    },

    async generationContext(sessionId, seedReplyIds) {
      const session = sessions.get(sessionId);
      if (!session) throw new AppError('not_found', 'That is not available.');

      const writing = lexicalMatches(session.sourceText, false)
        .slice(0, RETRIEVAL.maxContextSnippets)
        .map((reply) => ({
          id: reply.id,
          platform: reply.platform,
          text: reply.finalText,
          posted_on: reply.postedAt ? reply.postedAt.slice(0, 10) : reply.postedDate,
        }));

      const seeds = seedReplyIds
        .map((id) => replies.find((r) => r.id === id))
        .filter((r): r is MemoryReply => Boolean(r))
        .map((reply) => ({
          id: reply.id,
          platform: reply.platform,
          text: reply.finalText,
          posted_on: reply.postedAt ? reply.postedAt.slice(0, 10) : reply.postedDate,
        }));

      const merged = [...seeds, ...writing.filter((w) => !seeds.some((s) => s.id === w.id))];

      return {
        platform: session.platform,
        sourceText: session.sourceText,
        parentText: session.parentText,
        writing: merged.slice(0, RETRIEVAL.maxContextSnippets),
        // Seed data deliberately contains no approved facts: "no suitable fact"
        // is the state the journeys need to exercise most.
        facts: [],
        resources: qualifyResources(session.sourceText, session.platform).map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          description: r.why_it_fits,
        })),
        recentReplies: replies
          .filter((r) => r.provenance === 'posted_confirmed')
          .slice(0, 10)
          .map((r) => ({
            text: r.finalText,
            posted_on: r.postedAt ? r.postedAt.slice(0, 10) : r.postedDate,
          })),
      };
    },

    async countGenerationRunsInLastHour() {
      const cutoff = Date.now() - 3_600_000;
      return runs.filter((run) => run.createdAt >= cutoff).length;
    },

    async createGenerationRun(input: GenerationRunInput) {
      const id = randomUUID();
      runs.push({ id, sessionId: input.sessionId, createdAt: Date.now() });
      return id;
    },

    async completeGenerationRun() {
      // Usage accounting has no observable effect in the double.
    },

    async saveSuggestions(runId, ideas) {
      const withIds = ideas.map((idea) => ({ ...idea, id: randomUUID() }));
      suggestions.set(runId, withIds);
      return withIds;
    },

    async recordReply(input: RecordReplyInput): Promise<RecordResult> {
      const existing = mutations.get(input.operationKey);
      if (existing) {
        if (existing.fingerprint !== input.fingerprint) {
          throw new AppError('idempotency_conflict', 'This save was already handled with different text.');
        }
        return { replyId: existing.replyId, replayed: true, recordedAt: existing.recordedAt };
      }

      const session = sessions.get(input.sessionId);
      if (!session) throw new AppError('not_found', 'That is not available.');

      if (session.state === 'recorded') {
        const already = replies.find((r) => r.sessionId === input.sessionId);
        if (already && already.contentHash === input.contentHash) {
          mutations.set(input.operationKey, {
            fingerprint: input.fingerprint,
            replyId: already.id,
            recordedAt: already.recordedAt,
          });
          return { replyId: already.id, replayed: true, recordedAt: already.recordedAt };
        }
        throw new AppError('version_conflict', 'This reply was already recorded.');
      }

      if (session.editor_version !== input.editorVersion) {
        throw new AppError(
          'version_conflict',
          'This changed somewhere else. Check the latest version before saving.',
        );
      }

      const recordedAt = new Date().toISOString();
      const reply: MemoryReply = {
        id: randomUUID(),
        platform: session.platform,
        finalText: input.finalText,
        searchText: input.searchText,
        provenance: 'posted_confirmed',
        postedAt: input.postedAt ?? recordedAt,
        postedDate: null,
        datePrecision: 'timestamp',
        sourceTimezone: null,
        contentHash: input.contentHash,
        sessionId: input.sessionId,
        withdrawnAt: null,
        revision: 0,
        recordedAt,
      };
      replies.unshift(reply);
      session.state = 'recorded';
      mutations.set(input.operationKey, {
        fingerprint: input.fingerprint,
        replyId: reply.id,
        recordedAt,
      });

      return { replyId: reply.id, replayed: false, recordedAt };
    },

    async recordManualReply(input: ManualReplyInput): Promise<RecordResult> {
      const existing = mutations.get(input.operationKey);
      if (existing) {
        if (existing.fingerprint !== input.fingerprint) {
          throw new AppError('idempotency_conflict', 'This save was already handled with different text.');
        }
        return { replyId: existing.replyId, replayed: true, recordedAt: existing.recordedAt };
      }

      const recordedAt = new Date().toISOString();
      const reply: MemoryReply = {
        id: randomUUID(),
        platform: input.platform,
        finalText: input.finalText,
        searchText: input.searchText,
        provenance: 'posted_confirmed',
        postedAt: input.postedAt,
        postedDate: input.postedDate,
        datePrecision: input.datePrecision,
        sourceTimezone: input.sourceTimezone,
        contentHash: input.contentHash,
        sessionId: null,
        withdrawnAt: null,
        revision: 0,
        recordedAt,
      };
      replies.unshift(reply);
      mutations.set(input.operationKey, {
        fingerprint: input.fingerprint,
        replyId: reply.id,
        recordedAt,
      });

      return { replyId: reply.id, replayed: false, recordedAt };
    },

    async setReplyWithdrawn(replyId, withdrawn) {
      const reply = replies.find((r) => r.id === replyId);
      if (!reply) throw new AppError('not_found', 'That is not available.');
      reply.withdrawnAt = withdrawn ? new Date().toISOString() : null;
    },

    async correctReply(replyId, expectedRevision, finalText, hash, search) {
      const reply = replies.find((r) => r.id === replyId);
      if (!reply) throw new AppError('not_found', 'That is not available.');
      if (reply.revision !== expectedRevision) {
        throw new AppError('version_conflict', 'This changed somewhere else.');
      }
      reply.finalText = finalText;
      reply.contentHash = hash;
      reply.searchText = search;
      reply.revision += 1;
      return { revision: reply.revision };
    },

    async searchLibrary(input: LibrarySearchInput) {
      let matches =
        input.query.trim() === ''
          ? replies.filter((r) => r.withdrawnAt === null)
          : lexicalMatches(input.query, true);

      if (input.platforms?.length) {
        matches = matches.filter((r) => input.platforms!.includes(r.platform));
      }
      if (input.provenances?.length) {
        matches = matches.filter((r) => input.provenances!.includes(r.provenance));
      }
      if (!input.includeUnknownDates) {
        matches = matches.filter((r) => r.datePrecision !== 'unknown');
      }

      const start = input.cursor ? Number(input.cursor) : 0;
      const page = matches.slice(start, start + input.limit);

      return {
        state: (matches.length > 0 ? 'ready' : 'empty') as 'ready' | 'empty',
        items: page.map(toPastReply),
        nextCursor: start + input.limit < matches.length ? String(start + input.limit) : null,
      };
    },

    async hasEligibleFacts() {
      return false;
    },
  };
}
