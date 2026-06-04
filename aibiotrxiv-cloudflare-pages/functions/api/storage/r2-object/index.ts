export interface Env {
  AIBIO_STORAGE: R2Bucket;
  DB?: D1Database;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function sanitizeKey(key: string) {
  key = String(key || "").replace(/^\/+/, "").replace(/\.\./g, "");
  if (!key || key.length > 900) throw new Error("Invalid R2 key.");
  if (!/^[A-Za-z0-9._~!$&'()*+,;=:@\/-]+$/.test(key)) throw new Error("R2 key contains unsupported characters.");
  return key;
}

function base64ToBytes(base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function ensureRegistry(db?: D1Database) {
  if (!db) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS r2_object_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    r2_key TEXT UNIQUE,
    object_key TEXT UNIQUE,
    bucket_name TEXT NOT NULL DEFAULT 'aibiotrxiv-user-content',
    owner_type TEXT,
    owner_id TEXT,
    object_role TEXT,
    version_label TEXT,
    sha256 TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    immutable INTEGER NOT NULL DEFAULT 1,
    retention_until TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
  )`).run();
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  if (!env.AIBIO_STORAGE) return json({ ok: false, error: "R2 binding AIBIO_STORAGE is missing." }, 500);

  const body: any = await request.json().catch(() => ({}));
  const key = sanitizeKey(body.key);
  const mimeType = String(body.mimeType || "application/octet-stream");
  const filename = String(body.filename || key.split("/").pop() || "file");
  const bytes = base64ToBytes(String(body.base64 || ""));

  if (!bytes.length) return json({ ok: false, error: "Empty file body." }, 400);
  if (bytes.length > 25 * 1024 * 1024) return json({ ok: false, error: "File is too large for this upload endpoint." }, 413);

  await env.AIBIO_STORAGE.put(key, bytes, {
    httpMetadata: {
      contentType: mimeType,
      contentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`
    },
    customMetadata: {
      ownerType: String(body.ownerType || ""),
      ownerId: String(body.ownerId || ""),
      uploadedAt: new Date().toISOString()
    }
  });

  if (env.DB) {
    await ensureRegistry(env.DB);
    await env.DB.prepare(`INSERT INTO r2_object_registry
      (r2_key, object_key, bucket_name, owner_type, owner_id, object_role, mime_type, size_bytes, immutable, created_at)
      VALUES (?, ?, 'aibiotrxiv-user-content', ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(r2_key) DO UPDATE SET
        object_key = excluded.object_key,
        owner_type = excluded.owner_type,
        owner_id = excluded.owner_id,
        object_role = excluded.object_role,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        deleted_at = NULL`)
      .bind(key, key, String(body.ownerType || ""), String(body.ownerId || ""), "published_pdf", mimeType, bytes.length)
      .run();
  }

  return json({
    ok: true,
    key,
    filename,
    mimeType,
    sizeBytes: bytes.length,
    url: `/api/storage/r2-object?key=${encodeURIComponent(key)}`
  });
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  if (!env.AIBIO_STORAGE) return json({ ok: false, error: "R2 binding AIBIO_STORAGE is missing." }, 500);
  const url = new URL(request.url);
  const key = sanitizeKey(url.searchParams.get("key") || "");
  const object = await env.AIBIO_STORAGE.get(key);
  if (!object) return json({ ok: false, error: "R2 object not found." }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (!headers.get("content-type")) headers.set("content-type", "application/octet-stream");
  return new Response(object.body, { headers });
}


export async function onRequestDelete(context: { request: Request; env: Env }) {
  const { request, env } = context;
  if (!env.AIBIO_STORAGE) return json({ ok: false, error: "R2 binding AIBIO_STORAGE is missing." }, 500);
  const body: any = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const rawKeys = Array.isArray(body.keys) ? body.keys : [body.key || url.searchParams.get("key")].filter(Boolean);
  const keys = rawKeys.map((k: string) => sanitizeKey(k));
  const blocked = keys.filter((key: string) => !key.startsWith("published/") || key.endsWith("/") || key.includes("*"));
  if (blocked.length) return json({ ok: false, error: "Unsafe R2 delete blocked.", blocked }, 400);
  for (const key of keys) {
    await env.AIBIO_STORAGE.delete(key);
    if (env.DB) {
      await ensureRegistry(env.DB);
      await env.DB.prepare("UPDATE r2_object_registry SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted' WHERE r2_key = ? OR object_key = ?")
        .bind(key, key)
        .run();
    }
  }
  return json({ ok: true, deleted: keys });
}
