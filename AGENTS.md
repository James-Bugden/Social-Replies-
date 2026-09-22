# Social Replies: agent instructions

## Read before editing

Read SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md, docs/implementation/contracts.md, docs/design/interaction-spec.md, docs/testing/acceptance-matrix.md and the assigned issue. The canonical private Coding Workflow/Agent Rules remain authoritative when stricter. Resolve current repository state before acting. Preserve unrelated edits and use an isolated branch/worktree.

## Current state and design

This repository contains a completed planning/design package, not a deployed app. Mobbin research is already in docs/design/mobbin-research.md. Consume the inspected recommendations; do not repeat broad research just because the old issue assigned it.

Compact reference-first, direction B in docs/design/prototype.html, is the implementation default. It preserves visible resources in the two-window workflow. The synthetic comparison is not production code, owner approval, actual model output or an Orca pass. Issue #4 retains component/Orca validation.

## Public code, private data

Every commit, issue, PR, CI log and artifact is public. Never add credentials, production environment values, owner account IDs/emails, real reply exports, private source locators, private Drive exports, raw prompts or sensitive screenshots. Synthetic examples only. Real import/evaluation data stays outside Git. Read SECURITY.md.

Ordinary endpoints use verified constrained owner sessions. Test direct database/RPC access as well as UI auth. Server/admin secrets must never enter browser bundles. No production secrets in untrusted fork CI. Never delete real data or alter Soar infrastructure as a shortcut.

## Product invariants

Resources are a first-class visible section. Three reply alternatives use meaningful dynamic labels. Manual editing works during model failure. No async result silently overwrites a dirty editor. English meaning is tied to the exact Chinese version and becomes stale on edits.

Copy never posts or counts. Mark posted records the exact submitted final text as user-confirmed evidence. Idempotency is operation-based, not a text-hash-only key. Unknown imported dates remain unknown. All available history is searchable with provenance; AI drafts are not confirmed voice truth.

Only eligible registry URLs and approved active current public-safe facts enter generated replies. Models cannot infer owner approval or rewrite private canonical voice rules automatically.

## Build and verify

First Mate orchestrates according to its supported current runtime, merge authority and project procedure. Use shared typed fake adapters to parallelise UI work without private API keys. Missing exports block only that source's actual backfill. Do not claim unavailable data was imported.

T0 for relevant code; T1 for functional browser changes; T2/Orca for visible UX; T3/T4 when the canonical device/clipboard/viewport triggers apply. Skipped, blocked and inconclusive are not passes. Keep implementation and high-risk review independent. Continue unblocked QA charters while fixes run.

Every issue names acceptance IDs. Completion evidence states exact commit/environment, commands/results, unresolved risk and issue/PR links. Verify the actual promoted deployment for production claims. Planning/checklist completion is not application completion. Escalate only real owner-only credentials, access, safety or cost decisions, never routine setup for a nontechnical owner.
