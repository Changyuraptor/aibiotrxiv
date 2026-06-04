# v74 Browser Run PDF payload fix

Fixes the Cloudflare Browser Run PDF API payload used by `/api/publish-pdf`.

The Browser Run `/pdf` endpoint accepts `pdfOptions.format` values as lowercase enum values such as `a4`, not `A4`. v73 sent `A4`, causing a 400 `invalid_enum_value` response before PDF generation could start.

This version keeps the exact preview-style PDF HTML/CSS pipeline from v73, keeps the removal of mismatched html2pdf fallback, and changes the backend PDF request to use `format: "a4"`.
