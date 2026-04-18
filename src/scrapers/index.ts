import type { SourceDefinition, FetchResult } from "./types";
import { fetchOpenApi } from "./fetchers/openapi";
import { fetchRss } from "./fetchers/rss";
import { fetchGithubReleases } from "./fetchers/github_releases";
import { fetchHtml } from "./fetchers/html";

// -----------------------------------------------------------------------------
// Source catalog — ship 5 for MVP launch, easy to extend.
// -----------------------------------------------------------------------------

export const allSources: SourceDefinition[] = [
  {
    slug: "stripe",
    name: "Stripe",
    vendor: "Stripe, Inc.",
    logoUrl: "https://cdn.simpleicons.org/stripe/635bff",
    homepageUrl: "https://stripe.com",
    docsUrl: "https://docs.stripe.com/changelog",
    kind: "html",
    fetchUrl: "https://docs.stripe.com/changelog",
    // Stripe's changelog page has dated entries — we hash the whole main column
    config: { selector: "main" },
    pollIntervalMinutes: 60,
  },
  {
    slug: "openai",
    name: "OpenAI API",
    vendor: "OpenAI",
    logoUrl: "https://cdn.simpleicons.org/openai/ffffff",
    homepageUrl: "https://openai.com",
    docsUrl: "https://github.com/openai/openai-openapi/releases",
    // OpenAI's web changelog is Cloudflare-protected. Their OpenAPI spec repo
    // ships tagged releases when the surface changes — that's a cleaner signal.
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/openai/openai-openapi/releases?per_page=30",
    pollIntervalMinutes: 120,
  },
  {
    slug: "github",
    name: "GitHub API",
    vendor: "GitHub, Inc.",
    logoUrl: "https://cdn.simpleicons.org/github/ffffff",
    homepageUrl: "https://github.com",
    docsUrl: "https://docs.github.com/en/rest",
    kind: "openapi",
    fetchUrl:
      "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json",
    pollIntervalMinutes: 120,
  },
  {
    slug: "twilio",
    name: "Twilio",
    vendor: "Twilio, Inc.",
    logoUrl: "https://cdn.simpleicons.org/twilio/f22f46",
    homepageUrl: "https://twilio.com",
    docsUrl: "https://www.twilio.com/en-us/changelog",
    kind: "rss",
    fetchUrl: "https://www.twilio.com/en-us/changelog/feed",
    pollIntervalMinutes: 120,
  },
  {
    slug: "vercel",
    name: "Vercel",
    vendor: "Vercel Inc.",
    logoUrl: "https://cdn.simpleicons.org/vercel/ffffff",
    homepageUrl: "https://vercel.com",
    docsUrl: "https://vercel.com/changelog",
    kind: "rss",
    fetchUrl: "https://vercel.com/atom",
    pollIntervalMinutes: 60,
  },
];

export async function fetchSource(def: {
  kind: string;
  fetchUrl: string;
  config?: Record<string, unknown> | null;
}): Promise<FetchResult> {
  switch (def.kind) {
    case "openapi":
      return fetchOpenApi(def.fetchUrl);
    case "rss":
      return fetchRss(def.fetchUrl);
    case "github_releases":
      return fetchGithubReleases(def.fetchUrl);
    case "html":
      return fetchHtml(def.fetchUrl, (def.config ?? {}) as Record<string, unknown>);
    default:
      throw new Error(`Unknown source kind: ${def.kind}`);
  }
}

export type { SourceDefinition, FetchResult } from "./types";
