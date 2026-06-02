# AIBioTrXiv v51 D1/R2 diagnostic

v51 adds a diagnostic endpoint:

```text
/api/system/health
```

It checks whether the Cloudflare Pages Function can see:

- `DB` D1 binding
- `AIBIO_STORAGE` R2 binding
- required D1 tables

To also test R2 write/read/delete:

```text
/api/system/health?write=1
```

Expected successful response includes:

```json
{
  "ok": true,
  "bindings": { "DB": true, "AIBIO_STORAGE": true },
  "d1": { "query": "ok" },
  "r2": { "binding": "ok" }
}
```

If a table returns an error, run `schema.sql` in the D1 console.

If `DB` or `AIBIO_STORAGE` is false, check Cloudflare Pages → Settings → Bindings.

This project no longer uses `wrangler.toml`; D1/R2 are expected to be configured from the Cloudflare Dashboard.
