import { getCookie, verifyAdminToken, type Env } from './_session';

export async function onRequestGet({ request, env }: { request: Request; env: Env }) {
  const result = await verifyAdminToken(env, getCookie(request));
  if (!result.ok) return Response.json({ ok: false, error: result.reason || 'Not authenticated.' }, { status: 401 });
  return Response.json({ ok: true, account: result.account });
}
