# v73 published PDF exact preview layout

This version fixes the published PDF pipeline so that the generated R2 PDF is based on the same print-layout model as the PDF preview workspace.

Changes:
- The `/api/publish-pdf` backend now builds a self-contained print document instead of relying on mixed site CSS plus separate Puppeteer header/footer templates.
- The published PDF uses CSS `@page` running margins, matching the preview model:
  - first page keeps the AIBioTrXiv brand block and centered page number;
  - page 2 and later include `AIBioTʀχiv AI BIOTHEORY ARCHIVE` in the top-left running header;
  - all pages include centered page numbers.
- The AIBioTrXiv brand image is inlined as a data URI before Cloudflare Browser Rendering receives the HTML. This prevents the broken-logo problem in generated PDFs.
- The browser `html2pdf` fallback has been disabled for admin publishing because it does not faithfully reproduce the preview PDF layout. If Cloudflare Browser Rendering fails, publishing is stopped instead of uploading a mismatched PDF.
