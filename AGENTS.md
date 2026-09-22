# Social Replies — Agent Instructions

## Authority

Before code changes, read:

1. `SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md`
2. this file
3. the canonical Drive Coding Workflow
4. the canonical Drive Agent Rules
5. relevant canonical design/copy sources named by the implementation spec

Repository-specific rules here override generic guidance only when stricter.

## Product boundary

Social Replies is a single-user authenticated productivity app. The GitHub repository is public, but the application and its historical reply data are private.

Do not add multi-user SaaS, billing, automatic social posting, feed scraping/discovery, or browser-extension scope unless an issue explicitly authorizes it.

## Public-repository hard rule

Never commit secrets or real private user data.

This includes:
- real API keys/tokens
- Supabase service-role values
- login email/account identifiers
- historical reply exports
- private source-post text
- production database dumps
- screenshots/logs/fixtures containing real private content
- private Drive file contents copied into the repo

Use synthetic fixtures and placeholder values only.

If a task needs private data to validate behavior, keep it outside Git and record only sanitized evidence.

## Design gate

For user-visible work:
- inspect the canonical Drive design/copy references listed in the implementation spec;
- use Mobbin MCP for shipped-product research where the issue requests it;
- visually inspect retrieved Mobbin screens/flows before drawing conclusions;
- design the 500–750 px side-by-side workflow first;
- do not invent a separate visual system.

## Coding workflow

- First Mate is the preferred orchestrator.
- Work in isolated branches/worktrees.
- Preserve unrelated work.
- T0 verification for relevant code changes.
- T1 Playwright for browser behavior.
- T2 Orca browser/UX review for user-visible changes.
- Escalate to T3/T4 only when the changed surface requires it.
- A blocked, skipped, or inconclusive check is not a pass.

## Data behavior

The exact final text marked as posted is canonical memory.

Generated drafts are not canonical.

Historical records require provenance so an AI draft can never be presented as something the user actually posted.

Resource URLs come only from the Resource Registry. Personal examples come only from the approved Fact Bank.

## Completion

Report:
- what changed
- tests/checks run
- deployed environment when relevant
- unresolved risk
- issue/PR links

Do not claim production behavior from local evidence alone.
