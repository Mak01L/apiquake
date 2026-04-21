/**
 * Worker entrypoint. Run with `pnpm worker` (or `pnpm worker:dev` for watch mode).
 *
 * Architecture
 * ------------
 * Three BullMQ queues:
 *   - "fetch"   : download a source, hash it, create a snapshot if changed
 *   - "diff"    : compute unified diff + classify with LLM
 *   - "notify"  : fan-out one alert per (user,diff) pair via email/slack/discord
 *
 * A scheduler enqueues a `fetch_all` job on CRON_REFRESH_PATTERN. That job
 * enqueues one `fetch` job per active API source that is due.
 */
import { Worker } from "bullmq";
import {
  getQueue,
  getRedis,
  QUEUE_DIFF,
  QUEUE_FETCH,
  QUEUE_NOTIFY,
} from "../lib/queue";
import { env } from "../lib/env";
import { handleFetch, handleFetchAll } from "./fetch";
import { handleDiff } from "./diff";
import { handleNotify } from "./notify";

async function main() {
  const connection = getRedis();
  const concurrency = env.WORKER_CONCURRENCY;
  const fetchQueue = getQueue(QUEUE_FETCH);

  console.log("[worker] starting with concurrency", concurrency);

  const fetchWorker = new Worker(
    QUEUE_FETCH,
    async (job) => {
      if (job.name === "fetch_all") return handleFetchAll();
      if (job.name === "fetch_one") return handleFetch(job.data.sourceId);
      throw new Error(`Unknown job ${job.name} on ${QUEUE_FETCH}`);
    },
    { connection, concurrency },
  );

  const diffWorker = new Worker(
    QUEUE_DIFF,
    async (job) => handleDiff(job.data.sourceId, job.data.nextSnapshotId),
    { connection, concurrency },
  );

  const notifyWorker = new Worker(
    QUEUE_NOTIFY,
    async (job) => handleNotify(job.data.diffId),
    { connection, concurrency },
  );

  for (const [name, w] of [
    ["fetch", fetchWorker],
    ["diff", diffWorker],
    ["notify", notifyWorker],
  ] as const) {
    w.on("completed", (job) =>
      console.log(`[worker:${name}] job ${job.id} (${job.name}) completed`),
    );
    w.on("failed", (job, err) =>
      console.error(`[worker:${name}] job ${job?.id} failed:`, err),
    );
  }

  // Schedule the global refresh on the configured cron pattern.
  // BullMQ dedupes by jobId, so calling this on startup is safe.
  //
  // NOTE: early builds used `jobId: "cron:fetch_all"`, which BullMQ later
  // started rejecting ("Custom Id cannot contain :"). On any deploy that ran
  // before that, Redis may still have a repeatable keyed on the old id, which
  // would cause the fetch_all cron to fire twice. Remove the legacy entry
  // unconditionally on boot — it's a no-op if it doesn't exist.
  await fetchQueue
    .removeRepeatable(
      "fetch_all",
      { pattern: env.CRON_REFRESH_PATTERN },
      "cron:fetch_all",
    )
    .catch((err) => {
      console.warn("[worker] could not remove legacy repeatable:", err);
    });

  await fetchQueue.add(
    "fetch_all",
    {},
    {
      jobId: "cron-fetch_all",
      repeat: { pattern: env.CRON_REFRESH_PATTERN },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );

  // Also run once immediately on boot so seed->fetch happens without waiting.
  await fetchQueue.add("fetch_all", { bootstrap: true });

  console.log(
    "[worker] fetch scheduler scheduled with pattern",
    env.CRON_REFRESH_PATTERN,
  );

  const shutdown = async (sig: string) => {
    console.log(`[worker] received ${sig}, shutting down`);
    await Promise.all([fetchWorker.close(), diffWorker.close(), notifyWorker.close()]);
    await connection.quit();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
