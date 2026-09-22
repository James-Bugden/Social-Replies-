# Social Replies: acceptance and evidence matrix

Revision 2, 2026-09-22. This document specifies the tests that implementation must pass. It is not a report that the backend or app has passed them. Synthetic prototype checks are recorded separately in the scope audit.

## Evidence policy

Every implementation issue links its applicable test IDs below. Record command, result, environment, browser/runtime, exact commit and remaining risk. A skipped, blocked, advisory-red or inconclusive test is not a pass. The public repository contains only synthetic fixtures and sanitised results. Real exports, private prompts, golden replies, screenshots with user data and provider credentials stay outside Git and public CI artifacts.

T0 means types/unit/integration/database verification. T1 means deterministic browser journeys. T2 means actual browser/visual/copy review, using Orca in the build workflow. T3/T4 follow the canonical mobile/device triggers. Local Chromium or Playwright WebKit is not physical iPhone Safari. Clipboard and sticky/viewport defects require the environment that exposed the problem. Do not claim mobile support from responsive screenshots alone.

## Test contracts

| ID | Issue owners | Fixture/action | Required result |
|---|---|---|---|
| SEC-01 | #2 #5 #20 | Fresh synthetic DB, anonymous client and authenticated non-owner call every table and RPC | No private read/write; owner works; child joins and RPCs cannot bypass owner policy |
| SEC-02 | #5 #12 #20 | Forge user_id, parent ID, resource ID and session ID; try cross-origin mutations | Server rejects safely; WITH CHECK and composite FKs also reject direct database mutations |
| SEC-03 | #2 #21 | Scan tracked files/history and staged CI artifacts; deliberately use a synthetic leak sentinel in an isolated test | Scanner/policy gate detects the sentinel; actual keys/exports never committed; public fork CI has no production credentials |
| SEC-04 | #12 #14 #20 | Paste source text telling the model to reveal secrets, fetch URLs or change instructions | It is treated as quoted data; no tool capability or secret context exists; unsafe generated output is withheld |
| SEC-05 | #15 #19 #21 | Inspect API headers, URLs, error messages, analytics and logout recovery | Private no-store responses; no source/reply/search text in URLs or telemetry; explicit logout clears tab-local recovery |
| DATA-01 | #5 #8 | Reset/apply all migrations twice through supported tooling | Valid schema, explicit nullability/enums/indexes, deterministic migrations and generated types; no real owner seed in Git |
| IMP-01 | #8 #9 | Import same file twice; same native reply ID from another export | One canonical record with preserved source references and accurate dispositions |
| IMP-02 | #8 #9 | Identical wording on two distinct target posts | Two reply events, not silently deduplicated by text/day hash |
| IMP-03 | #8 #9 #18 | Unknown date, date-only with unknown timezone, known UTC timestamp, old archive imported today | Missing dates stay missing; old or unproven-day records do not inflate today's counter |
| IMP-04 | #8 #9 | Malformed CSV, JS archive wrapper, unknown schema, zip traversal, huge expansion, interrupted batch | No code execution or unsafe paths; row-level review/error dispositions; bounded resumable import |
| IMP-05 | #9 | Source lacks parent text or publication proof | Null context and honest provenance; no invented parent or promotion from AI draft to posted |
| RET-01 | #10 #20 | Frozen English/Chinese judgement queries including short keywords and cross-language equivalents | Relevant older matches remain discoverable; no hard recent-only cutoff; stable top-3 and cursor pagination |
| RET-02 | #10 #18 | Save a reply while embedding API is down | Exact save and lexical lookup succeed; durable job retries; vector becomes available later without duplicate reply |
| RET-03 | #10 #19 | Correct text while an old embedding job runs; disable/withdraw item | Stale hash result cannot overwrite new index; excluded item is filtered before candidate selection |
| RET-04 | #10 #16 | History only contains AI drafts/main posts | Label accurately; AI drafts excluded from default voice context; no You previously replied claim |
| RES-01 | #6 #11 #16 | Relevant own guide, irrelevant high-priority guide, approved book, inactive guide, disallowed platform | Relevance qualifies before preference; only eligible registry items returned; maximum three |
| RES-02 | #6 #11 #14 | Unknown ID, javascript/data URL, protocol-relative path, URL credentials, unapproved source-post link | Validation blocks insertion; model never gets arbitrary URL-fetch permission |
| RES-03 | #6 #11 #16 | No match vs empty registry vs lookup timeout; Chinese path missing | Three distinct states; explicit English fallback; no fabricated Free, translated title or availability claims |
| RES-04 | #16 #17 | Add same resource twice, add second resource, edit CTA then remove | No duplicates; preview replacement/removal; unrelated human text preserved; count unchanged |
| FACT-01 | #7 #13 #14 | Approved public-safe, expired, unapproved and private-only facts | Only eligible approved public-safe facts enter context; semantic claims match actual evidence, not just valid IDs |
| AI-01 | #12 #13 #14 | Successful schema response, malformed JSON, missing idea, duplicate ideas, missing Threads meaning | Normal success has three useful distinct alternatives; repair bounded once; unresolved unsafe results withheld |
| AI-02 | #12 #15 | Timeout, 429 with Retry-After, cancelled request, repeated clicks | Bounded cost/time/concurrency; editor stays usable; no implicit unapproved provider fallback |
| AI-03 | #13 #14 #20 | English/zh-TW samples including nuanced agreement and no available anecdote | British English; natural Taiwan wording; no forced disagreement, stock wrappers or invented personal story |
| AI-04 | #14 #20 | Same useful advice but different expression; nearly verbatim recent reply | Similar topic alone allowed; excessive wording warned/repaired without losing the useful point |
| UX-01 | #4 #15 #16 | 375/500/600/750/1280 CSS px, 200% zoom, long URLs and Chinese | No page overflow; resources visible in document order without tab switch; full text available; controls reachable |
| UX-02 | #4 #15 #17 | Keyboard-only traversal, IME composition, Escape, delayed results | No keyboard trap; visible/unobscured focus; no request during composition; background results do not steal focus |
| UX-03 | #15 #17 #19 | Edit during generation/refine/translation, switch platform, navigate utilities and return | No silent overwrite; version conflict handled; correct session/draft restored |
| UX-04 | #17 | Select another idea over dirty draft; accept/reject rewrite; Undo | Explicit replacement preview; Keep my reply preserves exact text; Undo restores previous version |
| ZH-01 | #13 #17 | Edit Chinese text, add CTA, trigger old translation response | English meaning becomes stale; old response discarded; refresh never rewrites Chinese |
| COPY-01 | #18 #20 #21 | Actual HTTPS browser clipboard allowed and denied | Success only after writeText resolves; denied path preserves/selects text; Chinese only copied for Threads; no counter change |
| SAVE-01 | #5 #18 | Exact text with line breaks, punctuation, emoji, CJK and trailing spaces | Database final_text equals submitted snapshot exactly; no normalisation or rewriting |
| SAVE-02 | #5 #18 | Double click; same key retry; different-key retry for same session; same key with changed payload | One recorded event; replay returns result; payload conflict is 409; no extra count |
| SAVE-03 | #18 | Network response lost after commit; DB transaction fails; embedding provider fails | Check/retry operation safely; never clear on uncertain/failed save; embedding failure does not roll back a valid save |
| DAY-01 | #18 #20 | Asia/Taipei 23:59:59 and 00:00:00, browser in another timezone, 11 replies | Correct server-local day; refetch on midnight/focus; display 11/10 without losing count |
| DAY-02 | #18 #19 | Correct existing reply, withdraw recorded status, manual undated reply | Correction adds no event; withdraw reverses app count only; unknown date not counted as today |
| UTIL-01 | #19 | Resource/fact create/edit/disable, stale version update, cancel Add past reply | Owner-only CRUD; safe conflicts; active draft retained; disabled records stop new suggestions |
| DEP-01 | #21 | Fresh preview deployment, production candidate, root-domain comparison | Separate credentials; exact deployed SHA known; root website/mail unchanged; no new public signup |
| DEP-02 | #21 | Owner login, generate, choose resource, edit/copy/record, retrieve just-saved reply | Verified on actual promoted HTTPS build; background embedding trigger and auth redirects work |

## AI evaluation procedure

Keep the real judgement set at PRIVATE_EVAL_SET_PATH, outside the repo. Use synthetic cases in public CI. Build a private set of 50-100 eligible historical pairs when available, and report actual available coverage rather than inventing missing original posts. Group duplicate/near-duplicate cases before splitting train/retrieval and evaluation; do not retrieve the held-out answer as its own context. Record dataset and prompt versions without exposing text.

Evaluate voice, practical usefulness, meaning preservation, Taiwan fluency, resource relevance, unsupported claims and edit burden. Edit distance is a diagnostic, not a quality verdict. A natural paraphrase can differ from the historical reply. Blind the model identity for owner preference checks where practical. Do not let a model's self-score stand in for review. Explicit factual/language guard failures are recorded separately from subjective preference.

Re-run when model, prompt, canonical voice snapshot, retrieval weights or eligibility rules change. Zero observed unsupported facts/URLs is a release gate on the evaluation set, not a promise that hallucination is impossible. If real examples are unavailable, report that limitation and keep real-data quality validation pending; continue synthetic engineering work.

## Performance and cost checks

Targets, not measured claims: first local lexical results within 1 second on a 10,000-row synthetic corpus; retrieval p95 within 2 seconds in the chosen environment; generated ideas within the configured total deadline; record response not blocked by embeddings. Record actual timings, cold/warm state, corpus size and provider settings. Do not optimise against invented latency figures.

## Release gate

SR-019 #20 maintains the campaign ledger: test ID, issue, environment, build, result, evidence and retest status. Continue independent test charters after filing a defect. Block only dependent tests. Fix workers add regression coverage; the QA owner retests the exact deployed environment. Security/data-loss defects block release.

SR-020 #21 deploys only when required T0/T1/T2 and triggered T3/T4 checks are green, configuration/private-source limitations are declared and critical user journeys pass on the candidate build. Public issue evidence uses synthetic text only. Credentials, actual owner data and complete private source manifests are never posted as proof.
