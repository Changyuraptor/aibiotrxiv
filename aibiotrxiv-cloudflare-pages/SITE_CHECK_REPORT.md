# AIBioTrXiv v51 site check report

## Persistent storage check

- Browser `localStorage` / `sessionStorage` search: no persistent storage usage found in `public/` or `functions/`.
- Member registration writes to D1 `members` and `email_verification_tokens`.
- Member login reads from D1 `members` and sets an HttpOnly cookie.
- Member drafts and formal submissions write to D1 `member_manuscripts`.
- Submitted JPG/PNG figures embedded as data URLs are uploaded to R2 `AIBIO_STORAGE`; R2 keys are recorded in D1 `app_files`.
- Admin submission actions update D1 `member_manuscripts`.
- Public manuscripts load from D1 `member_manuscripts`.
- Peer comments load/write/delete through D1 `peer_comments`.

## Changed in v51

- Added `/api/system/health` to diagnose D1 and R2 bindings and required tables.
- Replaced placeholder `/api/submissions` with a D1-backed member submission endpoint.
- Removed outdated README wording about localStorage-based member/submission testing.

## Remaining deployment requirements

- D1 binding name must be `DB`.
- R2 binding name must be `AIBIO_STORAGE`.
- Run `schema.sql` in D1 before testing registration/submissions.
- The project intentionally has no `wrangler.toml`; Cloudflare Dashboard bindings are the source of truth.
