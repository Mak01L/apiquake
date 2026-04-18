import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { apiSources, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const PLAN_LIMIT: Record<string, number> = {
  free: 5,
  pro: 30,
  team: 100,
  business: 10_000,
};

async function toggleSubscription(formData: FormData) {
  "use server";
  const user = await requireUser();
  const sourceId = String(formData.get("sourceId"));
  const subscribed = formData.get("subscribed") === "1";
  if (subscribed) {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.sourceId, sourceId),
        ),
      );
  } else {
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id));
    const limit = PLAN_LIMIT[user.plan] ?? 5;
    if (existing.length >= limit) {
      // Silently no-op; landing banner could be added later.
      return;
    }
    await db
      .insert(subscriptions)
      .values({ userId: user.id, sourceId })
      .onConflictDoNothing();
  }
  revalidatePath("/dashboard/apis");
}

export default async function ApisPage() {
  const user = await requireUser();
  const sources = await db
    .select()
    .from(apiSources)
    .where(eq(apiSources.active, true))
    .orderBy(asc(apiSources.name));
  const subs = await db
    .select({ sourceId: subscriptions.sourceId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));
  const subSet = new Set(subs.map((s) => s.sourceId));
  const limit = PLAN_LIMIT[user.plan] ?? 5;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">APIs</h1>
          <p className="text-sm text-muted-fg">
            Subscribed: <strong>{subSet.size}</strong> / {limit} ·{" "}
            <span className="uppercase">{user.plan}</span> plan
          </p>
        </div>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {sources.map((s) => {
          const subscribed = subSet.has(s.id);
          return (
            <li key={s.id} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logoUrl} alt="" width={28} height={28} />
                ) : (
                  <div className="h-7 w-7 rounded bg-brand/30" />
                )}
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-fg">
                    {s.kind} · every {s.pollIntervalMinutes}m
                  </div>
                </div>
              </div>
              <form action={toggleSubscription}>
                <input type="hidden" name="sourceId" value={s.id} />
                <input
                  type="hidden"
                  name="subscribed"
                  value={subscribed ? "1" : "0"}
                />
                <button
                  type="submit"
                  className={`btn text-sm ${subscribed ? "btn-outline" : "btn-primary"}`}
                >
                  {subscribed ? "Subscribed" : "Subscribe"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
