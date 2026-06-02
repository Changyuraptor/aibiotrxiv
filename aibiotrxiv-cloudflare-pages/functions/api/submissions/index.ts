
import { json, id, requireMember, sha256 } from '../_db';
function strip(html:string){ return String(html||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }
async function storeFigure(env:any, manuscriptId:string, sectionId:string, fig:any, idx:number){
  const dataUrl=String(fig.dataUrl||''); if(!dataUrl || !env.AIBIO_STORAGE) return null;
  const m=dataUrl.match(/^data:([^;]+);base64,(.+)$/); if(!m) return null;
  const mime=m[1]; const bytes=Uint8Array.from(atob(m[2]), c=>c.charCodeAt(0));
  const ext=mime.includes('png')?'png':'jpg'; const key=`submissions/${manuscriptId}/figures/${sectionId}-${idx}.${ext}`;
  await env.AIBIO_STORAGE.put(key, bytes, { httpMetadata:{ contentType:mime } });
  await env.DB.prepare(`INSERT INTO r2_object_registry (id,r2_key,owner_type,owner_id,object_role,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(id('r2'),key,'manuscript',manuscriptId,'figure',mime,bytes.byteLength).run();
  return { key, mime, size: bytes.byteLength };
}
export async function onRequestGet({ request, env }: any){ const r=await requireMember(env,request); if(r.error) return r.error; const rows=await env.DB.prepare(`SELECT * FROM member_manuscripts WHERE member_id=? AND deleted_at IS NULL ORDER BY created_at DESC`).bind(r.member.id).all(); return json({ok:true, submissions:rows.results||[]}); }
export async function onRequestPost({ request, env }: any){
  const r=await requireMember(env,request); if(r.error) return r.error; const member:any=r.member;
  if(!member.email_verified) return json({ok:false,error:'Email verification is required before submission.'},403);
  const b=await request.json().catch(()=>({}));
  const title=String(b.title||'').trim(); const abstract=String(b.abstract||'').trim(); if(!title||!abstract) return json({ok:false,error:'Title and abstract are required.'},400);
  const manuscriptId=id('SUB'); const fingerprint=await sha256(JSON.stringify({title,abstract,sections:b.sections||[],authors:b.authors||[]}));
  const waiver:any = await env.DB.prepare(`SELECT * FROM payment_waivers WHERE lower(member_email)=lower(?) AND active=1 LIMIT 1`).bind(member.email).first();
  const waived=!!waiver;
  await env.DB.prepare(`INSERT INTO member_manuscripts (id,member_id,article_category,title,abstract,topic,manuscript_type,license,status,payment_status,review_status,current_version,credit_statement,ai_use_statement,rights_confirmation,content_fingerprint,created_at,updated_at,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?)`).bind(manuscriptId, member.id, b.submissionCategory||b.article_category||'AI Research', title, abstract, b.topic||'Other', b.manuscriptType||'', b.license||'CC BY 4.0', waived?'submitted':'draft', waived?'waived':'unpaid', waived?'under_review':'draft', 1, b.creditStatement||'', b.aiUse||b.aiUseStatement||'', b.rightsConfirm?1:0, fingerprint, waived?new Date().toISOString():null).run();
  let order=0; for(const a of (b.authors||[])){ if(!a.name) continue; await env.DB.prepare(`INSERT INTO member_manuscript_authors (id,manuscript_id,author_order,author_name,author_email,affiliation,created_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(id('auth'),manuscriptId,order++,a.name,a.email||'',b.affiliation||'').run(); }
  let secOrder=0; for(const s of (b.sections||[])){ const sectionId=id('sec'); await env.DB.prepare(`INSERT INTO member_manuscript_sections (id,manuscript_id,section_type,section_order,heading,content_html,content_text,created_at,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(sectionId,manuscriptId,s.type||'Section',secOrder++,s.heading||'',s.html||'',strip(s.html||'')).run(); let figOrder=0; for(const fig of (s.figures||[])){ const stored=await storeFigure(env,manuscriptId,sectionId,fig,figOrder); await env.DB.prepare(`INSERT INTO member_manuscript_figures (id,manuscript_id,section_id,figure_order,filename,mime_type,size_bytes,r2_key,legend_html,legend_text,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(id('fig'),manuscriptId,sectionId,figOrder++,fig.filename||'',stored?.mime||'',stored?.size||0,stored?.key||'',fig.legend||'',strip(fig.legend||'')).run(); } }
  if(waived) await env.DB.prepare(`INSERT INTO payment_records (id,manuscript_id,member_id,payment_status,payment_reason,verified_by_server,created_at,verified_at) VALUES (?,?,?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(id('pay'),manuscriptId,member.id,'waived','owner_test_waiver').run();
  return json({ok:true, id:manuscriptId, paymentStatus:waived?'waived':'unpaid', reviewStatus:waived?'under_review':'draft', nextUrl: waived?'/member/dashboard/':`/submit/payment/?id=${encodeURIComponent(manuscriptId)}`});
}
