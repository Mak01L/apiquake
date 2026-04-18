import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    sub: "forever",
    limit: 5,
    features: ["5 APIs", "Email alerts", "7-day history"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$19",
    sub: "/month",
    limit: 30,
    priceId: env.STRIPE_PRICE_PRO,
    features: ["30 APIs", "Slack + Discord + webhooks", "90-day history", "AI diffs"],
  },
  {
    key: "team",
    name: "Team",
    price: "$49",
    sub: "/month",
    limit: 100,
    priceId: env.STRIPE_PRICE_TEAM,
    features: ["100 APIs", "5 users", "Jira / Linear"],
  },
  {
    key: "business",
    name: "Business",
    price: "$149",
    sub: "/month",
    limit: 10_000,
    priceId: env.STRIPE_PRICE_BUSINESS,
    features: ["Unlimited APIs", "SSO / SAML", "Priority support"],
  },
];

export default async function BillingPage() {
  const user = await requireUser();
  const row = (await db.select().from(users).where(eq(users.id, user.id)))[0];
  const stripeEnabled = Boolean(env.STRIPE_SECRET_KEY);

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-1 text-sm text-muted-fg">
        Current plan: <strong className="uppercase">{row.plan}</strong>
      </p>

      {!stripeEnabled && (
        <div className="mt-4 card border-warn/40 p-4 text-sm">
          Stripe isn’t configured in this environment. Set{" "}
          <code>STRIPE_SECRET_KEY</code> and the price IDs in <code>.env</code>{" "}
          to enable real checkout. For now, upgrades are stubbed.
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = row.plan === p.key;
          return (
            <div
              key={p.key}
              className={`card p-5 ${isCurrent ? "border-brand/60" : ""}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-fg">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-end gap-1">
                <div className="text-3xl font-bold">{p.price}</div>
                <div className="pb-1 text-xs text-muted-fg">{p.sub}</div>
              </div>
              <ul className="mt-4 space-y-1 text-xs text-muted-fg">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              {!isCurrent && p.key !== "free" && (
                <form
                  action={`/api/billing/checkout?plan=${p.key}`}
                  method="POST"
                >
                  <button className="btn btn-primary mt-5 w-full" type="submit">
                    Upgrade
                  </button>
                </form>
              )}
              {isCurrent && p.key !== "free" && (
                <form action="/api/billing/portal" method="POST">
                  <button className="btn btn-outline mt-5 w-full" type="submit">
                    Manage
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-muted-fg">
        Questions about invoicing, team seats, or annual billing?{" "}
        <Link href="mailto:hello@apiquake.dev" className="text-brand underline">
          hello@apiquake.dev
        </Link>
        .
      </p>
    </div>
  );
}
