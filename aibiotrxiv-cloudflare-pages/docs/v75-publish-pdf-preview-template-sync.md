# v75 publish PDF preview-template sync

This version changes the published PDF generator so the backend uses the same DOM contract and CSS rules as the admin Editing workspace PDF preview. It also forces Publish to save the currently visible editing workspace content before calling the backend PDF generator, preventing stale accepted-list data from being used.

Key points:
- `/api/publish-pdf` now embeds the site stylesheet plus v75 preview-specific print overrides.
- The backend HTML uses `pdf-preview-mode print-editor-preview-only published-pdf-export`.
- The first-page brand block, Georgia body typography, Inter-style headings, abstract box, figure styling, and CSS `@page` running header/page number rules are preserved.
- `publishAccepted()` now awaits `persistWordLayoutEditsAndWait()` and builds the PDF from the current `wordPdfEditor` DOM before publishing.
