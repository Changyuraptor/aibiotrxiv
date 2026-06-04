
import { baseUrl, getCookie, json, redirect, upsertOAuthMember, createMemberSession } from "../../_oauth";

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const saved = getCookie(request, "aibio_oauth_state");
  if (!code || !state || !saved || state !== saved) return json({ ok:false, error:"Invalid OAuth state." }, 400);
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return json({ ok:false, error:"Google OAuth secrets are not configured." }, 500);

  const callback = `${baseUrl(request)}/api/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callback,
      grant_type: "authorization_code"
    })
  });
  const token: any = await tokenRes.json();
  if (!tokenRes.ok || !token.access_token) return json({ ok:false, error:"Google token exchange failed.", detail: token }, 400);

  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` }
  });
  const user: any = await userRes.json();
  if (!userRes.ok || !user.email) return json({ ok:false, error:"Google userinfo failed.", detail: user }, 400);

  const member = await upsertOAuthMember(env, "google", String(user.sub), String(user.email), String(user.name || user.email), String(user.picture || ""));
  const headers = await createMemberSession(env, request, member, "google");
  headers.set("Location", "/member/dashboard/");
  headers.append("Set-Cookie", "aibio_oauth_state=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0");
  return new Response(null, { status: 302, headers });
}
