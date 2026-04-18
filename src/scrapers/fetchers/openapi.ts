import type { FetchResult } from "../types";

export async function fetchOpenApi(url: string): Promise<FetchResult> {
  const res = await fetch(url, {
    headers: {
      accept: "application/json, application/yaml, text/plain",
      "user-agent": "apiquake/0.1 (+https://apiquake.dev)",
    },
  });
  if (!res.ok) throw new Error(`OpenAPI fetch ${res.status}: ${url}`);
  const text = await res.text();
  // If it's JSON, pretty-print so that diffs are line-based and useful.
  if (text.trim().startsWith("{")) {
    try {
      const obj = JSON.parse(text);
      return { content: JSON.stringify(obj, Object.keys(obj).sort(), 2), contentType: "application/json" };
    } catch {
      return { content: text, contentType: "application/json" };
    }
  }
  return { content: text, contentType: "application/yaml" };
}
