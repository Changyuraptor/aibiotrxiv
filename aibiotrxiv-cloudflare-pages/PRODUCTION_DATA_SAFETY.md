# AIBioTrXiv production data safety notes

This website update is designed so a GitHub/Cloudflare Pages deployment does not reset Cloudflare D1 or R2.

## Deployment behavior

Uploading a new website version to GitHub changes static files and Pages Functions only. It does not run SQL migrations, does not clear D1, and does not delete R2 objects.

## D1 protections added in v62

- Browser-side D1 writes are disabled if `/api/storage/kv` did not load successfully.
- `/api/storage/kv` blocks accidental attempts to overwrite a non-empty production array with an empty array unless `allowEmptyOverwrite=true` is explicitly sent.
- D1 init endpoints are disabled unless the Cloudflare Pages environment variable `ALLOW_DB_INIT=true` is temporarily set.

## R2 protections added in v62

- R2 delete API only allows exact keys under `published/`.
- Wildcard-like or folder-like deletes are blocked.
- Unpublish/recover should delete only that article version's recorded PDF/HTML keys.

## Operational rule

Do not leave `ALLOW_DB_INIT=true` in production. Use it only briefly when intentionally running schema initialization or migration, then remove it and redeploy.
