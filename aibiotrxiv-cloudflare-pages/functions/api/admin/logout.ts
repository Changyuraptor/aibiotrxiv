import { clearAdminCookie } from './_session';

export async function onRequestPost() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearAdminCookie() } });
}
