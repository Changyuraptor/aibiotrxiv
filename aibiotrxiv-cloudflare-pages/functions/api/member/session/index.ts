import { currentMember, json } from '../../_shared';
export async function onRequestGet({request,env}:any){ const member=await currentMember(env,request); return json({ok:true,member}); }
