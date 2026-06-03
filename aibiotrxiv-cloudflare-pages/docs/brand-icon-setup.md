# Brand and browser icon setup

The site uses `/assets/img/Brand.jpg?v=38` for the header/footer logo and browser favicon.

To replace the logo:

1. Put your image here: `public/assets/img/Brand.jpg`.
2. Keep the filename exactly `Brand.jpg`.
3. Redeploy the whole `aibiotrxiv-cloudflare-pages` folder to Cloudflare Pages.
4. If the old image still appears, hard refresh the browser or purge Cloudflare cache.

The query string `?v=38` and `_headers` rule are added to reduce browser cache problems.
