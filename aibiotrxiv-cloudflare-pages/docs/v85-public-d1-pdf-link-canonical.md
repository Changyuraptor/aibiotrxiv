# v85 public D1 + latest PDF link fix

This version fixes two production-facing problems:

1. Public Browse manuscripts and dynamic manuscript pages no longer read `aibio_published` from browser localStorage. Public article discovery is now driven by the D1-backed `/api/storage/kv` response, with the built-in static demo article remaining as static seed content.

2. Published PDF URLs now include a fingerprint query parameter derived from the current PDF SHA-256. When a version PDF is regenerated, the public Download PDF URL changes immediately even if the R2 key path is the same, preventing browsers from continuing to show a previously cached PDF.

The public article Download PDF button also resolves the latest version for the article root and uses the latest PDF URL.
