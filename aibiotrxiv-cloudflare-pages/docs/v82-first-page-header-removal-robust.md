# v82 first-page running-header removal

This version keeps canonical PDF preview and published PDF on the same Cloudflare Browser Rendering pipeline.

Cloudflare Browser Rendering applies `headerTemplate` to every page and does not provide a native `headerTemplateExceptFirstPage` option. To keep the required running header on page 2 and later while removing it from page 1, the backend now post-processes the generated PDF by appending a white overlay content stream to the first page only.

Changes:

- Keeps `headerTemplate` for stable page 2+ running headers.
- Keeps `footerTemplate` for centered `Page X` page numbers.
- Expands the first-page white overlay to cover the complete Browser Rendering header band.
- Adds fallback PDF root/size detection for PDFs whose final trailer is not a classic trailer block.
- Preview PDF and published PDF still use the same `/api/publish-pdf` backend route.
