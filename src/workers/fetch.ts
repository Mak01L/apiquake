import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "../db";
import { apiSources, snapshots } from "../db/schema";
import { fetchSource } from "../scrapers";
import { sha256Hex } from "../lib/utils";
import { getQueue, QUEUE_DIFF, QUEUE_FETCH } from "../lib/queue";

export async function handleFetchAll(): Promise<{ queued: number }> {
  const now = new Date();
  const sources = await db.select().from(apiSources).where(eq(apiSources.active, true));
  const due = sources.filter((s) => {
    if (!s.lastFetchedAt) return true;
    const nextAt =
      s.lastFetchedAt.getTime() + s.pollIntervalMinutes * 60 * 1000;
    return nextAt <= now.getTime();
  });
  const q = getQueue(QUEUE_FETCH);
  for (const s of due) {
    await q.add(
      "fetch_one",
      { sourceId: s.id },
      {
        jobId: `fetch-${s.id}-${now.getTime()}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }
  console.log(
    `[fetch_all] ${sources.length} active sources, ${due.length} due, queued`,
  );
  return { queued: due.length };
}

export async function handleFetch(sourceId: string): Promise<{
  changed: boolean;
  snapshotId?: string;
}> {
  const rows = await db.select().from(apiSources).where(eq(apiSources.id, sourceId));
  const source = rows[0];
  if (!source) throw new Error(`source ${sourceId} not found`);

  console.log(`[fetch_one] ${source.slug} (${source.kind}) -> ${source.fetchUrl}`);
  const result = await fetchSource({
    kind: source.kind,
    fetchUrl: source.fetchUrl,
    config: source.config,
  });

  const hash = sha256Hex(result.content);
  await db
    .update(apiSources)
    .set({ lastFetchedAt: new Date() })
    .where(eq(apiSources.id, sourceId));

  if (source.lastHash === hash) {
    console.log(`[fetch_one] ${source.slug}: no change`);
    return { changed: false };
  }

  const inserted = await db
    .insert(snapshots)
    .values({
      sourceId: source.id,
      contentHash: hash,
      content: result.content,
      contentType: result.contentType,
    })
    .returning({ id: snapshots.id });

  const snapshotId = inserted[0].id;
  await db
    .update(apiSources)
    .set({ lastHash: hash })
    .where(eq(apiSources.id, sourceId));

  // Only enqueue a diff job if we had a previous hash — first run is baseline.
  if (source.lastHash) {
    await getQueue(QUEUE_DIFF).add(
      "diff_one",
      { sourceId: source.id, nextSnapshotId: snapshotId },
      {
        jobId: `diff-${snapshotId}`,
        attempts: 2,
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    console.log(`[fetch_one] ${source.slug}: CHANGED, queued diff job`);
  } else {
    console.log(`[fetch_one] ${source.slug}: baseline snapshot stored`);
  }
  return { changed: true, snapshotId };
}

// Also export a way for the app (server action) to enqueue a fetch manually.
export async function enqueueFetchOne(sourceId: string) {
  await getQueue(QUEUE_FETCH).add(
    "fetch_one",
    { sourceId },
    { attempts: 2, removeOnComplete: 50 },
  );
}
