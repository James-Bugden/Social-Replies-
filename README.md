# Social Replies

A private, single-user assistant for writing and remembering useful LinkedIn, X and Threads replies. Keep the feed in one window and Social Replies in the other.

Paste a post/comment -> see past writing -> see shareable resources -> choose among three reply ideas -> edit -> copy and post manually -> mark posted -> remember the exact final reply.

Daily targets: 10 replies on each platform, Asia/Taipei. Temporary app domain: `replies.jamesbugden.com`. The guide/tool resource origin is configured independently.

## Current status

The product/implementation plan, inspected Mobbin research, UI copy/state specification, technical contracts, acceptance matrix and scoped GitHub backlog are supplied. The included HTML is a synthetic design comparison, not a connected or deployed application. Implementation and production verification remain open work for First Mate.

## Start here

- [Complete product plan](SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md)
- [Inspected Mobbin research and recommendations](docs/design/mobbin-research.md)
- [UI interactions and copy](docs/design/interaction-spec.md)
- [A/B/C synthetic design comparison](docs/design/prototype.html)
- [Schema, API, retrieval and recording contracts](docs/implementation/contracts.md)
- [Acceptance and release matrix](docs/testing/acceptance-matrix.md)
- [Issue/dependency index](SOCIAL-REPLIES-GITHUB-ISSUES.md)
- [Build epic](https://github.com/James-Bugden/Social-Replies-/issues/1)

Research is completed in #3. #4 owns actual component/Orca validation. Use the documented compact reference-first default rather than restarting broad design discovery. GitHub displays HTML as source; open the local file in a browser to try the synthetic comparison.

## Public repository safety

Source code is public. Application data is not. No real credentials, owner account identifiers, historical reply exports, private Drive contents/locators, production dumps, sensitive screenshots or logs in Git, issues, PRs or CI artifacts. Real imports and evaluation data stay in private storage; tests use synthetic fixtures. `.env.example` contains names and blank secret/private values only.

Read [SECURITY.md](SECURITY.md) and [AGENTS.md](AGENTS.md). The existence of those files does not mean production security settings or CI scanning have been enabled; #2 implements and verifies the foundation.
