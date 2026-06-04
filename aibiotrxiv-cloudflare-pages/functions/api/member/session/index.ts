
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const part = cookie.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
export async function onRequestGet(context: any) {
  const { request, env } = context;
  const token = getCookie(request, "aibio_member_session");
  if (!token || !env.DB) return json({ ok:false, member:null }, 401);
  const hash = await sha256(token);
  const row: any = await env.DB.prepare(`
    SELECT m.id, m.name, m.display_name, m.email, m.email_verified, m.account_status, m.comment_status, m.auth_provider, m.avatar_url
    FROM member_sessions s
    JOIN members m ON m.id = s.member_id
    WHERE s.session_token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).bind(hash).first();
  if (!row) return json({ ok:false, member:null }, 401);
  await env.DB.prepare("UPDATE member_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE session_token_hash = ?").bind(hash).run();
  return json({ ok:true, member: row });
}
