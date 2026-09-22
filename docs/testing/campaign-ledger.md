# Quality campaign ledger

SR-019 (#20). One row per test ID from `acceptance-matrix.md`, with what was
actually run and what it does not cover.

**A skipped, blocked or inconclusive check is not a pass.** Rows below say
`pass`, `partial`, `pending` or `blocked`, and every row that is not `pass`
names what is missing.

Environment unless a row says otherwise: Windows 11, Node 24.15.0, PGlite 0.5.8
(Postgres in WebAssembly, **no pgvector**), Playwright 1.63 Chromium, the app in
fake-provider mode with synthetic data. Hosted checks ran against the Supabase
project the deployment runbook names.

```
npm run typecheck      clean
npm run lint           clean
npm run check:private  clean
npm run check:secrets  clean
npm test               436 passed (29 files)
npm run test:e2e       58 passed across narrow-600 and wide-1280
```

## What this campaign cannot tell you

Four gaps run through every row below. They are listed once here rather than
repeated as an excuse in each row.

1. **No pgvector locally.** PGlite has no vector extension, so the vector column,
   the HNSW index, `semantic.ts` and `applyVector` have **never executed** in any
   test. Retrieval is verified lexically only. This is survivable because lexical
   search is the floor rather than a fallback, but any claim about semantic
   ranking quality is currently unfounded.
2. **No live model.** Every generation test uses the fake adapter. The guards,
   budgets and failure paths are real; the *output quality*, the Taiwan Chinese
   fluency and the injection resistance of an actual model are not measured.
3. **No real corpus.** No authorised export has been inspected, so every import
   adapter is synthetic-tested and no real backfill has happened.
4. **No deployed build.** Nothing here was run against a promoted deployment, a
   real clipboard on a real device, or a physical iPhone.

## Security and data

| ID | Result | Evidence and limits |
|---|---|---|
| SEC-01 | **pass** (local) / **partial** (hosted) | 17 tests. Table list read from `pg_tables`, not hard-coded, so a new table with no policy fails the suite. Anonymous gets `permission denied` on all 14 tables; a second authenticated user reads 0 rows from all 14 and cannot insert rows it claims to own; disabling the owner record revokes access immediately; a second enabled owner cannot be created. Hosted: grants and policy counts verified by query (14 tables, 14 forced RLS, 56 policies, 0 anon grants), but **not** re-run with two real auth users. That belongs to #21 |
| SEC-02 | **pass** | Composite foreign keys reject a cross-owner parent with `23503`; RLS `WITH CHECK` rejects an insert or update that claims another `user_id`. Same-origin enforcement on every mutation is implemented and unit-covered; a cross-origin attempt from a real browser is not |
| SEC-03 | **pass** | 12 tests. A synthetic sentinel and seven credential shapes are planted in a temp directory outside the repo and each is detected; the scanner never prints the matched value; a clean directory passes. **GitHub's own secret-scanning toggle is an account setting and is not asserted enabled by anything here** |
| SEC-04 | **partial** | Architectural: a boundary test asserts no provider adapter defines a tool, a `tool_choice` or a `function_call`, and that only the Anthropic adapter reaches the network. The prompt fences untrusted blocks with a nonce the pasted text cannot predict, proven by a test that tries to close the fence early. **Not covered: whether a real model obeys any of it.** The fake ignores instructions, so it cannot refute them |
| SEC-05 | **partial** | `Cache-Control: private, no-store` verified on a live response in the browser suite. Library search is a POST so the query never enters a URL. **Not covered: logout clearing tab-local recovery**, because tab-local recovery is not implemented; drafts live on the server behind version checks instead |
| DATA-01 | **pass** | Migrations applied to two independent fresh databases; column-by-column signatures identical. The vector migration is recorded as **skipped** with its reason rather than silently passing, and a test asserts it was skipped so the suite cannot imply coverage it lacks |

## Imports

| ID | Result | Evidence and limits |
|---|---|---|
| IMP-01 | **pass** | Rerunning a completed batch restarts from ordinal 0 rather than trusting the checkpoint, so every record is re-identified: a checkpoint that skipped the work would make the import *look* idempotent without testing whether it is. A native reply id arriving from a second export reconciles into one record keeping both source references and the stronger proven status |
| IMP-02 | **pass** | Identical wording under two different target posts stays two records. Proven by mutation: adding a `content_hash` lookup to the duplicate check made this fail |
| IMP-03 | **pass** | Unknown, date-only-unzoned, known-UTC and a year-old archive imported today, proven against `public.daily_counts`. An unknown date never counts and a date-only record whose source timezone is not the counting timezone is excluded, because its Taipei day is unproven. Proven by mutation: defaulting an unknown date to the import clock made IMP-03 and IMP-05 fail |
| IMP-04 | **pass** | Malformed CSV and JSONL with surviving neighbours, a JavaScript archive wrapper, an unknown schema, path traversal, a symlink entry, an executable entry, an oversize file, a decompression bomb, and an interrupted batch resumed from its checkpoint. The JavaScript wrapper case asserts a `globalThis` marker is untouched **first**, so an early return cannot skip the assertion that matters |
| IMP-05 | **pass** | A source with no parent text and no publication proof keeps null context and honest provenance, with no promotion from `ai_draft` to posted |

## Retrieval

| ID | Result | Evidence and limits |
|---|---|---|
| RET-01 | **pass** (lexical) | 40-row synthetic bilingual corpus. English, Traditional Chinese, short-keyword and cross-language queries all return relevant older writing. The anti-recency case is constructed so that a recency-first ordering would return something different, and asserts the counterfactual. Cursor pages are stable with no duplicates, and a cursor from a different query is rejected rather than interleaved. **Semantic ranking is unverified** |
| RET-02 | **pass** | A reply saved while the embedder is `unconfigured` is lexically findable immediately; the job survives; the save is never rolled back by an embedding failure |
| RET-03 | **partial** | A stale job cannot overwrite a newer correction, proven at the pre-check. The atomic `and text_hash = ...` guard inside the UPDATE has **never executed**, because applying a vector requires pgvector. Withdrawn and ineligible rows are filtered before candidate selection, not after |
| RET-04 | **pass** | A history containing only AI drafts returns empty rather than "you replied before"; drafts and main posts carry their true provenance to the UI; a component test asserts the confirmed heading appears only when every row is a confirmed reply |

## Resources and facts

| ID | Result | Evidence and limits |
|---|---|---|
| RES-01 | **pass** | Relevance qualifies before ownership preference, so a low-relevance owned guide cannot displace advice-only output. Inactive, unverified and wrong-platform records are excluded. Maximum three |
| RES-02 | **pass** | Rejected at the database and in the resolver: `javascript:`, `data:`, protocol-relative, plain http, embedded credentials, backslash ambiguity and a scheme smuggled into a path. The model supplies an id; the server resolves the URL |
| RES-03 | **pass** | No-match, empty catalogue and lookup failure are three distinct API states and three distinct screens, asserted at the component level. A missing Chinese page is labelled an English resource rather than given a guessed path |
| RES-04 | **pass** | Reducer tests: re-adding is a no-op, a second resource previews a replacement instead of stacking links, removing an untouched block is exact, and removing an **edited** block previews instead of deleting the owner's words |
| FACT-01 | **pass** (eligibility) / **partial** (semantics) | Four independent gates with the specific failing reason; boundary-inclusive validity dates; `buildFactContext` throws on an ineligible fact and never carries `source_reference`. Semantic faithfulness is checked heuristically by the grounding guard; a model's ability to evade those heuristics is unmeasured |

## Generation

| ID | Result | Evidence and limits |
|---|---|---|
| AI-01 | **pass** (structure) | Malformed JSON, a missing idea, a fourth idea, duplicate positions, a missing field, duplicate ideas and a missing Chinese meaning all fail safely after exactly one shared repair. Failure detail never echoes the response text |
| AI-02 | **pass** | Timeout aborts at the deadline; 429 with a short Retry-After waits once and retries; 429 with a long one returns immediately rather than sitting out the budget; budget exhaustion stops before any call; the hourly limit refuses before the provider is touched; no implicit provider fallback. Assertions are on the **number of provider calls**, because an extra repair is invisible except in the bill |
| AI-03 | **partial** | British English, Taiwan terminology and AI-tell warnings are implemented and unit-covered against fixtures. **No Taiwan-Chinese review by a person and no private benchmark have happened**, so fluency is unmeasured |
| AI-04 | **pass** (rules) | Similar advice in different words is allowed; near-verbatim reuse warns with a real date, or says the date is unknown rather than inventing "12 days ago"; three paraphrases sold as three alternatives is a hard failure |

## Interface

| ID | Result | Evidence and limits |
|---|---|---|
| UX-01 | **pass** | No horizontal overflow at 375, 500, 600, 750 and 1280 CSS px, nor at a halved viewport standing in for 200% zoom. Resources appear in the reading order between past replies and ideas, verified by reading the heading order rather than by looking at a screenshot |
| UX-02 | **partial** | Ctrl+Enter submits; an Enter with `isComposing` set does **not**, so an IME candidate commit cannot fire a request; background results do not steal focus; the Add past reply dialog returns focus to its trigger and Escape closes it without discarding the draft. **Not covered: a full keyboard-only traversal by a person, and a real IME** |
| UX-03 | **pass** | A late result for an older source version is discarded; typing drops a pending proposal; a proposal from a stale editor version is ignored; a lower editor version from the server is ignored; paginating history leaves the draft alone |
| UX-04 | **pass** | Selecting an idea over a dirty editor previews rather than replaces; Keep my reply preserves the exact text including trailing spaces; Undo restores the previous version |
| ZH-01 | **pass** | Editing Chinese, inserting a resource and accepting a rewrite each mark the English meaning stale immediately; a translation that arrives for text that has since changed is discarded; a translation failure does not disable copy or save. Verified in the reducer and again in the browser |

## Recording

| ID | Result | Evidence and limits |
|---|---|---|
| COPY-01 | **partial** | The browser suite grants clipboard permission and asserts the copied text matches the editor exactly, and that copying does not move the count. The denied path selects the text and never claims success, implemented and unit-reasoned. **Not covered: a real permission prompt on a real device** |
| SAVE-01 | **pass** | Exact Unicode round-trips: CJK, emoji, tabs, trailing spaces and blank lines. An all-whitespace reply is rejected by a check constraint rather than trimmed, so the database never rewrites text |
| SAVE-02 | **pass** | Same key with the same payload replays; same key with different text is a conflict; a second key for an already-recorded session returns the existing record; a second key with different text is refused. In every case exactly one reply exists |
| SAVE-03 | **pass** | A failure inside the transaction rolls back the mutation key, the reply and the embedding job together, asserted by counting rows afterwards. An embedding outage leaves the save and lexical search working |
| DAY-01 | **pass** | 23:59:59 and 00:00:00 Taipei land on the days a person would name; the process timezone does not affect the answer; 11 replies display as 11/10 rather than clamped; drafts, main posts, AI drafts and withdrawn rows never count |
| DAY-02 | **pass** | A correction appends a private revision and adds no event, so the count does not move; a stale revision is refused; withdrawal removes the count while the record stays, and the copy says plainly that the social platform is untouched |

## Utilities and deployment

| ID | Result | Evidence and limits |
|---|---|---|
| UTIL-01 | **pass** | Resource and fact create, edit and disable; a stale `expected_version` shows a conflict and the typed text survives; a fact created through the interface comes back unapproved and marked excluded from generation; a private-only fact stays excluded even once approved and active; disabling a resource removes it from what a new reply can offer; every navigation link reaches a page that renders |
| DEP-01 | **pending** | No deployment exists. The procedure is in `docs/ops/deployment.md` |
| DEP-02 | **pending** | Requires a promoted build |

## Performance

Measured, not asserted. 10,000 synthetic rows, PGlite in WebAssembly, one
developer machine:

```
seed=2662ms cold=3329ms warm=3186ms fulltext=725ms trigram+containment=2042ms
```

No threshold is asserted anywhere in the suite. The split is the useful part:
containment and `word_similarity` cannot use the GIN index as currently written,
so they scan. **This must be re-measured on hosted Postgres**, probably with a
`%` operator prefilter, before any latency claim is made.

## AI evaluation

**Not started.** `PRIVATE_EVAL_SET_PATH` is unset and no historical pairs exist
yet, because no export has been imported. Until that happens there is no measured
statement about voice, usefulness, Taiwan fluency, resource relevance, unsupported
claims or editing burden, and none should be made.

The release gate of zero observed unsupported facts or URLs on the evaluation set
is therefore **not met**, because the set does not exist. That is a gap, not a pass.

## Accepted hosted advisor findings

Run after the last migration. The `anon` finding that started this list is gone.
Three remain, and all three are deliberate. They are recorded here with reasons so
that a later reader can tell a decision from an oversight.

| Finding | Why it stays |
|---|---|
| `private.app_owner` has RLS enabled with no policy | That is the mechanism. RLS with zero policies denies every non-superuser, which is exactly what this table needs. A policy would be a way in |
| 14 tables in `public` are visible in the GraphQL schema to `authenticated` | RLS restricts the rows, and this app has exactly one legitimate authenticated account. A second account can enumerate table *names* and read nothing, which is the boundary C01 asks for. Revoking SELECT from `authenticated` would break the owner's own session |
| `public.is_app_owner()` is executable by `authenticated` as SECURITY DEFINER | Intentional, and it is the entire public surface of the `private` schema. It takes no arguments, returns one boolean, cannot name a row and cannot mutate the owner. It is SECURITY DEFINER precisely so that `authenticated` needs no USAGE on `private` at all |

## Defects found and fixed during the campaign

| Found by | Defect | Fix |
|---|---|---|
| Hosted security advisor | `public.is_app_owner()` was callable by `anon`. Supabase grants EXECUTE on every new public function to `anon`, and revoking from `PUBLIC` does not undo a direct grant. Every local test was green | Every function revokes `anon` by name; the local harness now applies Supabase's default privileges so a test can catch it |
| Fact bank implementation | `factUpdateSchema.changes` used `.partial()` on a schema with defaults, so omitting a key parsed into that key's default. A partial update would have silently reset a fact to private | Update schemas describe optional fields with no defaults; regression test verified by reverting the fix |
| Retrieval implementation | pg_trgm cannot match short Chinese. `word_similarity('面試', '今天分享一個面試準備的技巧')` is exactly 0 on PGlite **and** on hosted Postgres | Containment added beside trigram matching as a first-class signal |
| Integration | Retrieval SQL assembled in TypeScript could never run in production, because PostgREST has no raw-SQL channel | Two Postgres functions, called by SQL from the harness and by `rpc()` from the app |
| Self-review after that refactor | The retrieval tests still imported the old inline builders, so they would have stayed green while the production path went untested | The builders delegate to the same functions, so there is one definition |
| Browser journeys | The page and the API received different instances of the in-memory test double, because Next bundles server components and route handlers separately | The double is held on `globalThis` |
| A browser journey, via a log line that did not exist | **`instanceof AppError` is false across Turbopack chunks.** Next gives a server component and a route handler separate copies of the module, so an error thrown inside a store the *page* constructed is not `instanceof` the class a *route* imports. Every deliberate 409, 401 and 429 raised on that path collapsed into an unexplained 500. It looked fine under curl, because a curl request constructed the store from a route chunk | `AppError` carries a `Symbol.for` brand, which is the same brand in every copy, and `isAppError` replaces every `instanceof`. A boundary test forbids the old form. `toErrorResponse` now logs unexpected failures with a request id, because a 500 that leaves no trace is what made this expensive to find |
| CI, not a local run | **The browser journeys were order-dependent.** The test double is a singleton shared by both viewport projects, so the second inherited every fact created and every resource disabled by the first. Worse, its seed resources were a module-level array that `saveResource` mutated, so even a reset handed back a "fresh" store over edited data. Each file passed alone and the suite failed as a whole | Each journey resets through a route that 404s outside `SR_TEST_MODE=e2e`, and the store copies its seeds per instance. A boundary test asserts every route under `api/test` checks the switch, and fails if that directory is ever empty rather than passing over nothing |
| CI, not a local run | The action strip height assertion read once, but the measurement is written by a ResizeObserver that fires after the paint. It raced | The assertion polls |
| Browser journeys | The test double kept English stopwords, so a nonsense query still matched every reply containing "the". A no-match assertion would have passed for the wrong reason | The double drops stopwords, as Postgres full-text search does |
