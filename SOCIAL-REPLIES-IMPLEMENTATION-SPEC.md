# Social Replies: product plan and implementation specification

Revision 2. Prepared 2026-09-22. Repository: `James-Bugden/Social-Replies-` (public). Product: an authenticated single-user app. Temporary app URL: `https://replies.jamesbugden.com`. Build owner: the active coding agent under `AGENTS.md`; implementation/browser review: the configured tool-neutral coding workflow, with Orca or equivalent tooling when useful.

**Retirement decision (2026-09-25):** the owner's newer instruction to combine
Social Replies and Content Studio in one codebase and UI supersedes the separate
deployment direction below. The live Replies workspace is now
`https://content-studio-blond-rho.vercel.app/replies`. The standalone deployment
uses a temporary, reversible redirect and retains its code and Supabase data for
rollback; it does not import historical replies into the combined app.

**Status:** product/implementation planning and inspected Mobbin research are supplied. The interactive comparison is synthetic design evidence. The production app, real-data backfill, model benchmark, Orca review and deployment are not claimed complete.

## 1. Authority and how to read this specification

This revision replaces the earlier conceptual specification, contradictory aliases and speculative estimates. The previous version remains in Git history, not as a competing current contract.

The complete specification is modular:

| Document | Authority |
|---|---|
| This file | Product scope, requirements, sequencing and delivery |
| [Mobbin research](docs/design/mobbin-research.md) | Actual inspected examples, observations, adopted/rejected patterns and source limits |
| [Interaction and copy specification](docs/design/interaction-spec.md) | D01-D14: layout, components, every main UI state, editor safety and language behaviour |
| [Implementation contracts](docs/implementation/contracts.md) | C01-C10: schema, enums, ownership, APIs, retrieval, model handling, recording and configuration |
| [Acceptance matrix](docs/testing/acceptance-matrix.md) | Traceable tests, environments, private evaluation and release evidence |
| [GitHub issue index](SOCIAL-REPLIES-GITHUB-ISSUES.md) | The existing epic and 20 scoped issues, dependencies and issue ownership |
| [Design comparison](docs/design/prototype.html) | Synthetic A/B/C demonstrator, not model-backed functionality |

The owner's newest explicit requirements remain authoritative. Repository security rules and stricter canonical coding rules apply. Private Drive writing/design sources inform this specification but are not exported into this public repo. In a future conflict, document the narrow resolution in the affected contract and issue rather than keeping two incompatible definitions.

## 2. The job to be done

The owner replies while looking at a feed because leaving it risks losing the conversation. He keeps the social platform in one browser window and Social Replies in another. He is not preparing a schedule of comments in advance.

The main loop is:

1. Paste the immediate post or comment, with optional parent-post context and URL.
2. See relevant things he has actually written before.
3. See useful guides, tools or books he could share.
4. Receive three meaningfully different reply ideas.
5. Select or write a reply, edit it and optionally add/remove a resource.
6. Copy it and post manually in the social platform.
7. Paste back any edits made in the feed, then Mark posted.
8. Save that exact final text as future searchable memory.

Daily targets: 10 LinkedIn, 10 X and 10 Threads replies, using Asia/Taipei. Copying is not posting. Mark posted records the owner's attestation, not independent platform verification.

## 3. Locked v1 scope

| Requirement | Behaviour | Issue owners |
|---|---|---|
| FR-01 Narrow workspace | 500-750 px first, optional wide layout, no persistent sidebar/dashboard | #4 #15 |
| FR-02 Source context | Post or comment target, optional parent and URL, no automatic scraping | #15 |
| FR-03 Historical memory | Import all available owner replies, preserve provenance/date uncertainty, search whole eligible corpus | #8 #9 #10 |
| FR-04 Prior writing display | Three exact excerpts first, full-text expansion and more matches; drafts labelled | #16 #19 |
| FR-05 Resource discovery | Independent visible section, up to three qualified owned resources/books, valid no-link state | #6 #11 #16 |
| FR-06 Three reply ideas | Dynamic labels describing actual differences, not mandatory Quick/Add Value/Different Angle | #12 #13 #14 #17 |
| FR-07 Grounded personal examples | Only approved active current public-safe Fact Bank evidence | #7 #13 #14 |
| FR-08 Platform language | LinkedIn/X English; native Taiwan Traditional Chinese plus English review meaning for Threads | #13 #17 |
| FR-09 Protected editing | Manual editor always available; explicit previews, Undo and version conflict handling | #15 #17 |
| FR-10 Exact recording | Copy separate from Mark posted; durable idempotent save; accurate daily counts | #5 #18 |
| FR-11 Capture outside the tool | Lightweight Add past reply, optional unknown date, same permanent library | #18 #19 |
| FR-12 Privacy and delivery | Public-safe code, private owner-only data, verified production build and evidence | #2 #5 #20 #21 |

A secondary keyword search retrieves old replies/resources without pretending the keyword is an external post. Resource recommendation remains available even if reply generation fails.

Out of scope: automatic commenting, platform OAuth/publishing, feed discovery, scraping, browser extension, native mobile app, billing/teams/multi-user SaaS, analytics/streak dashboards, prompt/model picker, separate Reply Inbox, a second content scheduler, automatic fine-tuning and autonomous edits to canonical private voice rules.

## 4. Main-screen design decision

The selected implementation default is **compact reference-first**, called direction B in the current comparison. Direction A is an all-expanded stack; direction C hides references behind tabs. B preserves independently visible resources while reducing historical-text density. It is a recommendation based on the stated workflow, not a user-approval or usability-study claim. Earlier issue drafts used different direction letters; behaviour and the committed comparison now govern.

Reading order: source, past replies, useful resources, reply ideas, final editor. At narrow widths the editor stays in document flow. Only a small action strip may stick, with reserved space and short-viewport fallback. At 1100+ px the editor may occupy a second column. No large fixed textarea covering results.

Use paper/white surfaces, deep-green actions, green-soft selection, neutral metadata and restrained decorative gold. Geist/Noto Sans TC in the app with readable fallbacks. Essential input/focus contrast must be stronger than decorative hairlines when necessary. Do not copy large marketing heroes/footer anatomy into this utility. Text-selection cards stay still on hover.

The Mobbin report contains eight individual inspected screens and three preview frames from one nine-screen flow. It distinguishes actual observations from proposed behaviour. Buffer informs contextual transformations and explicit insertion; Superhuman informs compact rows; WRITER informs source/resource objects; other references are qualified in the report. No licensed screenshot or expiring asset URL is redistributed.

The HTML comparison demonstrates selected interactions with synthetic text. It does not implement every contracted state, actual translation, authentication, storage, retrieval or model calls. #4 remains responsible for reusable component implementation and real Orca/browser validation.

## 5. Interaction contracts that cannot be omitted

Resources are not hidden in a fourth reply mode. Each qualified item shows a real title/type, locale/access information when verified, why it fits, Add to reply and Copy link. Advice-only is no qualified resource. Empty registry, no match and failed lookup are different states.

Adding a resource appends a validated CTA without rewriting human text. Re-adding is a no-op. A different resource or removal of an edited block requires preview. Historical URL snapshots never change during a future rebrand.

Three ideas display complete text and useful dynamic labels. Use this fills an empty/pristine editor, otherwise it proposes a replacement. Refine produces a proposal, not an automatic mutation. Late responses tied to older source/editor versions are discarded.

Threads meaning is linked to the exact Chinese text hash. Chinese edits, resource insertion and accepted rewrites invalidate it. Refresh meaning never changes the Chinese. Copy reply copies Chinese only. Translation failure does not block manual work.

Mark posted saves the submitted exact text only after durable commit. Failure or an unknown network result preserves the draft and uses the same operation key for recovery. Success leaves the final text available with Undo recorded status and Next reply. Undo affects the app record/count, not the external social post.

The UI remains English. Personal social replies follow the owner's private writing/reply voice, not the more formal product UI register. Taiwan terminology, British spelling and avoidance of invented anecdotes are defined in #13 and the private source hierarchy.

## 6. Technical architecture

Default stack: Next.js/TypeScript, Tailwind and selected shadcn primitives, Supabase Auth/Postgres, pgvector plus lexical search, Vercel, shared Zod contracts, unit/integration tests and Playwright. Verify supported versions at implementation time and commit a lockfile. Do not build redundant providers or infrastructure to satisfy a diagram.

One paid generation provider plus a fake adapter is enough. Server-side keys, explicit cost/deadline controls and validated outputs are mandatory. Model IDs/prices and quality must be verified before deployment. Earlier conversational price tables and hour ranges are not reliable engineering evidence.

Pipeline: authenticate -> validate source -> retrieve owner history/resources -> render retrieval -> bounded generation with eligible facts/voice context -> validate -> proposals -> explicit edits -> exact atomic recording -> lexical index/outbox -> asynchronous version-safe embeddings.

Private input is quoted untrusted data. The generator has no browsing, shell, social-posting or secret-reading capabilities. Provider failure cannot remove a usable manual workflow. Keep raw private text out of infrastructure logs.

## 7. Data and consistency decisions

C02 defines the single vocabulary. Store `posted_confirmed`, `user_edited_unconfirmed`, `published_main_post`, `ai_draft`. Publication evidence and date precision are separate fields. Legacy aliases are import-only. Unknown author/type goes to private review, not guessed publication.

Use `reply_library` for mixed-provenance writing, not a misleading posted_replies table holding drafts. Preserve exact text separately from search normalisation. All child tables carry owner identity and owner-preserving foreign keys. The private owner restriction is enforced in both API and database/RPC policies, not only UI routing.

C03 is the shared schema contract. In addition to its listed fields, resources have monotonic version and approved locale CTA fields; facts have active=true and monotonic version alongside approval/sensitivity/validity. Source identity/verification metadata and locale availability are explicit fields, not model guesses. Ordinary endpoints use constrained user sessions, not administrative bypass keys.

Dedupe uses strong event identity first. Identical wording on two different posts can be two legitimate events. Unknown dates never become today on import. Claim all *available* history, with a coverage ledger, not complete lifetime history from a partial export.

Recording uses a stable operation UUID plus payload fingerprint, and a unique session-event boundary. A text-hash-only key is insufficient. One transaction commits exact reply, receipt, session state, resource snapshots, lexical record and embedding job. Embedding failures do not undo a valid save. Old jobs cannot overwrite a corrected text hash.

Counters are derived from eligible non-withdrawn known-day reply events. Main posts, AI drafts, unknown dates and copies do not count. Correcting a record adds no event. Counts can exceed the target and refresh at Taipei midnight and on focus.

## 8. Resource and Fact Bank policy

Store owned resource paths separately from RESOURCE_BASE_URL. Verify the actual resource origin privately at deployment; the app's domain does not establish the resource host. Allow only approved owned resources and books. Do not fabricate Chinese paths, official book titles, Free/no-signup claims or resource contents.

Personal facts enter generation only when approved, active, current and public-safe. Importing an anecdote is not approval. A valid ID does not prove the generated claim is faithful: semantic validation still checks numbers, responsibility and meaning. No suitable fact means advice without a first-person anecdote.

Learning means better retrieval and private draft-to-final comparisons. Never treat untouched model drafts as the owner's voice or silently update canonical private writing rules. Propose repeated patterns for review; explicit owner instructions override immediately.

## 9. Imports and private operation

#8 builds a resumable private CLI with dry-run/review/import/resume/report. #9 builds separate adapters after inspecting actual authorised source schemas. Read all available relevant files, not a curated sample. Stream bounded batches, preserve identity/evidence/date precision and quarantine ambiguous/malformed rows privately.

Do not execute archive JavaScript, traverse unsafe zip paths or put large exports through the ordinary reply endpoint. Real source files and private golden sets stay outside Git. Missing exports block only that source's validation/backfill, not the synthetic end-to-end app slice.

Versioned server drafts are canonical working state. Tab-local recovery is short-lived, owner/session scoped and cleared on logout/discard; do not claim it is encrypted. Public CI uses synthetic data. Production credentials never reach fork PRs, screenshots or build logs.

## 10. Delivery sequence and autonomy

1. Start #2 foundation and consume completed research #3. #4 implements/validates the documented design with synthetic fixtures; do not repeat discovery without a specific unresolved question.
2. #5 publishes shared types/schema/security contracts. In parallel, #6 resources, #7 facts and #8 importer framework proceed once their prerequisites are stable.
3. #9 real adapters/backfill and #10 search/outbox proceed independently where sources allow. #11 resource qualification uses the same registry and retrieval contracts.
4. #12 provider/fake service, #13 voice and #14 guards build the generation path. #15 shell, #16 result sections, #17 editor, #18 recording and #19 utilities integrate against those contracts. Typed mocks keep UI work moving.
5. #20 runs independent quality charters as features arrive. File defects and continue unblocked tests while fix workers add regressions. Only dependent rows stop. Security/data-loss defects block release.
6. #21 provisions previews early, then promotes only after the required release evidence and verifies the actual deployed build.

The issue index supplies exact dependency links. No nonexistent SR-000 dependency remains. The active coding agent/orchestrator chooses appropriate worker/model/effort, follows the repository auto-merge policy, and uses isolated worktrees or managed isolated checkouts. The workflow must remain portable across Claude, Codex, Orca, or equivalent agents.

Pause only for genuine owner-only inputs under `AGENTS.md`: required private authentication/bootstrap access that the runtime cannot obtain, provider billing/keys, authorised exports, DNS/account permission, a consequential security/privacy or money-movement decision, irreversible production-data risk, or approval of a genuinely new design direction/large material UX change. Do not ask the nontechnical owner to implement routine setup.

Prior 5-8/12-25 hour estimates were not measured. Build the first vertical slice, record actual effort and blockers, then forecast remaining work. More agents do not turn verification and private-source dependencies into guaranteed elapsed hours.

## 11. Definition of ready for daily use

All FR requirements must be implemented with the relevant acceptance-matrix results. The owner can use a 500-750 px window, read prior replies, find useful resources, choose among three distinct ideas, review Threads meaning, edit/copy/post manually, record exact final text and retrieve it later. The system correctly handles missing resources, provider failure, dirty edits, stale meaning, clipboard denial, lost save responses and unknown historical dates.

Required T0/T1/T2 evidence is green; triggered T3/T4 follows the canonical workflow. Real clipboard/physical-browser claims need that environment. A local static prototype is not evidence of backend RLS, actual translation quality, production save reliability or Orca validation.

Private evaluation uses available historical pairs with grouped holdouts and no retrieval of the held-out answer. Record actual dataset coverage, voice/language review, hard failures, correction burden, latency and cost. Zero observed unsupported facts/URLs on the test set is a release gate, not an impossibility guarantee.

The public repository stays free of credentials, owner identifiers, raw historical exports, private Drive source contents/locators and private screenshots/logs. Secret-scanning configuration is work in #2, not assumed enabled by a SECURITY.md statement.

## 12. Deployment, workflow integration and later work

Keep a separate app deployment. Attach only replies.jamesbugden.com and preserve root website/mail DNS and Soar data. Verify exact auth redirects, TLS, no-store responses, the real embedding-worker trigger and promoted commit. A rollback changes this app's verified deployment/configuration, not unrelated production data.

Social Replies is an engagement workflow beside the content workflow. It never sends replies directly into Content Schedule or Typefully. A later Save as Content Idea bridge must enter the existing Content Library process. At deployment, update relevant private workflow routing/index entries by link without creating another canonical voice document.

After 50-100 real replies, assess actual friction, resource usefulness, retrieval relevance, editing burden and whether an extension would save enough work. Extensions, PWA/share sheets, discovery and multi-user productisation remain later decisions, not hidden v1 requirements.
