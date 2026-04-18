import { Resend } from "resend";
import { env } from "./env";

export interface AlertPayload {
  to: {
    email?: string;
    slackWebhook?: string;
    discordWebhook?: string;
    genericWebhook?: string;
  };
  apiName: string;
  severity: "breaking" | "deprecation" | "new_feature" | "info";
  title: string;
  summary: string;
  diffUrl: string;
  affectedPaths: string[];
}

export type DeliveredChannel = "email" | "slack" | "discord" | "webhook";

export async function deliver(payload: AlertPayload): Promise<DeliveredChannel[]> {
  const delivered: DeliveredChannel[] = [];
  const tasks: Array<Promise<DeliveredChannel | null>> = [];

  if (payload.to.email) tasks.push(sendEmail(payload).catch((e) => logErr("email", e)));
  if (payload.to.slackWebhook) tasks.push(sendSlack(payload).catch((e) => logErr("slack", e)));
  if (payload.to.discordWebhook)
    tasks.push(sendDiscord(payload).catch((e) => logErr("discord", e)));
  if (payload.to.genericWebhook)
    tasks.push(sendWebhook(payload).catch((e) => logErr("webhook", e)));

  const results = await Promise.all(tasks);
  for (const r of results) if (r) delivered.push(r);
  return delivered;
}

function logErr(ch: DeliveredChannel, e: unknown): null {
  console.error(`[notify:${ch}] failed:`, e);
  return null;
}

async function sendEmail(p: AlertPayload): Promise<DeliveredChannel | null> {
  if (!p.to.email) return null;
  const subject = `[${labelFor(p.severity)}] ${p.apiName}: ${p.title}`;
  const html = renderEmailHtml(p);
  if (!env.RESEND_API_KEY) {
    console.log("[notify:email] (stub, no RESEND_API_KEY) would send:", {
      to: p.to.email,
      subject,
    });
    return "email";
  }
  const client = new Resend(env.RESEND_API_KEY);
  const res = await client.emails.send({
    from: env.EMAIL_FROM,
    to: p.to.email,
    subject,
    html,
  });
  if (res.error) throw res.error;
  return "email";
}

async function sendSlack(p: AlertPayload): Promise<DeliveredChannel | null> {
  if (!p.to.slackWebhook) return null;
  const color =
    p.severity === "breaking"
      ? "#ef4444"
      : p.severity === "deprecation"
        ? "#f97316"
        : p.severity === "new_feature"
          ? "#22c55e"
          : "#3b82f6";
  const body = {
    attachments: [
      {
        color,
        title: `[${labelFor(p.severity)}] ${p.apiName}`,
        title_link: p.diffUrl,
        text: `*${p.title}*\n${p.summary}`,
        fields: p.affectedPaths.length
          ? [{ title: "Paths", value: p.affectedPaths.slice(0, 8).join("\n"), short: false }]
          : [],
        footer: "apiquake.dev",
      },
    ],
  };
  const res = await fetch(p.to.slackWebhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Slack webhook ${res.status}`);
  return "slack";
}

async function sendDiscord(p: AlertPayload): Promise<DeliveredChannel | null> {
  if (!p.to.discordWebhook) return null;
  const color =
    p.severity === "breaking"
      ? 0xef4444
      : p.severity === "deprecation"
        ? 0xf97316
        : p.severity === "new_feature"
          ? 0x22c55e
          : 0x3b82f6;
  const body = {
    embeds: [
      {
        title: `[${labelFor(p.severity)}] ${p.apiName}`,
        url: p.diffUrl,
        description: `**${p.title}**\n${p.summary}`,
        color,
        fields: p.affectedPaths.length
          ? [{ name: "Paths", value: p.affectedPaths.slice(0, 8).join("\n") }]
          : [],
        footer: { text: "apiquake.dev" },
      },
    ],
  };
  const res = await fetch(p.to.discordWebhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Discord webhook ${res.status}`);
  return "discord";
}

async function sendWebhook(p: AlertPayload): Promise<DeliveredChannel | null> {
  if (!p.to.genericWebhook) return null;
  const res = await fetch(p.to.genericWebhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      apiName: p.apiName,
      severity: p.severity,
      title: p.title,
      summary: p.summary,
      diffUrl: p.diffUrl,
      affectedPaths: p.affectedPaths,
    }),
  });
  if (!res.ok) throw new Error(`Generic webhook ${res.status}`);
  return "webhook";
}

function labelFor(s: AlertPayload["severity"]): string {
  switch (s) {
    case "breaking":
      return "BREAKING";
    case "deprecation":
      return "Deprecation";
    case "new_feature":
      return "New";
    default:
      return "Info";
  }
}

function renderEmailHtml(p: AlertPayload): string {
  const sevColor =
    p.severity === "breaking"
      ? "#ef4444"
      : p.severity === "deprecation"
        ? "#f97316"
        : p.severity === "new_feature"
          ? "#22c55e"
          : "#3b82f6";
  const paths = p.affectedPaths.length
    ? `<p style="color:#666;font-size:13px;margin-top:8px;"><strong>Paths:</strong><br>${p.affectedPaths
        .slice(0, 8)
        .map((x) => `<code style="font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(x)}</code>`)
        .join("<br>")}</p>`
    : "";
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#111;">
  <div style="border-left:4px solid ${sevColor};padding:0 16px;">
    <div style="font-size:12px;letter-spacing:0.08em;color:${sevColor};text-transform:uppercase;font-weight:700;">${labelFor(p.severity)} · ${escapeHtml(p.apiName)}</div>
    <h1 style="font-size:20px;margin:8px 0 12px 0;">${escapeHtml(p.title)}</h1>
    <p style="font-size:15px;line-height:1.55;color:#333;">${escapeHtml(p.summary)}</p>
    ${paths}
    <p style="margin-top:24px;">
      <a href="${p.diffUrl}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View diff on apiquake</a>
    </p>
  </div>
  <p style="margin-top:32px;color:#999;font-size:12px;">You are receiving this because you subscribed to ${escapeHtml(p.apiName)} on apiquake.dev. <a href="${p.diffUrl.replace(/\/diffs\/[^/]+$/, "/settings")}" style="color:#999;">Manage subscriptions</a>.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}
