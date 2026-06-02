
import { json, id, sha256, setCookie, audit } from '../../_db';
export async function onRequestPost({ request, env }: any){
  if (!env.DB) return json({ ok:false, error:'Database is not configured.' }, 500);
  const body = await request.json().catch(()=>({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const m:any = await env.DB.prepare(`SELECT * FROM members WHERE lower(email)=lower(?) AND deleted_at IS NULL`).bind(email).first();
  if (!m) return json({ ok:false, error:'Incorrect email or password.' }, 401);
  const hash = await sha256(`${m.password_salt}:${password}`);
  if (hash !== m.password_hash) return json({ ok:false, error:'Incorrect email or password.' }, 401);
  if (m.account_status === 'suspended') return json({ ok:false, error:'Account suspended.' }, 403);
  const token = crypto.randomUUID()+crypto.randomUUID(); const tokenHash = await sha256(token);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO member_sessions (id, member_id, session_token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, datetime('now','+30 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(id('sess'), m.id, tokenHash),
    env.DB.prepare(`UPDATE members SET last_login_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(m.id)
  ]);
  await audit(env, 'member_login', 'member', m.id, { email });
  return new Response(JSON.stringify({ ok:true, member:{ id:m.id, name:m.display_name, email:m.email, emailVerified:!!m.email_verified, accountStatus:m.account_status, commentStatus:m.comment_status } }), { status:200, headers:{ 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'Set-Cookie': setCookie('aibio_member_session', token, 60*60*24*30) } });
}
