import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// -------------------------------------------------------------------------
// Enums
// -------------------------------------------------------------------------

export const planEnum = pgEnum("plan", ["free", "pro", "team", "business"]);

export const sourceKindEnum = pgEnum("source_kind", [
  "openapi",
  "rss",
  "github_releases",
  "html",
]);

export const severityEnum = pgEnum("severity", [
  "breaking",
  "deprecation",
  "new_feature",
  "info",
]);

export const notifyChannelEnum = pgEnum("notify_channel", [
  "email",
  "slack",
  "discord",
  "webhook",
]);

// -------------------------------------------------------------------------
// Users & sessions
// -------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  minSeverity: severityEnum("min_severity").notNull().default("deprecation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

// -------------------------------------------------------------------------
// API sources (global catalog)
// -------------------------------------------------------------------------

export const apiSources = pgTable(
  "api_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // stable human-friendly slug, e.g. "stripe", "openai", "github"
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    vendor: text("vendor"),
    logoUrl: text("logo_url"),
    homepageUrl: text("homepage_url"),
    docsUrl: text("docs_url"),
    // what/where to fetch
    kind: sourceKindEnum("kind").notNull(),
    fetchUrl: text("fetch_url").notNull(),
    // free-form config the scraper understands (css selectors, headers, etc.)
    config: jsonb("config").$type<Record<string, unknown>>(),
    // how often to poll, in minutes
    pollIntervalMinutes: integer("poll_interval_minutes").notNull().default(30),
    active: boolean("active").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastHash: text("last_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index("api_sources_active_idx").on(t.active),
  }),
);

// -------------------------------------------------------------------------
// Snapshots (immutable raw content per source)
// -------------------------------------------------------------------------

export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => apiSources.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    content: text("content").notNull(), // raw body (openapi json, html, rss xml)
    contentType: text("content_type").notNull().default("text/plain"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sourceFetchedIdx: index("snapshots_source_fetched_idx").on(t.sourceId, t.fetchedAt),
  }),
);

// -------------------------------------------------------------------------
// Diffs (what changed between two snapshots)
// -------------------------------------------------------------------------

export const diffs = pgTable(
  "diffs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => apiSources.id, { onDelete: "cascade" }),
    prevSnapshotId: uuid("prev_snapshot_id").references(() => snapshots.id, {
      onDelete: "set null",
    }),
    nextSnapshotId: uuid("next_snapshot_id")
      .notNull()
      .references(() => snapshots.id, { onDelete: "cascade" }),
    severity: severityEnum("severity").notNull().default("info"),
    title: text("title").notNull(),
    summary: text("summary"), // plain-text summary, LLM-generated
    raw: text("raw"), // unified diff text
    affectedPaths: jsonb("affected_paths").$type<string[]>(),
    aiModel: text("ai_model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sourceCreatedIdx: index("diffs_source_created_idx").on(t.sourceId, t.createdAt),
    severityIdx: index("diffs_severity_idx").on(t.severity),
  }),
);

// -------------------------------------------------------------------------
// Subscriptions: user <-> api_source
// -------------------------------------------------------------------------

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => apiSources.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: unique("subscriptions_user_source_uniq").on(t.userId, t.sourceId),
    userIdx: index("subscriptions_user_idx").on(t.userId),
  }),
);

// -------------------------------------------------------------------------
// Integrations: per-user notification channels
// -------------------------------------------------------------------------

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channel: notifyChannelEnum("channel").notNull(),
  // for email: user's email override. for slack/discord/webhook: incoming webhook URL
  target: text("target").notNull(),
  label: text("label"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------------------------------------------------------------------------
// Alerts: fan-out of each diff to each subscribed user
// -------------------------------------------------------------------------

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    diffId: uuid("diff_id")
      .notNull()
      .references(() => diffs.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    deliveredChannels: jsonb("delivered_channels").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("alerts_user_created_idx").on(t.userId, t.createdAt),
    uniq: unique("alerts_user_diff_uniq").on(t.userId, t.diffId),
  }),
);

// -------------------------------------------------------------------------
// Relations
// -------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  integrations: many(integrations),
  alerts: many(alerts),
}));

export const apiSourcesRelations = relations(apiSources, ({ many }) => ({
  subscriptions: many(subscriptions),
  snapshots: many(snapshots),
  diffs: many(diffs),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  source: one(apiSources, { fields: [subscriptions.sourceId], references: [apiSources.id] }),
}));

export const diffsRelations = relations(diffs, ({ one }) => ({
  source: one(apiSources, { fields: [diffs.sourceId], references: [apiSources.id] }),
  prevSnapshot: one(snapshots, { fields: [diffs.prevSnapshotId], references: [snapshots.id] }),
  nextSnapshot: one(snapshots, { fields: [diffs.nextSnapshotId], references: [snapshots.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, { fields: [alerts.userId], references: [users.id] }),
  diff: one(diffs, { fields: [alerts.diffId], references: [diffs.id] }),
}));

// Helpful for sql template usage
export const schemaTouch = sql`-- touch`;
