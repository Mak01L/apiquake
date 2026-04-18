import type { FetchResult } from "../types";

/**
 * Fetch the latest 30 releases for a GitHub repo.
 * fetchUrl format: https://api.github.com/repos/<owner>/<repo>/releases
 */
export async function fetchGithubReleases(url: string): Promise<FetchResult> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "apiquake/0.1 (+https://apiquake.dev)",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub fetch ${res.status}: ${url}`);
  const arr = (await res.json()) as Array<{
    name: string;
    tag_name: string;
    published_at: string;
    body: string;
    html_url: string;
  }>;
  const normalized = arr
    .slice(0, 30)
    .map(
      (r) =>
        `## ${r.tag_name} — ${r.name ?? ""}\nPublished: ${r.published_at}\n${r.html_url}\n\n${r.body ?? ""}`,
    )
    .join("\n\n---\n\n");
  return { content: normalized, contentType: "text/markdown" };
}
