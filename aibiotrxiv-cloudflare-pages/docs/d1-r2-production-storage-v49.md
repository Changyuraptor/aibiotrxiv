# AIBioTrXiv v49 D1/R2 storage model

v49 removes browser localStorage as a source of truth. Persistent data is stored in Cloudflare D1 and uploaded files are stored in Cloudflare R2.

## Required Cloudflare resources

Only two storage resources are required:

1. D1 database: `aibiotrxiv-production-db`
   - Binding name: `DB`
2. R2 bucket: `aibiotrxiv-user-content`
   - Binding name: `AIBIO_STORAGE`

You do not need additional D1 databases or R2 buckets for the current architecture.

## What goes into D1

- Members and email verification state
- Manuscript drafts, submission status, payment status, review status
- Published article metadata and version metadata
- Peer comments and comment moderation state
- Admin moderation actions, audit logs, purge requests
- PayPal verification records and payment notification records
- R2 object indexes

## What goes into R2

- Submitted figure images
- Future generated PDFs
- Future article HTML snapshots
- Future supplementary files

## Important deployment note

This ZIP intentionally does not include `wrangler.toml`. D1/R2 bindings and environment variables are managed through the Cloudflare Dashboard.
