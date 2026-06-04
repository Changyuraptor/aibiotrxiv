# AIBioTrXiv v55 D1/R2 setup

This version is rebuilt from v46 as the visual/header baseline. It keeps the v46 mobile/tablet header behavior and adds D1/R2 diagnostics and a protected D1 initializer.

## Cloudflare resources

Use only these two resources:

- D1 database: `aibiotrxiv-production-db`
- D1 binding: `DB`
- R2 bucket: `aibiotrxiv-user-content`
- R2 binding: `AIBIO_STORAGE`

No `wrangler.toml` is included. Bindings are managed from the Cloudflare Dashboard.

## Build configuration

- Root directory: `aibiotrxiv-cloudflare-pages`
- Build command: empty
- Build output directory: `public`

## Initialize D1

Add this Cloudflare Pages secret:

- `INIT_DATABASE_SECRET`: a long private random string

Then deploy and open:

`/api/system/init-d1?secret=YOUR_SECRET`

Alternative routes are also included:

- `/api/system/initd1?secret=YOUR_SECRET`
- `/api/init-d1?secret=YOUR_SECRET`
- `/api/init-database?secret=YOUR_SECRET`

After success, verify:

`/api/system/health`

## Manual SQL

The same schema is included at:

- `schema.sql`
- `aibiotrxiv-production-db-v55.sql` as a separate download
