# AIBioTrXiv v41 Security Hardening Guide

This version adds application-level defenses, but no public website can be made absolutely unhackable. The operational goal is: prevent common attacks, reduce damage if an account is compromised, preserve author credit records, and make recovery possible.

## Required Cloudflare settings

### Account security
- Enable Cloudflare account 2FA or passkeys.
- Do not store API tokens inside the website folder.
- Use least-privilege API tokens only when automation is required.

### Cloudflare Access for admin
Protect `/admin/*` with Cloudflare Access before the built-in admin login.
Recommended chain:
1. Cloudflare Access identity check.
2. AIBioTrXiv admin account + Password 1 + Password 2.
3. Admin session cookie signed by `ADMIN_SESSION_SECRET`.

### WAF / rate limiting
Add Cloudflare WAF rate limits:
- `/api/admin/login`: 5 requests / 10 minutes / IP → Managed Challenge or Block.
- `/api/member/login`: 20 requests / 10 minutes / IP → Managed Challenge.
- `/api/member/register`: 10 requests / 10 minutes / IP → Managed Challenge.
- `/api/comments`: 10 requests / minute / IP → Managed Challenge.
- `/api/submissions`: 10 requests / 10 minutes / IP → Managed Challenge.

### Turnstile
Optional but strongly recommended. Add these secrets if you enable Turnstile in forms:
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

The v41 Functions accept Turnstile tokens when the secret is configured.

## D1 protection

Use D1 Time Travel / point-in-time recovery. If a wrong admin action, attack, or broken deployment damages records, restore the database to a known-good time.

Important tables in v41:
- `security_audit_events`
- `security_rate_limits`
- `purge_requests`
- `admin_delete_events`

Do not physically delete article, submission, member, payment, or credit data from the web UI. v41 turns dangerous permanent deletion into `purge_requested` so records remain recoverable.

## R2 protection

Use immutable object keys. Never overwrite published files.

Recommended prefixes:
- `drafts/`
- `submissions/`
- `published/`
- `published/AIBioTrXiv-YYYY-NNNN/v1/article.pdf`
- `published/AIBioTrXiv-YYYY-NNNN/v2/article.pdf`
- `reports/`
- `backups/`

Enable R2 bucket lock rules for:
- `published/`
- `backups/`

Recommended retention: at least 180 days, preferably 365+ days for published records.

## Delete / recover policy

The admin UI now treats delete as soft delete. Trash restore should recover the record to its previous area. `Request permanent purge` does not erase content. It marks the item as a purge request and writes an audit event.

Manual physical deletion should happen only after:
1. Checking D1 backup availability.
2. Checking R2 retention / backup status.
3. Confirming legal and moderation need.
4. Exporting the audit record.

## Peer-comment restriction vs account suspension

Do not punish article publishing rights for comment-only abuse.

- `Peer-comment restriction`: blocks comments only.
- `Full account suspension`: blocks submissions, payments, revisions, and comments.

Existing published articles should not be affected by comment-only restrictions.

## Payment protection

v40+ verifies PayPal orders server-side using:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

The system should only mark a payment as paid after PayPal confirms:
- order status is completed,
- currency is USD,
- amount is US$5.00.

## What still requires operational setup

v41 includes code and schema for hardening, but Cloudflare Dashboard settings are still required:
- Access policy for `/admin/*`.
- WAF rate limits.
- D1 Time Travel awareness and recovery workflow.
- R2 bucket lock rules.
- Resend or other email provider.
- Turnstile site key / secret if you enable challenge forms.
