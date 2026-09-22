# Social Replies — GitHub Issue Bootstrap

**Repository:** `James-Bugden/Social-Replies-`  
**Visibility:** Public  
**Canonical spec:** `SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md`  
**App:** authenticated single-user v1  
**Temporary domain:** `https://replies.jamesbugden.com`

This file is the compact backlog authority for First Mate. The implementation spec remains the product authority.

## Public-repository safety

Do not put private or sensitive material in issues, PRs, commits, CI logs, screenshots, fixtures, or artifacts.

Never include:
- API keys/tokens/credentials/service-role values;
- real login email/account identifiers;
- real historical reply exports or private source-post text;
- production database dumps;
- copied private Drive documents;
- screenshots/logs with real private content.

Use synthetic examples in public GitHub evidence. Real imports and the private AI evaluation set stay outside Git.

## Milestones

- **M0 — Foundation & Design**
- **M1 — Memory & Retrieval**
- **M2 — Core Reply Workflow**
- **M3 — Quality & Production**

## Suggested labels

- priority:p0 / priority:p1 / priority:p2
- type:epic / type:setup / type:design / type:data / type:ai / type:ui / type:qa / type:deploy
- area:security / area:database / area:imports / area:retrieval / area:resources / area:facts / area:threads / area:library / area:editor / area:infra
- blocked / needs-owner-input / ready

> The current GitHub connector does not expose label/milestone creation, so the issues themselves carry milestone/label suggestions in their bodies. First Mate may create/apply them during project bootstrap.

---

## SR-EPIC — Ship Social Replies single-user v1

**Milestone:** M3  
**Suggested labels:** type:epic, priority:p0

Ship the v1 described in the canonical implementation spec.

Success means the owner can keep a social feed in one window and Social Replies in the other, paste a post, retrieve relevant historical replies, see resources worth sharing, receive three meaningfully different reply ideas, edit/copy/post manually, mark the exact final reply as posted, and have that final text become future searchable memory.

The public repository must remain free of private data and secrets.

---

## SR-001 — Repository, security and CI foundation

**Milestone:** M0  
**Suggested labels:** type:setup, priority:p0, area:security, area:infra

Bootstrap the public repository for safe agent-driven development.

Acceptance:
- Next.js + TypeScript + Tailwind + shadcn foundation builds.
- CI runs typecheck/lint/tests as available.
- secret scanning is enabled in CI.
- `.gitignore`, `.env.example`, `SECURITY.md`, `AGENTS.md` remain enforced.
- no secrets or real private corpus data are committed.
- project is registered with First Mate.

---

## SR-002 — Complete Mobbin + Drive design research

**Milestone:** M0  
**Depends on:** SR-001  
**Suggested labels:** type:design, priority:p0

Read the canonical Drive design/copy sources and visually inspect relevant Mobbin screens/flows.

Research:
- AI rewrite/alternative selection;
- narrow productivity side panels;
- saved-message/search result patterns;
- recommendation/resource cards;
- social reply/composer flows.

Seed references are listed in the implementation spec.

Deliver `docs/design/research.md` with 6–12 useful references, what to adopt, and what not to copy.

---

## SR-003 — Lock the narrow two-window UX direction

**Milestone:** M0  
**Depends on:** SR-002  
**Suggested labels:** type:design, type:ui, priority:p0

Create 2–3 realistic directions around 600 px browser width, then review in Orca and select one.

Each direction must show:
- daily 10/10/10 counters;
- post input + platform;
- similar past replies;
- useful resources;
- three reply ideas;
- final editable reply;
- Copy reply;
- Mark posted.

Acceptance:
- primary flow works at 500–750 px width;
- no persistent sidebar steals width;
- existing design tokens/copy principles are followed.

---

## SR-004 — Supabase, authentication and core schema

**Milestone:** M0  
**Depends on:** SR-001  
**Suggested labels:** type:data, priority:p0, area:database, area:security

Create the production data/auth foundation.

Acceptance:
- separate Supabase project preferred;
- pgvector plus required lexical/trigram indexes;
- RLS protects all private records;
- authenticated owner allowlist;
- no service-role or private credentials exposed client-side;
- fresh migrations work from zero.

---

## SR-005 — Build Resource Registry

**Milestone:** M1  
**Depends on:** SR-004  
**Suggested labels:** type:data, priority:p0, area:resources

Create the resource registry for guides, tools, books, and advice-only resources.

Acceptance:
- resource path stored separately from `RESOURCE_BASE_URL`;
- EN/zh-TW paths supported;
- inactive resources excluded;
- AI cannot output a resource URL not found in Registry;
- simple add/edit workflow exists.

---

## SR-006 — Build approved Fact Bank

**Milestone:** M1  
**Depends on:** SR-004  
**Suggested labels:** type:data, priority:p0, area:facts

Create a small approved facts/examples store.

Acceptance:
- facts have tags and approval state;
- generation can only present a personal anecdote/example when grounded in an approved Fact Bank entry;
- UI supports simple add/edit/disable;
- no sensitive fact data is committed as fixtures.

---

## SR-007 — Historical reply import framework

**Milestone:** M1  
**Depends on:** SR-004  
**Suggested labels:** type:data, priority:p0, area:imports

Build a common private importer contract.

Acceptance:
- provenance levels: confirmed_posted, user_edited, published_post, ai_draft;
- normalization/deduplication;
- idempotent batches;
- source identifiers/hashes where available;
- failed rows are recoverable;
- source files are read from ignored/private locations and never copied into Git.

---

## SR-008 — Platform and Drive historical import adapters

**Milestone:** M1  
**Depends on:** SR-007  
**Suggested labels:** type:data, priority:p0, area:imports

Inspect actual available LinkedIn, X, Meta/Threads exports and the relevant private Drive reply sources when supplied.

Acceptance:
- import all available historical replies/comments rather than a curated sample;
- preserve platform/date/source/provenance;
- do not claim an unconfirmed draft was posted;
- private source data never appears in GitHub issues, test fixtures, logs, or artifacts.

---

## SR-009 — Embeddings and hybrid historical-reply retrieval

**Milestone:** M1  
**Depends on:** SR-007  
**Suggested labels:** type:data, type:ai, priority:p0, area:retrieval

Implement searchable memory over the whole corpus.

Acceptance:
- semantic/vector search;
- lexical/trigram search;
- provenance + recency weighting;
- platform/topic metadata usable in ranking;
- top 3 shown initially with View more matches;
- useful older replies remain discoverable.

---

## SR-010 — Resource retrieval and no-link threshold

**Milestone:** M1  
**Depends on:** SR-005, SR-009  
**Suggested labels:** type:ai, priority:p0, area:resources, area:retrieval

Match relevant resources to the current source post.

Acceptance:
- max 3 visible initially;
- resource rationale is concise;
- Add to reply and Copy link supported;
- explicit successful empty state: “Nothing worth linking for this one”;
- no pressure to include a link.

---

## SR-011 — AI provider abstraction and structured generation

**Milestone:** M2  
**Depends on:** SR-004, SR-009, SR-010  
**Suggested labels:** type:ai, priority:p0

Implement configurable generation provider/model and validated structured output.

Acceptance:
- provider/model configured by environment, not hard-coded;
- one generation request produces 3 alternatives;
- schema validation;
- bounded retries/timeouts;
- server-side secrets only;
- no chain-of-thought stored or shown.

---

## SR-012 — Platform prompts and Threads zh-TW adapter

**Milestone:** M2  
**Depends on:** SR-011  
**Suggested labels:** type:ai, priority:p0, area:threads

Implement platform-specific output rules.

Acceptance:
- LinkedIn: English, conversational, enough context;
- X: English, direct, no artificial 280-character limit;
- Threads: native Taiwan Traditional Chinese first;
- expandable English meaning for Threads;
- canonical Drive reply/writing rules are reused rather than copied into a competing voice spec.

---

## SR-013 — Repetition and hallucination guards

**Milestone:** M2  
**Depends on:** SR-005, SR-006, SR-011  
**Suggested labels:** type:ai, priority:p0

Protect against repetitive or invented output.

Acceptance:
- flag/rewrite high overlap with recent replies;
- detect repeated opening/CTA/example/resource use;
- personal example must resolve to approved Fact Bank entry;
- resource URL must resolve to Registry;
- fail safely if validation fails.

---

## SR-014 — Compact Social Replies workspace

**Milestone:** M2  
**Depends on:** SR-003, SR-004  
**Suggested labels:** type:ui, priority:p0, area:editor

Build the primary side-by-side desktop surface.

Acceptance:
- designed first for 500–750 px browser width;
- compact header with LinkedIn/X/Threads daily counters;
- Paste the post you're replying to input;
- platform segmented control;
- Get reply ideas primary action;
- Cmd/Ctrl+Enter support;
- no dashboard clutter or persistent sidebar.

---

## SR-015 — Past Replies and Useful Resources result sections

**Milestone:** M2  
**Depends on:** SR-009, SR-010, SR-014  
**Suggested labels:** type:ui, priority:p0, area:library, area:resources

Implement the first two result sections.

Acceptance:
- “You've replied to similar posts before” shows top 3;
- Use this idea;
- View more matches;
- “Useful things you can share” is independently visible;
- Add to reply;
- Copy link;
- resource state remains understandable even when no link is recommended.

---

## SR-016 — Reply Ideas and final editor

**Milestone:** M2  
**Depends on:** SR-012, SR-013, SR-014  
**Suggested labels:** type:ui, type:ai, priority:p0, area:editor

Implement generation cards and the editable final reply.

Acceptance:
- exactly 3 meaningfully different alternatives by default;
- dynamic labels describe actual difference, not generic Quick/Add Value/Different Angle;
- optional subtle Suggested marker;
- Use this moves copy into final editor;
- contextual refinements such as Shorter, More direct, Warmer, Add recruiter context, Remove link;
- Threads English meaning disclosure;
- keyboard-first flow.

---

## SR-017 — Copy, Mark posted, counters and Add past reply

**Milestone:** M2  
**Depends on:** SR-014, SR-016  
**Suggested labels:** type:ui, type:data, priority:p0, area:editor

Finish the daily loop.

Acceptance:
- Copy reply gives quiet success feedback;
- Mark posted saves the exact current editor text;
- save is idempotent;
- saved item becomes confirmed canonical memory;
- correct platform counter increments for Asia/Taipei;
- state clears safely for next reply;
- Add past reply supports manually written replies with minimal fields.

---

## SR-018 — Reply Library and lightweight admin utilities

**Milestone:** M2  
**Depends on:** SR-005, SR-006, SR-009  
**Suggested labels:** type:ui, priority:p1, area:library

Add utility pages without turning the product into a dashboard.

Acceptance:
- Library natural-language search;
- filters for platform/topic/date/resource;
- provenance visible;
- minimal Resource Registry management;
- minimal Fact Bank management.

---

## SR-019 — AI evaluation, Playwright and Orca UX QA

**Milestone:** M3  
**Depends on:** SR-013, SR-015, SR-016, SR-017  
**Suggested labels:** type:qa, priority:p0

Create the quality gate.

Acceptance:
- evaluation harness accepts a private golden set from outside Git;
- public repo contains only synthetic fixtures/schema;
- compare generated suggestions against historical final replies;
- hallucinated facts/URLs = hard failure;
- Playwright covers core browser flow;
- Orca reviews 500–750 px primary layout;
- dedicated Taiwan Traditional Chinese QA;
- T0/T1/T2 evidence recorded without private content.

---

## SR-020 — Vercel deployment, domain and production smoke

**Milestone:** M3  
**Depends on:** SR-019  
**Suggested labels:** type:deploy, priority:p0, area:infra, area:security

Deploy the authenticated app separately from Soar.

Acceptance:
- separate Vercel project;
- `replies.jamesbugden.com` attached and TLS valid;
- environment secrets stored only in provider secret configuration;
- production login works;
- generation works;
- resource/past-reply retrieval works;
- Mark posted persists exact text;
- Asia/Taipei counter reset verified;
- public GitHub tree/CI artifacts checked for accidental private data or secrets.

---

## Dependency summary

```text
SR-001
├─ SR-002 → SR-003 → SR-014
├─ SR-004
│  ├─ SR-005 ─┐
│  ├─ SR-006 ─┼─ SR-013
│  └─ SR-007 → SR-008
│            └→ SR-009 → SR-010
│                         └→ SR-011 → SR-012
│
SR-014 + SR-009/010 → SR-015
SR-014 + SR-012/013 → SR-016
SR-014 + SR-016 → SR-017
SR-005/006/009 → SR-018
SR-013/015/016/017 → SR-019
SR-019 → SR-020
```

First Mate should parallelize independent branches after the prerequisites are green, but should not block the usable end-to-end slice on perfect historical import.
