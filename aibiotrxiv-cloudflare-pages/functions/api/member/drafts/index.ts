export async function onRequestPost(context) {
  // Production plan: store draft metadata/sections in D1 and figures in R2.
  return Response.json({ ok: true, message: 'Draft save API placeholder ready for D1/R2.' });
}
export async function onRequestGet(context) {
  // Production plan: return drafts owned by authenticated member from D1.
  return Response.json({ ok: true, drafts: [] });
}
