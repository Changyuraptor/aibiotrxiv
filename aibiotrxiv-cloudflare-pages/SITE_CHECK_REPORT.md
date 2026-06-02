# AIBioTrXiv v52 site check report

## Storage source-of-truth check

- Persistent member, manuscript, article, payment, comment, moderation, and version data should be stored in D1.
- Uploaded files and generated files should be stored in R2.
- A legacy browser-storage purge routine has been added to `public/assets/js/app.js`.
- The purge removes old AIBioTrXiv prototype `localStorage` / `sessionStorage` records so stale browser data does not interfere with D1/R2 testing.

## Cloudflare resources

No additional databases or buckets are required:

- D1 database: `aibiotrxiv-production-db`
- D1 binding: `DB`
- R2 bucket: `aibiotrxiv-user-content`
- R2 binding: `AIBIO_STORAGE`

## Wrangler

`wrangler.toml` is intentionally absent. D1/R2 bindings and environment variables should be managed through the Cloudflare Dashboard.

## Diagnostic endpoint

After deployment, open:

`/api/system/health`

Expected result should indicate that `DB` and `AIBIO_STORAGE` bindings are available. To test R2 write/read/delete, open:

`/api/system/health?write=1`
