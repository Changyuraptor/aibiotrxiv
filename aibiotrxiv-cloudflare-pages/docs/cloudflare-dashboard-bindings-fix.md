# Cloudflare dashboard binding deployment fix

This project manages D1 and R2 bindings from the Cloudflare Pages dashboard instead of hardcoding binding IDs in `wrangler.toml`.

## Required Cloudflare Pages bindings

Go to:

Workers & Pages → aibiotrxiv → Settings → Bindings

Add:

- D1 database binding
  - Variable name: `DB`
  - Database: `aibiotrxiv-production-db`

- R2 bucket binding
  - Variable name: `AIBIO_STORAGE`
  - Bucket: `aibiotrxiv-user-content`

## Why `wrangler.toml` no longer contains a database_id

Leaving this placeholder in `wrangler.toml` causes deployment failure:

```toml
database_id = "REPLACE_WITH_D1_DATABASE_ID"
```

Cloudflare validates the UUID during Functions publishing, so a placeholder value blocks deployment.

Use dashboard bindings, or replace the placeholder with the real D1 UUID if you choose to manage bindings in `wrangler.toml`.
