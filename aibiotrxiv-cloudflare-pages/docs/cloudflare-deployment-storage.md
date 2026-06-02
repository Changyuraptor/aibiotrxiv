# Cloudflare deployment storage

The production deployment uses one D1 database and one R2 bucket.

## D1
Database name: `aibiotrxiv-production-db`
Binding name: `DB`

Run `schema.sql` in the D1 console before opening the site to public users.

## R2
Bucket name: `aibiotrxiv-user-content`
Binding name: `AIBIO_STORAGE`

Uploaded figures are written to this bucket and referenced from D1 by object key.
