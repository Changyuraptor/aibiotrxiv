# AIBioTrXiv v53 D1 initialization

v53 keeps persistent website data in Cloudflare D1 and R2.

Required resources:

- D1 database: `aibiotrxiv-production-db`
- D1 binding: `DB`
- R2 bucket: `aibiotrxiv-user-content`
- R2 binding: `AIBIO_STORAGE`

## Best setup method

The D1 Console may execute only one selected SQL statement, which caused previous
`no such table` errors. v53 includes a protected initializer endpoint that runs
the complete schema through the backend.

1. Add this Cloudflare Pages secret:

```text
INIT_DATABASE_SECRET=your-long-random-private-string
```

2. Deploy v53.

3. Open once:

```text
https://YOUR_DOMAIN/api/system/init-d1?secret=YOUR_INIT_DATABASE_SECRET
```

4. Verify:

```text
https://YOUR_DOMAIN/api/system/health
```

The D1 table checks should be `ok: true`.

## Manual alternative

You can paste `schema.sql` into D1 Console, but the initializer endpoint is safer.
