import { clearAdminCookie } from '../_session';

export async function onRequest({ request }: { request: Request }) {
  if (!['POST', 'GET'].includes(request.method)) {
    return new Response(JSON.stringify({ ok: false, error: `Method ${request.method} is not allowed.` }), {
      status: 405,
      headers: { 'content-type': 'application/json; charset=utf-8', allow: 'GET, POST' }
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'Set-Cookie': clearAdminCookie() }
  });
}
