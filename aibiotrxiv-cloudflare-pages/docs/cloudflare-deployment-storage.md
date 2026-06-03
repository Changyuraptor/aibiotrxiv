# AIBioTrXiv Cloudflare D1 / R2 deployment storage

Use Cloudflare Pages for the static website and Pages Functions. Do not store production member, article, payment, comment, or moderation records inside the project folder. The folder can be replaced safely only when persistent records are kept in Cloudflare D1 and files are kept in Cloudflare R2.

## Required Cloudflare resources

### D1 database

Create exactly one D1 database:

```bash
npx wrangler d1 create aibiotrxiv-production-db
```

Wrangler will return a database UUID. Put that UUID into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "aibiotrxiv-production-db"
database_id = "PASTE_DATABASE_UUID_HERE"
```

The `DB` binding is the single source of truth for:

- member accounts and email verification
- admin-visible submission records
- draft metadata
- payment records and PayPal order IDs
- article metadata
- article versions and timestamp/credit records
- peer comments
- article and comment reports
- account suspension events
- peer-comment-only restriction events
- R2 object metadata and content fingerprints

After editing the database UUID, initialize the database:

```bash
npx wrangler d1 execute aibiotrxiv-production-db --remote --file=./schema.sql
```

### R2 bucket

Create exactly one R2 bucket:

```bash
npx wrangler r2 bucket create aibiotrxiv-user-content
```

Bind it in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "AIBIO_STORAGE"
bucket_name = "aibiotrxiv-user-content"
```

Use this bucket for user-generated files with prefixes:

```text
submissions/{submission_id}/figures/{file_id}.jpg
submissions/{submission_id}/figures/{file_id}.png
submissions/{submission_id}/source/{file_id}
articles/{article_id}/versions/v1/article.html
articles/{article_id}/versions/v1/article.pdf
articles/{article_id}/versions/v1/figures/{file_id}.jpg
articles/{article_id}/versions/v2/article.html
articles/{article_id}/versions/v2/article.pdf
admin/reports/{report_id}.json
```

Keep file metadata in D1 `storage_objects`; keep the binary file itself in R2.


## Environment variables and secrets

Set these in Cloudflare Pages → Settings → Variables and Secrets:

```text
ADMIN_ACCOUNT
ADMIN_PASSWORD_1
ADMIN_PASSWORD_2
ADMIN_SESSION_SECRET
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
ADMIN_PAYMENT_NOTIFICATION_EMAIL
RESEND_API_KEY
EMAIL_FROM
```

`PAYPAL_CLIENT_ID` identifies the PayPal app used by the front-end PayPal button. `PAYPAL_CLIENT_SECRET` is required only when the site verifies PayPal orders from a Pages Function. If the first public release uses manual PayPal confirmation from your PayPal dashboard, the site can run without `PAYPAL_CLIENT_SECRET`; in that mode, the admin should confirm payment before reviewing the manuscript.

Never expose `PAYPAL_CLIENT_SECRET` in HTML, client-side JavaScript, or public files. Store it only as a Cloudflare encrypted secret.

## Moderation model

AIBioTrXiv uses two separate enforcement tracks:

1. **Full account suspension** blocks manuscript submission, PayPal submission, new versions, and peer comments. It does not automatically delete already published articles.
2. **Peer-comment restriction** blocks only peer comments. It must not block article submission, article version management, or already published articles.

Admins can delete improper peer comments directly from an article page while logged in as admin. This action should set the comment status to deleted and record `deleted_by_admin` and `deleted_at` in D1.

## Important deployment note

The current browser prototype still includes localStorage fallback for local testing. Production deployment should route all account, draft, payment, article, version, comment, and moderation writes through Pages Functions backed by D1/R2.

## v40 PayPal automatic verification note

For production automatic payment confirmation, configure both:

```text
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
```

`PAYPAL_CLIENT_SECRET` must be an encrypted Cloudflare Pages secret. The browser sends the PayPal order ID to `/api/member/payment`; the Pages Function verifies the order with PayPal before the manuscript is marked paid.
