# Social Replies: agent instructions

This file is the canonical tool-neutral engineering policy for this repository.
Claude, Codex, Orca, or another capable coding agent may drive the workflow.
The workflow does not depend on a specific orchestrator.

## Read before editing

Read:
- `SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md`
- `docs/implementation/contracts.md`
- `docs/design/interaction-spec.md`
- `docs/testing/acceptance-matrix.md`
- the assigned GitHub issue
- the canonical Drive `Coding Workflow` and `Agent Rules` when available

Resolve current repository, issue/PR, and deployed state before acting. Preserve
unrelated edits and use an isolated branch/worktree or managed isolated checkout.

## Default autonomy

James is non-technical and prefers maximum safe autonomy. Routine engineering
work should proceed end-to-end without asking him to approve each step.

Agents are authorised to:
- inspect state and refine issue scope
- create/update issues, plans, branches and worktrees
- implement and write tests
- fix test/review failures
- commit and open/update PRs
- run independent review and adversarial verification
- run required T0–T4 QA
- enable auto-merge / merge green PRs
- deploy/promote through repository-supported tooling when permitted
- run staged/production smoke checks
- close issues and update durable docs/QA evidence

Ask James only for:
- two materially different product outcomes that cannot be resolved from evidence
- a genuinely new design direction, a new major user-facing surface whose
  interaction model is not specified, or a large/material UX change
- RLS/access-control decisions that could expose/hide user data
- payment/billing or money-movement changes
- irreversible/destructive production-data operations without proven rollback
- credentials/account permissions that literally require the owner

Routine UI fixes and work that follows the approved design system do not need
James approval; verify them at T2 instead.

## Current state and design

This repository contains the planning/design package plus implementation work.
Mobbin research already lives in `docs/design/mobbin-research.md`; consume it
rather than repeating broad discovery without a specific unresolved question.

Compact reference-first, direction B in `docs/design/prototype.html`, remains
the implementation default unless a later approved decision supersedes it.
Synthetic prototypes are evidence, not proof of production behavior.

## Public code, private data

Every commit, issue, PR, CI log and artifact may be public. Never add
credentials, production environment values, owner account identifiers, real
reply exports, private source locators, private Drive exports, raw private
prompts, or sensitive screenshots. Use synthetic examples in Git.

Ordinary endpoints use verified constrained owner sessions. Test direct
database/RPC access as well as UI auth. Server/admin secrets must never enter
browser bundles. No production secrets in untrusted fork CI. Never delete real
data or alter Soar infrastructure as a shortcut.

## Product invariants

- Resources remain a first-class visible section.
- Three reply alternatives use meaningful dynamic labels.
- Manual editing still works during model failure.
- No async result silently overwrites a dirty editor.
- English meaning is tied to the exact Chinese version and becomes stale on edits.
- Copy never posts or counts.
- Mark posted records the exact submitted final text as user-confirmed evidence.
- Idempotency is operation-based, not text-hash-only.
- Unknown imported dates remain unknown.
- All available history is searchable with provenance.
- AI drafts are not confirmed voice truth.
- Only eligible registry URLs and approved active public-safe facts may enter
  generated replies.
- Models cannot infer owner approval or rewrite private canonical voice rules.

## Change classification and PRD

Classify every code change:
- Trivial: mechanical/localized, low ambiguity, small blast radius.
- Standard: bounded logic or multi-file change.
- Heavy: architecture, schema, auth/RLS, migrations, broad refactor,
  cross-system work, or ambiguous/high-risk behavior.

For a new app, new major feature, new user-visible surface, or epic that
plausibly breaks into multiple issues, use
`.agents/skills/bm-prd-creator/SKILL.md` before implementation. Skip PRD for
bugs, refactors, copy tweaks, chores, and already-specced child issues.

The PRD process must inspect the repo/specs/issues first and infer routine
answers from evidence. Do not re-ask established stack/product decisions.

## Issue readiness

Before implementation, a bug issue should define:
- current vs expected behavior
- reproduction steps and evidence
- affected flows
- acceptance criteria
- non-goals
- likely regression areas
- required T0–T4 verification and evidence

A feature issue should define:
- desired outcome/context
- user flow and in-scope behavior
- dependencies/constraints
- non-goals
- failure/edge states
- acceptance criteria
- likely regression areas
- required verification and evidence

Use `.agents/skills/issue-scoping/SKILL.md` for the detailed procedure.

## Build and verify

One logical task per branch/PR unless an issue explicitly defines a rollup.
Implement the smallest safe change that satisfies the issue. Add the lowest-cost
reliable regression for confirmed bugs where practical.

Verification:
- T0 for every relevant code change.
- T1 Playwright for functional browser/user-flow changes.
- T2 agentic browser/UX review for user-visible UI/UX changes.
- T3 simulator/emulator for mobile-sensitive behavior.
- T4 physical device/browser when native hardware/browser behavior matters.

A skipped, blocked, inconclusive, advisory-red, or never-started check is not a
pass.

For Heavy/high-risk or multi-agent work:
- keep builder and independent reviewer separate where practical
- run `.agents/skills/adversarial-verify/SKILL.md`
- pay special attention to integration seams, data/privacy, stale state,
  idempotency, race conditions and false-green tests

Continue unblocked QA charters while fix work runs. Confirmed defects become
issues/regressions and enter an exact-environment retest queue after deployment.

## PR, review and auto-merge

Every PR must link its issue and include:
- why the change exists
- acceptance-criteria status
- tests/environments/evidence
- unresolved risk or limitations

Routine review findings are fixed automatically and relevant tests rerun.
Do not ask James whether ordinary review findings should be fixed.

Auto-merge/self-merge when:
- every repository-required CI/check context positively reports green
- required acceptance criteria are evidenced
- blocking review findings are resolved
- final acceptance retest passes
- no human-only carve-out above applies

No CI, skipped CI, pending CI, blocked CI or unknown CI is not green.

## Deployment and closure

After merge, verify the staged/deployed build rather than assuming the merged
commit is production behavior. Use repository-supported Vercel/deployment
tooling to promote and smoke-test production when the active runtime has
permission. If the runtime genuinely lacks required account permission, record
that single owner-only blocker.

Close the linked issue only after required post-merge verification is complete.
Update the acceptance matrix, QA ledger, contracts or docs when the change makes
them stale.

## Portable skills

Shared tool-neutral procedures live under `.agents/skills/`:
- `bm-prd-creator`
- `issue-scoping`
- `implementation`
- `code-review`
- `adversarial-verify`
- `qa-regression`
- `ship`

Harness-specific instructions may describe how to invoke them, but must not
override the repository policy with a different workflow.
