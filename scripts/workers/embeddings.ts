#!/usr/bin/env node
/**
 * The embedding worker (SR-009 #10, C05).
 *
 * Saving a reply commits a search row and a job in one transaction, so the reply
 * is lexically findable immediately. This process turns those jobs into vectors
 * afterwards. Nothing in the owner's path waits for it, and nothing it does can
 * undo a save that already succeeded.
 *
 * It runs as an administrative process with its own connection, because there is
 * no owner session behind a background job. That is the one case C01 allows, and
 * it is why every query it issues carries an explicit owner predicate rather than
 * relying on row-level security.
 *
 *   SUPABASE_DB_URL=... npm run worker:embeddings -- --once
 *
 * The exit code is 0 when the pass completed, whatever the jobs did: a dead job is
 * a recorded outcome, not a crash. It prints counts and error codes only, never
 * reply text.
 */
import { connectAsAdmin } from '../lib/db';
import { runOwnerScopedPass } from '@/lib/embeddings/worker';
import { createEmbedder } from '@/lib/embeddings/provider';
import { serverConfig } from '@/lib/config/env';

const once = process.argv.includes('--once');
const intervalMs = Number(process.env.EMBEDDING_WORKER_INTERVAL_MS ?? 60_000);

const config = serverConfig();
if (config.embedding.mode === 'unconfigured') {
  // Not an error. The app is designed to work with no embedding provider at all,
  // and pretending otherwise would turn a supported state into a failed job.
  console.log('embedding worker: no provider configured, nothing to do');
  process.exit(0);
}

const connection = await connectAsAdmin();
const embedder = createEmbedder(config);

/**
 * Returns false when the pass was refused, so the caller stops instead of
 * looping. A worker that cannot establish whose rows it is holding must not run
 * at all: with an administrative connection there is no row level security to
 * catch the mistake, and the first thing it would do is send another account's
 * private writing to an embedding provider (C01).
 */
async function pass(): Promise<boolean> {
  const outcome = await runOwnerScopedPass(connection, embedder);

  if (outcome.status === 'refused') {
    console.error(`embedding worker: refusing to run, reason=${outcome.reason}`);
    return false;
  }

  const { report } = outcome;
  // The owner's id is never printed. It is the one identifier this repository
  // is not allowed to carry, and a worker log is a terminal recording away from
  // being public (C01, C10).
  console.log(
    `embedding worker: claimed=${report.claimed} applied=${report.applied} ` +
      `superseded=${report.superseded} retried=${report.retried} dead=${report.dead} ` +
      `storage_unavailable=${report.storageUnavailable}`,
  );
  return true;
}

try {
  if (once) {
    if (!(await pass())) process.exitCode = 1;
  } else {
    // A plain loop rather than a scheduler. Whatever actually triggers this in
    // production must be verified there: a script existing is not evidence that
    // anything runs it (#21).
    for (;;) {
      if (!(await pass())) {
        process.exitCode = 1;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
} finally {
  await connection.close();
}
