import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alerts, apiSources, diffs, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { relativeTime, severityColor, severityLabel } from "@/lib/utils";

export default async function FeedPage() {
  const user = await requireUser();

  // Load diffs for sources the user is subscribed to (newest first).
  const rows = await db
    .select({
      diff: diffs,
      source: {
        id: apiSources.id,
        slug: apiSources.slug,
        name: apiSources.name,
        logoUrl: apiSources.logoUrl,
      },
    })
    .from(subscriptions)
    .innerJoin(apiSources, eq(subscriptions.sourceId, apiSources.id))
    .innerJoin(diffs, eq(diffs.sourceId, apiSources.id))
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(diffs.createdAt))
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your feed</h1>
          <p className="text-sm text-muted-fg">
            Detected changes across APIs you subscribe to. Newest first.
          </p>
        </div>
        <Link href="/dashboard/apis" className="btn btn-primary">
          Subscribe to APIs
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.diff.id} className="card p-4 hover:border-brand/40">
              <Link href={`/dashboard/diffs/${r.diff.id}`} className="block">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold ${severityColor(r.diff.severity)}`}
                      >
                        {severityLabel(r.diff.severity)}
                      </span>
                      <span className="text-sm font-medium">{r.source.name}</span>
                    </div>
                    <div className="font-semibold">{r.diff.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-fg">
                      {r.diff.summary}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-fg">
                    {relativeTime(r.diff.createdAt)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <h2 className="text-lg font-semibold">No alerts yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-fg">
        Subscribe to the APIs you use. apiquake will start watching them within
        a few minutes and notify you when something changes.
      </p>
      <Link href="/dashboard/apis" className="btn btn-primary mt-6">
        Browse APIs
      </Link>
    </div>
  );
}
