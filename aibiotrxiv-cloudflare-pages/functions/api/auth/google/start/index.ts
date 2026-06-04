
import { baseUrl, cookie, redirect, json } from "../../_oauth";

export async function onRequestGet(context: any) {
  const { request, env } = context;
  if (!env.GOOGLE_CLIENT_ID) return json({ ok:false, error:"GOOGLE_CLIENT_ID is not configured." }, 500);
  const state = crypto.randomUUID();
  const callback = `${baseUrl(request)}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return redirect(url.toString(), {
    "Set-Cookie": cookie("aibio_oauth_state", state, "Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600")
  });
}
