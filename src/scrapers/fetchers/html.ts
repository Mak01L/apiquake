import type { FetchResult } from "../types";

/**
 * Fetch an HTML page and return a stripped text version so diffs don't
 * drown in layout churn (inline scripts, tracking ids, CSP nonces, etc.).
 *
 * We keep things dependency-free: no jsdom/cheerio. The simple approach is
 * good enough for changelog pages whose signal is the text content.
 */
export async function fetchHtml(
  url: string,
  _config: Record<string, unknown>,
): Promise<FetchResult> {
  const res = await fetch(url, {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (compatible; apiquake/0.1; +https://apiquake.dev)",
    },
  });
  if (!res.ok) throw new Error(`HTML fetch ${res.status}: ${url}`);
  const html = await res.text();
  return { content: stripHtml(html), contentType: "text/plain" };
}

function stripHtml(html: string): string {
  // Drop <script>, <style>, <noscript>, <svg>, <iframe> whole blocks.
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  // Preserve structure with line breaks on block tags.
  s = s.replace(
    /<\/?(h[1-6]|p|li|tr|div|section|article|header|footer|main|nav|br|hr)\b[^>]*>/gi,
    "\n",
  );
  // Drop remaining tags.
  s = s.replace(/<[^>]+>/g, " ");
  // Decode a few HTML entities we actually see.
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Collapse whitespace.
  s = s
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return s;
}
