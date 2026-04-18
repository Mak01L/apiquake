import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString();
}

export function severityColor(s: string): string {
  switch (s) {
    case "breaking":
      return "text-red-400 bg-red-400/10 border-red-400/30";
    case "deprecation":
      return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    case "new_feature":
      return "text-green-400 bg-green-400/10 border-green-400/30";
    default:
      return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  }
}

export function severityLabel(s: string): string {
  switch (s) {
    case "breaking":
      return "Breaking";
    case "deprecation":
      return "Deprecation";
    case "new_feature":
      return "New feature";
    default:
      return "Info";
  }
}

export function sha256Hex(text: string): string {
  // node-only; workers and server actions use this
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}
