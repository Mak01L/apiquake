# apiquake

> Never get surprised by an API breaking change again.

apiquake watches the OpenAPI specs, RSS changelogs, GitHub releases, and docs
pages of the APIs your product depends on — then notifies you via email, Slack,
Discord, or webhook when something changes. Every diff is classified by Claude
Haiku as **BREAKING / DEPRECATION / NEW_FEATURE / INFO** with a one-sentence
summary of what you need to do.

- **Target stack:** Next.js 15 + Postgres + Redis + BullMQ workers + Claude Haiku
- **Designed to self-host on modest hardware** (e.g. Intel i3 / 16 GB Linux box)
- **MIT licensed**

---

## Features shipped in this MVP

- Landing page with pricing, live list of monitored APIs, and "suggest an API" capture.
- Email/password auth (bcrypt + HTTP-only cookies, no external auth dependency).
- Dashboard: feed of diffs, browse/subscribe APIs, individual diff view with
  affected paths, user settings (integrations + min-severity), billing page.
- Workers:
  - **fetch** — polls each API source on its schedule, stores a snapshot only
    when content hash changes.
  - **diff** — computes a unified diff from consecutive snapshots, extracts
    affected endpoints, and calls Claude Haiku to classify severity and write
    a summary (falls back to a heuristic if `ANTHROPIC_API_KEY` is unset).
  - **notify** — fans out to each subscribed user's integrations.
- 5 API sources wired on day one: **Stripe, OpenAI, GitHub, Twilio, Vercel**.
- Billing via Stripe (checkout + customer portal + webhook). Falls back to a
  dev-mode stub so you can run the whole app without Stripe keys.
- Docker Compose stack: Postgres 16, Redis 7, Next.js app, worker, Caddy.

---

## Local development

```bash
# 1. install deps
pnpm install

# 2. bring up Postgres + Redis only (you run the app / worker locally)
docker compose up -d postgres redis

# 3. create .env from the template and edit values
cp .env.example .env

# 4. run migrations + seed the source catalog
pnpm db:migrate
pnpm db:seed

# 5. in one terminal: run Next.js
pnpm dev

# 6. in another terminal: run the worker
pnpm worker:dev
```

Visit http://localhost:3000, sign up, subscribe to a few APIs, and within a
few minutes the worker will populate your feed.

---

## Deploying to your Linux Mint box

This is the self-host happy path on an Intel i3 / 16 GB machine.

### 1. Install Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
# log out + back in for the group to apply
```

### 2. Clone and configure

```bash
git clone https://github.com/Mak01L/apiquake.git
cd apiquake
cp .env.example .env
# Edit .env:
#  - set SESSION_SECRET to a 32+ char random string
#  - set NEXT_PUBLIC_APP_URL to your public URL (e.g. https://apiquake.dev)
#  - (optional) set RESEND_API_KEY for real emails
#  - (optional) set ANTHROPIC_API_KEY for AI-powered diff summaries
#  - (optional) set STRIPE_* for real billing
```

Generate a secret quickly:

```bash
openssl rand -base64 48
```

### 3. Bring the stack up

```bash
docker compose up -d --build
docker compose logs -f web worker
```

The first time the worker boots it runs DB migrations and seeds the source
catalog, then starts polling every 30 minutes (configurable with
`CRON_REFRESH_PATTERN`).

### 4. Make it reachable from the internet

You have two good options. **Option A is strongly recommended** because it
avoids opening ports on your router and gives you DDoS protection for free.

#### Option A — Cloudflare Tunnel (recommended)

```bash
# install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# one-time auth — opens browser
cloudflared tunnel login

# create the tunnel
cloudflared tunnel create apiquake

# map your domain to the tunnel
cloudflared tunnel route dns apiquake apiquake.dev
cloudflared tunnel route dns apiquake www.apiquake.dev
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: apiquake
credentials-file: /home/<you>/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: apiquake.dev
    service: http://localhost:8080
  - hostname: www.apiquake.dev
    service: http://localhost:8080
  - service: http_status:404
```

Point the Caddy container at port `8080` on the host (edit `docker-compose.yml`
to publish `"8080:80"` instead of `80/443`), comment out the 443 binding, and
change the Caddyfile block to `http://:80 { reverse_proxy web:3000 }` so Caddy
doesn't try to get TLS certs — cloudflared handles TLS at the edge.

Start the tunnel as a systemd service:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

#### Option B — Expose Caddy directly

If you prefer to open ports:

1. Point `apiquake.dev` A-record at your home IP (consider DDNS).
2. Port-forward 80 and 443 on your router to the Mint box.
3. `docker compose up -d` — Caddy will obtain a Let's Encrypt cert automatically.

### 5. Monitor apiquake itself

Optional but recommended:

```bash
docker run -d --restart=unless-stopped -p 3001:3001 \
  -v uptime-kuma:/app/data louislam/uptime-kuma:1
```

Point Uptime Kuma at `https://apiquake.dev/api/health` so *apiquake* gets an
external heartbeat too.

---

## Scaling beyond the MVP

- **Adding API sources** — edit `src/scrapers/index.ts`, then run
  `pnpm db:seed`. Supported kinds: `openapi`, `rss`, `github_releases`, `html`.
- **Adding a new scraper kind** — drop a file in `src/scrapers/fetchers/`,
  wire it in `src/scrapers/index.ts#fetchSource`.
- **Tuning cost** — the LLM call is the only variable-cost component.
  Claude Haiku is currently set to ~500 output tokens per classification, which
  comes to roughly **$0.001 per detected change**. If you want to cap cost,
  set `ANTHROPIC_API_KEY=""` in prod — the heuristic classifier is quite
  usable and costs nothing.
- **Going multi-region / HA** — replace Postgres with a managed instance,
  run more worker replicas, and move Redis to Upstash or Elasticache.

---

## Repo layout

```
src/
├── app/                # Next.js App Router
│   ├── (auth)/         # login, signup, logout
│   ├── api/            # REST endpoints (billing, suggest, health)
│   ├── dashboard/      # authenticated UI
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx        # landing
├── db/                 # Drizzle schema + migrations
├── lib/                # env, auth, queue, diff, llm, notify, stripe, utils
├── scrapers/           # source catalog + fetchers per kind
└── workers/            # BullMQ handlers: fetch, diff, notify
```

---

## License

MIT — use it, fork it, ship it.
