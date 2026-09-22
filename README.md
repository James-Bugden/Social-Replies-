# Social Replies

Social Replies is a single-user productivity app for drafting and remembering high-quality replies across LinkedIn, X, and Threads.

The application is designed for a side-by-side desktop workflow: keep the social feed open in one browser window and Social Replies in the other.

## Core workflow

1. Paste the post you want to reply to.
2. See relevant replies you have written before.
3. See useful resources you could share.
4. Get three meaningfully different reply ideas.
5. Edit the final reply.
6. Copy and post it manually.
7. Mark it posted.
8. The exact final reply becomes searchable memory.

Daily target: 10 LinkedIn + 10 X + 10 Threads replies.

Temporary app domain: `replies.jamesbugden.com`.

## Product authority

Read [SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md](SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md) before implementation.

The GitHub backlog is described in [SOCIAL-REPLIES-GITHUB-ISSUES.md](SOCIAL-REPLIES-GITHUB-ISSUES.md).

## Public repository safety

This repository is public.

Never commit:

- API keys, tokens, credentials, passwords, cookies, or service-role keys
- production environment files
- real historical reply exports or source-post archives
- private user data, account identifiers, or login email addresses
- production database dumps
- screenshots, logs, fixtures, or test artifacts containing real private content
- private Drive exports or copied private documents

Use synthetic fixtures in tests. Real reply history belongs in the authenticated database/private import pipeline, not Git.

See [SECURITY.md](SECURITY.md).

## Build workflow

Implementation is orchestrated through First Mate and follows the canonical Coding Workflow and Agent Rules. User-visible work requires Playwright plus browser/UX review in Orca. Mobile-sensitive behavior escalates to simulator or real-device testing when required.
