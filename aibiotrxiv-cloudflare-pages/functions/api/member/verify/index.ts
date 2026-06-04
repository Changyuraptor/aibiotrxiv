export async function onRequestPost(context) {
  // Production plan: verify token hash in D1, mark email_verified = 1, mark token used.
  return Response.json({ ok: true, message: 'Email verification API placeholder ready for D1.' });
}
