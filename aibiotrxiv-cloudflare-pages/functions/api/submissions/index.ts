import { currentMember, json, parseJson } from '../_shared';

function safeJson(x: any) { try { return JSON.stringify(x || {}); } catch { return '{}'; } }

export async function onRequestGet({ request, env }: any) {
  if (!env.DB) return json({ ok: false, error: 'D1 binding DB is not configured.' }, 500);
  const member = await currentMember(env, request);
  if (!member) return json({ ok: false, error: 'Member login required.' }, 401);
  const rows: any[] = await env.DB.prepare(
    `SELECT id, title, submission_category, research_area, payment_status, review_status, article_id, version_label, version_number, site_id, published_at, created_at, updated_at
     FROM member_manuscripts
     WHERE lower(member_email)=lower(?)
     ORDER BY updated_at DESC`
  ).bind(member.email).all().then((r: any) => r.results || []);
  return json({ ok: true, submissions: rows });
}

export async function onRequestPost({ request, env }: any) {
  if (!env.DB) return json({ ok: false, error: 'D1 binding DB is not configured.' }, 500);
  const member = await currentMember(env, request);
  if (!member) return json({ ok: false, error: 'Member login required.' }, 401);
  if (member.status === 'suspended') return json({ ok: false, error: 'Account suspended.' }, 403);
  const body: any = await parseJson(request);
  const id = String(body.id || body.manuscript?.id || ('SUB-' + Date.now()));
  const manuscript = body.manuscript || body;
  await env.DB.prepare(
    `INSERT INTO member_manuscripts (id, member_email, title, submission_category, research_area, payment_status, review_status, manuscript_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       title=excluded.title,
       submission_category=excluded.submission_category,
       research_area=excluded.research_area,
       payment_status=excluded.payment_status,
       review_status=excluded.review_status,
       manuscript_json=excluded.manuscript_json,
       updated_at=CURRENT_TIMESTAMP`
  ).bind(
    id,
    member.email,
    manuscript.title || '',
    manuscript.submissionCategory || 'AI Research',
    manuscript.topic || manuscript.researchArea || '',
    manuscript.paymentStatus || 'unpaid',
    manuscript.reviewStatus || 'draft',
    safeJson({ ...manuscript, id, memberEmail: member.email })
  ).run();
  return json({ ok: true, id, message: 'Submission saved to D1.' });
}
