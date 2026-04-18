import Link from "next/link";
import { db } from "@/db";
import { apiSources } from "@/db/schema";
import { eq } from "drizzle-orm";

export const revalidate = 300;

export default async function HomePage() {
  // Read the live catalog so the landing reflects what we actually monitor.
  let sources: Array<{
    slug: string;
    name: string;
    logoUrl: string | null;
  }> = [];
  try {
    sources = await db
      .select({ slug: apiSources.slug, name: apiSources.name, logoUrl: apiSources.logoUrl })
      .from(apiSources)
      .where(eq(apiSources.active, true));
  } catch {
    // DB might not be ready at build time — degrade gracefully.
    sources = [];
  }
  return (
    <main className="relative overflow-hidden">
      <Gradient />
      <Header />
      <Hero />
      <Stats />
      <SupportedApis sources={sources} />
      <HowItWorks />
      <Pricing />
      <SuggestCTA />
      <Footer />
    </main>
  );
}

function Gradient() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[40rem]
                   bg-[radial-gradient(ellipse_at_top,hsl(var(--brand)/0.25),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px
                   bg-gradient-to-r from-transparent via-brand/50 to-transparent"
      />
    </>
  );
}

function Header() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <Logo />
        <span className="text-fg">apiquake</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="#pricing" className="text-muted-fg hover:text-fg">
          Pricing
        </Link>
        <Link href="#how" className="text-muted-fg hover:text-fg">
          How it works
        </Link>
        <Link href="/login" className="text-muted-fg hover:text-fg">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Start free
        </Link>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="text-brand">
      <path
        fill="currentColor"
        d="M3 13h3l2-6 4 14 3-9 2 4h4v2h-5l-1-2-3 9-4-14-1 4H3z"
      />
    </svg>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 text-center">
      <p className="mb-4 inline-block rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-fg">
        Now monitoring Stripe, OpenAI, GitHub, Twilio, Vercel and more →
      </p>
      <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
        Never get surprised by an API
        <br />
        <span className="text-brand">breaking change</span> again.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-fg">
        apiquake watches the changelogs, OpenAPI specs and release notes of the
        APIs you depend on — and pings your Slack, Discord, or inbox the second
        something important changes. With AI-summarized diffs so you know
        whether you need to fix production or just read it later.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link href="/signup" className="btn btn-primary">
          Start free — 5 APIs, no card
        </Link>
        <Link href="#how" className="btn btn-outline">
          See how it works
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted-fg">
        Self-hostable · Open alerts via email / Slack / Discord / webhooks
      </p>
    </section>
  );
}

function Stats() {
  const items = [
    { n: "200+", l: "APIs in the catalog (growing)" },
    { n: "< 30m", l: "avg detection time after a vendor publishes" },
    { n: "4", l: "severity levels classified by Claude" },
    { n: "0", l: "false alarms on non-semantic changes" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 pb-12">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((x) => (
          <div key={x.l} className="card px-5 py-4 text-center">
            <div className="text-2xl font-bold">{x.n}</div>
            <div className="mt-1 text-xs text-muted-fg">{x.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SupportedApis({
  sources,
}: {
  sources: Array<{ slug: string; name: string; logoUrl: string | null }>;
}) {
  const list =
    sources.length > 0
      ? sources
      : [
          { slug: "stripe", name: "Stripe", logoUrl: null },
          { slug: "openai", name: "OpenAI", logoUrl: null },
          { slug: "github", name: "GitHub", logoUrl: null },
          { slug: "twilio", name: "Twilio", logoUrl: null },
          { slug: "vercel", name: "Vercel", logoUrl: null },
        ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-fg">
        Currently tracking
      </h2>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        {list.map((s) => (
          <div
            key={s.slug}
            className="card flex items-center gap-2 px-4 py-2 text-sm"
          >
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.logoUrl}
                alt=""
                width={18}
                height={18}
                className="rounded"
              />
            ) : (
              <span className="h-4 w-4 rounded bg-brand/30" />
            )}
            <span>{s.name}</span>
          </div>
        ))}
        <div className="text-sm text-muted-fg">
          …and{" "}
          <Link href="#suggest" className="text-brand underline">
            suggest the ones you need
          </Link>
          .
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      t: "1. We watch",
      d: "Every 30 minutes apiquake pulls OpenAPI specs, RSS feeds, GitHub releases, and docs pages for each API. Changes are hashed and only real content changes are stored.",
    },
    {
      t: "2. We diff",
      d: "When content changes, we compute a clean unified diff — stripping layout/tracking noise so you only see what matters.",
    },
    {
      t: "3. We classify with AI",
      d: "Claude Haiku reads the diff and tags it as BREAKING, DEPRECATION, NEW FEATURE, or INFO — plus a one-sentence summary of what you need to do.",
    },
    {
      t: "4. We ping you",
      d: "Email, Slack, Discord, or generic webhook. You choose the minimum severity that wakes you up.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold">How it works</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {steps.map((s) => (
          <div key={s.t} className="card p-5">
            <h3 className="font-semibold">{s.t}</h3>
            <p className="mt-2 text-sm text-muted-fg">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      sub: "forever",
      features: ["5 APIs", "Email alerts", "7-day history", "Community support"],
      cta: "Start free",
    },
    {
      name: "Pro",
      price: "$19",
      sub: "/ month",
      highlighted: true,
      features: [
        "30 APIs",
        "Slack + Discord + webhooks",
        "90-day history",
        "AI-summarized diffs",
      ],
      cta: "Start 14-day trial",
    },
    {
      name: "Team",
      price: "$49",
      sub: "/ month",
      features: [
        "100 APIs",
        "5 users",
        "Jira / Linear integration",
        "Priority support",
      ],
      cta: "Start free trial",
    },
    {
      name: "Business",
      price: "$149",
      sub: "/ month",
      features: [
        "Unlimited APIs + users",
        "SSO / SAML",
        "Dedicated onboarding",
        "99.9% SLA",
      ],
      cta: "Contact sales",
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold">Pricing</h2>
      <p className="mt-2 text-center text-muted-fg">
        Prevent one production incident and the Pro plan has paid for itself
        for 3 years.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`card p-6 ${t.highlighted ? "border-brand/60" : ""}`}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">{t.name}</h3>
              {t.highlighted && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-fg">
                  Popular
                </span>
              )}
            </div>
            <div className="mt-4 flex items-end gap-1">
              <div className="text-4xl font-bold">{t.price}</div>
              <div className="pb-1 text-sm text-muted-fg">{t.sub}</div>
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className={`btn mt-6 w-full ${t.highlighted ? "btn-primary" : "btn-outline"}`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function SuggestCTA() {
  return (
    <section id="suggest" className="mx-auto max-w-4xl px-6 py-20">
      <div className="card p-8 text-center">
        <h2 className="text-2xl font-bold">Missing an API?</h2>
        <p className="mt-2 text-muted-fg">
          We add new sources every week based on customer requests. Tell us
          which API you need monitored.
        </p>
        <form
          action="/api/suggest"
          method="POST"
          className="mt-6 flex flex-col items-center gap-3 md:flex-row md:justify-center"
        >
          <input
            required
            name="api"
            placeholder="e.g. Shopify, HubSpot, Mercado Pago…"
            className="input md:max-w-md"
          />
          <input
            required
            name="email"
            type="email"
            placeholder="you@domain.dev"
            className="input md:max-w-xs"
          />
          <button className="btn btn-primary">Request</button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-fg">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 md:flex-row">
        <p>© {new Date().getFullYear()} apiquake. Built for developers, by developers.</p>
        <div className="flex items-center gap-5">
          <Link href="/login">Log in</Link>
          <Link href="/signup">Sign up</Link>
          <Link href="#pricing">Pricing</Link>
        </div>
      </div>
    </footer>
  );
}
