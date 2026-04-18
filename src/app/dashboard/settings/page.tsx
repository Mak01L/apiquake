import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";

async function saveSeverity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const value = String(formData.get("minSeverity") ?? "deprecation");
  if (!["breaking", "deprecation", "new_feature", "info"].includes(value)) return;
  await db
    .update(users)
    .set({ minSeverity: value as "breaking" | "deprecation" | "new_feature" | "info" })
    .where(eq(users.id, user.id));
  revalidatePath("/dashboard/settings");
}

async function addIntegration(formData: FormData) {
  "use server";
  const user = await requireUser();
  const channel = String(formData.get("channel")) as
    | "slack"
    | "discord"
    | "webhook"
    | "email";
  const target = String(formData.get("target") ?? "").trim();
  if (!target) return;
  await db.insert(integrations).values({ userId: user.id, channel, target });
  revalidatePath("/dashboard/settings");
}

async function deleteIntegration(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("id"));
  await db
    .delete(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.userId, user.id)));
  revalidatePath("/dashboard/settings");
}

export default async function SettingsPage() {
  const user = await requireUser();
  const userRow = (
    await db.select().from(users).where(eq(users.id, user.id))
  )[0];
  const ints = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, user.id));

  return (
    <div className="max-w-2xl space-y-10">
      <section>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Configure how apiquake notifies you.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Minimum severity</h2>
        <p className="mt-1 text-sm text-muted-fg">
          Only fire alerts at or above this level. (Your feed always shows
          everything.)
        </p>
        <form action={saveSeverity} className="mt-4 flex items-center gap-3">
          <select
            name="minSeverity"
            defaultValue={userRow.minSeverity}
            className="input"
          >
            <option value="breaking">Breaking only</option>
            <option value="deprecation">Deprecation and up</option>
            <option value="new_feature">New features and up</option>
            <option value="info">All changes</option>
          </select>
          <button className="btn btn-primary">Save</button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Notification integrations</h2>
        <p className="mt-1 text-sm text-muted-fg">
          Add Slack/Discord incoming webhooks, or an alternate email address.
          Default is your account email.
        </p>

        <ul className="mt-4 space-y-2">
          {ints.length === 0 && (
            <li className="text-sm text-muted-fg">No extra integrations yet.</li>
          )}
          {ints.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
            >
              <span>
                <strong className="uppercase">{i.channel}</strong>{" "}
                <code className="text-xs text-muted-fg">
                  {i.channel === "email"
                    ? i.target
                    : `${i.target.slice(0, 40)}${i.target.length > 40 ? "…" : ""}`}
                </code>
              </span>
              <form action={deleteIntegration}>
                <input type="hidden" name="id" value={i.id} />
                <button className="btn btn-ghost text-xs" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>

        <form
          action={addIntegration}
          className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr_auto]"
        >
          <select name="channel" className="input" defaultValue="slack">
            <option value="email">Email</option>
            <option value="slack">Slack webhook</option>
            <option value="discord">Discord webhook</option>
            <option value="webhook">Generic webhook</option>
          </select>
          <input
            name="target"
            required
            placeholder="https://hooks.slack.com/… or you@domain.dev"
            className="input"
          />
          <button className="btn btn-primary">Add</button>
        </form>
      </section>
    </div>
  );
}
