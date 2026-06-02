# Email verification behavior

AIBioTrXiv accounts must remain unverified after registration until the member clicks the verification link sent to their email inbox.

## Required Cloudflare variables

Set these in Cloudflare Pages → Settings → Variables and Secrets:

- `RESEND_API_KEY` — encrypted secret from Resend.
- `EMAIL_FROM` — verified sender address, such as `AIBioTrXiv <no-reply@your-domain>`.

## Flow

1. Member submits the registration form.
2. `/api/member/register` creates the member in D1 with `email_verified = 0`.
3. The API creates an `email_verification_tokens` row containing a SHA-256 hash of the verification token.
4. The API sends an email containing `/member/verify/?email=...&token=...`.
5. The member opens the email link.
6. `/member/verify/` calls `/api/member/verify`.
7. The API verifies the token hash, marks it used, and updates `members.email_verified = 1`.

Do not display verification links directly on the registration page in production. Verification must be completed from the user's email inbox.
