# Markaz management system

A system meant to manage a markaz, similar to an educational institute or school. It covers student fees, teacher salaries, a dashboard, and biweekly and monthly PDF reports.

The live site runs on Netlify. Records live in Netlify Database (Postgres). Report PDFs live in Netlify Blobs.

## Run locally

```bash
npm install
npm run db:migrate
npm run dev
```

Open the printed local URL. The dashboard opens immediately. No account is required.

`npm run dev` uses the Netlify Vite plugin, so functions, the local database, and Blobs all work without wrapping in `netlify dev`.

```bash
npm run verify
npm run build
```

`verify` checks balance math, report date ranges, and that a PDF is produced. `build` typechecks and builds the client.

## Database

Tables are defined in `db/schema.ts`. After a schema change:

```bash
npm run db:generate
npm run db:migrate
```

`db:migrate` applies pending files to the **local** database only. Commit the new file under `netlify/database/migrations/` with the schema change. A Netlify deploy applies those migrations to preview and production automatically. Do not run `drizzle-kit push` or raw DDL against the hosted database.

`@netlify/database` in this project is what tells Netlify to provision Postgres on the next deploy.

## Mail

Balance alerts stay off until these site environment variables are set in the Netlify UI or CLI. Do not commit real values.

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MARKAZ_FROM`

If any are missing, the API responds that mail is not configured and the student screen explains that.

## Reports

The Reports page can generate a biweekly or monthly PDF immediately. The file is stored in the `markaz-reports` Blob store, and the top bar shows an unread alert when it is ready.

After the site is published, scheduled functions also generate those packs at 06:00 UTC on the 1st and 15th (biweekly) and 06:30 UTC on the 1st (monthly).

## Deploy

1. Link the GitHub repo `salimhatibu/markazmanagementsystem` to a Netlify site.
2. Build command: `npm run build`. Publish directory: `dist`. Production branch: `main`.
3. Push `main`. The first deploy provisions the database and applies migrations.

Anyone who opens the site can manage the records. No sign-in is required.
