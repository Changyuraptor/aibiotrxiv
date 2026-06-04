import { getCookie, verifyAdminToken, type Env as AdminEnv } from '../_session';

export interface Env extends AdminEnv { DB: D1Database; }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

async function tableExists(db: D1Database, table: string) {
  const row: any = await db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name=?").bind(table).first();
  return Boolean(row?.name);
}

async function ensureMemberColumns(db: D1Database) {
  if (!(await tableExists(db, 'members'))) return false;
  const alters = [
    "ALTER TABLE members ADD COLUMN display_name TEXT",
    "ALTER TABLE members ADD COLUMN account_status TEXT DEFAULT 'active'",
    "ALTER TABLE members ADD COLUMN email_verified INTEGER DEFAULT 0",
    "ALTER TABLE members ADD COLUMN verified_at TEXT",
    "ALTER TABLE members ADD COLUMN comment_status TEXT DEFAULT 'allowed'",
    "ALTER TABLE members ADD COLUMN comment_suspended INTEGER DEFAULT 0",
    "ALTER TABLE members ADD COLUMN comment_suspension_reason TEXT",
    "ALTER TABLE members ADD COLUMN comment_suspended_at TEXT",
    "ALTER TABLE members ADD COLUMN comment_restored_at TEXT",
    "ALTER TABLE members ADD COLUMN updated_at TEXT",
    "ALTER TABLE members ADD COLUMN last_login_at TEXT",
    "ALTER TABLE members ADD COLUMN auth_provider TEXT",
    "ALTER TABLE members ADD COLUMN avatar_url TEXT"
  ];
  for (const sql of alters) {
    try { await db.prepare(sql).run(); } catch (_) {}
  }
  return true;
}

function normalizeEmail(email: unknown) {
  return String(email || '').trim().toLowerCase();
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const auth = await verifyAdminToken(context.env, getCookie(context.request));
  if (!auth.ok) return json({ ok: false, error: auth.reason || 'Admin login is required.' }, 401);
  if (!context.env.DB) return json({ ok: false, error: 'D1 binding DB is missing.' }, 500);
  const hasMembers = await ensureMemberColumns(context.env.DB);
  if (!hasMembers) return json({ ok: true, members: [], source: 'members_table_missing' });

  const url = new URL(context.request.url);
  const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
  const params: string[] = [];
  let where = '';
  if (q) {
    where = `WHERE lower(coalesce(email,'')) LIKE ? OR lower(coalesce(name,'')) LIKE ? OR lower(coalesce(display_name,'')) LIKE ?`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const rows: any = await context.env.DB.prepare(`
    SELECT id, name, display_name, email, status, account_status, suspended_at, suspension_reason, restored_at,
           email_verified, verified_at, comment_status, comment_suspended, comment_suspension_reason,
           comment_suspended_at, comment_restored_at, created_at, updated_at, last_login_at, auth_provider, avatar_url
    FROM members
    ${where}
    ORDER BY datetime(coalesce(last_login_at, created_at, '1970-01-01')) DESC, id DESC
    LIMIT 1000
  `).bind(...params).all();

  return json({ ok: true, source: 'members', members: (rows?.results || []).map((m: any) => ({
    id: m.id,
    name: m.name || m.display_name || m.email,
    displayName: m.display_name || m.name || m.email,
    email: m.email,
    status: m.status || m.account_status || 'active',
    accountStatus: m.account_status || m.status || 'active',
    suspended: (m.status === 'suspended' || m.account_status === 'suspended'),
    suspendedAt: m.suspended_at || '',
    suspensionReason: m.suspension_reason || '',
    restoredAt: m.restored_at || '',
    emailVerified: !!m.email_verified,
    verifiedAt: m.verified_at || '',
    commentStatus: m.comment_status || (m.comment_suspended ? 'restricted' : 'allowed'),
    commentSuspended: !!m.comment_suspended || m.comment_status === 'restricted',
    commentSuspensionReason: m.comment_suspension_reason || '',
    commentSuspendedAt: m.comment_suspended_at || '',
    commentRestoredAt: m.comment_restored_at || '',
    authProvider: m.auth_provider || '',
    avatarUrl: m.avatar_url || '',
    createdAt: m.created_at || '',
    updatedAt: m.updated_at || '',
    lastLoginAt: m.last_login_at || ''
  })) });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const auth = await verifyAdminToken(context.env, getCookie(context.request));
  if (!auth.ok) return json({ ok: false, error: auth.reason || 'Admin login is required.' }, 401);
  if (!context.env.DB) return json({ ok: false, error: 'D1 binding DB is missing.' }, 500);
  const hasMembers = await ensureMemberColumns(context.env.DB);
  if (!hasMembers) return json({ ok: false, error: 'members table is missing.' }, 500);

  const body: any = await context.request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const action = String(body.action || '').trim();
  const reason = String(body.reason || '').trim();
  if (!email) return json({ ok: false, error: 'Member email is required.' }, 400);

  const row: any = await context.env.DB.prepare('SELECT id FROM members WHERE lower(email)=?').bind(email).first();
  if (!row?.id) return json({ ok: false, error: 'Member not found.' }, 404);

  if (action === 'suspend_account') {
    await context.env.DB.prepare(`UPDATE members SET status='suspended', account_status='suspended', suspended_at=CURRENT_TIMESTAMP, suspension_reason=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(reason, row.id).run();
  } else if (action === 'restore_account') {
    await context.env.DB.prepare(`UPDATE members SET status='active', account_status='active', restored_at=CURRENT_TIMESTAMP, suspension_reason='', updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.id).run();
  } else if (action === 'restrict_comments') {
    await context.env.DB.prepare(`UPDATE members SET comment_status='restricted', comment_suspended=1, comment_suspension_reason=?, comment_suspended_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(reason, row.id).run();
  } else if (action === 'restore_comments') {
    await context.env.DB.prepare(`UPDATE members SET comment_status='allowed', comment_suspended=0, comment_suspension_reason='', comment_restored_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(row.id).run();
  } else {
    return json({ ok: false, error: 'Unsupported member action.' }, 400);
  }

  return json({ ok: true, email, action });
}
