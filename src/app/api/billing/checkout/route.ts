import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getStripe, PRICE_BY_PLAN } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const url = new URL(req.url);
  const plan = url.searchParams.get("plan") ?? "pro";
  const priceId = PRICE_BY_PLAN[plan];
  const stripe = getStripe();

  if (!stripe || !priceId) {
    // Dev fallback: just upgrade the account directly.
    await db
      .update(users)
      .set({ plan: plan as "pro" | "team" | "business" })
      .where(eq(users.id, user.id));
    return NextResponse.redirect(new URL("/dashboard/billing?dev=1", env.APP_URL), {
      status: 303,
    });
  }

  const userRow = (await db.select().from(users).where(eq(users.id, user.id)))[0];
  let customerId = userRow.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userRow.email,
      name: userRow.name ?? undefined,
      metadata: { userId: userRow.id },
    });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.APP_URL}/dashboard/billing?success=1`,
    cancel_url: `${env.APP_URL}/dashboard/billing?canceled=1`,
    metadata: { userId: userRow.id, plan },
    subscription_data: { metadata: { userId: userRow.id, plan } },
    allow_promotion_codes: true,
  });

  return NextResponse.redirect(session.url ?? `${env.APP_URL}/dashboard/billing`, {
    status: 303,
  });
}
