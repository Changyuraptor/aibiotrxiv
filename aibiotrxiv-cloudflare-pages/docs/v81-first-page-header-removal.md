# v81 first-page PDF running-header removal

The canonical Cloudflare Browser Rendering PDF path still uses `headerTemplate` so that the running header appears on later pages. Because Browser Rendering applies `headerTemplate` to page 1 as well, v81 adds a narrow PDF post-processing overlay on page 1 only. The overlay hides the first-page running header without touching the logo/title block. Preview PDF and published PDF continue to use the same backend generator.
