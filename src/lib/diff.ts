// Small dependency-free unified-diff implementation. Good enough for our
// use case: human-readable diff of normalized text snapshots. Not meant
// for git-quality diffs.

export interface DiffResult {
  raw: string; // unified diff text
  affectedPaths: string[]; // optional heuristic extraction of changed "paths"
  added: number;
  removed: number;
}

export function unifiedDiff(prev: string, next: string, contextLines = 3): DiffResult {
  const a = prev.split("\n");
  const b = next.split("\n");
  const lcs = computeLcs(a, b);
  const hunks = buildHunks(a, b, lcs, contextLines);
  const raw = hunks.map(renderHunk).join("\n");

  let added = 0;
  let removed = 0;
  for (const h of hunks) {
    for (const op of h.ops) {
      if (op.type === "+") added++;
      else if (op.type === "-") removed++;
    }
  }

  const affectedPaths = extractPaths(hunks);
  return { raw, affectedPaths, added, removed };
}

type Op = { type: "+" | "-" | " "; line: string };
interface Hunk {
  aStart: number;
  bStart: number;
  ops: Op[];
}

function computeLcs(a: string[], b: string[]): number[][] {
  // Classic DP. O(n*m) memory — we cap inputs upstream for huge docs.
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

function buildHunks(a: string[], b: string[], dp: number[][], ctx: number): Hunk[] {
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ type: " ", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "-", line: a[i] });
      i++;
    } else {
      ops.push({ type: "+", line: b[j] });
      j++;
    }
  }
  while (i < a.length) ops.push({ type: "-", line: a[i++] });
  while (j < b.length) ops.push({ type: "+", line: b[j++] });

  // Group into hunks with ctx lines of context around changes.
  const hunks: Hunk[] = [];
  let aLine = 0;
  let bLine = 0;
  let current: Hunk | null = null;
  let tail = 0;

  const flush = () => {
    if (current) {
      hunks.push(current);
      current = null;
      tail = 0;
    }
  };

  const pending: Op[] = [];
  for (const op of ops) {
    if (op.type === " ") {
      if (current) {
        if (tail < ctx) {
          current.ops.push(op);
          tail++;
        } else {
          pending.push(op);
          if (pending.length > ctx) pending.shift();
          // if we go past 2*ctx equal lines, close current hunk
          if (pending.length >= ctx) {
            flush();
            pending.length = 0;
          }
        }
      } else {
        pending.push(op);
        if (pending.length > ctx) pending.shift();
      }
      aLine++;
      bLine++;
    } else {
      if (!current) {
        current = {
          aStart: Math.max(1, aLine - pending.length + 1),
          bStart: Math.max(1, bLine - pending.length + 1),
          ops: [...pending],
        };
        pending.length = 0;
      } else if (pending.length) {
        current.ops.push(...pending);
        pending.length = 0;
      }
      current.ops.push(op);
      tail = 0;
      if (op.type === "-") aLine++;
      else bLine++;
    }
  }
  flush();
  return hunks;
}

function renderHunk(h: Hunk): string {
  let aCount = 0;
  let bCount = 0;
  for (const op of h.ops) {
    if (op.type !== "+") aCount++;
    if (op.type !== "-") bCount++;
  }
  const header = `@@ -${h.aStart},${aCount} +${h.bStart},${bCount} @@`;
  const body = h.ops.map((op) => `${op.type}${op.line}`).join("\n");
  return `${header}\n${body}`;
}

const PATH_RE =
  /\b(?:GET|POST|PUT|PATCH|DELETE)\s+(\/[\w\-{}\/\.:]+)|["']((?:\/|api\/)[\w\-{}\/\.:]+)["']/g;

function extractPaths(hunks: Hunk[]): string[] {
  const paths = new Set<string>();
  for (const h of hunks) {
    for (const op of h.ops) {
      if (op.type === " ") continue;
      for (const m of op.line.matchAll(PATH_RE)) {
        const p = m[1] ?? m[2];
        if (p && p.length < 200) paths.add(p);
      }
    }
  }
  return Array.from(paths).slice(0, 25);
}
