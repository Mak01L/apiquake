export type SourceKind = "openapi" | "rss" | "github_releases" | "html";

export interface SourceDefinition {
  slug: string;
  name: string;
  vendor?: string;
  logoUrl?: string;
  homepageUrl?: string;
  docsUrl?: string;
  kind: SourceKind;
  fetchUrl: string;
  config?: Record<string, unknown>;
  pollIntervalMinutes?: number;
}

export interface FetchResult {
  content: string;
  contentType: string;
}
