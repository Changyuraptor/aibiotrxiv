
export async function onRequestPost() {
  const headers = new Headers({ "content-type": "application/json" });
  for (const name of ["aibio_member_session","aibio_member_email","aibio_member_name","aibio_member_provider"]) {
    headers.append("Set-Cookie", `${name}=; Path=/; Secure; SameSite=Lax; Max-Age=0`);
  }
  return new Response(JSON.stringify({ ok:true }), { status: 200, headers });
}
