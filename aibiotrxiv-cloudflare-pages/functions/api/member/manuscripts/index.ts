
import { json, requireMember } from '../../_db';
export async function onRequestGet({ request, env }: any){ const r=await requireMember(env,request); if(r.error) return r.error; const rows=await env.DB.prepare(`SELECT * FROM member_manuscripts WHERE member_id=? AND deleted_at IS NULL ORDER BY created_at DESC`).bind(r.member.id).all(); return json({ok:true, manuscripts: rows.results || []}); }
