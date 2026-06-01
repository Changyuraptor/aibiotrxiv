# Admin login troubleshooting

If `/api/admin/login` returns 405, the Pages Function is not receiving the POST request or the route is being handled as a static asset.

This version uses a universal `onRequest()` handler for `/api/admin/login` and includes `public/_routes.json` to force `/api/*` through Pages Functions.

After deployment, open:

```text
https://YOUR_DOMAIN/api/admin/login
```

Expected GET response:

```json
{"ok":true,"endpoint":"/api/admin/login","method":"GET","message":"Admin login API is deployed. Use POST to log in."}
```

If you still receive 405 or an HTML page, Cloudflare did not deploy the `functions/` directory. Check Root directory and build output settings.
