# Social Replies

> **Retired standalone UI.** Social Replies now lives inside Content Studio at
> <https://content-studio-blond-rho.vercel.app/replies>. This repository remains
> intact as a rollback reference and its production deployment temporarily
> redirects every route to the combined workspace. No Supabase data was deleted.

A private, single-user assistant for writing and remembering useful LinkedIn, X and Threads replies. Keep the feed in one window and Social Replies in the other.

Paste a post/comment -> see past writing -> see shareable resources -> choose among three reply ideas -> edit -> copy and post manually -> mark posted -> remember the exact final reply.

Daily targets: 10 replies on each platform, Asia/Taipei. Temporary app domain: `replies.jamesbugden.com`. The guide/tool resource origin is configured independently.

## Current status

The app is built and **not deployed**. There is no live instance, no owner account
and no provider key, so nothing here has produced a real reply.

What exists: the schema, the owner boundary and its policies, applied to a Supabase
project and verified there as well as locally; the resource registry and fact bank;
hybrid bilingual retrieval with a durable embedding outbox; the bounded generation
service with grounding, disclosure and repetition guards; the workspace, the
library and the administration screens; and the exact-recording transaction with
its Taipei daily counters.

What is unverified, in full, is in [the campaign ledger](docs/testing/campaign-ledger.md).
The four gaps that run through everything: no pgvector locally so semantic ranking
has never executed, no live model so output quality is unmeasured, no authorised
export so every import adapter is synthetic-tested only, and no deployed build.

Deployment is [its own runbook](docs/ops/deployment.md) and needs the owner: an
auth account, a Vercel project, DNS, and a provider key.

## Start here

- [Complete product plan](SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md)
- [Inspected Mobbin research and recommendations](docs/design/mobbin-research.md)
- [UI interactions and copy](docs/design/interaction-spec.md)
- [A/B/C synthetic design comparison](docs/design/prototype.html)
- [Schema, API, retrieval and recording contracts](docs/implementation/contracts.md)
- [Acceptance and release matrix](docs/testing/acceptance-matrix.md)
- [Issue/dependency index](SOCIAL-REPLIES-GITHUB-ISSUES.md)
- [Build epic](https://github.com/James-Bugden/Social-Replies-/issues/1)
- [Quality campaign ledger](docs/testing/campaign-ledger.md)
- [Deployment runbook](docs/ops/deployment.md)
- [Developer runbook](docs/ops/runbook.md)

The implemented design is compact reference-first, direction B in the committed
comparison. GitHub displays HTML as source; open the local file in a browser to try
the synthetic comparison.

## Public repository safety

Source code is public. Application data is not. No real credentials, owner account identifiers, historical reply exports, private Drive contents/locators, production dumps, sensitive screenshots or logs in Git, issues, PRs or CI artifacts. Real imports and evaluation data stay in private storage; tests use synthetic fixtures. `.env.example` contains names and blank secret/private values only.

Read [SECURITY.md](SECURITY.md) and [AGENTS.md](AGENTS.md). The existence of those files does not mean production security settings or CI scanning have been enabled; #2 implements and verifies the foundation.
