import { getCookie, verifyAdminToken, type Env } from '../../admin/_session';
import { LOCAL_ADMIN_CREDENTIALS } from '../../admin/_local_credentials';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export async function onRequestPost(context: any) {
  const env = context.env as Env & { DB?: D1Database };
  const secret = env.ADMIN_SESSION_SECRET || LOCAL_ADMIN_CREDENTIALS.ADMIN_SESSION_SECRET;
  const check = await verifyAdminToken({ ...env, ADMIN_SESSION_SECRET: secret }, getCookie(context.request));
  if (!check.ok) return json({ ok: false, error: 'Admin session required.' }, 401);

  let payload: any = {};
  try { payload = await context.request.json(); } catch { return json({ ok: false, error: 'Invalid JSON payload.' }, 400); }
  const commentId = String(payload.commentId || '').trim();
  const manuscriptId = String(payload.manuscriptId || '').trim();
  if (!commentId) return json({ ok: false, error: 'commentId is required.' }, 400);

  if (env.DB) {
    await env.DB.prepare(
      `UPDATE peer_comments SET status = 'deleted', is_deleted = 1, deleted_by_admin = ?, deleted_at = ? WHERE id = ?`
    ).bind(check.account || 'admin', new Date().toISOString(), commentId).run();
  }

  return json({ ok: true, manuscriptId, commentId, deletedBy: check.account || 'admin' });
}
