# AIBioTrXiv Cloudflare Pages

This project is designed for Cloudflare Pages with Pages Functions, Cloudflare D1, and Cloudflare R2.

## Local static preview

```bash
cd public
python -m http.server 8787
```

Open `http://localhost:8787/`.

Static preview is useful for viewing pages and testing localStorage-based member/submission flows. Admin login requires Pages Functions, so use Cloudflare Pages deployment or Wrangler Pages dev for admin testing.

## Cloudflare Pages settings

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `public`

## Admin credentials

Fill `admin-credentials.txt` privately, then run:

```bash
npm run prepare-admin
```

For a production deployment, Cloudflare Pages secrets are preferred:

```bash
wrangler pages secret put ADMIN_ACCOUNT
wrangler pages secret put ADMIN_PASSWORD_1
wrangler pages secret put ADMIN_PASSWORD_2
wrangler pages secret put ADMIN_SESSION_SECRET
wrangler pages secret put PAYPAL_CLIENT_SECRET
```

`ADMIN_SESSION_SECRET` is a long random string used to sign the admin session cookie after login. It is not a login password.

## Brand image

The site uses:

```text
public/assets/img/Brand.jpg
```

## Current behavior

- Member registration uses display name, email, password, password confirmation, and email verification flow.
- Manuscripts are saved as member drafts first.
- Formal submission requires PayPal US$5 processing-fee payment.
- Paid submissions enter admin review.
- AI Research and AI Idea submissions are separated and filterable.
- Published articles include peer comments for logged-in members.
- Footer includes The Sound of Evolution contact email.
- Admin pages are protected by account + two passwords.

## Backend plan

- D1 stores members, submissions, manuscript metadata, comments, payment records, and audit events.
- R2 stores JPG/PNG figures and generated PDF files.
- PayPal payment verification is now implemented through `/api/member/payment`. For production, set both `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in Cloudflare Pages. The site should not mark a manuscript as paid unless PayPal server-side verification succeeds.


## Admin payment email

Payment notification emails are addressed to `aibiotrxiv@gmail.com`. Configure Cloudflare Pages variables/secrets `ADMIN_PAYMENT_NOTIFICATION_EMAIL`, `RESEND_API_KEY`, and `EMAIL_FROM` to send real email after PayPal server-side verification.


## Admin login local testing

After editing `admin-credentials.txt`, run `npm install`, `npm run prepare-admin`, then `npm run dev`. Open the Wrangler Pages URL, not a directly opened HTML file and not a simple static server.


## Local review-flow testing account

The member email `changyuraptor.dinosaur@gmail.com` is configured in the front-end prototype as a payment-bypass testing account. Manuscripts submitted from that verified member account move directly to admin review with `paymentStatus: waived`, so the review flow can be tested without repeated PayPal payments. In production, implement this bypass on the Cloudflare Pages Functions side and store the waiver decision in D1.

## Member suspension

Admin member management is available at `/admin/members/`. Suspension does not delete member records; it prevents submission, payment, and peer-comment activity until the account is restored.

## Production storage resources for Cloudflare Pages

Create these Cloudflare resources before production launch:

- D1 database name: `aibiotrxiv-production-db`
- D1 binding name in `wrangler.toml`: `DB`
- R2 bucket name: `aibiotrxiv-user-content`
- R2 binding name in `wrangler.toml`: `AIBIO_STORAGE`

All persistent production data should live in D1 or R2, not inside the deployed website folder. See `docs/cloudflare-deployment-storage.md`.
