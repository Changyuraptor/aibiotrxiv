import { createAdminToken, adminCookie, type Env } from './_session';
import { LOCAL_ADMIN_CREDENTIALS } from './_local_credentials';
import { audit, getIp, rateLimit, verifyTurnstileIfConfigured } from '../_security';

function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {})
    }
  });
}

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function getAdminConfig(env: Env) {
  return {
    ADMIN_ACCOUNT: clean(env.ADMIN_ACCOUNT) || clean(LOCAL_ADMIN_CREDENTIALS.ADMIN_ACCOUNT),
    ADMIN_PASSWORD_1: clean(env.ADMIN_PASSWORD_1) || clean(LOCAL_ADMIN_CREDENTIALS.ADMIN_PASSWORD_1),
    ADMIN_PASSWORD_2: clean(env.ADMIN_PASSWORD_2) || clean(LOCAL_ADMIN_CREDENTIALS.ADMIN_PASSWORD_2),
    ADMIN_SESSION_SECRET: clean(env.ADMIN_SESSION_SECRET) || clean(LOCAL_ADMIN_CREDENTIALS.ADMIN_SESSION_SECRET),
  };
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    if (request.method === 'GET') {
      return json({ ok: true, endpoint: '/api/admin/login', method: 'GET', message: 'Admin login API is deployed. Use POST to log in.' });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Allow': 'GET, POST, OPTIONS',
          'Cache-Control': 'no-store'
        }
      });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: `Method ${request.method} is not allowed.` }, {
        status: 405,
        headers: { 'Allow': 'GET, POST, OPTIONS' }
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

    const account = clean(data.account);
    const password1 = clean(data.password1);
    const password2 = clean(data.password2);
    const cfg = getAdminConfig(env);

    if (!cfg.ADMIN_ACCOUNT || !cfg.ADMIN_PASSWORD_1 || !cfg.ADMIN_PASSWORD_2 || !cfg.ADMIN_SESSION_SECRET) {
      return json({
        ok: false,
        error: 'Admin credentials are not configured in Cloudflare Pages production variables.',
        missing: {
          ADMIN_ACCOUNT: !cfg.ADMIN_ACCOUNT,
          ADMIN_PASSWORD_1: !cfg.ADMIN_PASSWORD_1,
          ADMIN_PASSWORD_2: !cfg.ADMIN_PASSWORD_2,
          ADMIN_SESSION_SECRET: !cfg.ADMIN_SESSION_SECRET
        }
      }, { status: 500 });
    }

    const valid = account === cfg.ADMIN_ACCOUNT && password1 === cfg.ADMIN_PASSWORD_1 && password2 === cfg.ADMIN_PASSWORD_2;
    if (!valid) {
      await audit(env as any, 'admin_login_failed', account, 'admin', account, { ip });
      return json({ ok: false, error: 'Incorrect admin account or password.' }, { status: 401 });
    }

    // Do not mutate Cloudflare's runtime env object. Some Pages runtimes expose it as read-only.
    const token = await createAdminToken({ ADMIN_SESSION_SECRET: cfg.ADMIN_SESSION_SECRET }, account);
    await audit(env as any, 'admin_login_success', account, 'admin', account, { ip });
    return json({ ok: true }, { headers: { 'Set-Cookie': adminCookie(token) } });
  } catch (error: any) {
    return json({
      ok: false,
      error: 'Admin login function failed before the session could be created.',
      code: 'ADMIN_LOGIN_RUNTIME_ERROR',
      message: String(error?.message || error || 'Unknown runtime error')
    }, { status: 500 });
  }
}
