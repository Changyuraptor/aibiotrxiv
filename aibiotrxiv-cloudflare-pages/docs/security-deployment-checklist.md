# Security Deployment Checklist

Before public launch:

- [ ] D1 database `aibiotrxiv-production-db` created.
- [ ] R2 bucket `aibiotrxiv-user-content` created.
- [ ] D1 binding name is `DB`.
- [ ] R2 binding name is `AIBIO_STORAGE`.
- [ ] `schema.sql` executed once on D1.
- [ ] `migrations/0002_security_hardening.sql` reviewed and applied only where columns do not already exist.
- [ ] Cloudflare Access protects `/admin/*`.
- [ ] WAF rate limiting protects login, register, comments, submissions, payment.
- [ ] R2 bucket lock set for `published/` and `backups/`.
- [ ] Cloudflare account 2FA / passkey enabled.
- [ ] `PAYPAL_CLIENT_SECRET` set as encrypted secret.
- [ ] `ADMIN_SESSION_SECRET` set as encrypted secret and is not reused elsewhere.
- [ ] `RESEND_API_KEY` set as encrypted secret if email is enabled.
- [ ] Test: admin login wrong password is rate-limited.
- [ ] Test: article delete goes to trash, not permanent removal.
- [ ] Test: purge request does not physically remove the record.
- [ ] Test: trash restore returns item to correct state.
- [ ] Test: comment restriction does not affect article publishing rights.
- [ ] Test: full suspension blocks submissions and comments.
