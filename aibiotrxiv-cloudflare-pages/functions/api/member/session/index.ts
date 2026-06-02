
import { json, currentMember, publicMember, clearCookie } from '../../_db';
export async function onRequestGet({ request, env }: any){ const m = await currentMember(env, request); if (!m) return json({ ok:false, member:null }, 401); return json({ ok:true, member: publicMember(m) }); }
export async function onRequestPost({ request, env }: any){ return onRequestGet({request,env}); }
export async function onRequestDelete(){ return new Response(JSON.stringify({ok:true}), {headers:{'content-type':'application/json','Set-Cookie':clearCookie('aibio_member_session')}}); }
