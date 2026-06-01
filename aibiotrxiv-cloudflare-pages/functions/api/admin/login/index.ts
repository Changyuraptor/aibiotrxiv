import { createAdminToken, adminCookie, type Env } from '../_session';
import { LOCAL_ADMIN_CREDENTIALS } from '../_local_credentials';
import { audit, getIp, rateLimit, verifyTurnstileIfConfigured } from '../../_security';

function json(data: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {})
    }
  });
}

export async function onRequest(context: { request: Request; env: Env & Record<string, any> }) {
  try {
    const { request, env } = context;

    if (request.method === 'GET' || request.method === 'HEAD') {
      return json({
        ok: true,
        route: '/api/admin/login',
        accepts: 'POST',
        message: 'Admin login API is active. Submit credentials with POST.'
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'allow': 'GET, HEAD, POST, OPTIONS',
          'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
          'access-control-allow-headers': 'content-type'
        }
      });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: `Method ${request.method} is not allowed. Use POST.` }, {
        status: 405,
        headers: { 'allow': 'GET, HEAD, POST, OPTIONS' }
      });
    }

    let data: any = {};
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const ip = getIp(request);
    const limited = await rateLimit(env as any, `admin-login:${ip}`, 5, 600);
    if (!limited.ok) return json({ ok: false, error: 'Too many admin login attempts. Try again later.' }, { status: 429 });

    const turnstile = await verifyTurnstileIfConfigured(env as any, data.turnstileToken || null, ip);
    if (!turnstile.ok) return json({ ok: false, error: turnstile.error || 'Security challenge failed.' }, { status: 403 });

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
      return json({ ok: false, error: 'Admin credentials are not configured in Cloudflare Variables and Secrets.' }, { status: 500 });
    }

    const valid = account === cfg.ADMIN_ACCOUNT && password1 === cfg.ADMIN_PASSWORD_1 && password2 === cfg.ADMIN_PASSWORD_2;
    if (!valid) {
      await audit(env as any, 'admin_login_failed', account, 'admin', account, { ip });
      return json({ ok: false, error: 'Incorrect admin account or password.' }, { status: 401 });
    }

    const token = await createAdminToken({ ...env, ...cfg }, account);
    await audit(env as any, 'admin_login_success', account, 'admin', account, { ip });
    return json({ ok: true }, { headers: { 'Set-Cookie': adminCookie(token) } });
  } catch (err: any) {
    return json({
      ok: false,
      error: 'Admin login function crashed.',
      detail: String(err?.message || err || 'Unknown error')
    }, { status: 500 });
  }
}
