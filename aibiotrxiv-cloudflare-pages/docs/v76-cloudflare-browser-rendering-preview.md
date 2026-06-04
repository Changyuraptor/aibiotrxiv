# v76 Cloudflare Browser Rendering PDF Preview

PDF preview no longer uses local browser `window.print()`. Admin and author layout workspaces now call `/api/publish-pdf` with `previewOnly: true`, which generates a canonical preview PDF through Cloudflare Browser Rendering without writing published records or R2 objects. Publishing continues to use the same backend HTML/CSS template and Browser Rendering path, so preview and final published PDF are produced by the same engine.

Required environment variables remain: `CF_ACCOUNT_ID` and `CF_BROWSER_TOKEN` (or the legacy aliases already supported by the function).
