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
| pgvector column and index | Created on the hosted project. **Never exercised** by any test |
| Owner record in `private.app_owner` | **Not created.** Needs an auth user first |
| Vercel project | **Not created** |
| `replies.jamesbugden.com` | **Not attached** |
| Provider credentials | **Not set.** The app runs without them and says so |

The project is `Career` rather than a new one because a new project in this
organisation costs 10 USD per month and `Career` was completely empty: zero public
tables, zero auth users. It is a *separate* project from `gettheoffer`, which is
what C01 requires. If a dedicated project is wanted later, these migrations apply
to any empty Postgres.

## Owner-only steps

### 1. Create the owner's auth user

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

## Rollback

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
