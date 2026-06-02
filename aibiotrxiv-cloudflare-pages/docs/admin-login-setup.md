# Admin login setup

The admin login has three visible fields: admin account, password 1, and password 2.

`ADMIN_SESSION_SECRET` is not a login password. It is a private random string used by the backend to sign the admin session cookie after login. Use a long value, for example 32+ random letters, numbers, and symbols.

## Local testing

Editing `admin-credentials.txt` alone is not enough. After editing it, run:

```bash
npm install
npm run prepare-admin
npm run dev
```

Then open the site through the Wrangler local URL, usually:

```text
http://localhost:8788/admin/login/
```

Do not test admin login by double-clicking HTML files or by using `python -m http.server`, because those methods do not run Cloudflare Pages Functions. Without Pages Functions, `/api/admin/login` cannot read your credentials.

## Cloudflare Pages production setup

For production, set these as Cloudflare Pages secrets:

```bash
wrangler pages secret put ADMIN_ACCOUNT
wrangler pages secret put ADMIN_PASSWORD_1
wrangler pages secret put ADMIN_PASSWORD_2
wrangler pages secret put ADMIN_SESSION_SECRET
wrangler pages secret put ADMIN_PAYMENT_NOTIFICATION_EMAIL
wrangler pages secret put COMMENT_REPORT_EMAIL
wrangler pages secret put RESEND_API_KEY
wrangler pages secret put EMAIL_FROM
```

`admin-credentials.txt` must stay outside `public/`. Do not upload it as a public website file.
