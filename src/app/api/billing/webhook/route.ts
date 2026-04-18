import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("stripe disabled", { status: 200 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("missing signature", { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe] webhook signature failed", err);
    return new NextResponse("bad signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as "pro" | "team" | "business" | undefined;
      if (userId && plan) {
        await db
          .update(users)
          .set({
            plan,
            stripeSubscriptionId: session.subscription as string,
          })
          .where(eq(users.id, userId));
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        const newPlan = sub.status === "active" || sub.status === "trialing"
          ? ((sub.metadata?.plan as "pro" | "team" | "business" | undefined) ?? "free")
          : "free";
        await db
          .update(users)
          .set({ plan: newPlan, stripeSubscriptionId: sub.status === "active" ? sub.id : null })
          .where(eq(users.id, userId));
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

// Stripe requires the raw body, which Next.js gives us via req.text() above.
// Disable Node's automatic parsing just in case.
export const runtime = "nodejs";
