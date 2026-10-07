# Markaz management system

Student fees, teacher salaries, a desk dashboard, public papers, and PDF reports for Markaz Imam ash-Shafi'i.

**Stack:** Cloudflare Workers (Static Assets + API), D1 (SQLite), R2 (report PDFs and blog media), Cloudflare Access for the desk.

## Hosts (public papers vs desk)

One Worker serves two surfaces, chosen by the `Host` header:

| Surface | Host | What it serves |
|---------|------|----------------|
| Public papers | `thesalafimindset.com` | Shelf at `/`, `/saved`, `/series/:slug`, `/:slug`. Open to the world. |
| Desk | `admin.mysalafimindset.com` | Dashboard, students, blog editor, etc. Cloudflare Access required. |

Same D1 and R2. Vars in `wrangler.jsonc`:

- `PUBLIC_HOST` / `ADMIN_HOST` — hostname matching
- `SITE_URL` — public origin for RSS, sitemap, newsletter links (`https://thesalafimindset.com`)

The SPA build reads the same names via Vite (`.env.production`: `VITE_PUBLIC_HOST`, `VITE_ADMIN_HOST`, origins). Localhost keeps the legacy `/read…` paths next to the desk.

### Cloudflare setup

1. **DNS**:
   - Zone `thesalafimindset.com`: apex → CNAME (or flattening) to `markaz.arruhayn-87f.workers.dev` (proxied).
   - Zone for desk: `admin.mysalafimindset.com` → CNAME to `markaz.arruhayn-87f.workers.dev` (proxied).

2. **Worker custom domains** (Workers → `markaz` → Settings → Domains & Routes):
   - Add `thesalafimindset.com` (public).
   - Add `admin.mysalafimindset.com` (desk).

3. **Cloudflare Access** (Zero Trust → Access → Applications):
   - Self-hosted app whose Application domain is **only** `admin.mysalafimindset.com` (paths `*` or default).
   - Do **not** add `thesalafimindset.com` to that Access app.
   - Set secrets if the AUD changes: `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`.
   - Remove any old Access policy that wraps the whole `*.workers.dev` host if it still blocks public traffic.

4. **Smoke test**:
   - `https://thesalafimindset.com` — papers load, no Access login.
   - `https://admin.mysalafimindset.com` — Access challenge, then desk.
   - Share links / RSS use the public host.
   - Desk “Read the papers” opens the public host.

## Run locally

Requires **Node.js 22+**.

```bash
npm install
cp .dev.vars.example .dev.vars   # opens the desk without Access locally
npm run db:migrate:local
npm run dev
```

Open the printed local URL. `.dev.vars` sets `DEV_OPEN_DESK=1` so the desk works without Access on your machine. Papers stay under `/read` until you hit the real public host.

```bash
npm run verify
npm run build
```

## Cloudflare resources (this account)

| Resource | Name / ID | Status |
|----------|-----------|--------|
| Account | `87f42add36c73d8668f7aaf00ffb8d70` | bound in `wrangler.jsonc` |
| D1 | `markaz` → `604c7d61-ddc1-4ca9-9ada-59d2bc9333ba` | created; remote migrations applied |
| R2 | `markaz-reports`, `markaz-blog` | created |
| Worker | https://markaz.arruhayn-87f.workers.dev | deployed (cutover host) |
| Public | https://thesalafimindset.com | custom domain |
| Desk | https://admin.mysalafimindset.com | custom domain + Access |
| Access | Zero Trust application | desk host only (below) |

## Database (D1)

Schema lives in `db/schema.ts`. SQL migrations live in `migrations/` and are applied only through Wrangler:

```bash
npm run db:generate          # after schema edits
npm run db:migrate:local     # local D1
npm run db:migrate           # remote D1 (production)
```

Do not apply DDL by hand against remote D1 outside `wrangler d1 migrations apply`.

### One-time import from Netlify Postgres

1. Export rows into `tmp/tables.json` (snake_case columns; keep dumps out of git).
2. `node scripts/import-pg-to-d1.mjs > tmp/import.sql`
3. `npx wrangler d1 execute markaz --remote --file=tmp/import.sql`

## Auth (Cloudflare Access)

Production has `DEV_OPEN_DESK=0`. The desk host requires Cloudflare Access for allowed emails. The public papers host stays open. Local `.dev.vars` keeps `DEV_OPEN_DESK=1` for development.

To (re)configure Access:

1. Desk URL: https://admin.mysalafimindset.com (custom domain on the same Worker).
2. In [Zero Trust → Access → Applications](https://one.dash.cloudflare.com/), create or update a **Self-hosted** application for **only** that desk host.
3. Do not wrap `thesalafimindset.com` in Access. Desk APIs are also rejected on the public host by the Worker.
4. Set secrets (AUD must match the Access application’s **Application Audience** — if you recreate the Access app, update `CF_ACCESS_AUD`):

```bash
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN   # e.g. dawn-butterfly-7105.cloudflareaccess.com
npx wrangler secret put CF_ACCESS_AUD           # from Zero Trust → Access → Applications → Markaz desk
```


## Files (R2)

| Binding      | Bucket            | Use                   |
|--------------|-------------------|-----------------------|
| `REPORTS`    | `markaz-reports`  | Operations PDFs       |
| `BLOG_MEDIA` | `markaz-blog`     | Blog pictures / video |

## Mail

Balance alerts and newsletter sends need secrets:

```bash
npx wrangler secret put SMTP_HOST
npx wrangler secret put SMTP_PORT
npx wrangler secret put SMTP_USER
npx wrangler secret put SMTP_PASS
npx wrangler secret put MARKAZ_FROM
# SITE_URL is a wrangler var (public origin); override only if needed
```

## Reports and cron

Desk can generate biweekly/monthly PDFs. Cron triggers match:

- `0 6 1,15 * *` — biweekly
- `30 6 1 * *` — monthly

Student and teacher detail pages can download a full person record PDF (`/api/students/:id/file`, `/api/teachers/:id/file`).

## Deploy

### Automatic (GitHub → Cloudflare)

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml): apply D1 migrations, build, and `wrangler deploy`.

One-time GitHub secrets (already have `CLOUDFLARE_ACCOUNT_ID`):

1. Create a Cloudflare API token: [Create Token](https://dash.cloudflare.com/profile/api-tokens) → template **Edit Cloudflare Workers** → also allow **Account → D1 → Edit** → scope to this account.
2. Add it as the repository secret `CLOUDFLARE_API_TOKEN`:

```bash
gh secret set CLOUDFLARE_API_TOKEN
```

Then push to `main` (or run **Actions → Deploy Worker → Run workflow**).

Optional native alternative: Worker → **Settings → Builds → Connect** and link this GitHub repo (Workers Builds). The GitHub Actions workflow above is the default path.

### Manual

```bash
npx wrangler login          # once
npm run db:migrate
npm run deploy
```

Public papers stay open on `thesalafimindset.com`; the desk on `admin.mysalafimindset.com` requires Access once secrets are set.
