import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export async function POST(_req: NextRequest) {
  const user = await requireUser();
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.redirect(
      new URL("/dashboard/billing?err=stripe_disabled", env.APP_URL),
      { status: 303 },
    );
  }
  const userRow = (await db.select().from(users).where(eq(users.id, user.id)))[0];
  if (!userRow.stripeCustomerId) {
    return NextResponse.redirect(
      new URL("/dashboard/billing?err=no_customer", env.APP_URL),
      { status: 303 },
    );
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: userRow.stripeCustomerId,
    return_url: `${env.APP_URL}/dashboard/billing`,
  });
  return NextResponse.redirect(session.url, { status: 303 });
}
