# v45 admin login fix

This version fixes a Cloudflare Pages runtime issue where `/api/admin/login` could return 500 after the Function was successfully deployed.

The login Function no longer mutates `context.env`. Some Cloudflare Pages runtimes expose the environment object as read-only, so the previous `Object.assign(env, cfg)` step could fail before the session cookie was created.

If admin login still fails:

- `401` means the account or password values do not match.
- `429` means too many failed attempts; wait for the rate-limit window.
- `500` with `missing` fields means one or more Production variables/secrets are absent.
- `/api/admin/session` returning `401` before login is normal.
