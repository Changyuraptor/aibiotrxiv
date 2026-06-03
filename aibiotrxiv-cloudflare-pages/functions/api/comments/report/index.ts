interface CommentReportPayload {
  manuscriptId?: string;
  title?: string;
  commentId?: string;
  commentAuthor?: string;
  commentText?: string;
  reportReason?: string;
  reporterEmail?: string;
  reportedAt?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestPost(context: any) {
  const env = context.env || {};
  let payload: CommentReportPayload = {};
  try {
    payload = await context.request.json();
  } catch (_) {
    return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
  }
  if (!payload.reportReason || String(payload.reportReason).trim().length < 5) {
    return json({ ok: false, error: 'A report reason is required.' }, 400);
  }

  const adminEmail = env.COMMENT_REPORT_EMAIL || 'aibiotrxiv@gmail.com';
  const subject = `[AIBioTrXiv] Peer comment report: ${payload.manuscriptId || 'unknown manuscript'}`;
  const body = [
    'A peer comment has been reported for moderation.',
    '',
    `Manuscript ID: ${payload.manuscriptId || '(unknown)'}`,
    `Title: ${payload.title || '(not provided)'}`,
    `Comment ID: ${payload.commentId || '(unknown)'}`,
    `Comment author: ${payload.commentAuthor || '(unknown)'}`,
    `Reported at: ${payload.reportedAt || new Date().toISOString()}`,
    '',
    'Report reason:',
    payload.reportReason || '',
    '',
    'Comment text:',
    payload.commentText || ''
  ].join('\n');

  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [adminEmail], subject, text: body })
    });
    const result = await res.text();
    if (!res.ok) return json({ ok: false, emailSent: false, provider: 'resend', status: res.status, result }, 502);
    return json({ ok: true, emailSent: true, to: adminEmail, provider: 'resend' });
  }

  return json({ ok: true, emailSent: false, to: adminEmail, subject, message: body, note: 'Email provider secrets are not configured.' });
}
