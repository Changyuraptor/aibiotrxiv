# AIBioTrXiv production PDF generation setup

This build removes the old browser-side `html2pdf.js` publishing dependency. The admin Publish button now sends the final PDF HTML to `/api/publish-pdf`. The Cloudflare Pages Function calls Cloudflare Browser Run `/pdf`, stores the generated PDF and HTML in R2, records the object keys in D1, and only then allows the article to be marked as published.

## Cloudflare Pages project name

Use your existing Pages project. Recommended name if you recreate it:

```txt
aibiotrxiv-cloudflare-pages
```

## Optional standalone Worker name

The Pages Function is already complete, so a separate Worker is not required. If you still want a standalone Worker, create:

```txt
aibiotrxiv-pdf-worker
```

Use the file:

```txt
workers/aibiotrxiv-pdf-worker.js
```

## Required Cloudflare Pages bindings and variables

Go to:

```txt
Cloudflare Dashboard
→ Workers & Pages
→ aibiotrxiv-cloudflare-pages
→ Settings
→ Functions
→ Bindings / Variables
```

Set these for both Production and Preview.

| Name | Type | Value |
|---|---|---|
| `AIBIO_STORAGE` | R2 bucket binding | Your AIBioTrXiv R2 bucket, for example `aibiotrxiv-user-content` |
| `DB` | D1 database binding | Your D1 database, for example `aibiotrxiv-production-db` |
| `CF_ACCOUNT_ID` | Environment variable | Your Cloudflare Account ID |
| `CF_BROWSER_TOKEN` | Secret variable | Cloudflare API token with `Account → Browser Rendering → Edit` permission |

Do not rename `AIBIO_STORAGE` or `DB` unless you also edit the code. This website already uses `DB` in existing Pages Functions.

## Cloudflare API token

Create a custom Cloudflare API token with:

```txt
Account → Browser Rendering → Edit
```

Limit the token to your Cloudflare account. Store the token as:

```txt
CF_BROWSER_TOKEN
```

## R2 bucket name

Recommended bucket name:

```txt
aibiotrxiv-user-content
```

The code stores generated files here:

```txt
published/{articleId}/{version}/{articleId}-{version}.pdf
published/{articleId}/{version}/{articleId}-{version}.html
```

## What changed in this ZIP

```txt
functions/api/publish-pdf/index.ts
```

New production PDF endpoint. It creates the PDF with Cloudflare Browser Run and stores PDF/HTML in R2.

```txt
public/assets/js/admin.js
```

The Publish action no longer loads `html2pdf.bundle.min.js`. It calls `/api/publish-pdf`.

```txt
workers/aibiotrxiv-pdf-worker.js
```

Optional standalone Worker code.

```txt
docs/pdf-generation-production-setup.md
```

This setup guide.

## Deployment

Commit this folder to GitHub and redeploy Cloudflare Pages.

After deployment, open the admin accepted manuscript layout page and click Publish. A successful publication should create these R2 objects:

```txt
published/AIBioTrXiv-YYYY-000X/v1/AIBioTrXiv-YYYY-000X-v1.pdf
published/AIBioTrXiv-YYYY-000X/v1/AIBioTrXiv-YYYY-000X-v1.html
```

The public PDF URL saved into the article record uses:

```txt
/api/storage/r2-object?key=published/...
```

## Common errors

### `CF_ACCOUNT_ID is missing`

Add `CF_ACCOUNT_ID` in Pages environment variables.

### `CF_BROWSER_TOKEN is missing`

Add the API token as a secret variable named `CF_BROWSER_TOKEN`.

### `Browser Run PDF failed (401)`

The token is wrong or lacks `Browser Rendering - Edit` permission.

### `R2 binding AIBIO_STORAGE is missing`

Add an R2 bucket binding named exactly `AIBIO_STORAGE`.

### `D1 binding DB is missing`

Add a D1 binding named exactly `DB`. PDF generation can still work without D1 only if you remove registry mirroring, but this production package expects D1.
