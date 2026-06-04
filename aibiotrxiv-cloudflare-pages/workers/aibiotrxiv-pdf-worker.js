// Standalone Worker version of the AIBioTrXiv PDF generator.
// Recommended Worker name: aibiotrxiv-pdf-worker
// Route option: https://pdf.thesoundofevolution.com/* or a Workers route under your Cloudflare zone.
// The Pages site already includes /functions/api/publish-pdf/index.ts, so this Worker is optional.

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'POST only. Use the Pages Function /api/publish-pdf for normal publishing.' }, 405);
    }
    try {
      const body = await request.json();
      if (!env.AIBIO_STORAGE) return json({ ok: false, error: 'R2 binding AIBIO_STORAGE is missing.' }, 500);
      const accountId = env.CF_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
      const token = env.CF_BROWSER_TOKEN || env.CLOUDFLARE_API_TOKEN;
      if (!accountId) return json({ ok: false, error: 'CF_ACCOUNT_ID is missing.' }, 500);
      if (!token) return json({ ok: false, error: 'CF_BROWSER_TOKEN is missing.' }, 500);

      const articleId = slug(body.articleId || body.record?.siteId || body.record?.articleId || crypto.randomUUID(), 'article');
      const version = slug(body.version || body.record?.version || 'v1', 'v1');
      const filename = fileSlug(body.filename || `${articleId}-${version}.pdf`, `${articleId}-${version}.pdf`).replace(/\.pdf$/i, '') + '.pdf';
      const html = String(body.html || body.fullHtml || body.htmlFragment || '');
      if (!html.trim()) return json({ ok: false, error: 'html/htmlFragment is required.' }, 400);

      const pdfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          pdfOptions: { format: 'a4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, timeout: 30000 },
          viewport: { width: 794, height: 1123 },
          gotoOptions: { waitUntil: 'networkidle0', timeout: 45000 }
        })
      });
      if (!pdfRes.ok) return json({ ok: false, error: 'Browser Run PDF failed', detail: await pdfRes.text() }, 500);
      const pdfBuffer = await pdfRes.arrayBuffer();
      const key = `published/${articleId}/${version}/${filename}`;
      await env.AIBIO_STORAGE.put(key, pdfBuffer, { httpMetadata: { contentType: 'application/pdf', contentDisposition: `inline; filename="${filename}"` } });
      return json({ ok: true, key, url: `/api/storage/r2-object?key=${encodeURIComponent(key)}`, sizeBytes: pdfBuffer.byteLength });
    } catch (err) {
      return json({ ok: false, error: 'PDF Worker failed', detail: String(err?.stack || err?.message || err) }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function slug(value, fallback) {
  return String(value || '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || fallback;
}
function fileSlug(value, fallback) {
  return String(value || '').replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160) || fallback;
}
