AIBioTrXiv v49 D1/R2 storage

This version is rebuilt from v48 and removes persistent browser localStorage/sessionStorage usage from the active front-end scripts.

Data storage:
- Members, sessions, email verification tokens: D1
- Manuscript metadata, authors, sections, review states, payments: D1
- Peer comments and reports: D1
- Uploaded figures and future PDFs/HTML snapshots: R2, with keys recorded in D1

Cloudflare resources needed:
- D1: aibiotrxiv-production-db, binding DB
- R2: aibiotrxiv-user-content, binding AIBIO_STORAGE

Initialize D1 by either running aibiotrxiv-production-db-v49.sql in D1 Console or visiting /api/system/init-d1?secret=INIT_DATABASE_SECRET after setting INIT_DATABASE_SECRET as a Cloudflare Pages secret.
