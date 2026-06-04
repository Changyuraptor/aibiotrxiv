
import { baseUrl, getCookie, json, upsertOAuthMember, createMemberSession } from "../../_oauth";

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const saved = getCookie(request, "aibio_oauth_state");
  if (!code || !state || !saved || state !== saved) return json({ ok:false, error:"Invalid OAuth state." }, 400);
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) return json({ ok:false, error:"Facebook OAuth secrets are not configured." }, 500);

  const callback = `${baseUrl(request)}/api/auth/facebook/callback`;
  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", env.FACEBOOK_APP_ID);
  tokenUrl.searchParams.set("client_secret", env.FACEBOOK_APP_SECRET);
  tokenUrl.searchParams.set("redirect_uri", callback);
  tokenUrl.searchParams.set("code", code);
  const tokenRes = await fetch(tokenUrl.toString());
  const token: any = await tokenRes.json();
  if (!tokenRes.ok || !token.access_token) return json({ ok:false, error:"Facebook token exchange failed.", detail: token }, 400);

  const userUrl = new URL("https://graph.facebook.com/me");
  userUrl.searchParams.set("fields", "id,name,email,picture");
  userUrl.searchParams.set("access_token", token.access_token);
  const userRes = await fetch(userUrl.toString());
  const user: any = await userRes.json();
  if (!userRes.ok || !user.email) return json({ ok:false, error:"Facebook did not return an email address.", detail: user }, 400);

  const avatar = user?.picture?.data?.url || "";
  const member = await upsertOAuthMember(env, "facebook", String(user.id), String(user.email), String(user.name || user.email), String(avatar));
  const headers = await createMemberSession(env, request, member, "facebook");
  headers.set("Location", "/member/dashboard/");
  headers.append("Set-Cookie", "aibio_oauth_state=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0");
  return new Response(null, { status: 302, headers });
}
