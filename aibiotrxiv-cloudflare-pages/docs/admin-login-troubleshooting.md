# Admin login troubleshooting

If `/api/admin/login` returns 500, open the browser Network tab, click `/api/admin/login`, and read the JSON response. v45 returns the crash detail in the `detail` field.

Expected GET check:

```json
{"ok":true,"route":"/api/admin/login","accepts":"POST","configured":true}
```

If `configured` is false, set these Cloudflare Pages Variables and Secrets in Production:

- ADMIN_ACCOUNT
- ADMIN_PASSWORD_1
- ADMIN_PASSWORD_2
- ADMIN_SESSION_SECRET

If the POST returns 401, the API is working and the credentials do not match exactly.
