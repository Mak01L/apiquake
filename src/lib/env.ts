// Centralized env access with explicit types. Do not import this from
// the browser — these are server-only.

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  SESSION_SECRET:
    process.env.SESSION_SECRET ??
    "dev-only-insecure-secret-change-me-32-chars-minimum!!",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/apiquake",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "apiquake <notify@apiquake.dev>",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO ?? "",
  STRIPE_PRICE_TEAM: process.env.STRIPE_PRICE_TEAM ?? "",
  STRIPE_PRICE_BUSINESS: process.env.STRIPE_PRICE_BUSINESS ?? "",
  WORKER_CONCURRENCY: Number.parseInt(process.env.WORKER_CONCURRENCY ?? "2", 10),
  CRON_REFRESH_PATTERN:
    process.env.CRON_REFRESH_PATTERN ?? "*/30 * * * *",
};

export function assertServerEnv() {
  if (env.SESSION_SECRET.length < 32) {
    console.warn(
      "[env] SESSION_SECRET is shorter than 32 characters. Generate a real one before going to production.",
    );
  }
}
