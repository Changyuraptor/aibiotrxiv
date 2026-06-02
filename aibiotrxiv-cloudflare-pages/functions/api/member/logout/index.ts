import { json } from '../../_shared';
export async function onRequestPost(){ return json({ok:true},200,{'set-cookie':'aibio_member=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}); }
