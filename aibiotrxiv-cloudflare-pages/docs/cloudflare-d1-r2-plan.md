# Cloudflare D1/R2 plan

AIBioTrXiv uses Cloudflare D1 as the persistent database and Cloudflare R2 as persistent object storage.

Required resources:
- D1 database: `aibiotrxiv-production-db`, binding `DB`
- R2 bucket: `aibiotrxiv-user-content`, binding `AIBIO_STORAGE`

D1 stores accounts, email verification, manuscripts, statuses, comments, moderation events, payments, article versions, audit logs, and R2 object indexes. R2 stores figures, PDFs, article HTML snapshots, and supplementary files.
