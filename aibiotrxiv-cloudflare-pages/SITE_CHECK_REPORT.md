# AIBioTrXiv v41 Site Check Report

Date: 2026-06-01

## Security-hardening changes checked

- Added Cloudflare Pages Functions middleware with security headers and same-origin protection for state-changing requests.
- Added static `_headers` file for public assets and HTML responses.
- Added optional Turnstile verification helper for sensitive API routes.
- Added D1-backed rate-limit helper for admin login and member registration.
- Added D1-backed audit helper.
- Updated admin login to record failed/successful attempts and rate-limit brute-force attempts.
- Updated member registration API placeholder into a D1-ready server endpoint with validation, password hashing, email verification token creation, and optional email sending.
- Changed local admin trash "permanent delete" behavior into purge-request behavior to avoid accidental irreversible deletion in the UI.
- Added migration file for security audit, rate-limit, purge-request, R2 registry, and admin delete event tables.
- Added security documentation, disaster recovery plan, and deployment checklist.

## Local syntax checks

- `node --check` completed successfully for all JavaScript files under `public/assets/js/`.

## Important operational requirements

The ZIP hardens the codebase, but the following must be configured in Cloudflare Dashboard before public operation:

- Cloudflare account 2FA / passkey.
- Cloudflare Access for `/admin/*`.
- WAF rate limits for login, registration, comments, submissions, and payment endpoints.
- D1 Time Travel awareness and recovery workflow.
- R2 bucket lock rules for `published/` and `backups/` prefixes.
- Cloudflare Pages encrypted secrets.
- PayPal server-side verification secrets.
- Email provider secrets.


## v43 admin login route fix

- Converted `/api/admin/login`, `/api/admin/session`, and `/api/admin/logout` into directory-based Pages Function routes.
- `/api/admin/login` now responds to GET with a JSON diagnostic message so deployment can confirm whether the function route is active.
- Removed ambiguous flat admin login route files.


## v44 admin login hotfix
- Removed D1/R2 placeholder bindings from wrangler.toml so Dashboard bindings can be used.
- Removed env mutation in admin login function to avoid immutable env runtime crashes.
- Added JSON error details for admin login function crashes.
