import { desc, eq, and, lt } from "drizzle-orm";
import { db } from "../db";
import { apiSources, diffs, snapshots } from "../db/schema";
import { unifiedDiff } from "../lib/diff";
import { classifyDiff } from "../lib/llm";
import { getQueue, QUEUE_NOTIFY } from "../lib/queue";

export async function handleDiff(
  sourceId: string,
  nextSnapshotId: string,
): Promise<{ diffId: string | null }> {
  // Fetch next snapshot
  const nextRows = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.id, nextSnapshotId));
  const next = nextRows[0];
  if (!next) throw new Error(`snapshot ${nextSnapshotId} missing`);

  // Fetch previous snapshot (most recent before next)
  const prevRows = await db
    .select()
    .from(snapshots)
    .where(
      and(eq(snapshots.sourceId, sourceId), lt(snapshots.fetchedAt, next.fetchedAt)),
    )
    .orderBy(desc(snapshots.fetchedAt))
    .limit(1);
  const prev = prevRows[0];
  if (!prev) {
    console.log(`[diff] no previous snapshot for source ${sourceId}, skipping`);
    return { diffId: null };
  }

  const sourceRows = await db.select().from(apiSources).where(eq(apiSources.id, sourceId));
  const source = sourceRows[0];
  if (!source) throw new Error(`source ${sourceId} missing`);

  const { raw, affectedPaths, added, removed } = unifiedDiff(prev.content, next.content);
  if (added === 0 && removed === 0) {
    console.log(`[diff] ${source.slug}: empty diff, skipping`);
    return { diffId: null };
  }

  const classified = await classifyDiff({
    sourceName: source.name,
    diff: raw,
    affectedPaths,
  });

  const inserted = await db
    .insert(diffs)
    .values({
      sourceId: source.id,
      prevSnapshotId: prev.id,
      nextSnapshotId: next.id,
      severity: classified.severity,
      title: classified.title,
      summary: classified.summary,
      raw,
      affectedPaths,
      aiModel: classified.model,
    })
    .returning({ id: diffs.id });
  const diffId = inserted[0].id;

  console.log(
    `[diff] ${source.slug}: +${added}/-${removed} lines, severity=${classified.severity}, diff=${diffId}`,
  );

  // Fan-out notification to all subscribed users
  await getQueue(QUEUE_NOTIFY).add(
    "notify",
    { diffId },
    { attempts: 3, removeOnComplete: 100, removeOnFail: 50 },
  );

  return { diffId };
}
