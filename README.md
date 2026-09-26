# Markaz management system

A system meant to manage a markaz, similar to an educational institute or school. It covers student fees, teacher salaries, a dashboard, and biweekly and monthly PDF reports.

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL. Create an account there. A new account is signed in immediately and sent to the dashboard.

```bash
npm run verify
npm run build
```

`verify` checks balance math, report date ranges, and that a PDF is produced. `build` typechecks and builds the client.

## Cloudflare

The live site runs on Cloudflare with a D1 database.

1. In the Cloudflare dashboard, create a D1 database named `markaz`.
2. Open the Pages project, then **Settings**, then **Bindings**. Add a D1 binding whose variable name is exactly `DB`, pointed at that database.
3. Build command: `npm run build`. Output directory: `dist`. Production branch: `main`.
4. Redeploy after the binding exists.

The first request creates the tables. Accounts live in that database. Registering sets a session cookie and opens the dashboard. No Netlify Identity step is required.

To apply the same SQL yourself:

```bash
npx wrangler d1 execute markaz --remote --file=migrations/0001_init.sql
```

## Mail

Balance alerts stay off until these site environment variables are set. Do not commit real values.

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MARKAZ_FROM`

If any are missing, the API responds that mail is not configured and the student screen explains that.

## Reports

The Reports page can generate a biweekly or monthly PDF immediately. The file is stored in D1, and the top bar shows an unread alert when it is ready.

## Deploy

Push `main`. Cloudflare Pages builds `dist` and serves the Pages Function under `/api`. The D1 binding named `DB` must exist before sign-in will work. Add the SMTP variables on the Pages project when balance emails should send.
