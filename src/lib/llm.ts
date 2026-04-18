import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

export type Severity = "breaking" | "deprecation" | "new_feature" | "info";

export interface ClassifyInput {
  sourceName: string;
  diff: string;
  affectedPaths: string[];
}

export interface ClassifyOutput {
  severity: Severity;
  title: string;
  summary: string;
  model: string;
}

// Hard cap what we send to the LLM to keep per-diff cost ~$0.001.
const MAX_DIFF_CHARS = 12_000;

const SYSTEM_PROMPT = `You are an expert API-change analyst. You receive a unified diff of an API's changelog, OpenAPI spec, or docs.

Your job:
1. Classify the change severity as ONE of: "breaking", "deprecation", "new_feature", "info".
   - breaking: consumers must update code NOW to avoid outage
   - deprecation: consumers should plan to update (grace period announced)
   - new_feature: additive, no action required
   - info: pricing, doc-only, typo, non-technical
2. Write a ONE-LINE title (<=80 chars) describing the most important change.
3. Write a summary (<=400 chars, plain text, no markdown) explaining what changed and what a developer needs to do. Mention specific endpoints/fields when you can see them.

Return STRICT JSON matching this schema, nothing else:
{"severity":"breaking|deprecation|new_feature|info","title":"...","summary":"..."}`;

export async function classifyDiff(input: ClassifyInput): Promise<ClassifyOutput> {
  const { sourceName, diff, affectedPaths } = input;

  // Fallback when no API key is configured — still ship something useful.
  if (!env.ANTHROPIC_API_KEY) {
    return heuristicClassify(sourceName, diff, affectedPaths);
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const truncated =
    diff.length > MAX_DIFF_CHARS ? diff.slice(0, MAX_DIFF_CHARS) + "\n...[truncated]" : diff;

  const userMsg = `API: ${sourceName}
Affected paths: ${affectedPaths.length ? affectedPaths.join(", ") : "(none detected)"}

Unified diff:
\`\`\`diff
${truncated}
\`\`\``;

  try {
    const res = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });
    const textBlock = res.content.find((c) => c.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = extractJson(raw);
    if (!parsed) throw new Error("LLM did not return JSON");
    return {
      severity: normalizeSeverity(parsed.severity),
      title: String(parsed.title ?? "Change detected").slice(0, 200),
      summary: String(parsed.summary ?? "").slice(0, 1000),
      model: env.ANTHROPIC_MODEL,
    };
  } catch (err) {
    console.error("[llm] classify failed, falling back to heuristic:", err);
    return heuristicClassify(sourceName, diff, affectedPaths);
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

function normalizeSeverity(s: unknown): Severity {
  const v = String(s).toLowerCase();
  if (v === "breaking" || v === "deprecation" || v === "new_feature" || v === "info") {
    return v;
  }
  return "info";
}

function heuristicClassify(
  sourceName: string,
  diff: string,
  paths: string[],
): ClassifyOutput {
  const lower = diff.toLowerCase();
  let severity: Severity = "info";
  if (/\bbreaking\b|\bremoved\b|\bno longer supported\b|\bincompatible\b/.test(lower)) {
    severity = "breaking";
  } else if (/\bdeprecat/.test(lower)) {
    severity = "deprecation";
  } else if (/\bnew\b|\badded\b|\bintroduc/.test(lower)) {
    severity = "new_feature";
  }
  const firstChange = diff
    .split("\n")
    .find((l) => l.startsWith("+") || l.startsWith("-"))
    ?.slice(1, 100)
    .trim();
  return {
    severity,
    title: `${sourceName}: ${firstChange ?? "Change detected"}`.slice(0, 200),
    summary: paths.length
      ? `Paths affected: ${paths.slice(0, 5).join(", ")}. Configure ANTHROPIC_API_KEY for AI-powered summaries.`
      : "Configure ANTHROPIC_API_KEY for AI-powered summaries.",
    model: "heuristic",
  };
}
