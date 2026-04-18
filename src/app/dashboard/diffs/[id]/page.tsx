import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiSources, diffs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate, severityColor, severityLabel } from "@/lib/utils";

export default async function DiffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const rows = await db
    .select({
      diff: diffs,
      source: apiSources,
    })
    .from(diffs)
    .innerJoin(apiSources, eq(diffs.sourceId, apiSources.id))
    .where(eq(diffs.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm text-muted-fg hover:text-fg"
      >
        ← back to feed
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`rounded border px-2 py-0.5 text-xs font-semibold ${severityColor(row.diff.severity)}`}
            >
              {severityLabel(row.diff.severity)}
            </span>
            <span className="text-sm text-muted-fg">
              {row.source.name} · {formatDate(row.diff.createdAt)}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{row.diff.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-fg">{row.diff.summary}</p>
        </div>
        {row.source.docsUrl && (
          <a
            href={row.source.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline shrink-0 text-sm"
          >
            Vendor docs ↗
          </a>
        )}
      </div>

      {row.diff.affectedPaths && row.diff.affectedPaths.length > 0 && (
        <section className="mt-6">
          <h2 className="label mb-2">Affected paths</h2>
          <div className="flex flex-wrap gap-2">
            {row.diff.affectedPaths.map((p) => (
              <code
                key={p}
                className="rounded bg-muted px-2 py-0.5 text-xs font-mono"
              >
                {p}
              </code>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="label mb-2">
          Unified diff
          {row.diff.aiModel && (
            <span className="ml-2 text-[10px] text-muted-fg">
              classified by {row.diff.aiModel}
            </span>
          )}
        </h2>
        <pre className="card overflow-x-auto p-4 text-xs leading-relaxed">
          {(row.diff.raw ?? "").split("\n").map((line, i) => {
            let cls = "";
            if (line.startsWith("+") && !line.startsWith("+++"))
              cls = "diff-line-add";
            else if (line.startsWith("-") && !line.startsWith("---"))
              cls = "diff-line-del";
            else if (line.startsWith("@@")) cls = "diff-line-hunk";
            return (
              <span key={i} className={cls}>
                {line}
                {"\n"}
              </span>
            );
          })}
        </pre>
      </section>
    </div>
  );
}
