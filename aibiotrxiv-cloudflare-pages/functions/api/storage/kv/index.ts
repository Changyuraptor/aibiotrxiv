export interface Env { DB: D1Database; }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

const ALLOWED_KEYS = new Set([
  "aibio_demo_submission",
  "aibio_submissions",
  "aibio_accepted",
  "aibio_published",
  "aibio_unpublished",
  "aibio_trash",
  "aibio_security_audit_events",
  "aibio_members",
  "aibio_member_papers",
  "aibio_payment_notifications",
  "aibio_email_verifications"
]);

async function ensureTable(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_kv_storage (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: "D1 binding DB is missing." }, 500);
  await ensureTable(env.DB);
  const url = new URL(request.url);
  const keys = String(url.searchParams.get("keys") || "")
    .split(",")
    .map(k => k.trim())
    .filter(k => ALLOWED_KEYS.has(k));
  const values: Record<string, unknown> = {};
  for (const key of keys) {
    const row: any = await env.DB.prepare("SELECT value_json FROM app_kv_storage WHERE key = ?").bind(key).first();
    if (row?.value_json) {
      try { values[key] = JSON.parse(row.value_json); } catch { values[key] = null; }
    }
  }
  return json({ ok: true, values });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: "D1 binding DB is missing." }, 500);
  await ensureTable(env.DB);
  const body: any = await request.json().catch(() => ({}));
  const writes = Array.isArray(body.items) ? body.items : [{ key: body.key, value: body.value }];
  const saved: string[] = [];
  for (const item of writes) {
    const key = String(item?.key || "");
    if (!ALLOWED_KEYS.has(key)) continue;
    await env.DB.prepare(`INSERT INTO app_kv_storage (key, value_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`)
      .bind(key, JSON.stringify(item.value ?? null)).run();
    saved.push(key);
  }
  return json({ ok: true, saved });
}
