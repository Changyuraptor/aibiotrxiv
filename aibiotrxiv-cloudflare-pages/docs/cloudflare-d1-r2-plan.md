# Cloudflare D1/R2 integration plan for AIBioTrXiv

This prototype currently uses browser localStorage so the workflow can be tested without a backend. The data model has been prepared so production can move to Cloudflare D1 and R2.

## D1 should store

- member accounts and email verification state
- manuscript draft metadata
- submission category: `AI Research` or `AI Idea`
- PayPal order IDs and payment status
- section text, figure legends, selected license
- content fingerprints and timestamped credit records
- review status, accepted/published/unpublished state
- audit events for dispute handling

## R2 should store

- uploaded JPG/PNG figures
- generated PDF files
- optional manuscript export files

D1 should store only the R2 object key, MIME type, size, and hash, not the file body.

## Suggested production sequence

1. Register member account in D1.
2. Create email verification token in D1 and send verification email.
3. Store draft metadata and sections in D1.
4. Upload figures to R2 and store their keys in `submission_files`.
5. Create PayPal order server-side and record it in `payment_records`.
6. Verify PayPal capture server-side before setting `payment_status = paid`.
7. Move the manuscript into admin review queue only after payment verification.
8. On publication, store public article metadata, PDF R2 key, license, timestamp, and content fingerprint.

## Security notes

- Do not store plaintext passwords. Use a server-side password hash.
- Do not trust frontend PayPal status alone. Always verify payment server-side.
- Protect admin routes with Cloudflare Access or a server-side role system.
- Keep PayPal secret credentials in Cloudflare environment variables, never in frontend JavaScript.


## Payment notification email

When a PayPal payment is approved, the member frontend calls `POST /api/member/payment` with the submission ID, member email, title, PayPal order ID, and amount. The production function is prepared to email `aibiotrxiv@gmail.com`.

To send real email on Cloudflare Pages, configure these secrets:

```text
ADMIN_PAYMENT_NOTIFICATION_EMAIL=aibiotrxiv@gmail.com
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=AIBioTrXiv <notifications@your-domain.example>
```

Without an email provider secret, the local prototype stores a local notification record and returns the email body that would be sent, but it cannot send real email.

Admin review queue rule: only records with `payment_status = 'paid'` and `review_status = 'under_review'` should appear in the admin submission management queue. Unpaid drafts remain visible only in each member's dashboard.


## Payment-bypass testing account

For local and staging review-flow testing, `changyuraptor.dinosaur@gmail.com` is allowed to submit drafts directly to editorial review with `paymentStatus: waived`. In production, this rule should be implemented in Cloudflare Pages Functions, not trusted solely from front-end JavaScript. Store the waiver in D1 with `payment_waived = 1`, `payment_waiver_reason`, and an admin audit event.

## Member suspension

Member suspension should be stored in D1 on the member record. A suspended account remains in the database, but API routes should block submission creation, PayPal payment capture, peer comments, and other member actions until an admin restores the account.
