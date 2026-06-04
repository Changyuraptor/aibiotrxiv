import { createAdminToken, adminCookie, type Env } from '../_session';
import { LOCAL_ADMIN_CREDENTIALS } from '../_local_credentials';

function json(data: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {})
    }
  });
}

function getCfg(env: Env & Record<string, any>) {
  return {
    ADMIN_ACCOUNT: String(env.ADMIN_ACCOUNT || LOCAL_ADMIN_CREDENTIALS.ADMIN_ACCOUNT || '').trim(),
    ADMIN_PASSWORD_1: String(env.ADMIN_PASSWORD_1 || LOCAL_ADMIN_CREDENTIALS.ADMIN_PASSWORD_1 || ''),
    ADMIN_PASSWORD_2: String(env.ADMIN_PASSWORD_2 || LOCAL_ADMIN_CREDENTIALS.ADMIN_PASSWORD_2 || ''),
    ADMIN_SESSION_SECRET: String(env.ADMIN_SESSION_SECRET || LOCAL_ADMIN_CREDENTIALS.ADMIN_SESSION_SECRET || ''),
  };
}

export async function onRequest(context: { request: Request; env: Env & Record<string, any> }) {
  const { request, env } = context;
  try {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const cfg = getCfg(env);
      return json({
        ok: true,
        route: '/api/admin/login',
        accepts: 'POST',
        configured: Boolean(cfg.ADMIN_ACCOUNT && cfg.ADMIN_PASSWORD_1 && cfg.ADMIN_PASSWORD_2 && cfg.ADMIN_SESSION_SECRET)
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

    const account = String(data.account || '').trim();
    const password1 = String(data.password1 || '');
    const password2 = String(data.password2 || '');
    const cfg = getCfg(env);

    if (!cfg.ADMIN_ACCOUNT || !cfg.ADMIN_PASSWORD_1 || !cfg.ADMIN_PASSWORD_2 || !cfg.ADMIN_SESSION_SECRET) {
      return json({ ok: false, error: 'Admin credentials are not configured in Cloudflare Variables and Secrets.' }, { status: 500 });
    }

    const valid = account === cfg.ADMIN_ACCOUNT && password1 === cfg.ADMIN_PASSWORD_1 && password2 === cfg.ADMIN_PASSWORD_2;
    if (!valid) {
      return json({ ok: false, error: 'Incorrect admin account or password.' }, { status: 401 });
    }

    const token = await createAdminToken(cfg, account);
    return json({ ok: true }, { headers: { 'Set-Cookie': adminCookie(token) } });
  } catch (err: any) {
    return json({ ok: false, error: 'Admin login function crashed.', detail: String(err?.stack || err?.message || err || 'Unknown error') }, { status: 500 });
  }
}
