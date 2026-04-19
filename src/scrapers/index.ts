import type { SourceDefinition, FetchResult } from "./types";
import { fetchOpenApi } from "./fetchers/openapi";
import { fetchRss } from "./fetchers/rss";
import { fetchGithubReleases } from "./fetchers/github_releases";
import { fetchHtml } from "./fetchers/html";

// -----------------------------------------------------------------------------
// Source catalog — ship 5 for MVP launch, easy to extend.
// -----------------------------------------------------------------------------

export const allSources: SourceDefinition[] = [
  // ---------- Payments / Core APIs ----------
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

  // ---------- Cloud & Infra ----------
  {
    slug: "aws",
    name: "AWS",
    vendor: "Amazon Web Services",
    logoUrl: "https://cdn.simpleicons.org/amazonwebservices/ff9900",
    homepageUrl: "https://aws.amazon.com",
    docsUrl: "https://aws.amazon.com/new/",
    kind: "rss",
    fetchUrl: "https://aws.amazon.com/new/feed/",
    pollIntervalMinutes: 120,
  },
  {
    slug: "cloudflare",
    name: "Cloudflare",
    vendor: "Cloudflare, Inc.",
    logoUrl: "https://cdn.simpleicons.org/cloudflare/f38020",
    homepageUrl: "https://cloudflare.com",
    docsUrl: "https://developers.cloudflare.com/release-notes/",
    kind: "rss",
    fetchUrl: "https://developers.cloudflare.com/release-notes/index.xml",
    pollIntervalMinutes: 120,
  },
  {
    slug: "kubernetes",
    name: "Kubernetes",
    vendor: "CNCF",
    logoUrl: "https://cdn.simpleicons.org/kubernetes/326ce5",
    homepageUrl: "https://kubernetes.io",
    docsUrl: "https://github.com/kubernetes/kubernetes/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/kubernetes/kubernetes/releases?per_page=30",
    pollIntervalMinutes: 240,
  },
  {
    slug: "docker",
    name: "Docker CLI",
    vendor: "Docker, Inc.",
    logoUrl: "https://cdn.simpleicons.org/docker/2496ed",
    homepageUrl: "https://www.docker.com",
    docsUrl: "https://github.com/docker/cli/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/docker/cli/releases?per_page=30",
    pollIntervalMinutes: 240,
  },

  // ---------- Frameworks / Dev Tools ----------
  {
    slug: "nextjs",
    name: "Next.js",
    vendor: "Vercel Inc.",
    logoUrl: "https://cdn.simpleicons.org/nextdotjs/ffffff",
    homepageUrl: "https://nextjs.org",
    docsUrl: "https://github.com/vercel/next.js/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/vercel/next.js/releases?per_page=30",
    pollIntervalMinutes: 120,
  },
  {
    slug: "prisma",
    name: "Prisma",
    vendor: "Prisma Data, Inc.",
    logoUrl: "https://cdn.simpleicons.org/prisma/2d3748",
    homepageUrl: "https://prisma.io",
    docsUrl: "https://github.com/prisma/prisma/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/prisma/prisma/releases?per_page=30",
    pollIntervalMinutes: 240,
  },
  {
    slug: "postgres",
    name: "PostgreSQL",
    vendor: "PostgreSQL Global Dev Group",
    logoUrl: "https://cdn.simpleicons.org/postgresql/336791",
    homepageUrl: "https://www.postgresql.org",
    docsUrl: "https://www.postgresql.org/about/news/",
    kind: "rss",
    fetchUrl: "https://www.postgresql.org/news.rss",
    pollIntervalMinutes: 360,
  },

  // ---------- AI / LLM ----------
  {
    slug: "anthropic",
    name: "Anthropic SDK",
    vendor: "Anthropic PBC",
    logoUrl: "https://cdn.simpleicons.org/anthropic/ffffff",
    homepageUrl: "https://anthropic.com",
    docsUrl: "https://github.com/anthropics/anthropic-sdk-python/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/anthropics/anthropic-sdk-python/releases?per_page=30",
    pollIntervalMinutes: 120,
  },

  // ---------- Messaging / Communication ----------
  {
    slug: "slack",
    name: "Slack API",
    vendor: "Slack Technologies",
    logoUrl: "https://cdn.simpleicons.org/slack/4a154b",
    homepageUrl: "https://slack.com",
    docsUrl: "https://api.slack.com/changelog",
    kind: "rss",
    fetchUrl: "https://api.slack.com/changelog/feed",
    pollIntervalMinutes: 180,
  },
  {
    slug: "discord",
    name: "Discord API",
    vendor: "Discord Inc.",
    logoUrl: "https://cdn.simpleicons.org/discord/5865f2",
    homepageUrl: "https://discord.com",
    docsUrl: "https://github.com/discord/discord-api-docs/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/discord/discord-api-docs/releases?per_page=30",
    pollIntervalMinutes: 240,
  },
  {
    slug: "resend",
    name: "Resend SDK",
    vendor: "Resend",
    logoUrl: "https://cdn.simpleicons.org/resend/000000",
    homepageUrl: "https://resend.com",
    docsUrl: "https://github.com/resend/resend-node/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/resend/resend-node/releases?per_page=30",
    pollIntervalMinutes: 240,
  },

  // ---------- Platforms / BaaS ----------
  {
    slug: "supabase",
    name: "Supabase",
    vendor: "Supabase Inc.",
    logoUrl: "https://cdn.simpleicons.org/supabase/3ecf8e",
    homepageUrl: "https://supabase.com",
    docsUrl: "https://github.com/supabase/supabase/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/supabase/supabase/releases?per_page=30",
    pollIntervalMinutes: 180,
  },
  {
    slug: "clerk",
    name: "Clerk",
    vendor: "Clerk Inc.",
    logoUrl: "https://cdn.simpleicons.org/clerk/6c47ff",
    homepageUrl: "https://clerk.com",
    docsUrl: "https://github.com/clerk/javascript/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/clerk/javascript/releases?per_page=30",
    pollIntervalMinutes: 180,
  },
  {
    slug: "notion",
    name: "Notion SDK",
    vendor: "Notion Labs, Inc.",
    logoUrl: "https://cdn.simpleicons.org/notion/000000",
    homepageUrl: "https://notion.so",
    docsUrl: "https://github.com/makenotion/notion-sdk-js/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/makenotion/notion-sdk-js/releases?per_page=30",
    pollIntervalMinutes: 240,
  },

  // ---------- Monitoring / Observability ----------
  {
    slug: "sentry",
    name: "Sentry",
    vendor: "Functional Software, Inc.",
    logoUrl: "https://cdn.simpleicons.org/sentry/362d59",
    homepageUrl: "https://sentry.io",
    docsUrl: "https://github.com/getsentry/sentry/releases",
    kind: "github_releases",
    fetchUrl: "https://api.github.com/repos/getsentry/sentry/releases?per_page=30",
    pollIntervalMinutes: 240,
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
