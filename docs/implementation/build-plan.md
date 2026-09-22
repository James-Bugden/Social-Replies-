# Social Replies: build plan and delivery record

Created 2026-09-22. Owner of this document: the implementation workflow. It records how the 21 scoped
issues are grouped into branches, which decisions were taken without the owner, and which inputs
remain genuinely owner-only.

This is a delivery plan. It is not evidence that any listed item has shipped. Completion evidence
lives in each pull request and in `docs/testing/campaign-ledger.md`.

## Delivery grouping

Nineteen open implementation issues are grouped into six branches. Grouping is an engineering
decision to reduce integration churn on a greenfield codebase where the shared contracts in
`docs/implementation/contracts.md` are imported by almost every module. Each pull request still
names every issue it closes and records that issue's acceptance evidence separately.

| Branch | Issues | Deliverable |
|---|---|---|
| `jb/sr-001-foundation` | #2 | Scaffold, CI, secret scanning, private-path policy, runbook |
| `jb/sr-004-schema` | #5 | Migrations, RLS, owner boundary, shared contracts, PGlite test harness |
| `jb/sr-data-services` | #6 #7 #8 #9 #10 #11 | Registry, Fact Bank, importer, adapters, retrieval, qualification |
| `jb/sr-ai-services` | #12 #13 #14 | Provider/fake generator, voice adapters, grounding guards |
| `jb/sr-workspace` | #4 #15 #16 #17 #18 #19 | Components, workspace, results, editor, recording, library/admin |
| `jb/sr-release` | #20 #21 | Campaign ledger, evaluation harness, deployment runbook |

## Decisions taken without the owner

**D-01. The database is the existing empty `Career` Supabase project, not a new paid project.**
A new project in this organisation costs 10 USD per month. `Career`
(`avpntrdnqlrjfmfdagfj`, ap-southeast-2) has zero public tables and zero auth users, is already
provisioned, and is separate from the `gettheoffer` production project. C01 requires a *separate*
project, which this satisfies, at no additional cost and with no risk to production data. Reversible:
if the owner wants a dedicated project later, the migrations apply to any empty Postgres.

**D-02. Local database verification uses PGlite, not Docker.** There is no Docker runtime on this
machine, so `supabase start` cannot run. Migrations and RLS policies are verified against PGlite
with a small `auth` schema shim that supplies `auth.uid()`, the `anon`/`authenticated` roles and
`request.jwt.claims`. This makes DATA-01, SEC-01 and SEC-02 runnable in public CI with synthetic
data and no credentials. It is not a claim that PGlite is byte-identical to hosted Supabase; the
same migrations are also applied to the real project and re-verified there.

**D-03. Generation provider is Anthropic; embeddings are OpenAI-compatible at 1536 dimensions.**
C08 requires exactly one paid provider plus a fake adapter. Anthropic is the owner's existing
provider relationship. C03 fixes the first index at 1536 dimensions, which `text-embedding-3-small`
returns natively. Both are selected by environment variable and both have deterministic fakes, so
no module depends on a specific vendor. Model IDs and pricing are verified in #12 before deployment.

**D-04. Lexical search is the floor, not a fallback.** Every retrieval path returns useful results
with zero embeddings configured. Vectors improve ranking; they are never required for correctness.
This follows C05 and makes the app usable before any embedding key exists.

## Genuinely owner-only inputs

These block the named issue only. They do not block the rest of the build.

| Input | Blocks | Why it cannot be automated |
|---|---|---|
| Owner auth bootstrap (one account, private) | #21 production sign-in | Account creation and credential handling |
| `AI_API_KEY` | #12 live generation, #20 model benchmark | Provider billing credential |
| `EMBEDDING_API_KEY` | #10 vector ranking (lexical still works) | Provider billing credential |
| Vercel project and `replies.jamesbugden.com` DNS | #21 | Account and DNS authority |
| LinkedIn, X, Threads, Drive exports | #9 real backfill | Authorised private data |

## Acceptance evidence policy

Each pull request records, per issue: the acceptance checkboxes, the exact commands run, their
results, the commit, and what remains unverified. A skipped, blocked or inconclusive check is
recorded as such. Synthetic fixtures only in this repository.
