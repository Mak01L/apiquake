import { db } from "./index";
import { apiSources } from "./schema";
import { allSources } from "../scrapers";
import { eq } from "drizzle-orm";

async function main() {
  console.log("[seed] inserting/updating", allSources.length, "API sources");
  for (const src of allSources) {
    const existing = await db
      .select()
      .from(apiSources)
      .where(eq(apiSources.slug, src.slug));
    if (existing.length === 0) {
      await db.insert(apiSources).values({
        slug: src.slug,
        name: src.name,
        vendor: src.vendor,
        logoUrl: src.logoUrl,
        homepageUrl: src.homepageUrl,
        docsUrl: src.docsUrl,
        kind: src.kind,
        fetchUrl: src.fetchUrl,
        config: src.config ?? {},
        pollIntervalMinutes: src.pollIntervalMinutes ?? 30,
      });
      console.log(`[seed] + ${src.slug}`);
    } else {
      await db
        .update(apiSources)
        .set({
          name: src.name,
          vendor: src.vendor,
          logoUrl: src.logoUrl,
          homepageUrl: src.homepageUrl,
          docsUrl: src.docsUrl,
          kind: src.kind,
          fetchUrl: src.fetchUrl,
          config: src.config ?? {},
          pollIntervalMinutes: src.pollIntervalMinutes ?? 30,
        })
        .where(eq(apiSources.slug, src.slug));
      console.log(`[seed] ~ ${src.slug}`);
    }
  }
  console.log("[seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
