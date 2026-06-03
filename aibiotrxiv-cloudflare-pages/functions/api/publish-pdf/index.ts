export interface Env {
  AIBIO_STORAGE: R2Bucket;
  DB?: D1Database;
  CF_ACCOUNT_ID?: string;
  CF_BROWSER_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

type AnyRecord = Record<string, any>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function sanitizeSlug(value: string, fallback = "aibiotrxiv") {
  const cleaned = String(value || "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return cleaned || fallback;
}

function sanitizeFilename(value: string, fallback: string) {
  const cleaned = String(value || "")
    .replace(/[^A-Za-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  return cleaned || fallback;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripDangerousHtml(html: string) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

async function loadSiteCss(origin: string) {
  try {
    const res = await fetch(`${origin}/assets/css/style.css`, { cf: { cacheTtl: 60 } as any });
    if (res.ok) return await res.text();
  } catch (_) {}
  return "";
}

function productionPdfCss() {
  return `
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print, .figure-move-controls, .blog-editor-toolbar, button { display: none !important; }
    .pdf-word-document { display: block !important; background: white !important; padding: 0 !important; border-radius: 0 !important; }
    .pdf-word-page { width: auto !important; min-height: auto !important; margin: 0 !important; padding: 12mm 14mm 17mm !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; }
    .pdf-word-page .pdf-brand { display: flex !important; align-items: center !important; gap: 14px !important; border-bottom: 3px solid #1f3a5f !important; padding-bottom: 12px !important; margin-bottom: 22px !important; }
    .pdf-word-page .pdf-brand img { width: 58px !important; height: 58px !important; object-fit: contain !important; border-radius: 12px !important; }
    .pdf-word-page .brand-title { font-family: Georgia, 'Times New Roman', serif !important; color: #1f3a5f !important; background: none !important; -webkit-text-fill-color: initial !important; font-size: 25px !important; line-height: 1.1 !important; }
    .pdf-word-page .brand-subtitle { color: #5b6475 !important; font-size: 8pt !important; letter-spacing: .12em !important; text-transform: uppercase !important; }
    .pdf-word-page .pdf-title { font-family: Georgia, 'Times New Roman', serif !important; font-size: 24pt !important; line-height: 1.15 !important; margin: 0 0 12px !important; color: #111827 !important; }
    .pdf-authors { font-size: 10.5pt !important; margin: 0 0 6px !important; color: #1f3a5f !important; }
    .pdf-meta { font-size: 9pt !important; color: #5b6475 !important; margin: 0 0 18px !important; }
    .pdf-word-editor { font-family: Georgia, 'Times New Roman', serif !important; font-size: 11pt !important; line-height: 1.48 !important; color: #07152b !important; min-height: 0 !important; outline: 0 !important; }
    .pdf-word-editor h2 { font-family: Arial, Helvetica, sans-serif !important; font-size: 15pt !important; line-height: 1.22 !important; color: #1f3a5f !important; margin: 8mm 0 3mm !important; break-after: avoid !important; }
    .pdf-word-editor p, .pdf-word-editor div.word-section-text { margin: 0 0 10px !important; }
    .word-abstract-box { background: rgba(47,111,255,.075) !important; border: .4pt solid rgba(47,111,255,.22) !important; border-radius: 10px !important; padding: 4mm !important; margin: 0 0 8mm !important; break-inside: avoid !important; }
    .word-abstract-box h2 { margin-top: 0 !important; }
    .word-figure { max-width: 92% !important; margin: 6mm auto !important; padding: 3mm !important; border: .35pt solid #d1d5db !important; border-radius: 10px !important; background: #fafafa !important; break-inside: avoid !important; page-break-inside: avoid !important; }
    .word-figure img { display: block !important; width: 100% !important; max-height: 105mm !important; height: auto !important; object-fit: contain !important; border-radius: 8px !important; background: #fff !important; }
    .word-figure figcaption { margin-top: 8px !important; font-size: 9pt !important; line-height: 1.35 !important; color: #111827 !important; }
    a { color: inherit !important; text-decoration: none !important; }
  `;
}

function buildFullHtml(args: { origin: string; title: string; htmlFragment: string; css: string }) {
  const safeFragment = stripDangerousHtml(args.htmlFragment);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<base href="${escapeHtml(args.origin)}/">
<title>${escapeHtml(args.title)}</title>
<style>${args.css}\n${productionPdfCss()}</style>
</head>
<body>
${safeFragment}
</body>
</html>`;
}

async function callBrowserRunPdf(env: Env, html: string) {
  const accountId = env.CF_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CF_BROWSER_TOKEN || env.CLOUDFLARE_API_TOKEN;
  if (!accountId) throw new Error("CF_ACCOUNT_ID is missing.");
  if (!token) throw new Error("CF_BROWSER_TOKEN is missing.");

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/pdf`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      html,
      pdfOptions: {
        format: "a4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        timeout: 30000
      },
      viewport: { width: 794, height: 1123 },
      gotoOptions: { waitUntil: "networkidle0", timeout: 45000 }
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Browser Run PDF failed (${res.status}): ${detail.slice(0, 2000)}`);
  }
  return await res.arrayBuffer();
}

async function sha256Hex(buffer: ArrayBuffer | string) {
  const bytes = typeof buffer === "string" ? new TextEncoder().encode(buffer) : buffer;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
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
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_kv_storage (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function registerObject(db: D1Database | undefined, key: string, ownerId: string, role: string, mimeType: string, size: number, hash: string, version: string) {
  if (!db) return;
  await ensureRegistry(db);
  await db.prepare(`INSERT INTO r2_object_registry
    (r2_key, object_key, bucket_name, owner_type, owner_id, object_role, version_label, sha256, mime_type, size_bytes, immutable, status, created_at)
    VALUES (?, ?, 'aibiotrxiv-user-content', 'published_article', ?, ?, ?, ?, ?, ?, 1, 'active', CURRENT_TIMESTAMP)
    ON CONFLICT(r2_key) DO UPDATE SET
      object_key = excluded.object_key,
      owner_id = excluded.owner_id,
      object_role = excluded.object_role,
      version_label = excluded.version_label,
      sha256 = excluded.sha256,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      deleted_at = NULL,
      status = 'active'`)
    .bind(key, key, ownerId, role, version, hash, mimeType, size)
    .run();
}

async function readKvArray(db: D1Database | undefined, key: string) {
  if (!db) return [] as AnyRecord[];
  await ensureRegistry(db);
  const row: any = await db.prepare("SELECT value_json FROM app_kv_storage WHERE key = ?").bind(key).first();
  if (!row?.value_json) return [] as AnyRecord[];
  try {
    const parsed = JSON.parse(row.value_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return [] as AnyRecord[]; }
}

async function writeKv(db: D1Database | undefined, key: string, value: unknown) {
  if (!db) return;
  await ensureRegistry(db);
  await db.prepare(`INSERT INTO app_kv_storage (key, value_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`)
    .bind(key, JSON.stringify(value ?? null)).run();
}

async function mirrorPublishedLists(db: D1Database | undefined, record: AnyRecord, acceptedId: string) {
  if (!db) return;
  const published = await readKvArray(db, "aibio_published");
  const filtered = published.filter((x: AnyRecord) =>
    String(x?.id || "") !== String(record.id || "") &&
    String(x?.siteId || x?.articleId || "") !== String(record.siteId || record.articleId || "") &&
    String(x?.sourceSubmissionId || "") !== String(record.sourceSubmissionId || "")
  );
  filtered.push(record);
  await writeKv(db, "aibio_published", filtered);

  if (acceptedId) {
    const accepted = await readKvArray(db, "aibio_accepted");
    await writeKv(db, "aibio_accepted", accepted.filter((x: AnyRecord) => String(x?.id || "") !== String(acceptedId)));
  }
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    if (!env.AIBIO_STORAGE) return json({ ok: false, error: "R2 binding AIBIO_STORAGE is missing." }, 500);

    const body: any = await request.json().catch(() => ({}));
    const record: AnyRecord = body.record && typeof body.record === "object" ? body.record : {};
    const origin = new URL(request.url).origin;
    const articleId = sanitizeSlug(body.articleId || record.siteId || record.articleId || record.id || crypto.randomUUID(), "article");
    const version = sanitizeSlug(body.version || record.version || "v1", "v1");
    const filename = sanitizeFilename(body.filename || `${articleId}-${version}.pdf`, `${articleId}-${version}.pdf`).replace(/\.pdf$/i, "") + ".pdf";
    const htmlFragment = String(body.htmlFragment || "");
    if (!htmlFragment.trim()) return json({ ok: false, error: "htmlFragment is required." }, 400);

    const css = await loadSiteCss(origin);
    const fullHtml = buildFullHtml({ origin, title: record.title || articleId, htmlFragment, css });
    const pdfBuffer = await callBrowserRunPdf(env, fullHtml);

    const baseKey = `published/${articleId}/${version}`;
    const pdfKey = `${baseKey}/${filename}`;
    const htmlKey = `${baseKey}/${articleId}-${version}.html`;
    const pdfHash = await sha256Hex(pdfBuffer);
    const htmlHash = await sha256Hex(fullHtml);

    await env.AIBIO_STORAGE.put(htmlKey, fullHtml, {
      httpMetadata: { contentType: "text/html; charset=utf-8", contentDisposition: `inline; filename="${articleId}-${version}.html"` },
      customMetadata: { articleId, version, objectRole: "published_html", generatedAt: new Date().toISOString() }
    });
    await env.AIBIO_STORAGE.put(pdfKey, pdfBuffer, {
      httpMetadata: { contentType: "application/pdf", contentDisposition: `inline; filename="${filename.replace(/"/g, "")}"` },
      customMetadata: { articleId, version, objectRole: "published_pdf", generatedAt: new Date().toISOString() }
    });

    await registerObject(env.DB, htmlKey, articleId, "published_html", "text/html; charset=utf-8", new TextEncoder().encode(fullHtml).length, htmlHash, version);
    await registerObject(env.DB, pdfKey, articleId, "published_pdf", "application/pdf", pdfBuffer.byteLength, pdfHash, version);

    const now = new Date().toISOString();
    const updatedRecord = {
      ...record,
      articleId,
      versionGroupId: articleId,
      siteId: articleId,
      version,
      status: "published",
      pdf: `/api/storage/r2-object?key=${encodeURIComponent(pdfKey)}`,
      pdfR2Key: pdfKey,
      htmlR2Key: htmlKey,
      pdfFileName: filename,
      pdfGeneratedAt: now,
      pdfGenerationMode: "cloudflare-browser-run-r2",
      pdfSha256: pdfHash,
      htmlSha256: htmlHash
    };

    await mirrorPublishedLists(env.DB, updatedRecord, String(body.acceptedId || body.sourceSubmissionId || record.sourceSubmissionId || record.id || ""));

    return json({ ok: true, record: updatedRecord, pdfKey, htmlKey, pdfUrl: updatedRecord.pdf, sizeBytes: pdfBuffer.byteLength });
  } catch (err: any) {
    return json({ ok: false, error: "Publish PDF failed", detail: String(err?.stack || err?.message || err) }, 500);
  }
}
