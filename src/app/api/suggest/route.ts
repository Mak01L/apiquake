import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// Lightweight suggestion capture. Logs and (if configured) posts to Slack.
// We intentionally keep this serverless-friendly — no DB write required.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const api = String(form?.get("api") ?? "").trim();
  const email = String(form?.get("email") ?? "").trim().toLowerCase();
  if (!api || !email) {
    return NextResponse.redirect(new URL("/?suggest=bad", req.url), { status: 303 });
  }
  const line = `[suggest] ${new Date().toISOString()}  api="${api}"  email="${email}"`;
  console.log(line);
  const hook = process.env.INTERNAL_SLACK_WEBHOOK;
  if (hook) {
    fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `New API request: *${api}* by ${email}` }),
    }).catch(() => {});
  }
  return NextResponse.redirect(
    new URL("/?suggest=ok", env.APP_URL),
    { status: 303 },
  );
}
