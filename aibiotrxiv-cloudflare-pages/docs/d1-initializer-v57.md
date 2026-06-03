# D1 initializer v57

The D1 initializer no longer uses `DB.exec(fullSchema)`.
It now splits the schema into individual SQL statements and runs them one by one.

Use:

`/api/system/init-d1?secret=YOUR_INIT_DATABASE_SECRET`

If needed, aliases are also available:

- `/api/system/initd1?secret=...`
- `/api/init-d1?secret=...`
- `/api/init-database?secret=...`
