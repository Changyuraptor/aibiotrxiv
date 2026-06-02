# AIBioTrXiv v47 site check

- `wrangler.toml` is intentionally absent so D1/R2 bindings can be managed in the Cloudflare dashboard.
- Member registration now keeps accounts unverified until an email verification link is clicked.
- The registration page no longer displays a direct verification button or local testing verification link.
- `/api/member/verify` now verifies D1 email tokens and marks `members.email_verified = 1` only after token validation.
- Payment and formal submission remain blocked until `emailVerified` is true in the client session.
