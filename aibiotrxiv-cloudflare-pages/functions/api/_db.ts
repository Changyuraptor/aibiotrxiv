
export function json(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
export function now() { return new Date().toISOString(); }
export function id(prefix = 'id') { return `${prefix}_${crypto.randomUUID()}`; }
export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
}
export function getCookie(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1) || '';
}
export function setCookie(name: string, value: string, maxAge: number) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function clearCookie(name: string) { return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }
export async function currentMember(env: any, request: Request) {
  if (!env.DB) return null;
  const token = getCookie(request, 'aibio_member_session');
  if (!token) return null;
  const hash = await sha256(token);
  const row: any = await env.DB.prepare(`SELECT m.* FROM member_sessions s JOIN members m ON m.id=s.member_id WHERE s.session_token_hash=? AND s.expires_at > CURRENT_TIMESTAMP AND m.deleted_at IS NULL`).bind(hash).first();
  if (row) await env.DB.prepare(`UPDATE member_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE session_token_hash=?`).bind(hash).run().catch(()=>{});
  return row || null;
}
export function publicMember(row: any) {
  if (!row) return null;
  return { id: row.id, name: row.display_name, displayName: row.display_name, email: row.email, emailVerified: !!row.email_verified, accountStatus: row.account_status, commentStatus: row.comment_status, suspended: row.account_status === 'suspended', commentRestricted: row.comment_status === 'restricted' };
}
export async function requireMember(env: any, request: Request) {
  const m = await currentMember(env, request);
  if (!m) return { error: json({ ok:false, error:'Member login required.' }, 401) };
  if (m.account_status === 'suspended') return { error: json({ ok:false, error:'Account suspended.' }, 403) };
  return { member: m };
}
export async function adminOk(env: any, request: Request) {
  const token = getCookie(request, 'aibio_admin_session');
  if (!token || !env.ADMIN_SESSION_SECRET) return false;
  try {
    const [account, ts, sig] = atob(token).split('|');
    if (!account || !ts || !sig) return false;
    const age = Date.now() - Number(ts);
    if (!Number.isFinite(age) || age > 1000*60*60*12) return false;
    const expected = await sha256(`${account}|${ts}|${env.ADMIN_SESSION_SECRET}`);
    return expected === sig;
  } catch { return false; }
}
export async function audit(env: any, action: string, actorType = '', actorId = '', details: any = {}) {
  if (!env.DB) return;
  await env.DB.prepare(`INSERT INTO security_audit_events (id, actor_type, actor_id, action, details_json, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(id('audit'), actorType, actorId, action, JSON.stringify(details)).run().catch(()=>{});
}
