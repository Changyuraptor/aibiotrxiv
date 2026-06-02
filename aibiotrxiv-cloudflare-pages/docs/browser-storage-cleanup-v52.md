# Browser storage cleanup in v52

AIBioTrXiv no longer uses browser `localStorage` or `sessionStorage` as a persistent data store.

Earlier prototype versions stored member accounts, submissions, articles, comments, and admin workflow data in browser storage. That could interfere with D1/R2 testing because an old browser could still display stale local records.

v52 adds a one-time-on-load legacy cleanup routine in `public/assets/js/app.js`. It removes only AIBioTrXiv-specific legacy keys such as:

- `aibio_members`
- `aibio_current_member`
- `aibio_submissions`
- `aibio_drafts`
- `aibio_published`
- `aibio_accepted`
- `aibio_rejected`
- `aibio_unpublished`
- `aibio_trash`
- `aibio_comments`
- any key beginning with `aibio_`, `AIBIO_`, `aibiotrxiv_`, or `AIBioTrXiv_`

Persistent data must be stored in Cloudflare D1 and files must be stored in Cloudflare R2.

Cloudflare resources remain:

- D1 binding: `DB` → `aibiotrxiv-production-db`
- R2 binding: `AIBIO_STORAGE` → `aibiotrxiv-user-content`
