# Social Replies: implementation contracts

Revision 2, 2026-09-22. These are implementation decisions, not evidence of an existing backend. They replace the contradictory conceptual enum, route, environment and idempotency examples in revision 1. Keep shared TypeScript/Zod definitions in `src/lib/contracts/` and migrations in `supabase/migrations/`. Do not implement competing types in different tickets.

## C01. Ownership and security boundary

The repo is public; the application, imported writing and account are private. Use a separate Supabase project and separate Vercel project. No changes to Soar production infrastructure as an incidental shortcut. A paid project or account-level security change still needs the owner's existing authority, not a new assumption.

Supabase Auth has no public signup. Bootstrap the allowed owner privately. Store the single enabled owner's ID in a non-exposed `private.app_owner` table, not in Git, client code or an editable user profile. `private.is_app_owner()` may be a narrowly scoped security-definer function with an empty search_path and fully qualified references. It returns only a boolean and cannot change the owner.

All user-owned tables, including child tables, have non-null `user_id`, RLS and least-privilege grants. Reads and writes require both `user_id = auth.uid()` and the private owner check. Use USING and WITH CHECK for applicable operations. Composite foreign keys `(user_id, parent_id)` prevent cross-owner references. Revoke anonymous access and test RPC permissions as well as table permissions. A second authenticated synthetic user must not access anything, even through the direct database API.

Ordinary requests use the verified user session, not a service-role bypass. Administrative import/worker credentials stay server-side and perform explicit owner scoping. All mutation routes check session, ownership and same-origin/CSRF protection. Return generic unauthorised/not-found errors without disclosing another record's existence. Responses with private data use Cache-Control: private, no-store. Do not cache across users or expose bodies through GET query strings.

Supabase documents the separate roles of grants/RLS and the service-role bypass: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API keys](https://supabase.com/docs/guides/getting-started/api-keys). These are platform constraints, not proof that this app's future policies are correct.

## C02. Canonical vocabulary

```ts
type Platform = 'linkedin' | 'x' | 'threads';
type TargetKind = 'post' | 'comment' | 'keyword';
type Provenance =
  | 'posted_confirmed'
  | 'user_edited_unconfirmed'
  | 'published_main_post'
  | 'ai_draft';
type PublicationEvidence = 'user_confirmed' | 'platform_export' | 'verified_url' | 'unknown';
type DatePrecision = 'timestamp' | 'date_only' | 'unknown';
type SectionState = 'loading' | 'ready' | 'empty' | 'error';
type SessionState = 'draft' | 'recorded' | 'discarded';
```

Import-only legacy aliases: confirmed_posted -> posted_confirmed; james_edited_unconfirmed or user_edited -> user_edited_unconfirmed; published_post -> published_main_post. Persist only canonical values. Unknown authorship/record type goes to import review, not to a falsely classified library record. An AI classifier cannot establish publication evidence.

Mark posted yields posted_confirmed with evidence=user_confirmed. This is the user's attestation, not independent platform verification. Main posts never count as comments. Drafts never become voice truth simply because a model retrieved them.

## C03. Database schema contract

Every public user-owned table has `id uuid`, `user_id uuid`, `created_at timestamptz`, `updated_at timestamptz` unless its composite key makes id unnecessary. Add explicit nullability, checks, foreign keys and indexes in SQL, not only TypeScript. Retain exact text separately from search normalisation.

| Table | Required domain fields and invariants |
|---|---|
| app_settings | user_id unique; target_linkedin/target_x/target_threads integer default 10, range 0..100; timezone default Asia/Taipei |
| source_posts | platform, target_kind, source_text, parent_text nullable, source_url nullable, detected_language nullable; source_text may be null only for imported/manual records with genuinely unavailable context |
| reply_sessions | source_post_id nullable, platform, source_version, editor_version, draft_text, draft_hash, state, last_copied_hash nullable, english_meaning nullable, meaning_source_hash nullable; monotonic editor_version |
| generation_runs | session_id, source_version, editor_base_version, request_key, context_version, prompt_version, provider/model, status, input/output token usage, duration, error_code; no raw provider/log payload |
| reply_suggestions | generation_run_id, position 0..2 unique per run, angle_label, reply_text, english_meaning nullable, resource_id nullable, cta_text nullable, fact_ids, based_on_reply_ids; exactly three on successful run |
| reply_library | source_post_id nullable, session_id nullable, platform, exact final_text, search_text, provenance, publication_evidence, posted_at nullable, posted_date nullable, date_precision, source_timezone nullable, native_reply_id nullable, reply_url nullable, recorded_at, withdrawn_at nullable, content_hash, resource_snapshots JSON, suggestion_id nullable |
| reply_revisions | reply_id, revision_number, exact text, reason, recorded_at; private audit of explicit corrections, not automatic rewrites |
| resources | type guide/tool/article/book, ownership own/book, title_en, title_zh_tw nullable, description, aliases/tags, canonical_path nullable, zh_tw_path nullable, external_url nullable, active, verified, allowed_platforms, access_notes, last_checked_at; own paths and external book URL are mutually constrained |
| facts | fact_text, tags, approved default false, sensitivity public_safe/private_context_only, source_reference private JSON, valid_from/to nullable, version; only approved+public_safe+current may enter public suggestions |
| import_batches | source_type, source_file_hash, adapter_version, started/completed_at, checkpoint, status and per-disposition counts; filename/locator private only |
| import_items | batch_id, stable source locator/hash, disposition imported/duplicate/needs_review/invalid, reply_id nullable, private warning codes; unique source identity within batch |
| search_documents | entity_kind reply/resource, entity_id, text_hash, search_text, embedding vector(1536) nullable, embedding_model/version, embedded_at; unique owner+kind+entity |
| embedding_jobs | entity_kind/id, text_hash, status pending/running/retry/dead, attempts, next_attempt_at, lease_until; unique entity+text_hash+model |
| mutation_keys | user_id + key unique, request_fingerprint, operation, result_id, created_at; stores idempotency outcome, not credentials |

Use `reply_library` rather than the old misleading `posted_replies` table name because the library also contains explicitly labelled drafts/main posts. No old production table exists to migrate on the evidence reviewed. Recheck live state before making that assumption in implementation.

Indexes: owner+platform+posted_at for counters; partial unique owner+session_id when present; partial unique owner+platform+native_reply_id when present; owner+reply_url when a verified canonical reply URL exists; trigram/English FTS search indexes; pgvector index after the first embedding model's dimensions are verified. Do not make normalised text alone unique.

1536 is the first schema's engineering choice, not a claim about every provider. Verify the selected embedding model can return that dimension. Reject mismatched vectors. Changing model or dimensions requires re-embedding into a versioned index and a tested switch; never compare incompatible vectors.

## C04. Import identity, completeness and dates

Import all available owner-authored comments/replies from supported private sources, not just a curated sample. Track source coverage: files inspected, records seen, imported, duplicates, review, invalid, missing context and unavailable history. Do not claim complete lifetime history when a platform export omits it.

Original text is immutable import evidence. Normalise NFC, line endings and search whitespace only into search_text. Preserve final_text bytes/characters as supplied. Do not rewrite old links or dates in the historical text.

Identity order: native platform reply ID; verified canonical reply URL; stable export/source record ID; file hash + record locator for rerun protection. Text/date similarity is a review signal, not permission to merge different replies. Two identical replies on different target posts are two events. The same record in two exports may merge only with strong identity evidence; keep both provenance references and the stronger proven status.

Convert timestamps using the declared source timezone. If only a date is known, retain posted_date and date_precision=date_only. If neither is known, both date fields remain null. Do not use import time as posted time. Unknown timezone/date is displayed honestly and excluded from a precise daily count unless its local day is proven.

Use private staging and a dry-run -> review -> import flow. Do not execute archive JavaScript. Parse the recognised wrapper as data. Reject path traversal, executable content, unsupported schema, oversized files and decompression bombs. Process resumable bounded batches with disposition counters. A crash/retry cannot duplicate imported rows. Do not let an LLM decide authorship or publication certainty.

LinkedIn, X, Threads/Meta and Drive adapters are separate. Inspect a real authorised export before claiming its exact schema is supported. In the absence of an export, build/test the parser against clearly synthetic samples and leave that source's backfill pending. For ambiguous X records, retain as unclassified review rather than invent reply status. Never fetch missing parent posts by unauthorised scraping.

## C05. Retrieval and index updates

Each query searches the entire eligible owner corpus, not a hard-coded recent sample. Return top three initially and cursor-paginated further results. Generate with at most seven relevant historical snippets, not the entire archive.

Retrieve independent semantic and lexical candidate lists (initial limit 40 each). Use English FTS as one signal, plus trigram/escaped substring matching for Chinese and short keywords. Parameterise queries. Normalise search text without changing stored final text. Fuse ranks with RRF, initially k=60; this is a tuneable engineering default. Apply relevance qualification before bounded provenance, recency and platform tie-breaks. A recent irrelevant item must not outrank a strong older match solely for being recent. No fabricated percentage-confidence labels.

[Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search) explains rank fusion; the limits and tuning above are this product's choices. Freeze a small judgement set for relevance and test Chinese/English cross-language queries. Empty results and failed retrieval are different response states.

Only approved owner writing is voice evidence. Confirmed replies lead. User-edited drafts and main posts are separately labelled. AI drafts remain searchable on explicit filters but are excluded from default voice context. Filter withdrawn/private-only material before similarity queries, not after selecting a global top-k.

Saving a reply commits a search row and an embedding job in the same transaction. Lexical search works immediately. A bounded authenticated worker processes the job with lease/retry semantics. Check content_hash before applying a vector so an old job cannot overwrite a newer correction. After five failed attempts, retain lexical search and flag the job for retry. Do not make the user's save wait on an embedding API. Scheduled processing may use the existing supported runtime; its exact trigger/plan must be verified during deployment, not silently assumed.

## C06. Resources and facts

Resource discovery is independent of generation. Only active, verified, platform-allowed records are insertable. Search the registry, not the open web. Prefer owned resources among qualified matches, then approved books. No arbitrary third-party tool promotion. Advice-only is represented by zero qualified resources, not a dummy database entry.

Store owned resource paths separately from RESOURCE_BASE_URL. Do not assume the resource site equals replies.jamesbugden.com or the root jamesbugden.com. Resolve the current verified resource origin at deployment. Validate HTTPS, expected host, no credentials, no protocol-relative path, no backslash ambiguity, no javascript/data URL. Model output references resource IDs; the server appends the canonical URL. Original source-post URLs do not authorise recommendations. Never send arbitrary user URLs to a server-side fetcher in v1.

For Threads select a verified Chinese path, or label an English-only fallback explicitly. Books need a verified title and optional approved URL. Do not invent an official Taiwan title. Free/sign-up/access labels require verified metadata. Disabling or changing a resource invalidates cached recommendations. Historical reply URL snapshots remain unchanged after future rebranding.

Approved public-safe facts are the only source of first-person experiences, employer anecdotes and personal metrics in generated replies. Private-context-only facts are not sent to the generation model. Retrieve only eligible facts, validate referenced IDs server-side and apply a semantic claim check. Supplying an ID is not proof that invented wording faithfully reflects the fact. Without a suitable fact, use practical advice without first-person claims. User-written final text is never silently corrected by the generator.

## C07. API contracts and versioning

All endpoints are authenticated and owner-scoped. Validate with shared Zod types. Maximum request body: 128 KiB. Source text: 16,000 Unicode code points; parent context: 8,000; keyword: 200; final reply: 16,000. These are defensive app limits, not asserted social-platform limits. Reject oversize input with 413 and preserve the user's draft. No silent truncation. X is not limited to 280 characters.

| Endpoint | Request | Response / behaviour |
|---|---|---|
| POST /api/reply/analyse | request_key, platform, target_kind, source_text, optional parent_text/source_url | session_id, source_version, context_version, independent history/resources section states, qualified matches; no model reply generation yet |
| POST /api/reply/generate | session_id, source_version, context_version, request_key | generation_run_id, exactly three validated ideas, suggested_index, allowed refinement actions; reject stale context with 409 |
| PATCH /api/reply/session | session_id, expected_editor_version, exact draft_text | incremented editor_version, draft_hash, translation invalidated if needed; 409 on concurrent change |
| POST /api/reply/refine | session_id, expected_editor_version, action, optional eligible fact/resource ID, request_key | proposed text and base_editor_version; never updates editor automatically |
| POST /api/reply/meaning | session_id or suggestion_id, text_hash, request_key | English meaning + source hash; discard when hash is stale; never changes Chinese |
| POST /api/reply/mark-posted | session_id, editor_version, exact final_text, optional reply_url/posted_at; Idempotency-Key header | reply_id, replayed, recorded_at, current counts, embedding_status; atomic contract below |
| POST /api/replies/manual | platform, exact text, evidence=user_confirmed, date precision/date fields, optional source context/URL; Idempotency-Key | same library/count guarantees; unknown posted date allowed |
| POST /api/library/search | query, platform/provenance/date filters, cursor, limit <= 25 | exact excerpts, evidence and known dates, next_cursor; search text is not put in URL |
| PATCH /api/library/:id | expected_revision, exact corrected text or withdraw action, reason | append private revision, update canonical corrected record/index/count atomically |
| GET /api/progress | no private body | local_day, timezone, counts and targets; refetch on focus and local midnight |
| GET/POST/PATCH /api/resources and /api/facts | validated fields and expected_version on updates | owner-only CRUD, soft disable; no arbitrary SQL or key editing |

Analyse returns retrieval first; the client then calls generate automatically for post/comment targets. Keyword mode is retrieval-only. A generation outage does not block old-reply/resource lookup or manual editing. Provide schema-valid fake adapters so independent UI work does not wait for private API keys.

Unified error envelope: `{ code, message, retryable, request_id, retry_after_seconds? }`. Use 400 validation, 401/403 auth, 409 version/idempotency conflict, 413 size, 429 limit, 502 provider invalid response and 504 timeout. Never return stack traces, provider request bodies or secrets. Show no-link only for successful empty qualification, not a 5xx.

## C08. Generation, cost and untrusted text

Implement one selected paid provider adapter plus a fake adapter behind ReplyGenerator. Do not build three production providers or a model picker just to satisfy an abstraction. The active coding agent verifies supported model IDs/pricing from official provider material and runs the private quality benchmark before selecting the deployed model. Earlier conversational model prices and agent-hour estimates are not verified implementation facts.

Normal success: one model request produces three alternatives. Use a bounded context of compact canonical rules, platform rules, eligible writing/facts/resources and the current source. Imported/source text is untrusted quoted data, never instructions. The generation service has no social-posting, browsing, shell, secret-reading or arbitrary tool capabilities. Limit concurrency and usage server-side, not just in the UI.

Initial safety defaults: one active generation per session, 60 generation requests per owner per hour, 6,000 input-token budget and 1,800 output-token budget. Validate these against the selected provider and bilingual output; adjust with recorded evidence, not silent truncation. Use a 25-second attempt deadline and at most one bounded retry/repair, with a 40-second total request budget. Honour Retry-After where it fits. Never cross to an unapproved provider as an automatic fallback.

Structured idea: `{ position, angle_label, reply_text, english_meaning, resource_id, cta_text, uses_fact_ids, based_on_reply_ids }`. Plain text only, no raw URLs from the model. The server resolves any resource URL and validates every referenced ID against this request's eligible context. Threads needs nonempty English meaning for each generated idea. Manual drafts may lack it.

Hard failures: unknown/mismatched resource, private/unapproved fact, invented first-person claim, unsupported certainty, leaked secret/contact information, invalid schema or missing required Chinese review meaning. Attempt one repair; if still unsafe, withhold generated suggestions and retain search/manual workflow. Similarity alone is not a hard failure: recurring advice may legitimately use similar language. Flag excessive wording overlap and vary the expression without manufacturing disagreement.

No silent fine-tuning or automatic rewrite of the owner's canonical style documents. Learning is retrieval plus private draft-to-final comparisons. Propose repeated preferences for review; explicit owner instructions remain authoritative.

## C09. Atomic recording and counters

Idempotency key is a stable operation UUID, NOT a hash that changes whenever the editor changes. Compute a fingerprint from the submitted operation payload, including exact text. Same key+same fingerprint returns the existing result. Same key+different fingerprint returns 409. A second key for an already-recorded session still returns the existing record or a correction conflict; it must not insert another reply.

One database transaction validates owner/session/editor version, records mutation_keys, inserts the exact reply, updates session state, stores resource URL snapshots, inserts a search document and queues its embedding. Rollback everything on failure. Respond success only after commit. Never normalise, trim, translate, add a link or fix spelling in the recorded final_text. A database check may reject all-whitespace, but must not rewrite nonempty text.

Counters are derived, not independently incremented integers. Count non-withdrawn posted_confirmed replies whose proven posting date falls in the requested Asia/Taipei day. Copied/generated/draft/main-post/unknown-date records do not count. Importing last year's replies changes historical counts, not today's. Repeat submissions across tabs count once. Counts can exceed targets; display 11/10 rather than clamping the underlying count.

Default Mark posted records the current confirmation time, unless the user supplies an actual posting time. Add past reply defaults to date unknown, not now. Store UTC timestamps, compute the local-day interval server-side and return the local date. Replayed responses should refresh current counts rather than reapply an optimistic +1. Midnight/focus refetch prevents stale counters in a long session.

Correcting a posted record appends a private revision and reindexes it without adding a new count. Undo recorded status marks it withdrawn and removes its count/voice eligibility, without pretending to delete the external social reply.

## C10. Drafts, privacy and deployment configuration

Server drafts use expected_editor_version. Tab-local recovery is namespaced by session and user, short-lived and cleared on logout/discard. It is not encrypted storage and is not advertised as such. Never write tokens or raw imported archives there. Provider and analytics logs contain only request IDs, durations, token counts and error codes; no writing bodies, private file locators or credentials.

The public `.env.example` is the canonical name list. Values for credentials, private IDs and account email remain blank. Required names: APP_BASE_URL, RESOURCE_BASE_URL, APP_TIMEZONE, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, AI_PROVIDER, AI_MODEL, AI_API_KEY, EMBEDDING_PROVIDER, EMBEDDING_MODEL, EMBEDDING_API_KEY, PRIVATE_SOURCE_ROOT, PRIVATE_EVAL_SET_PATH. Secret/admin keys are optional unless an actual administrative worker requires them. Ordinary requests must not use them. Privately bootstrap the owner table; no login email goes in this file.

Use distinct preview/test and production databases and credentials. Public pull requests run synthetic tests without production secrets. Exclude private artefacts from CI upload even on failure. A public source repo does not make an authenticated app public. Login, API routes and direct database/RPC tests must all prove the boundary.

Attach replies.jamesbugden.com without changing the root domain or email DNS. Verify current Vercel runtime constraints, auth redirect allowlist, TLS, no-store headers, clipboard behaviour and the exact promoted commit. Do not configure wildcards for production auth redirects. Future app-domain moves and resource-domain moves are independent; stored historical final text and URL snapshots are not rewritten.
