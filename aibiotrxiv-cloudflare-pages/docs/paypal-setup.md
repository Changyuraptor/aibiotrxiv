# PayPal setup for AIBioTrXiv

AIBioTrXiv v40 uses automatic server-side PayPal verification before a manuscript is marked as paid.

## Required Cloudflare Pages variables / secrets

Set these in Cloudflare Pages:

```text
PAYPAL_CLIENT_ID=your PayPal client ID
PAYPAL_CLIENT_SECRET=your PayPal Secret key 1
```

`PAYPAL_CLIENT_ID` is used by the PayPal button. `PAYPAL_CLIENT_SECRET` must be stored only as a Cloudflare encrypted secret. Do not put the secret in HTML, client-side JavaScript, GitHub, or any public file.

Optional:

```text
PAYPAL_MODE=live
```

Use `PAYPAL_MODE=sandbox` only when your PayPal app and button are also sandbox credentials.

## Payment verification flow

1. The member opens the payment page.
2. PayPal creates and captures a US$5 order in the browser.
3. The browser sends only the PayPal order ID to `/api/member/payment`.
4. The Pages Function uses `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` to request a PayPal access token.
5. The Pages Function retrieves the order from PayPal and verifies:
   - order or capture is completed
   - currency is USD
   - amount is exactly US$5.00
6. Only after this verification does the front end mark the manuscript as paid and move it into the admin review queue.
7. If `RESEND_API_KEY` and `EMAIL_FROM` are configured, the site emails `aibiotrxiv@gmail.com`.

## Important

If `PAYPAL_CLIENT_SECRET` is missing, automatic verification will fail. That is intentional. A manuscript should not be marked paid in production unless the server has verified the PayPal order.
