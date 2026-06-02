
import { json } from '../../_db';
const tables = ['members','email_verification_tokens','member_manuscripts','peer_comments','app_files','payment_records','security_audit_events'];
export async function onRequestGet({ env, request }: any) {
  const out: any = { ok: true, timestamp: new Date().toISOString(), bindings: { DB: !!env.DB, AIBIO_STORAGE: !!env.AIBIO_STORAGE } };
  if (env.DB) {
    try {
      await env.DB.prepare('SELECT 1').first();
      out.d1 = { query: 'ok', tables: {} };
      for (const t of tables) {
        try { await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first(); out.d1.tables[t] = { ok: true }; }
        catch (e: any) { out.d1.tables[t] = { ok: false, error: String(e?.message || e) }; out.ok = false; }
      }
    } catch (e: any) { out.d1 = { error: String(e?.message || e) }; out.ok = false; }
  }
  if (env.AIBIO_STORAGE) {
    out.r2 = { binding: 'ok', writeReadDelete: 'not_run_add_?write=1_to_test' };
    if (new URL(request.url).searchParams.get('write') === '1') {
      const key = `health/${crypto.randomUUID()}.txt`;
      await env.AIBIO_STORAGE.put(key, 'ok');
      const got = await env.AIBIO_STORAGE.get(key);
      const text = got ? await got.text() : '';
      await env.AIBIO_STORAGE.delete(key);
      out.r2.writeReadDelete = text === 'ok' ? 'ok' : 'failed';
      if (text !== 'ok') out.ok = false;
    }
  }
  return json(out, out.ok ? 200 : 500);
}
