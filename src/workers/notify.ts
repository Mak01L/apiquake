import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  alerts,
  apiSources,
  diffs,
  integrations,
  subscriptions,
  users,
} from "../db/schema";
import { deliver } from "../lib/notify";
import { env } from "../lib/env";

const SEVERITY_ORDER: Record<string, number> = {
  info: 0,
  new_feature: 1,
  deprecation: 2,
  breaking: 3,
};

export async function handleNotify(diffId: string): Promise<{ delivered: number }> {
  const diffRows = await db.select().from(diffs).where(eq(diffs.id, diffId));
  const diff = diffRows[0];
  if (!diff) throw new Error(`diff ${diffId} not found`);

  const sourceRows = await db
    .select()
    .from(apiSources)
    .where(eq(apiSources.id, diff.sourceId));
  const source = sourceRows[0];
  if (!source) throw new Error(`source ${diff.sourceId} not found`);

  // Find all users subscribed to this source
  const subs = await db
    .select({
      userId: subscriptions.userId,
      minSeverity: users.minSeverity,
      email: users.email,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .where(eq(subscriptions.sourceId, diff.sourceId));

  if (subs.length === 0) {
    console.log(`[notify] no subscribers for ${source.slug}`);
    return { delivered: 0 };
  }

  // Gather integrations for all those users in one go
  const userIds = subs.map((s) => s.userId);
  const userIntegrations = await db
    .select()
    .from(integrations)
    .where(and(inArray(integrations.userId, userIds), eq(integrations.active, true)));

  let deliveredTotal = 0;
  const diffUrl = `${env.APP_URL}/dashboard/diffs/${diff.id}`;
  for (const sub of subs) {
    if (
      SEVERITY_ORDER[diff.severity] < (SEVERITY_ORDER[sub.minSeverity] ?? 0)
    ) {
      continue; // user opted out of this severity
    }
    const ints = userIntegrations.filter((i) => i.userId === sub.userId);
    const to: Parameters<typeof deliver>[0]["to"] = {};
    // default to the user's own email if no custom email integration
    to.email = sub.email;
    for (const i of ints) {
      if (i.channel === "email") to.email = i.target;
      if (i.channel === "slack") to.slackWebhook = i.target;
      if (i.channel === "discord") to.discordWebhook = i.target;
      if (i.channel === "webhook") to.genericWebhook = i.target;
    }
    const delivered = await deliver({
      to,
      apiName: source.name,
      severity: diff.severity,
      title: diff.title,
      summary: diff.summary ?? "",
      diffUrl,
      affectedPaths: diff.affectedPaths ?? [],
    });
    // Upsert an alert row
    try {
      await db
        .insert(alerts)
        .values({
          userId: sub.userId,
          diffId: diff.id,
          deliveredChannels: delivered,
        })
        .onConflictDoNothing();
    } catch (e) {
      console.error("[notify] alert insert failed", e);
    }
    deliveredTotal += delivered.length;
  }
  console.log(
    `[notify] ${source.slug} diff=${diff.id}: delivered ${deliveredTotal} messages across ${subs.length} subscribers`,
  );
  return { delivered: deliveredTotal };
}
