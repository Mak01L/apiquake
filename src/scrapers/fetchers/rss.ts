import type { FetchResult } from "../types";

export async function fetchRss(url: string): Promise<FetchResult> {
  const res = await fetch(url, {
    headers: {
      accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
      "user-agent": "apiquake/0.1 (+https://apiquake.dev)",
    },
  });
  if (!res.ok) throw new Error(`RSS fetch ${res.status}: ${url}`);
  const xml = await res.text();
  // Normalize: extract <item>/<entry> blocks and concatenate so cosmetic XML
  // changes (e.g. <lastBuildDate>) don't trigger false-positive diffs.
  const normalized = normalizeFeed(xml);
  return { content: normalized, contentType: "application/xml" };
}

function normalizeFeed(xml: string): string {
  const itemRegex = /<(item|entry)\b[\s\S]*?<\/\1>/g;
  const matches = xml.match(itemRegex) ?? [];
  if (matches.length === 0) return xml.trim();
  return matches
    .map((m) => m.replace(/\s+/g, " ").trim())
    .join("\n\n");
}
