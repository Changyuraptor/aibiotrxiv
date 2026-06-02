export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export function getIp(request: Request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

export async function rateLimit(env: any, key: string, limit: number, windowSeconds: number) {
  if (!env.DB) return { ok: true, remaining: limit };
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds) * windowSeconds;
  const id = `${key}:${bucket}`;
  try {
    await env.DB.prepare(`INSERT INTO security_rate_limits (id, key, window_start, count, updated_at)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP`).bind(id, key, bucket).run();
    const row: any = await env.DB.prepare(`SELECT count FROM security_rate_limits WHERE id = ?`).bind(id).first();
    const count = Number(row?.count || 0);
    return { ok: count <= limit, remaining: Math.max(0, limit - count), count };
  } catch (_) {
    return { ok: true, remaining: limit };
  }
}

export async function audit(env: any, eventType: string, actor: string, targetType: string, targetId: string, data: unknown = {}) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(`INSERT INTO security_audit_events
      (event_type, actor, target_type, target_id, event_json, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(eventType, actor || '', targetType || '', targetId || '', JSON.stringify(data || {}))
      .run();
  } catch (_) {}
}

export async function verifyTurnstileIfConfigured(env: any, token: string | null | undefined, ip: string) {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: 'Turnstile token is required.' };
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  if (ip && ip !== 'unknown') form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data: any = await res.json().catch(() => ({}));
  return data.success ? { ok: true } : { ok: false, error: 'Turnstile verification failed.', details: data['error-codes'] || [] };
}
