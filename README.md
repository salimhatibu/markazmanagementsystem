# Markaz management system

A system meant to manage a markaz, similar to an educational institute or school. It covers student fees, teacher salaries, a dashboard, and biweekly and monthly PDF reports.

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL. Identity does not run under the Vite dev server, so sign-in works only on a Netlify deploy. The login screen should say that Identity is unavailable.

```bash
npm run verify
npm run build
```

`verify` checks balance math, report date ranges, and that a PDF is produced. `build` typechecks and builds the client.

## Database

Schema lives in `db/schema.ts`. Migrations are generated into `netlify/database/migrations` and applied to hosted databases by the Netlify deploy. Do not run `drizzle-kit push` or apply those migrations yourself against a hosted database.

```bash
npm run db:generate
npm run db:migrate
```

`db:migrate` applies pending files to the local development database only, and it needs the Netlify CLI signed in.

## Identity

In **Project configuration > Identity**:

1. Set registration to **Invite only**.
2. Invite the primary admin.
3. After they accept, open that user and add the role `admin`.

The app does not offer public signup. Every API route requires a signed-in user with the `admin` role.

## Mail

Balance alerts stay off until these site environment variables are set. Do not commit real values.

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MARKAZ_FROM`

If any are missing, the API responds that mail is not configured and the student screen explains that.

## Reports

Published deploys run a biweekly PDF at 06:00 UTC on the 1st and the 15th (the half-month that just ended) and a monthly PDF at 06:30 UTC on the 1st (the previous calendar month). Scheduled functions time out after 30 seconds and do not run on unpublished deploys. The Reports page can generate the same files immediately. PDFs are stored in Netlify Blobs. The top bar shows an unread alert when a report is ready.

## Deploy

Link a Netlify site, then deploy. The presence of `@netlify/database` provisions the database, and the deploy applies the committed migration. Set the SMTP variables and the admin role after the first deploy.
