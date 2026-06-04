# v80 Browser Rendering header placement

Cloudflare Browser Rendering did not reliably output CSS @page margin boxes in PDF output. v80 moves the visible PDF running header into the Browser Rendering headerTemplate and keeps the page number in footerTemplate. PDF preview and published PDF still share the same backend PDF generator and template.
