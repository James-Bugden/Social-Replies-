# Security and Data Handling

## Repository visibility

This repository is public. Treat every tracked file, commit, pull request, issue, action log, artifact, and screenshot as potentially visible to anyone.

## Never commit private or sensitive values

Do not commit:

- API keys, OAuth tokens, access tokens, refresh tokens, cookies, passwords, credentials, service-role keys, private certificates
- production `.env` files
- real historical reply/comment exports
- source-post archives containing private or personally identifying content
- production database dumps or Supabase exports
- private account identifiers or login email addresses
- copied private Drive documents
- screenshots, network traces, logs, fixtures, snapshots, or CI artifacts containing real user data

Use environment variables and provider secret stores for secrets. Use synthetic or anonymized fixtures for tests.

## Historical reply data

The product is intentionally designed to ingest a large historical reply corpus. That corpus belongs in the authenticated production database or a local/private import staging area, never in Git.

Import tools must read from local/private sources and write directly to authenticated storage. Import source files must be ignored by Git.

## Public GitHub issues and PRs

Do not paste real private reply text, account exports, tokens, production logs, or screenshots with sensitive content into GitHub issues or pull requests. Reproduce bugs with synthetic examples.

## Secret scanning

CI should include a secret-scanning check such as gitleaks or an equivalent tool. GitHub secret scanning should remain enabled where available.

## If a secret is exposed

1. Revoke/rotate the secret immediately.
2. Remove it from the current tree.
3. Purge it from Git history if needed.
4. Review logs and access for misuse.
5. Add a regression guard so the same class of leak cannot recur.

Deleting only the latest file is not sufficient after a secret has been committed.
