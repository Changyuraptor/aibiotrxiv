import { getCookie, verifyAdminToken, type Env } from '../_session';

function json(data: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) }
  });
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return json({ ok: false, error: `Method ${request.method} is not allowed. Use GET.` }, { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  const result = await verifyAdminToken(env, getCookie(request));
  if (!result.ok) return json({ ok: false, error: result.reason || 'Not authenticated.' }, { status: 401 });
  return json({ ok: true, account: result.account });
}
