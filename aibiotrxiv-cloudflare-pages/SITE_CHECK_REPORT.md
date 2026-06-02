# AIBioTrXiv v49 site check

## Storage
- Browser persistent storage has been removed from public JavaScript and Pages Functions.
- Members, submissions, article state, comments, moderation state, payment records, and audit data are written through Cloudflare Pages Functions to D1.
- Submitted figure images are uploaded through Pages Functions to R2 and referenced in D1 by object key.

## Required Cloudflare resources
- D1: `aibiotrxiv-production-db`, binding `DB`
- R2: `aibiotrxiv-user-content`, binding `AIBIO_STORAGE`

No additional D1 database or R2 bucket is required for the current architecture.

## Deployment note
`wrangler.toml` is intentionally absent. Manage D1/R2 bindings and environment variables through Cloudflare Dashboard.
