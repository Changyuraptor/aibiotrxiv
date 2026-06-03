function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

async function tableCount(env: any, table: string) {
  try {
    const row: any = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first();
    return { ok: true, count: Number(row?.n || 0) };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export async function onRequestGet({ request, env }: any) {
  const url = new URL(request.url);
  const writeTest = url.searchParams.get('write') === '1';
  const result: any = {
    ok: true,
    timestamp: new Date().toISOString(),
    bindings: { DB: Boolean(env.DB), AIBIO_STORAGE: Boolean(env.AIBIO_STORAGE) },
    d1: {},
    r2: {}
  };

  if (!env.DB) {
    result.ok = false;
    result.d1.error = 'D1 binding DB is not configured.';
  } else {
    try {
      const row = await env.DB.prepare('SELECT 1 AS ok').first();
      result.d1.query = row?.ok === 1 ? 'ok' : 'unexpected';
      result.d1.tables = {
        members: await tableCount(env, 'members'),
        email_verification_tokens: await tableCount(env, 'email_verification_tokens'),
        member_manuscripts: await tableCount(env, 'member_manuscripts'),
        peer_comments: await tableCount(env, 'peer_comments'),
        app_files: await tableCount(env, 'app_files'),
        payment_records: await tableCount(env, 'payment_records'),
        security_audit_events: await tableCount(env, 'security_audit_events'),
        app_settings: await tableCount(env, 'app_settings')
      };
    } catch (err: any) {
      result.ok = false;
      result.d1.error = String(err?.message || err);
    }
  }

  if (!env.AIBIO_STORAGE) {
    result.ok = false;
    result.r2.error = 'R2 binding AIBIO_STORAGE is not configured.';
  } else {
    result.r2.binding = 'ok';
    if (writeTest) {
      const key = `_diagnostics/healthcheck-${Date.now()}.txt`;
      try {
        await env.AIBIO_STORAGE.put(key, `AIBioTrXiv R2 health check ${new Date().toISOString()}`, {
          httpMetadata: { contentType: 'text/plain; charset=utf-8' }
        });
        const obj = await env.AIBIO_STORAGE.get(key);
        await env.AIBIO_STORAGE.delete(key);
        result.r2.writeReadDelete = obj ? 'ok' : 'write_succeeded_but_read_failed';
      } catch (err: any) {
        result.ok = false;
        result.r2.writeReadDelete = 'failed';
        result.r2.error = String(err?.message || err);
      }
    } else {
      result.r2.writeReadDelete = 'not_run_add_?write=1_to_test';
    }
  }

  return json(result, result.ok ? 200 : 500);
}
