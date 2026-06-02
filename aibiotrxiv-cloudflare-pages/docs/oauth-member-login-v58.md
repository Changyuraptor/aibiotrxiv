# AIBioTrXiv v58 OAuth-only member login

Member accounts now use Google / Facebook OAuth instead of password registration and email verification.

Cloudflare Pages Variables / Secrets needed:

Google:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

Facebook:
- FACEBOOK_APP_ID
- FACEBOOK_APP_SECRET

Callback URLs to add in provider consoles:
- https://YOUR_DOMAIN/api/auth/google/callback
- https://YOUR_DOMAIN/api/auth/facebook/callback

Existing admin login is unchanged.

D1:
Run /api/system/init-d1?secret=YOUR_INIT_DATABASE_SECRET after deploying v58 to add:
- member_oauth_accounts
- OAuth columns on members when supported
