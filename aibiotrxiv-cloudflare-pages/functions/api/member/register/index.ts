import { audit, getIp, json, rateLimit, verifyTurnstileIfConfigured } from '../../_security';

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const ip = getIp(request);
  const limited = await rateLimit(env, `member-register:${ip}`, 10, 600);
  if (!limited.ok) return json({ ok: false, error: 'Too many registration attempts. Try again later.' }, 429);

  const body = await request.json().catch(() => ({}));
  const turnstile = await verifyTurnstileIfConfigured(env, body.turnstileToken || null, ip);
  if (!turnstile.ok) return json({ ok: false, error: turnstile.error || 'Security challenge failed.' }, 403);

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || body.password2 || '');
  if (!name) return json({ ok: false, error: 'Display name is required.' }, 400);
  if (!validEmail(email)) return json({ ok: false, error: 'A valid email address is required.' }, 400);
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return json({ ok: false, error: 'Password must be at least 8 characters and include letters and numbers.' }, 400);
  if (password !== confirmPassword) return json({ ok: false, error: 'Password confirmation does not match.' }, 400);

  const salt = crypto.randomUUID();
  const passwordHash = await sha256(`${salt}:${password}`);
  let memberId: any = null;
  const verificationToken = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha256(verificationToken);

  if (env.DB) {
    try {
      const insertResult: any = await env.DB.prepare(`INSERT INTO members (name, email, password_hash, password_salt, status, email_verified, created_at)
        VALUES (?, ?, ?, ?, 'active', 0, CURRENT_TIMESTAMP)`).bind(name, email, passwordHash, salt).run();
      memberId = insertResult?.meta?.last_row_id ?? null;
      await env.DB.prepare(`INSERT INTO email_verification_tokens (member_id, email, token_hash, used, expires_at)
        VALUES (?, ?, ?, 0, datetime('now', '+48 hours'))`).bind(memberId, email, tokenHash).run();
      await audit(env, 'member_registered', email, 'member', String(memberId || ''), { ip });
    } catch (err: any) {
      return json({ ok: false, error: 'This email may already be registered, or the database is not ready.' }, 409);
    }
  }

  // If RESEND is configured, send the verification email. Otherwise return a development verification path.
  const verifyPath = `/member/verify/?email=${encodeURIComponent(email)}&token=${encodeURIComponent(verificationToken)}`;
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const url = new URL(verifyPath, request.url).toString();
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: 'Verify your AIBioTrXiv account',
        text: `Please verify your AIBioTrXiv account: ${url}`
      })
    }).catch(() => null);
  }

  return json({ ok: true, message: 'Registration received. Please verify your email before submitting manuscripts.', developmentVerifyPath: env.RESEND_API_KEY ? undefined : verifyPath });
}
