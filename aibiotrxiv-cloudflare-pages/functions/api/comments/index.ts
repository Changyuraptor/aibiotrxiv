async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function getCookie(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  const part = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(name + '='));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
async function ensurePeerCommentsTable(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS peer_comments (
    id TEXT PRIMARY KEY,
    manuscript_id TEXT NOT NULL,
    manuscript_public_id TEXT,
    version_number INTEGER,
    member_id TEXT NOT NULL,
    member_email TEXT,
    comment_html TEXT,
    comment_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'visible',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_by_admin TEXT,
    deleted_at TEXT,
    delete_reason TEXT,
    report_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  )`).run();
}
async function currentMember(request: Request, env: any) {
  if (!env.DB) return null;
  const token = getCookie(request, 'aibio_member_session');
  if (!token) return null;
  const hash = await sha256(token);
  const row: any = await env.DB.prepare(`
    SELECT m.id, m.name, m.display_name, m.email, m.account_status, m.comment_status, m.comment_suspended, m.comment_suspension_reason
    FROM member_sessions s
    JOIN members m ON m.id = s.member_id
    WHERE s.session_token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).bind(hash).first();
  return row || null;
}
export async function onRequestGet(context: any) {
  const env = context.env || {};
  if (!env.DB) return json({ ok: false, error: 'D1 DB binding is missing.' }, 500);
  await ensurePeerCommentsTable(env.DB);
  const url = new URL(context.request.url);
  const manuscriptId = String(url.searchParams.get('manuscriptId') || '').trim();
  if (!manuscriptId) return json({ ok: false, error: 'manuscriptId is required.' }, 400);
  const rows = await env.DB.prepare(`
    SELECT pc.id,
           pc.manuscript_id AS manuscriptId,
           pc.manuscript_public_id AS manuscriptPublicId,
           pc.version_number AS versionNumber,
           pc.member_email AS email,
           COALESCE(m.display_name, m.name, pc.member_email, 'Member') AS name,
           pc.comment_text AS text,
           pc.status,
           pc.is_deleted AS isDeleted,
           pc.created_at AS createdAt
    FROM peer_comments pc
    LEFT JOIN members m ON CAST(m.id AS TEXT) = pc.member_id
    WHERE pc.manuscript_id = ? AND COALESCE(pc.is_deleted,0) = 0 AND COALESCE(pc.status,'visible') = 'visible'
    ORDER BY pc.created_at ASC
  `).bind(manuscriptId).all();
  return json({ ok: true, comments: rows.results || [] });
}
export async function onRequestPost(context: any) {
  const env = context.env || {};
  if (!env.DB) return json({ ok: false, error: 'D1 DB binding is missing.' }, 500);
  await ensurePeerCommentsTable(env.DB);
  const member = await currentMember(context.request, env);
  if (!member) return json({ ok: false, error: 'Member login is required to post peer comments.' }, 401);
  if (String(member.account_status || 'active') !== 'active') return json({ ok: false, error: 'This member account is suspended.' }, 403);
  if (member.comment_suspended || String(member.comment_status || 'allowed') === 'restricted') return json({ ok: false, error: member.comment_suspension_reason || 'Peer-comment privilege is restricted.' }, 403);
  let body: any = {};
  try { body = await context.request.json(); } catch { return json({ ok: false, error: 'Invalid JSON payload.' }, 400); }
  const manuscriptId = String(body.manuscriptId || '').trim();
  const text = String(body.commentText || body.text || '').trim();
  if (!manuscriptId) return json({ ok: false, error: 'manuscriptId is required.' }, 400);
  if (text.length < 10) return json({ ok: false, error: 'Please write a more substantive peer comment.' }, 400);
  if (text.length > 3000) return json({ ok: false, error: 'Please keep peer comments under 3000 characters.' }, 400);
  const id = 'CMT-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8);
  await env.DB.prepare(`INSERT INTO peer_comments
    (id, manuscript_id, manuscript_public_id, version_number, member_id, member_email, comment_text, status, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'visible', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(id, manuscriptId, String(body.manuscriptPublicId || manuscriptId), Number(body.versionNumber || 1), String(member.id), String(member.email || ''), text)
    .run();
  return json({ ok: true, comment: { id, manuscriptId, manuscriptPublicId: body.manuscriptPublicId || manuscriptId, versionNumber: Number(body.versionNumber || 1), name: member.display_name || member.name || member.email, email: member.email, text, status: 'visible', createdAt: new Date().toISOString() } });
}
