# Runbook

Verified commands for this repository. Every version below was resolved from the registry on
2026-09-22 and is pinned in `package-lock.json`. Nothing here contains a credential, an owner
identifier or a private path.

## Toolchain

| Tool | Version | Why this version |
|---|---|---|
| Node | 24.15.0 (`.nvmrc`) | Runtime used for the recorded results below |
| Next.js | 16.3.5 | Current release; App Router |
| React | 19.3.0 | Required peer of Next 16 |
| TypeScript | 5.9.3 | Next 16's type plugin and `eslint-config-next` target the 5.x line |
| Tailwind CSS | 4.3.3 | CSS-first `@theme` tokens, no JS config file |
| Vitest | 5.0.1 | Unit and database integration tests |
| Playwright | 1.63.0 | Deterministic browser journeys |
| ESLint | 9.39.5 | **Not 10.x.** `eslint-config-next@16.3.5` bundles an `eslint-plugin-react` that throws `contextOrFilename.getFilename is not a function` on ESLint 10. Verified by running it. Revisit when Next ships a config that supports ESLint 10 |
| PGlite | 0.5.8 | In-process Postgres for migration and RLS tests without Docker |

## Daily commands

```bash
npm ci                 # install exactly what the lockfile pins
npm run dev            # local workspace
npm run verify         # typecheck, lint, private-path policy, secret scan, unit tests
npm test               # unit and database integration tests only
npm run test:e2e       # browser journeys against a production build in fake-provider mode
```

`npm run verify` is what CI runs. If it passes locally and fails in CI, the difference is the
environment, not the checks.

## Guard scripts

```bash
node scripts/scan-secrets.mjs               # tracked files
node scripts/scan-secrets.mjs <path>        # isolated path, no allowlist
node scripts/check-private-paths.mjs        # tracked-path policy, .gitignore, .env.example
```

`scan-secrets.mjs` prints the rule, file and line, never the matched value. Its allowlist covers
only files that legitimately describe the *shape* of a credential.

## Configuration

`.env.example` is the canonical name list (C10). Copy it to `.env.local` and fill it privately.
Names, never values, belong in Git.

With no provider configured the app runs in fake mode: generation returns clearly-labelled
synthetic ideas and embeddings are deterministic local vectors. Retrieval, editing, copying and
recording all work in this mode. Missing configuration surfaces as a setup state, never as a
fabricated successful generation.

## Known environment notes

- **No Docker on the build machine.** `supabase start` cannot run here. Migrations are verified
  against PGlite (`npm test`) and then applied to the hosted project. See D-02 in the build plan.
- **Windows line endings.** `.gitattributes` forces LF. Exact-text acceptance tests (SAVE-01)
  compare bytes, so a CRLF round-trip would be a real defect, not a cosmetic one.

## Deployment

Deployment is SR-020 (#21) and is not performed from this runbook. It needs owner authority for
the Vercel project, the `replies.jamesbugden.com` DNS record and the provider credentials.

## Database

The application database is the Supabase project `Career`
(`avpntrdnqlrjfmfdagfj`, ap-southeast-2). It was empty — zero tables, zero auth
users — so it was repurposed rather than paying for an additional project. It is
a *separate* project from the `gettheoffer` production project, which is what C01
requires. The project id is not a credential; the keys are not in this repository.

```bash
npm test                              # migrations + policies, locally via PGlite
npx supabase link --project-ref <ref> # then `npx supabase db push` for the hosted project
```

Two things the local harness cannot prove, and which must be re-checked on the
hosted project after any migration:

1. **Default privileges.** A hosted project grants `anon` and `authenticated`
   EXECUTE on every new function in `public`. Revoking from `PUBLIC` does not undo
   that. Every function this app defines revokes `anon` by name.
2. **pgvector.** The vector column and its HNSW index exist only on the hosted
   project. Run the security advisor after each migration:
   it caught the `anon` grant above on a schema whose local tests were green.
