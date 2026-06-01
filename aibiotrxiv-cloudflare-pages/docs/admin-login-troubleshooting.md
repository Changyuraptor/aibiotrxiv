# Admin login troubleshooting

If `/api/admin/login` returns `405 Method Not Allowed`, Cloudflare Pages is not executing the intended Pages Function route.

Check these items:

1. Deploy the project root folder, not only `public/`.
   - Correct root: `aibiotrxiv-cloudflare-pages`
   - Build output directory: `public`
   - The root must contain both `public/` and `functions/`.

2. Confirm the function route is active.
   Open this URL in a browser:
   `/api/admin/login`

   A working deployment should return JSON like:
   `{ "ok": true, "route": "/api/admin/login", "accepts": "POST" }`

3. Variables must be set in Cloudflare Pages → Settings → Variables and Secrets for Production:
   - ADMIN_ACCOUNT
   - ADMIN_PASSWORD_1
   - ADMIN_PASSWORD_2
   - ADMIN_SESSION_SECRET

4. After changing variables or uploading a new ZIP, redeploy the Pages project.

5. Do not test admin login with `file://`, VS Code Live Server, or `python -m http.server`. These do not run Pages Functions.
