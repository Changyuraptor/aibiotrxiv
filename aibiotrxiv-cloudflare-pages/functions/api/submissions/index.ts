export async function onRequestPost(context) {
  const { request, env } = context;
  // TODO production:
  // - authenticate verified member
  // - parse multipart/form-data or JSON manuscript payload
  // - store text/metadata in env.DB (D1)
  // - upload JPG/PNG figures to env.PAPERS_BUCKET (R2)
  // - store R2 keys in submission_files
  // - create timestamped credit record and content fingerprint
  return Response.json({ ok: true, message: 'Submission API placeholder ready for Cloudflare D1/R2.' });
}
export async function onRequestGet(context) {
  // TODO: read authorized submissions from D1.
  return Response.json({ ok: true, submissions: [] });
}
