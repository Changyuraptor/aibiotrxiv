
import { baseUrl, cookie, redirect, json } from "../../_oauth";

export async function onRequestGet(context: any) {
  const { request, env } = context;
  if (!env.FACEBOOK_APP_ID) return json({ ok:false, error:"FACEBOOK_APP_ID is not configured." }, 500);
  const state = crypto.randomUUID();
  const callback = `${baseUrl(request)}/api/auth/facebook/callback`;
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", env.FACEBOOK_APP_ID);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "email,public_profile");
  url.searchParams.set("state", state);
  return redirect(url.toString(), {
    "Set-Cookie": cookie("aibio_oauth_state", state, "Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600")
  });
}
