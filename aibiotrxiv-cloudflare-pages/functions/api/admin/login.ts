import { createAdminToken, adminCookie, type Env } from './_session';
import { LOCAL_ADMIN_CREDENTIALS } from './_local_credentials';
import { audit, getIp, rateLimit, verifyTurnstileIfConfigured } from '../_security';

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  let data: any = {};
  try {
    data = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const ip = getIp(request);
  const limited = await rateLimit(env as any, `admin-login:${ip}`, 5, 600);
  if (!limited.ok) return Response.json({ ok: false, error: 'Too many admin login attempts. Try again later.' }, { status: 429 });

  const turnstile = await verifyTurnstileIfConfigured(env as any, data.turnstileToken || null, ip);
  if (!turnstile.ok) return Response.json({ ok: false, error: turnstile.error || 'Security challenge failed.' }, { status: 403 });

  const account = String(data.account || '').trim();
  const password1 = String(data.password1 || '');
  const password2 = String(data.password2 || '');

  const cfg = {
    ADMIN_ACCOUNT: env.ADMIN_ACCOUNT || LOCAL_ADMIN_CREDENTIALS.ADMIN_ACCOUNT,
    ADMIN_PASSWORD_1: env.ADMIN_PASSWORD_1 || LOCAL_ADMIN_CREDENTIALS.ADMIN_PASSWORD_1,
    ADMIN_PASSWORD_2: env.ADMIN_PASSWORD_2 || LOCAL_ADMIN_CREDENTIALS.ADMIN_PASSWORD_2,
    ADMIN_SESSION_SECRET: env.ADMIN_SESSION_SECRET || LOCAL_ADMIN_CREDENTIALS.ADMIN_SESSION_SECRET,
  };

  if (!cfg.ADMIN_ACCOUNT || !cfg.ADMIN_PASSWORD_1 || !cfg.ADMIN_PASSWORD_2 || !cfg.ADMIN_SESSION_SECRET) {
    return Response.json({ ok: false, error: 'Admin credentials are not configured.' }, { status: 500 });
  }

  Object.assign(env, cfg);
  const valid = account === cfg.ADMIN_ACCOUNT && password1 === cfg.ADMIN_PASSWORD_1 && password2 === cfg.ADMIN_PASSWORD_2;
  if (!valid) {
    await audit(env as any, 'admin_login_failed', account, 'admin', account, { ip });
    return Response.json({ ok: false, error: 'Incorrect admin account or password.' }, { status: 401 });
  }

  const token = await createAdminToken(env, account);
  await audit(env as any, 'admin_login_success', account, 'admin', account, { ip });
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': adminCookie(token) } });
}
