
import { json, id, sha256, setCookie, audit } from '../../_db';
function validEmail(email:string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }
async function sendVerification(env:any, request:Request, email:string, token:string){
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  const url = new URL(`/member/verify/?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`, request.url).toString();
  const res = await fetch('https://api.resend.com/emails',{ method:'POST', headers:{ Authorization:`Bearer ${env.RESEND_API_KEY}`, 'Content-Type':'application/json' }, body: JSON.stringify({ from:env.EMAIL_FROM, to:[email], subject:'Verify your AIBioTrXiv account', html:`<p>Please verify your AIBioTrXiv account:</p><p><a href="${url}">Verify email</a></p><p>This link expires in 48 hours.</p>`, text:`Verify your AIBioTrXiv account: ${url}` }) });
  return res.ok;
}
export async function onRequestPost({ request, env }: any){
  if (!env.DB) return json({ ok:false, error:'Database is not configured.' }, 500);
  const body = await request.json().catch(()=>({}));
  const displayName = String(body.name || body.displayName || '').trim().slice(0,120);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const confirm = String(body.confirmPassword || body.password2 || '');
  if (!displayName) return json({ ok:false, error:'Display name is required.' }, 400);
  if (!validEmail(email)) return json({ ok:false, error:'A valid email address is required.' }, 400);
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return json({ ok:false, error:'Password must be at least 8 characters and include letters and numbers.' }, 400);
  if (password !== confirm) return json({ ok:false, error:'Password confirmation does not match.' }, 400);
  const memberId = id('mem'); const salt = crypto.randomUUID(); const hash = await sha256(`${salt}:${password}`);
  const token = crypto.randomUUID()+crypto.randomUUID(); const tokenHash = await sha256(token);
  try{
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO members (id, display_name, email, password_hash, password_salt, email_verified, account_status, comment_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 'active', 'allowed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(memberId, displayName, email, hash, salt),
      env.DB.prepare(`INSERT INTO email_verification_tokens (id, member_id, email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, datetime('now','+48 hours'), CURRENT_TIMESTAMP)`).bind(id('evt'), memberId, email, tokenHash)
    ]);
  }catch(e:any){ return json({ ok:false, error:'This email may already be registered, or the database schema is not ready.', detail:String(e?.message||e) }, 409); }
  const emailSent = await sendVerification(env, request, email, token).catch(()=>false);
  await audit(env, 'member_registered', 'member', memberId, { email, emailSent });
  return json({ ok:true, emailSent, message:'Registration received. Please verify your email before submitting manuscripts.' });
}
