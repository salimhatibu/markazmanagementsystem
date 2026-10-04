# Markaz management system

Student fees, teacher salaries, a desk dashboard, public papers, and PDF reports for Markaz Imam ash-Shafi'i.

**Stack:** Cloudflare Workers (Static Assets + API), D1 (SQLite), R2 (report PDFs and blog media), Cloudflare Access for the desk.

## Run locally

Requires **Node.js 22+**.

```bash
npm install
cp .dev.vars.example .dev.vars   # opens the desk without Access locally
npm run db:migrate:local
npm run dev
```

Open the printed local URL. `.dev.vars` sets `DEV_OPEN_DESK=1` so the desk works without Access on your machine.

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
| Worker | https://markaz-management-system.arruhayn-87f.workers.dev | deployed |
| Access | Zero Trust application | configure secrets (below) |

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

Production has `DEV_OPEN_DESK=0`. The desk requires Cloudflare Access for allowed emails. Local `.dev.vars` keeps `DEV_OPEN_DESK=1` for development.

To (re)configure Access:

1. Worker URL: https://markaz-management-system.arruhayn-87f.workers.dev (or attach a custom domain).
2. In [Zero Trust → Access → Applications](https://one.dash.cloudflare.com/), create a **Self-hosted** application for the desk.
3. Protect the desk host (or paths) so staff must sign in. **Bypass** Access for public `/read` and public blog APIs if needed.
4. Set secrets:

```bash
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler secret put CF_ACCESS_AUD
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
# optional
npx wrangler secret put SITE_URL
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

Public `/read` stays open (via Access bypasses); the desk requires Access once secrets are set.
