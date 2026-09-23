# Deployment

SR-020 (#21). This is the procedure, not a record that it has been carried out.
Nothing in this repository should be read as a claim that the app is deployed.

Every step that needs an account, a credential or a DNS record is the owner's.
Everything else is already done and is marked as such.

## What already exists

| Thing | State |
|---|---|
| Database schema, policies, functions | **Applied** to the Supabase project `Career` (`avpntrdnqlrjfmfdagfj`, ap-southeast-2) |
| Anonymous access | Revoked on every table and every function; verified by query, not by assumption |
| pgvector column and index | Created on the hosted project. The type, the `extensions.vector` cast, the HNSW index and the `<=>` operator were checked directly on 2026-09-23 and behave. **Still never exercised against a real row**, because there are none |
| Owner record in `private.app_owner` | **Created** 2026-09-23. One enabled owner, matching the single auth user. Verified by assuming that user's claims in a rolled-back transaction: `is_app_owner()` returns true and the owner can read the tables |
| Vercel project | **Created** 2026-09-23: `social-replies` in the `james-projects-1242b366` team (Pro), beside `gettheoffer` and separate from it. Git-connected, so a push to `main` deploys production. See "Deployed" below |
| `replies.jamesbugden.com` | **Not attached.** The app is live on its Vercel address in the meantime. The record goes in Namecheap, not Vercel; see DNS below |
| Provider credentials | **Not set.** The app runs without them and says so |

### Where the DNS actually is

Measured on 2026-09-23 rather than assumed:

```
jamesbugden.com.        NS   dns1.registrar-servers.com, dns2.registrar-servers.com
jamesbugden.com.        A    185.158.133.1
jamesbugden.com.        MX   1 smtp.google.com
replies.jamesbugden.com          does not exist
```

The nameservers are **Namecheap's**, not Vercel's and not Cloudflare's. So
attaching the subdomain is two separate acts in two separate places: add the
domain to the Vercel project, then add the record Vercel asks for in
**Namecheap's** DNS panel. A runbook step that says only "add the domain in
Vercel" will strand you.

Two records on that zone must not be touched. The root `A` record is the live
website, and the `MX` record points at Google Workspace, which is the owner's
mail. Adding a `replies` record does not affect either, but editing the zone by
hand next to them is where mail gets lost.

The project is `Career` rather than a new one because a new project in this
organisation costs 10 USD per month and `Career` was completely empty: zero public
tables, zero auth users. It is a *separate* project from `gettheoffer`, which is
what C01 requires. If a dedicated project is wanted later, these migrations apply
to any empty Postgres.

## Owner-only steps

### 1. Create the owner's auth user -- DONE 2026-09-23

Left here as the record of what was done, not as a step to repeat. One auth user
exists, sign-ups are off, and one enabled row in `private.app_owner` matches it.
The insert selected the id by email rather than quoting it, so the owner's auth
user id is in the database and nowhere else, which is what C01 asks for.

The original wording of this step:

In the Supabase dashboard for the project, under Authentication, create exactly one
user with the address that will sign in. Do not enable sign-ups.

Then, in the SQL editor, run the bootstrap. The owner's id is a private value and
belongs in neither this repository nor a public issue:

```sql
insert into private.app_owner (user_id) values ('<the new auth user id>');
```

A unique index allows only one enabled owner, so a second insert fails rather than
quietly creating a second account with access.

Verify from the app's own perspective rather than from the dashboard:

```sql
-- Should return true only when run as that user's session.
select public.is_app_owner();
```

### 2. Create the Vercel project

A new project, not a branch of an existing one. Import this repository and set:

| Name | Value |
|---|---|
| `APP_BASE_URL` | `https://replies.jamesbugden.com` |
| `APP_TIMEZONE` | `Asia/Taipei` |
| `NEXT_PUBLIC_SUPABASE_URL` | the project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key |
| `RESOURCE_BASE_URL` | **verify where the guides actually live.** It is not necessarily `jamesbugden.com` and it is definitely not the app's own domain |
| `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` | see step 4 |
| `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_API_KEY` | optional; lexical search works without them |

`SR_TEST_MODE` must **not** be set. It selects the in-memory test double, and a
production deployment with it set would serve synthetic replies from memory and
record nothing.

Preview deployments get their own Supabase project and their own keys. Production
credentials never reach a preview, and never reach a fork's CI.

### 3. Attach the subdomain

Add `replies.jamesbugden.com` to the Vercel project and create only the record
Vercel asks for. Do not touch the root domain's records and do not touch the MX
records: the root website and mail are unrelated deployments that happen to share
a domain.

In Supabase Authentication, add the exact redirect URL:

```
https://replies.jamesbugden.com/auth/callback
```

No wildcard. A wildcard redirect allowlist turns any subdomain takeover into an
account takeover.

### 4. Choose and verify the generation model

The default in `src/lib/config/env.ts` is a starting point, not a verified
selection. Before setting `AI_MODEL`:

1. read the provider's own current model list and pricing page, and record what it
   says and when it was read;
2. run the private evaluation set (`PRIVATE_EVAL_SET_PATH`) against the candidate;
3. record actual latency and cost from that run.

Prior conversational price tables are not engineering evidence and are not to be
reused.

## Before promoting

Do not promote until the required evidence in `docs/testing/campaign-ledger.md` is
green and the remaining gaps are declared. A skipped or blocked check is not a pass.

## Production smoke

Run against the **promoted build**, and confirm its commit first:

```bash
vercel inspect <deployment-url>   # record the exact SHA
```

Then, in order:

1. sign in as the owner; confirm `public.is_app_owner()` is true for that session;
2. from a signed-out browser, call `/api/progress` and `/api/reply/analyse`
   directly. Both must return 401, not data;
3. from a second authenticated account, call the PostgREST endpoints directly
   (`/rest/v1/reply_library?select=*`). It must return zero rows, not an error that
   reveals the table has rows;
4. paste a synthetic post; confirm past replies and resources render before the
   ideas do;
5. confirm three ideas arrive, and that the resource link points at the verified
   resource origin rather than the app's domain;
6. on Threads: edit the Chinese and confirm the English meaning goes stale;
7. copy over real HTTPS, then deny clipboard permission and confirm the failure
   path selects the text and does not claim success;
8. Mark posted once; confirm the count moves by exactly one, then press it again
   from a second tab and confirm the count does not move again;
9. search for the reply just saved and confirm it is findable immediately, before
   any embedding exists;
10. confirm the embedding worker actually ran. A script in the repository is not
    evidence that anything scheduled it;
11. check response headers on a private route for `Cache-Control: private, no-store`;
12. confirm the root website and mail still resolve exactly as before.

## Deployed

Recorded on 2026-09-23. Every line was checked against the running deployment,
not read off a dashboard.

| | |
|---|---|
| URL | `https://social-replies.vercel.app` |
| Commit | `17d1c10` on `main`, deployment `dpl_A7xzzVK8n4kUG89tKK628FFtH14k` |
| Production settings | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_TIMEZONE`. Nothing else |
| Preview settings | **None for any branch except `demo`.** C01 wants previews off production data, and on a public repository it also means no pull-request build ever receives them |
| Demo | `https://social-replies-git-demo-james-projects-1242b366.vercel.app`, built from the `demo` branch. Four settings scoped to that branch alone: `SR_TEST_MODE=e2e`, `AI_PROVIDER=fake`, `EMBEDDING_PROVIDER=fake`, `APP_TIMEZONE`. It runs the in-memory double with synthetic seed data and placeholder ideas, holds no credentials and touches no database. Behind Vercel's own login, so only team members can open it. Its data lives in server memory and can vanish whenever Vercel starts a fresh instance; it is for trying the flow, not for keeping anything |
| Deliberately unset | `SR_TEST_MODE` (selects the in-memory double and skips auth), `AI_PROVIDER` (`fake` is accepted in production and would show placeholder text as real ideas; unset, the ideas section says it is not set up), `EMBEDDING_PROVIDER`, `RESOURCE_BASE_URL` (the resolver refuses to guess) |

What a signed-out stranger gets, measured the same day:

```
GET  /                    200  sign-in screen only
POST /api/test/reset      404  test mode is off
GET  /api/progress        401
GET  /api/resources       401
GET  /api/facts           401
GET  /api/settings        401
POST /api/reply/analyse   401  same-origin, still refused
Cache-Control             private, no-store, max-age=0
```

Two traps from the first attempt, both now closed in the repository rather than
in a dashboard:

- `vercel project add` sets no framework preset, so the first build was treated
  as a static site and failed looking for `public/`. `vercel.json` declares
  `nextjs`.
- `vercel link` appended `.env*` to `.gitignore` *after* the `!.env.example`
  exception, silently re-ignoring the template. Removed.

Supabase Auth URL configuration, set by the owner in the dashboard: Site URL
`https://social-replies.vercel.app`; redirect URLs exactly
`https://social-replies.vercel.app/auth/callback` and
`http://localhost:3000/auth/callback`. No wildcard. **A 200 from the magic-link
endpoint does not prove a redirect is allowed**: Supabase answers 200 for a
rejected redirect too and falls back to the Site URL. Only a completed sign-in
proves it.

## Rollback

To roll back the app: in the Vercel project, promote the previous **Ready**
production deployment (`npx vercel rollback` or the dashboard's "Promote"). The
previous deployment keeps the environment it was built with, so this restores
code and configuration together. As of this record there is no earlier good
production deployment: the only other one failed on the framework preset above.

Rollback means promoting the previous verified deployment of **this** app and
restoring its configuration. It does not mean restoring a database, and it must
never touch anything belonging to another project.

The migrations here are additive. If one has to be undone, write the forward fix
rather than dropping a table that holds recorded replies: a withdrawn reply is
recoverable, a dropped one is not.

## After deployment

Update the private workflow index with a link to this app. Do not copy private
content into this repository to do it.

Then use it. After 50 to 100 real replies, look at actual friction, whether the
resources were ever worth sharing, how much editing each suggestion needed, and
whether the daily targets are the right ones. Those answers decide what is built
next, and none of them can be guessed now.
