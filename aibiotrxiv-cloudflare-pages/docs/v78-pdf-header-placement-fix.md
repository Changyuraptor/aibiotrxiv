# v78 PDF header placement fix

This version removes the body-fixed running header that could appear inside the page content or on page 1 in the canonical PDF preview and published PDF. The running header is now defined in the backend PDF print CSS using CSS page margin boxes.

Expected PDF behavior:

- Page 1: no running header text in the upper-left page margin; the normal AIBioTrXiv brand block remains in the manuscript header.
- Page 2 and following pages: `AIBioTʀχiv AI BIOTHEORY ARCHIVE` appears in the upper-left page margin.
- All pages: the Cloudflare Browser Rendering footer still provides `Page X` centered at the bottom.
- PDF preview and published PDF still use the same backend template and PDF options.
