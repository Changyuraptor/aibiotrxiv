export async function onRequestGet(context) {
  // TODO: read published manuscripts from D1.
  return Response.json({ ok: true, manuscripts: [] });
}
