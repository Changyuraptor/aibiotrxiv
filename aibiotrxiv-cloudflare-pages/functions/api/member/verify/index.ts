async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function readPayload(request: Request) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    return {
      email: url.searchParams.get('email') || '',
      token: url.searchParams.get('token') || ''
    };
  }
  return await request.json().catch(() => ({}));
}

export async function onRequest(context: any) {
  const { request, env } = context;
  if (!['GET', 'POST'].includes(request.method)) {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }

  const body = await readPayload(request);
  const email = String(body.email || '').trim().toLowerCase();
  const token = String(body.token || '').trim();

  if (!email || !token) {
    return json({ ok: false, error: 'Verification email and token are required.' }, 400);
  }

  if (!env.DB) {
    return json({ ok: false, error: 'Database binding DB is not configured.' }, 500);
  }

  const tokenHash = await sha256(token);

  try {
    const row = await env.DB.prepare(`
      SELECT id, member_id, email, used, expires_at
      FROM email_verification_tokens
      WHERE lower(email) = lower(?) AND token_hash = ? AND used = 0
      ORDER BY id DESC
      LIMIT 1
    `).bind(email, tokenHash).first();

    if (!row) {
      return json({ ok: false, error: 'This verification link is invalid or already used.' }, 400);
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
    if (!expiresAt || expiresAt < Date.now()) {
      return json({ ok: false, error: 'This verification link has expired. Please register again or contact AIBioTrXiv.' }, 400);
    }

    await env.DB.batch([
      env.DB.prepare(`UPDATE members SET email_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(row.member_id),
      env.DB.prepare(`UPDATE email_verification_tokens SET used = 1 WHERE id = ?`).bind(row.id)
    ]);

    return json({ ok: true, message: 'Email verified.' });
  } catch (err: any) {
    return json({ ok: false, error: 'Email verification failed.', detail: String(err?.message || err) }, 500);
  }
}
