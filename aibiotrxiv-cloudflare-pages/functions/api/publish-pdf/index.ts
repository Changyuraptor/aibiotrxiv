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

function absolutizeResourceUrls(html: string, origin: string) {
  return String(html || "").replace(/\b(src|href)=(["'])(\/[^"']*)\2/gi, (_m, attr, quote, url) => {
    const absolute = `${origin}${String(url || "")}`;
    return `${attr}=${quote}${absolute}${quote}`;
  });
}

async function loadSiteCss(origin: string) {
  try {
    const res = await fetch(`${origin}/assets/css/style.css`, { cf: { cacheTtl: 60 } as any });
    if (res.ok) return await res.text();
  } catch (_) {}
  return "";
}

function mimeFromPath(path: string) {
  const clean = String(path || "").split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

async function dataUriForUrl(url: string, mimeHint = "image/jpeg") {
  const res = await fetch(url, { cf: { cacheTtl: 60 } as any });
  if (!res.ok) throw new Error(`Could not load PDF image asset: ${url}`);
  const contentType = res.headers.get("content-type") || mimeHint;
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

async function inlinePdfCriticalImages(html: string, origin: string) {
  let out = String(html || "");
  const brandPaths = new Set<string>();
  out.replace(/<img\b[^>]*\bsrc=(['"])([^'"]*Brand\.jpg[^'"]*)\1[^>]*>/gi, (_m, _q, src) => {
    brandPaths.add(String(src || ""));
    return _m;
  });
  for (const src of brandPaths) {
    try {
      const absolute = src.startsWith("http") ? src : `${origin}${src.startsWith("/") ? src : "/" + src}`;
      const dataUri = await dataUriForUrl(absolute, mimeFromPath(src));
      out = out.split(src).join(dataUri);
    } catch (err) {
      console.warn("Brand image could not be inlined for PDF", err);
    }
  }
  return out;
}

function productionPdfCss(siteCss = "") {
  return `
    ${siteCss || ""}

    /* v81: Cloudflare Browser Rendering / Chromium does not reliably render
       CSS paged-media margin boxes. The canonical preview/published PDF now
       uses Browser Rendering headerTemplate/footerTemplate for visible page
       furniture, while the document body remains the same preview layout. */
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }
    html, body {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }
    body.published-pdf-export {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color: #07152b !important;
    }
    body.published-pdf-export .topbar,
    body.published-pdf-export footer,
    body.published-pdf-export .no-print,
    body.published-pdf-export .layout-tool,
    body.published-pdf-export .page-title,
    body.published-pdf-export .panel-label,
    body.published-pdf-export #blogEditorToolbar,
    body.published-pdf-export .blog-editor-toolbar,
    body.published-pdf-export .figure-move-controls,
    body.published-pdf-export .hero-actions,
    body.published-pdf-export button {
      display: none !important;
    }
    body.published-pdf-export .site-shell,
    body.published-pdf-export .wide-shell,
    body.published-pdf-export .layout-workspace,
    body.published-pdf-export .single-layout-editor,
    body.published-pdf-export .layout-editor-pane,
    body.published-pdf-export .pdf-word-document {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      position: static !important;
      background: #fff !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      outline: none !important;
    }
    body.published-pdf-export .pdf-word-page {
      display: block !important;
      width: auto !important;
      min-height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      position: static !important;
      background: #fff !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      outline: none !important;
    }
    body.published-pdf-export .pdf-word-page .pdf-brand {
      display: flex !important;
      align-items: center !important;
      gap: 18px !important;
      min-height: 22mm !important;
      border-bottom: 4px solid #1f3a5f !important;
      padding-bottom: 20px !important;
      margin: 0 0 34px 0 !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    body.published-pdf-export .pdf-word-page .pdf-brand img {
      display: block !important;
      width: 72px !important;
      height: 72px !important;
      object-fit: contain !important;
      border-radius: 16px !important;
      background: #fff !important;
      box-shadow: none !important;
    }
    body.published-pdf-export .pdf-word-page .brand-title,
    body.published-pdf-export .pdf-word-page .pdf-brand-title {
      font-family: Georgia, 'Times New Roman', serif !important;
      font-size: 34px !important;
      line-height: 1 !important;
      font-weight: 700 !important;
      letter-spacing: -.025em !important;
      color: #1f3a5f !important;
      background: none !important;
      -webkit-text-fill-color: initial !important;
      -webkit-background-clip: initial !important;
      background-clip: initial !important;
    }
    body.published-pdf-export .pdf-word-page .brand-subtitle {
      display: block !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 10px !important;
      line-height: 1.2 !important;
      font-weight: 850 !important;
      letter-spacing: .12em !important;
      text-transform: uppercase !important;
      color: #5b6475 !important;
      margin-top: 5px !important;
    }
    body.published-pdf-export .pdf-word-page .pdf-title {
      font-family: Georgia, 'Times New Roman', serif !important;
      font-size: 24pt !important;
      line-height: 1.08 !important;
      margin: 0 0 18px !important;
      color: #07152b !important;
      letter-spacing: -.02em !important;
      font-weight: 700 !important;
    }
    body.published-pdf-export .pdf-authors {
      font-family: Inter, Arial, sans-serif !important;
      font-size: 12.5pt !important;
      margin: 0 0 8px !important;
      color: #1f3a5f !important;
    }
    body.published-pdf-export .pdf-meta {
      font-family: Inter, Arial, sans-serif !important;
      font-size: 10.5pt !important;
      color: #5b6475 !important;
      margin: 0 0 28px !important;
      border-bottom: 1px solid rgba(17,24,39,.12) !important;
      padding-bottom: 13px !important;
    }
    body.published-pdf-export .pdf-word-editor {
      font-family: Georgia, 'Times New Roman', serif !important;
      font-size: 11pt !important;
      line-height: 1.48 !important;
      color: #07152b !important;
      min-height: 0 !important;
      outline: none !important;
      widows: 2;
      orphans: 2;
    }
    body.published-pdf-export .pdf-word-editor h2 {
      font-family: Inter, Arial, sans-serif !important;
      font-size: 16pt !important;
      line-height: 1.22 !important;
      color: #1f3a5f !important;
      margin: 8mm 0 3mm !important;
      letter-spacing: -.02em !important;
      font-weight: 800 !important;
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    body.published-pdf-export .pdf-word-editor p,
    body.published-pdf-export .pdf-word-editor div.word-section-text,
    body.published-pdf-export .pdf-word-editor .word-section-text p,
    body.published-pdf-export .pdf-word-editor .word-section-text div {
      margin: 0 0 16px !important;
    }
    body.published-pdf-export .word-abstract-box {
      background: rgba(47,111,255,.075) !important;
      border: .4pt solid rgba(47,111,255,.22) !important;
      border-radius: 16px !important;
      padding: 4mm !important;
      margin: 0 0 28px !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    body.published-pdf-export .word-abstract-box h2 {
      margin: 0 0 12px !important;
      padding: 0 !important;
    }
    body.published-pdf-export .word-figure {
      position: relative !important;
      margin: 6mm auto !important;
      padding: 3mm !important;
      border: .35pt solid #d1d5db !important;
      border-radius: 16px !important;
      background: #fafafa !important;
      max-width: 92% !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      outline: none !important;
      outline-offset: 0 !important;
    }
    body.published-pdf-export .word-figure img {
      display: block !important;
      width: 100% !important;
      max-height: 105mm !important;
      height: auto !important;
      object-fit: contain !important;
      border-radius: 12px !important;
      background: #fff !important;
    }
    body.published-pdf-export .word-figure figcaption {
      display: block !important;
      margin-top: 10px !important;
      font-size: 10.5pt !important;
      line-height: 1.45 !important;
      color: #111827 !important;
    }
    body.published-pdf-export a {
      color: inherit !important;
      text-decoration: none !important;
    }
  `;
}

async function buildFullHtml(args: { origin: string; title: string; htmlFragment: string; css: string }) {
  const noDanger = stripDangerousHtml(args.htmlFragment);
  const withCriticalImages = await inlinePdfCriticalImages(noDanger, args.origin);
  const safeFragment = absolutizeResourceUrls(withCriticalImages, args.origin);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<base href="${escapeHtml(args.origin)}/">
<title>${escapeHtml(args.title)}</title>
<style>${productionPdfCss(args.css || "")}</style>
</head>
<body class="pdf-preview-mode print-editor-preview-only published-pdf-export">
${safeFragment}
</body>
</html>`;
}



function findBalancedPdfDict(src: string, start: number) {
  const open = src.indexOf("<<", start);
  if (open < 0) return null as null | { start: number; end: number; dict: string };
  let depth = 0;
  for (let i = open; i < src.length - 1; i++) {
    const pair = src.slice(i, i + 2);
    if (pair === "<<") { depth++; i++; continue; }
    if (pair === ">>") {
      depth--;
      i++;
      if (depth === 0) {
        const end = i + 1;
        return { start: open, end, dict: src.slice(open, end) };
      }
    }
  }
  return null as null | { start: number; end: number; dict: string };
}

function findFirstPdfPageObject(src: string) {
  const re = /(\d+)\s+(\d+)\s+obj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const objStart = m.index;
    const headerEnd = re.lastIndex;
    const endObj = src.indexOf("endobj", headerEnd);
    if (endObj < 0) break;
    const objText = src.slice(headerEnd, endObj);
    if (/\/Type\s*\/Page\b/.test(objText) && !/\/Type\s*\/Pages\b/.test(objText)) {
      const dictInfo = findBalancedPdfDict(src, headerEnd);
      if (dictInfo && dictInfo.end <= endObj) {
        return {
          objNum: Number(m[1]),
          genNum: Number(m[2]),
          objStart,
          objEnd: endObj + "endobj".length,
          headerEnd,
          dict: dictInfo.dict
        };
      }
    }
    re.lastIndex = endObj + "endobj".length;
  }
  return null as null | { objNum: number; genNum: number; objStart: number; objEnd: number; headerEnd: number; dict: string };
}

function replacePdfContentsEntry(pageDict: string, newObjRef: string) {
  if (/\/Contents\s*\[[\s\S]*?\]/.test(pageDict)) {
    return pageDict.replace(/\/Contents\s*\[([\s\S]*?)\]/, (_m, inner) => `/Contents [${String(inner || "").trim()} ${newObjRef}]`);
  }
  if (/\/Contents\s+\d+\s+\d+\s+R/.test(pageDict)) {
    return pageDict.replace(/\/Contents\s+(\d+\s+\d+\s+R)/, (_m, ref) => `/Contents [${ref} ${newObjRef}]`);
  }
  const tail = pageDict.lastIndexOf(">>");
  if (tail >= 0) return `${pageDict.slice(0, tail)} /Contents ${newObjRef} ${pageDict.slice(tail)}`;
  return pageDict;
}

function removeFirstPageHeaderOverlay(pdfBuffer: ArrayBuffer) {
  try {
    const bytes = new Uint8Array(pdfBuffer);
    let src = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      src += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const page = findFirstPdfPageObject(src);
    if (!page) return pdfBuffer;

    const startMatch = /startxref\s+(\d+)\s+%%EOF\s*$/s.exec(src);
    const prevXref = startMatch ? Number(startMatch[1]) : bytes.length;
    const trailerMatch = /trailer\s*<<(\s*[\s\S]*?)>>\s*startxref\s+\d+\s+%%EOF\s*$/s.exec(src);
    const trailerBody = trailerMatch ? trailerMatch[1] : "";
    const sizeMatch = /\/Size\s+(\d+)/.exec(trailerBody);
    const rootMatch = /\/Root\s+(\d+\s+\d+\s+R)/.exec(trailerBody);
    if (!sizeMatch || !rootMatch) return pdfBuffer;

    const oldSize = Number(sizeMatch[1]);
    const streamObj = oldSize;
    const newSize = oldSize + 1;
    const streamRef = `${streamObj} 0 R`;

    /* White out only the first-page Browser Rendering headerTemplate area.
       A4 is about 595 x 842 pt. The cover height is deliberately limited to
       the top 16 mm so it removes the extra running header without touching
       the first-page logo/title block below the PDF body margin. */
    const coverStream = "q\n1 1 1 rg\n0 797 596 45 re\nf\nQ\n";
    const streamObjText = `${streamObj} 0 obj\n<< /Length ${coverStream.length} >>\nstream\n${coverStream}endstream\nendobj\n`;
    const newPageDict = replacePdfContentsEntry(page.dict, streamRef);
    const pageObjText = `${page.objNum} ${page.genNum} obj\n${newPageDict}\nendobj\n`;

    const originalLen = bytes.length;
    const streamOffset = originalLen;
    const pageOffset = originalLen + streamObjText.length;
    const xrefOffset = pageOffset + pageObjText.length;
    const xrefText = `xref\n${page.objNum} 1\n${String(pageOffset).padStart(10, "0")} ${String(page.genNum).padStart(5, "0")} n \n${streamObj} 1\n${String(streamOffset).padStart(10, "0")} 00000 n \ntrailer\n<< /Size ${newSize} /Root ${rootMatch[1]} /Prev ${prevXref} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    const appended = streamObjText + pageObjText + xrefText;
    const out = new Uint8Array(originalLen + appended.length);
    out.set(bytes, 0);
    for (let i = 0; i < appended.length; i++) out[originalLen + i] = appended.charCodeAt(i) & 255;
    return out.buffer;
  } catch (err) {
    console.warn("Could not remove first-page PDF running header overlay", err);
    return pdfBuffer;
  }
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
        displayHeaderFooter: true,
        headerTemplate: `<div style="width:100%;box-sizing:border-box;padding-left:16mm;padding-top:5mm;font-family:Inter,Arial,sans-serif;font-size:8.5pt;line-height:1;font-weight:800;letter-spacing:.08em;color:#1f3a5f;text-align:left;white-space:nowrap;">AIBioTʀχiv AI BIOTHEORY ARCHIVE</div>`,
        footerTemplate: `<div style="width:100%;font-family:Inter,Arial,sans-serif;font-size:9pt;color:#1f3a5f;text-align:center;padding:0;margin:0;">Page <span class="pageNumber"></span></div>`,
        margin: { top: "18mm", right: "16mm", bottom: "20mm", left: "16mm" },
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
  const rawPdf = await res.arrayBuffer();
  return removeFirstPageHeaderOverlay(rawPdf);
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
  const filtered = published.filter((x: AnyRecord) => {
    const sameVersion = String(x?.version || "v1") === String(record.version || "v1");
    const sameArticle = String(x?.siteId || x?.articleId || "") === String(record.siteId || record.articleId || "");
    const sameRecord = String(x?.id || "") === String(record.id || "") || String(x?.sourceSubmissionId || "") === String(record.sourceSubmissionId || "");
    return !(sameVersion && (sameArticle || sameRecord));
  });
  filtered.push(record);
  await writeKv(db, "aibio_published", filtered);

  if (acceptedId) {
    const accepted = await readKvArray(db, "aibio_accepted");
    await writeKv(db, "aibio_accepted", accepted.filter((x: AnyRecord) => String(x?.id || "") !== String(acceptedId)));
    const submitted = await readKvArray(db, "aibio_submissions");
    await writeKv(db, "aibio_submissions", submitted.filter((x: AnyRecord) => String(x?.id || "") !== String(acceptedId)));
  }

  const papers = await readKvArray(db, "aibio_member_papers");
  if (papers.length) {
    const source = String(record.sourceSubmissionId || record.id || acceptedId || "");
    const article = String(record.siteId || record.articleId || "");
    const next = papers.map((p: AnyRecord) => {
      const match = String(p?.id || "") === source || String(p?.sourceSubmissionId || "") === source || (article && String(p?.siteId || p?.articleId || p?.versionGroupId || "") === article);
      if (!match) return p;
      return {
        ...p,
        status: "published",
        reviewStatus: "published",
        paymentStatus: p.paymentStatus || "paid",
        articleId: record.articleId,
        versionGroupId: record.versionGroupId || record.articleId,
        siteId: record.siteId || record.articleId,
        version: record.version || p.version || "v1",
        publishedAt: record.publishedAt || record.date || new Date().toISOString(),
        pdf: record.pdf,
        pdfR2Key: record.pdfR2Key,
        htmlR2Key: record.htmlR2Key
      };
    });
    await writeKv(db, "aibio_member_papers", next);
  }
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  try {
    const body: any = await request.json().catch(() => ({}));
    const previewOnly = body.previewOnly === true || body.mode === "preview";
    if (!previewOnly && !env.AIBIO_STORAGE) return json({ ok: false, error: "R2 binding AIBIO_STORAGE is missing." }, 500);
    const record: AnyRecord = body.record && typeof body.record === "object" ? body.record : {};
    const origin = new URL(request.url).origin;
    const articleId = sanitizeSlug(body.articleId || record.siteId || record.articleId || record.id || crypto.randomUUID(), "article");
    const version = sanitizeSlug(body.version || record.version || "v1", "v1");
    const filename = sanitizeFilename(body.filename || `${articleId}-${version}.pdf`, `${articleId}-${version}.pdf`).replace(/\.pdf$/i, "") + ".pdf";
    const htmlFragment = String(body.htmlFragment || "");
    if (!htmlFragment.trim()) return json({ ok: false, error: "htmlFragment is required." }, 400);

    const css = await loadSiteCss(origin);
    const fullHtml = await buildFullHtml({ origin, title: record.title || articleId, htmlFragment, css });
    const pdfBuffer = await callBrowserRunPdf(env, fullHtml);

    if (previewOnly) {
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
          "cache-control": "no-store",
          "x-aibiotrxiv-pdf-mode": "cloudflare-browser-rendering-preview"
        }
      });
    }

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
