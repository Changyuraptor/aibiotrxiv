
(function(){
const MEMBERS_KEY='aibio_members';
const CURRENT_KEY='aibio_current_member_email';
const PAPERS_KEY='aibio_member_papers';
const VERIFY_KEY='aibio_email_verifications';
const ADMIN_PAYMENT_EMAIL='aibiotrxiv@gmail.com';
const PAYMENT_BYPASS_EMAIL='changyuraptor.dinosaur@gmail.com';
const PAYMENT_NOTIFY_KEY='aibio_payment_notifications';
const REVISION_FREE_VERSION_LIMIT=15;
const REVISION_GRACE_HOURS=12;
const AIBIO_REMOTE_KV_KEYS=[
'aibio_demo_submission',
'aibio_submissions',
'aibio_accepted',
'aibio_published',
'aibio_unpublished',
'aibio_trash',
'aibio_security_audit_events',
'aibio_members',
'aibio_member_papers',
'aibio_payment_notifications',
'aibio_email_verifications'
];
window.AIBIO_REMOTE_KV=window.AIBIO_REMOTE_KV||{loaded:false,data:{}};
async function loadRemoteKv(){
  if(window.AIBIO_REMOTE_KV.loaded) return window.AIBIO_REMOTE_KV.data;
  try{
    const res=await fetch('/api/storage/kv?keys='+encodeURIComponent(AIBIO_REMOTE_KV_KEYS.join(',')),{cache:'no-store',credentials:'include'});
    const data=await res.json().catch(()=>({}));
    if(res.ok&&data.ok&&data.values){
      window.AIBIO_REMOTE_KV.data=data.values;
      window.AIBIO_REMOTE_KV.loaded=true;
      window.AIBIO_REMOTE_KV.loadOk=true;
      return data.values;
    }
    window.AIBIO_REMOTE_KV.loadOk=false;
    console.error('D1 storage load returned an invalid response',data);
  }catch(e){
    window.AIBIO_REMOTE_KV.loadOk=false;
    console.error('D1 storage load failed; remote writes are disabled for this page load to protect production data.',e);
  }
  window.AIBIO_REMOTE_KV.loaded=true;
  return window.AIBIO_REMOTE_KV.data;
}
function remoteKvLoaded(){return !!window.AIBIO_REMOTE_KV?.loaded;}
function writeRemoteKv(key,value){
  if(!AIBIO_REMOTE_KV_KEYS.includes(key)) return false;
  window.AIBIO_REMOTE_KV.data[key]=value;
  if(!window.AIBIO_REMOTE_KV.loadOk){
    console.warn('Skipped D1 write because remote storage was not loaded successfully. This prevents accidental overwriting of production D1 with stale local data.',key);
    return false;
  }
  fetch('/api/storage/kv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({key,value})}).catch(e=>console.error('D1 storage write failed',e));
  return true;
}
async function writeRemoteKvAndWait(key,value){
  if(!AIBIO_REMOTE_KV_KEYS.includes(key)) return false;
  window.AIBIO_REMOTE_KV.data[key]=value;
  if(!window.AIBIO_REMOTE_KV.loadOk){
    console.warn('Skipped D1 write because remote storage was not loaded successfully. This prevents accidental overwriting of production D1 with stale local data.',key);
    return false;
  }
  const res=await fetch('/api/storage/kv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',cache:'no-store',body:JSON.stringify({key,value})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok){
    throw new Error((data&&data.error)||'D1 storage write failed.');
  }
  if(Array.isArray(data.blocked)&&data.blocked.includes(key)){
    throw new Error('D1 storage write was blocked for production data safety: '+key);
  }
  return true;
}
function getRemoteValue(key){
  return window.AIBIO_REMOTE_KV?.data && Object.prototype.hasOwnProperty.call(window.AIBIO_REMOTE_KV.data,key) ? window.AIBIO_REMOTE_KV.data[key] : undefined;
}

function readLocalArray(key){
  try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}
}
function mergeByStableId(remote,local){
  const out=[];const seen=new Set();
  [...(Array.isArray(remote)?remote:[]),...(Array.isArray(local)?local:[])].forEach(item=>{
    const id=String(item&& (item.id||item.siteId||item.articleId||item.title||JSON.stringify(item))).trim();
    if(!id||seen.has(id))return;
    seen.add(id);out.push(item);
  });
  return out;
}
function safeLocal(key,fallback=[]){
  try{
    const remote=getRemoteValue(key);
    if(remote!==undefined){
      if(key===PAPERS_KEY&&Array.isArray(remote)){
        const local=readLocalArray(key);
        return local.length?mergeByStableId(remote,local):remote;
      }
      return remote;
    }
    return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));
  }catch(e){return fallback;}
}
function safeSet(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));}catch(e){console.warn('local cache write failed',e);}
  writeRemoteKv(key,value);
  return true;
}
async function safeSetAndWait(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));}catch(e){console.warn('local cache write failed',e);}
  return await writeRemoteKvAndWait(key,value);
}
function normEmail(email){return String(email||'').trim().toLowerCase();}
function productionHost(){return !['localhost','127.0.0.1',''].includes(location.hostname);}
function requireRemoteWriteOk(ok,key){if(ok===false && productionHost())throw new Error('Remote D1 storage was not available while saving '+key+'. The record was kept only in this browser, so the admin dashboard would not reliably see it. Please reload and try again after D1/API is available.');}

function getCookie(name){
  const parts = document.cookie.split(';').map(x=>x.trim());
  const row = parts.find(x=>x.startsWith(name+'='));
  return row ? decodeURIComponent(row.slice(name.length+1)) : '';
}
function oauthCookieMember(){
  const email = normEmail(getCookie('aibio_member_email'));
  if(!email) return null;
  const name = getCookie('aibio_member_name') || email;
  return { name, displayName:name, email, emailVerified:true, authProvider:getCookie('aibio_member_provider')||'oauth', status:'active', account_status:'active', commentStatus:'allowed', cookieOnly:true };
}
function normalizeServerMember(row){
  if(!row)return null;
  return {
    ...row,
    name:row.display_name||row.displayName||row.name||row.email||'Member',
    displayName:row.display_name||row.displayName||row.name||row.email||'Member',
    email:row.email||'',
    emailVerified:row.email_verified===1||row.emailVerified===true,
    status:row.status||row.account_status||row.accountStatus||'active',
    account_status:row.account_status||row.accountStatus||row.status||'active',
    accountStatus:row.account_status||row.accountStatus||row.status||'active',
    commentStatus:row.comment_status||row.commentStatus||'allowed',
    commentSuspended:row.comment_suspended===1||row.commentSuspended===true,
    commentSuspensionReason:row.comment_suspension_reason||row.commentSuspensionReason||'',
    authProvider:row.auth_provider||row.authProvider||getCookie('aibio_member_provider')||'oauth',
    serverVerified:true
  };
}
const SERVER_MEMBER_SESSION={loaded:false,promise:null,member:null,error:null};
async function refreshServerMemberSession(force=false){
  if(SERVER_MEMBER_SESSION.promise&&!force)return SERVER_MEMBER_SESSION.promise;
  if(SERVER_MEMBER_SESSION.loaded&&!force)return SERVER_MEMBER_SESSION.member;
  SERVER_MEMBER_SESSION.promise=fetch('/api/member/session',{credentials:'include',cache:'no-store'})
    .then(async res=>{
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok||!data.member){SERVER_MEMBER_SESSION.loaded=true;SERVER_MEMBER_SESSION.member=null;SERVER_MEMBER_SESSION.error=data.error||'No active member session.';return null;}
      const member=normalizeServerMember(data.member);
      SERVER_MEMBER_SESSION.loaded=true;SERVER_MEMBER_SESSION.member=member;SERVER_MEMBER_SESSION.error=null;
      if(member?.email)localStorage.setItem(CURRENT_KEY,normEmail(member.email));
      return member;
    })
    .catch(err=>{SERVER_MEMBER_SESSION.loaded=true;SERVER_MEMBER_SESSION.member=null;SERVER_MEMBER_SESSION.error=String(err?.message||err);return null;})
    .finally(()=>{SERVER_MEMBER_SESSION.promise=null;});
  return SERVER_MEMBER_SESSION.promise;
}

function normUser(u){return String(u||'').trim();}
function members(){return safeLocal(MEMBERS_KEY,[])}
function setMembers(list){return safeSet(MEMBERS_KEY,list)}
function tokens(){return safeLocal(VERIFY_KEY,[])}
function setTokens(list){return safeSet(VERIFY_KEY,list)}
function currentEmail(){return normEmail(localStorage.getItem(CURRENT_KEY)||getCookie('aibio_member_email')||'')}
function currentMember(){if(SERVER_MEMBER_SESSION.member)return SERVER_MEMBER_SESSION.member;const email=currentEmail();return members().find(m=>normEmail(m.email)===email)||oauthCookieMember()||null}
function isBypassEmail(email){return normEmail(email)===PAYMENT_BYPASS_EMAIL;}
function isSuspended(member){return !!(member&&(member.suspended||member.status==='suspended'));}
function suspensionMessage(member){return member?.suspensionReason?`Account suspended: ${member.suspensionReason}`:'Account suspended. Please contact AIBioTrXiv if you believe this is an error.';}
function isCommentRestricted(member){return !!(member&&(member.commentSuspended||member.commentStatus==='restricted'||member.commentsRestricted));}
function commentRestrictionMessage(member){return member?.commentSuspensionReason?`Peer-comment privilege restricted: ${member.commentSuspensionReason}`:'Peer-comment privilege restricted. You may still submit manuscripts and manage published articles unless your full account is separately suspended.';}
function setCurrent(email){localStorage.setItem(CURRENT_KEY,normEmail(email));}
async function logout(){try{await fetch('/api/auth/logout',{method:'POST'});}catch(e){} localStorage.removeItem(CURRENT_KEY);document.cookie='aibio_member_email=; Max-Age=0; Path=/';document.cookie='aibio_member_name=; Max-Age=0; Path=/';document.cookie='aibio_member_provider=; Max-Age=0; Path=/';location.href='/member/login/'}
function papers(){return safeLocal(PAPERS_KEY,[])}
function setPapers(list){return safeSet(PAPERS_KEY,list)}
async function setPapersAndWait(list){const ok=await safeSetAndWait(PAPERS_KEY,list);requireRemoteWriteOk(ok,PAPERS_KEY);return ok}
function memberPapers(email=currentEmail()){email=normEmail(email);return papers().filter(p=>normEmail(p.memberEmail)===email)}
function upsertPaper(p){const list=papers();const idx=list.findIndex(x=>x.id===p.id);if(idx>=0)list[idx]=p;else list.push(p);return setPapers(list)}
async function upsertPaperAndWait(p){const list=papers();const idx=list.findIndex(x=>x.id===p.id);if(idx>=0)list[idx]=p;else list.push(p);await setPapersAndWait(list);return true}
function getPaper(id){return papers().find(p=>p.id===id)||null}
function deleteDraft(id){const list=papers().filter(p=>p.id!==id);setPapers(list);location.reload();}
function adminSubmissionRecordFromPaper(p){
  return {...p,status:'submitted',paymentStatus:p.paymentStatus||'paid',reviewStatus:'under_review',submittedAt:p.submittedAt||new Date().toISOString()};
}
function paidAdminSubmissions(){return safeLocal('aibio_submissions',[])}
function setPaidAdminSubmissions(list){return safeSet('aibio_submissions',list)}
async function setPaidAdminSubmissionsAndWait(list){const ok=await safeSetAndWait('aibio_submissions',list);requireRemoteWriteOk(ok,'aibio_submissions');return ok}
function copyPaidPaperToAdminQueue(p){const admin=paidAdminSubmissions().filter(x=>x.id!==p.id);admin.push(adminSubmissionRecordFromPaper(p));setPaidAdminSubmissions(admin);}
async function copyPaidPaperToAdminQueueAndWait(p){const admin=paidAdminSubmissions().filter(x=>x.id!==p.id);admin.push(adminSubmissionRecordFromPaper(p));await setPaidAdminSubmissionsAndWait(admin);return true}
async function reconcileAdminQueueFromMemberPapers(){
  const eligible=papers().filter(p=>(p.paymentStatus==='paid'||p.paymentStatus==='waived')&&(p.reviewStatus==='under_review'||p.status==='submitted'));
  if(!eligible.length)return false;
  const admin=paidAdminSubmissions();
  const ids=new Set(admin.map(x=>String(x.id||'')));
  let changed=false;
  eligible.forEach(p=>{if(!ids.has(String(p.id||''))){admin.push(adminSubmissionRecordFromPaper(p));changed=true;}});
  if(changed)await setPaidAdminSubmissionsAndWait(admin);
  return changed;
}
function localPaymentNotifications(){return safeLocal(PAYMENT_NOTIFY_KEY,[])}
function setLocalPaymentNotifications(list){return safeSet(PAYMENT_NOTIFY_KEY,list)}
function recordLocalPaymentNotification(payload){const list=localPaymentNotifications();list.push({...payload,to:ADMIN_PAYMENT_EMAIL,createdAt:new Date().toISOString(),localPrototype:true});setLocalPaymentNotifications(list);}
async function notifyAdminPayment(p,orderId='prototype',purpose='first_submission'){
  const payload={
    to:ADMIN_PAYMENT_EMAIL,
    submissionId:p.id,
    title:p.title||'Untitled manuscript',
    memberEmail:p.memberEmail||currentEmail(),
    memberName:currentMember()?.name||'',
    paypalOrderId:orderId,
    amountUsd:'5.00',
    paymentPurpose:purpose,
    paymentStatus:purpose==='revision_fee'?'paid_revision_fee':'paid',
    reviewStatus:purpose==='revision_fee'?'published_after_fee':'under_review',
    submittedAt:p.submittedAt||new Date().toISOString()
  };
  if(orderId==='prototype-paid' || orderId==='payment-waived-test-account'){
    recordLocalPaymentNotification({...payload,verified:false,localPrototype:true});
    return {ok:true,verified:false,localPrototype:true};
  }
  const res=await fetch('/api/member/payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true});
  const data=await res.json().catch(()=>({ok:false,error:'Payment verification response was not JSON.'}));
  if(!res.ok||!data.ok||!data.verified){
    throw new Error(data.error||'PayPal server-side verification failed. The manuscript was not marked as paid.');
  }
  recordLocalPaymentNotification({...payload,verified:true,paypal:data.paypal||null});
  return data;
}
function makeToken(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function validPassword(p){return String(p||'').length>=8 && /[A-Za-z]/.test(p) && /\d/.test(p)}
function escapeHtml(str=''){return String(str||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function updateMemberNav(){const member=currentMember();document.querySelectorAll('[data-member-link]').forEach(el=>{el.textContent=member?'Member dashboard':'Login';el.href=member?'/member/dashboard/':'/member/login/';});document.querySelectorAll('[data-member-mini]').forEach(el=>{el.textContent=member?`Signed in as ${member.name||member.email}`:'Not signed in';});}
function createVerification(email){const token=makeToken();const list=tokens().filter(t=>normEmail(t.email)!==normEmail(email));list.push({email:normEmail(email),token,createdAt:new Date().toISOString(),used:false});setTokens(list);return token;}
function verificationLink(email, token){return `/member/verify/?email=${encodeURIComponent(normEmail(email))}&token=${encodeURIComponent(token)}`;}
function initRegister(){const form=document.getElementById('registerForm');if(!form)return;form.addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('regName').value.trim();const email=normEmail(document.getElementById('regEmail').value);const password=document.getElementById('regPassword').value;const confirm=document.getElementById('regPasswordConfirm').value;if(!name||!email||!password||!confirm){alert('Please complete display name, email, password, and password confirmation.');return;}if(!validPassword(password)){alert('Password must be at least 8 characters and include at least one letter and one number.');return;}if(password!==confirm){alert('Password confirmation does not match.');return;}const list=members();if(list.some(m=>normEmail(m.email)===email)){alert('This email is already registered. Please log in.');return;}const token=createVerification(email);list.push({name,email,password,emailVerified:false,createdAt:new Date().toISOString()});setMembers(list);setCurrent(email);const url=verificationLink(email,token);const box=document.getElementById('verificationPreview');if(box){box.hidden=false;box.innerHTML=`<h3>Verify your email</h3><p>Please verify your email to continue. Use the verification link below.</p><p><a class="btn btn-cyan" href="${url}">Verify email now</a></p>`;}else{location.href=url;}});}
function initVerify(){const box=document.getElementById('verifyBox');if(!box)return;const qs=new URLSearchParams(location.search);const email=normEmail(qs.get('email'));const token=qs.get('token')||'';let list=tokens();const tok=list.find(t=>normEmail(t.email)===email&&t.token===token&&!t.used);if(!tok){box.innerHTML='<h1 class="page-title">Verification failed</h1><p class="muted">This verification link is invalid or already used.</p><a class="btn btn-ghost" href="/member/login/">Back to login</a>';return;}const ms=members();const idx=ms.findIndex(m=>normEmail(m.email)===email);if(idx<0){box.innerHTML='<h1 class="page-title">Account not found</h1><p class="muted">The account for this verification link could not be found.</p>';return;}ms[idx].emailVerified=true;ms[idx].verifiedAt=new Date().toISOString();setMembers(ms);tok.used=true;setTokens(list);setCurrent(email);box.innerHTML='<h1 class="page-title">Email verified</h1><p class="muted">Your email has been verified. You may now draft manuscripts and proceed to payment when ready.</p><a class="btn btn-cyan" href="/member/dashboard/">Open member dashboard</a>';}
function initLogin(){const form=document.getElementById('loginForm');if(!form)return;form.addEventListener('submit',e=>{e.preventDefault();const email=normEmail(document.getElementById('loginEmail').value);const password=document.getElementById('loginPassword').value;const m=members().find(x=>normEmail(x.email)===email&&x.password===password);if(!m){alert('Login failed. Please check your email and password.');return;}setCurrent(email);if(!m.emailVerified){const token=createVerification(email);alert('Please verify your email before submitting. A local testing verification link will be shown on the next page.');location.href=verificationLink(email,token);return;}location.href='/member/dashboard/';});}
function statusLabel(p){if(p.reviewStatus==='accepted'||p.status==='accepted')return '<span class="member-status-pill paid">Accepted</span>';if(p.reviewStatus==='rejected'||p.status==='rejected')return '<span class="member-status-pill unpaid">Rejected</span>';if((p.paymentStatus==='paid'||p.paymentStatus==='waived')&&(p.reviewStatus==='under_review'||p.status==='submitted'))return '<span class="member-status-pill review">Under review</span>';if(p.status==='revision_draft'||p.isRevisionDraft){if(p.revisionFeeRequired&&p.paymentStatus!=='paid_revision_fee')return '<span class="member-status-pill unpaid">Revision draft · fee required</span>';return p.graceUpdateOfVersion?'<span class="member-status-pill review">12-hour update draft</span>':'<span class="member-status-pill review">Revision draft</span>';}
  if(p.status==='draft')return '<span class="member-status-pill unpaid">Draft · unpaid</span>';if(p.paymentStatus==='paid'||p.paymentStatus==='paid_revision_fee')return '<span class="member-status-pill paid">Paid</span>';return '<span class="member-status-pill unpaid">Unpaid</span>';}
function publishedList(){return safeLocal('aibio_published',[]);}
function publicArticleKey(p){return p.articleId||p.versionGroupId||p.siteId||p.id;}
function versionNumber(v){const m=String(v||'v1').match(/(\d+)/);return m?Number(m[1]):1;}
function revisionFeeRequired(version){return versionNumber(version)>REVISION_FREE_VERSION_LIMIT;}
function publishedAgeHours(p){const stamp=p?.revisionSubmittedAt||p?.publishedAt||p?.date||'';const t=Date.parse(stamp);if(!t)return Infinity;return (Date.now()-t)/36e5;}
function withinRevisionGrace(p){return publishedAgeHours(p)<=REVISION_GRACE_HOURS;}
function memberPublished(email=currentEmail()){email=normEmail(email);return publishedList().filter(p=>normEmail(p.memberEmail)===email||normalizeAuthorEmails(p).includes(email));}
function normalizeAuthorEmails(p){return Array.isArray(p.authorList)?p.authorList.map(a=>normEmail(a.email)).filter(Boolean):(p.email?[normEmail(p.email)]:[]);}
function latestPublishedByArticle(email=currentEmail()){
  const by=new Map();
  memberPublished(email).forEach(p=>{const k=publicArticleKey(p);const old=by.get(k);if(!old||versionNumber(p.version)>versionNumber(old.version))by.set(k,p);});
  return [...by.values()];
}
function versionsForArticleId(articleId){return publishedList().filter(p=>publicArticleKey(p)===articleId).sort((a,b)=>versionNumber(a.version)-versionNumber(b.version));}

function memberAuthorLinks(p){
  const list=Array.isArray(p.authorList)&&p.authorList.length?p.authorList:(p.authors?String(p.authors).split(',').map((name,i)=>({name:name.trim(),email:i===0?(p.email||''):''})).filter(a=>a.name):[]);
  return list.map(a=>a.email?`<a href="mailto:${escapeHtml(a.email)}">${escapeHtml(a.name||a.email)}</a>`:escapeHtml(a.name||'')).join(', ') || escapeHtml(p.authors||currentMember()?.name||'');
}
function cleanMemberRichHtml(html=''){
  const t=document.createElement('template');t.innerHTML=html||'';
  t.content.querySelectorAll('script,style,iframe,object,embed').forEach(n=>n.remove());
  t.content.querySelectorAll('*').forEach(el=>{
    [...el.attributes].forEach(a=>{
      if(/^on/i.test(a.name))el.removeAttribute(a.name);
      if(a.name==='style' && !el.classList.contains('word-figure')) el.removeAttribute(a.name);
    });
  });
  return t.innerHTML.trim();
}
function memberWordHtmlFor(p){
  if(p.pdfEditedHtml)return p.pdfEditedHtml;
  const out=[];
  if((p.abstract||'').trim())out.push(`<section class="word-abstract-box"><h2>Abstract</h2><p>${escapeHtml(p.abstract)}</p></section>`);
  (p.sections||[]).forEach((sec,si)=>{
    const heading=String(sec.heading||'Section').trim();
    if(heading)out.push(`<h2>${escapeHtml(heading)}</h2>`);
    const body=cleanMemberRichHtml(sec.text||'');
    if(body)out.push(`<div class="word-section-text">${body}</div>`);
    if(sec.image)out.push(`<figure class="word-figure" data-figure-id="fig-${si}" data-figure-scale="92" style="width:92%;max-width:100%" contenteditable="false"><img src="${sec.image}" alt="Figure"><figcaption contenteditable="true">${escapeHtml(sec.legend||'')}</figcaption></figure>`);
  });
  return out.join('');
}
function memberClampFigureScale(value){
  const n=Number(value);if(!Number.isFinite(n))return 92;return Math.max(30,Math.min(100,Math.round(n)));
}
function memberApplyFigureScale(fig,scale){
  const n=memberClampFigureScale(scale);fig.dataset.figureScale=String(n);fig.style.width=n+'%';fig.style.maxWidth='100%';return n;
}
function memberSetSelectedFigure(fig){
  document.querySelectorAll('#memberWordPdfEditor .word-figure.selected').forEach(f=>f.classList.remove('selected'));
  if(fig)fig.classList.add('selected');
  memberUpdateFigureToolbar(fig);
}
function memberUpdateFigureToolbar(fig){
  const range=document.getElementById('memberFigureSizeRange');
  const out=document.getElementById('memberFigureSizeValue');
  const label=document.getElementById('memberSelectedFigureLabel');
  if(!range||!out||!label)return;
  if(!fig){range.disabled=true;out.textContent='—';label.textContent='No figure selected';return;}
  const scale=memberClampFigureScale(fig.dataset.figureScale||parseInt(fig.style.width,10)||parseInt(fig.style.maxWidth,10)||92);
  range.disabled=false;range.value=String(scale);out.textContent=scale+'%';label.textContent='Selected figure';
}
function memberCleanEditorForStorage(html){
  const root=document.createElement('div');root.innerHTML=html||'';
  root.querySelectorAll('.figure-move-controls').forEach(n=>n.remove());
  root.querySelectorAll('.word-figure.selected').forEach(fig=>fig.classList.remove('selected'));
  root.querySelectorAll('.word-figure').forEach((fig,i)=>{
    fig.setAttribute('contenteditable','false');
    if(!fig.dataset.figureId)fig.dataset.figureId='fig-'+i;
    const scale=memberClampFigureScale(fig.dataset.figureScale||parseInt(fig.style.width,10)||parseInt(fig.style.maxWidth,10)||92);
    fig.dataset.figureScale=String(scale);fig.style.width=scale+'%';fig.style.maxWidth='100%';
  });
  return root.innerHTML.trim();
}
function memberPersistLayoutEdits(id,{silent=false}={}){
  const editor=document.getElementById('memberWordPdfEditor');if(!editor)return false;
  const p=getPaper(id);if(!p)return false;
  const updated={...p,pdfEditedHtml:memberCleanEditorForStorage(editor.innerHTML)};
  upsertPaper(updated);
  if(!silent)alert('Layout edits saved.');
  return true;
}
function memberMoveFigure(id,figId,delta){
  const editor=document.getElementById('memberWordPdfEditor');if(!editor)return;
  const figs=[...editor.querySelectorAll('.word-figure')];
  const idx=figs.findIndex(f=>f.dataset.figureId===figId);
  const target=idx+delta;
  if(idx<0||target<0||target>=figs.length)return;
  const moving=figs[idx], other=figs[target];
  if(delta<0)other.before(moving);else other.after(moving);
  memberPersistLayoutEdits(id,{silent:true});
}
function memberAddFigureControls(root,id){
  root.querySelectorAll('.word-figure').forEach((fig,i)=>{
    if(!fig.dataset.figureId)fig.dataset.figureId='fig-'+i;
    memberApplyFigureScale(fig,fig.dataset.figureScale||parseInt(fig.style.width,10)||parseInt(fig.style.maxWidth,10)||92);
    fig.querySelector('.figure-move-controls')?.remove();
    const c=document.createElement('div');
    c.className='figure-move-controls no-print';
    c.setAttribute('contenteditable','false');
    c.innerHTML=`<button type="button" title="Move figure up">▲</button><button type="button" title="Move figure down">▼</button>`;
    c.children[0].addEventListener('click',e=>{e.preventDefault();e.stopPropagation();memberSetSelectedFigure(fig);memberMoveFigure(id,fig.dataset.figureId,-1);});
    c.children[1].addEventListener('click',e=>{e.preventDefault();e.stopPropagation();memberSetSelectedFigure(fig);memberMoveFigure(id,fig.dataset.figureId,1);});
    fig.addEventListener('click',()=>memberSetSelectedFigure(fig));
    fig.prepend(c);
  });
}
function memberToolbarHtml(id){
  return `<div class="blog-editor-toolbar no-print" contenteditable="false">
    <button type="button" title="Undo" data-cmd="undo">↶ Undo</button>
    <button type="button" title="Redo" data-cmd="redo">↷ Redo</button>
    <span class="blog-toolbar-separator"></span>
    <button type="button" title="Bold" data-cmd="bold"><strong>B</strong></button>
    <button type="button" title="Italic" data-cmd="italic"><em>I</em></button>
    <button type="button" title="Underline" data-cmd="underline"><u>U</u></button>
    <button type="button" title="Heading 2" data-format="h2">H2</button>
    <button type="button" title="Paragraph" data-format="p">¶</button>
    <button type="button" title="Bulleted list" data-cmd="insertUnorderedList">• List</button>
    <button type="button" title="Numbered list" data-cmd="insertOrderedList">1. List</button>
    <button type="button" title="Insert link" data-action="link">Link</button>
    <button type="button" title="Remove formatting" data-cmd="removeFormat">Clear</button>
    <span class="blog-toolbar-separator"></span>
    <span id="memberSelectedFigureLabel" class="blog-figure-label">No figure selected</span>
    <button type="button" title="Move selected figure up" data-figure-action="up">▲</button>
    <button type="button" title="Move selected figure down" data-figure-action="down">▼</button>
    <button type="button" title="Make selected figure smaller" data-figure-action="smaller">−</button>
    <input id="memberFigureSizeRange" type="range" min="30" max="100" step="1" value="92" disabled title="Resize selected figure">
    <button type="button" title="Make selected figure larger" data-figure-action="larger">＋</button>
    <button type="button" title="Reset selected figure size" data-figure-action="reset">Reset</button>
    <output id="memberFigureSizeValue">—</output>
  </div>`;
}
function memberRenderWordProcessorDocument(p,mode='layout'){
  const tmp=document.createElement('div');tmp.innerHTML=memberWordHtmlFor(p);
  if(mode!=='preview')memberAddFigureControls(tmp,p.id);
  const editable=mode==='preview'?'false':'true';
  const editorId=mode==='preview'?'memberPreviewWordPdfEditor':'memberWordPdfEditor';
  return `<div class="pdf-word-document editor-document blog-edit-document"><div class="pdf-word-page printable-pdf"><div class="pdf-brand" contenteditable="false"><img src="/assets/img/Brand.jpg?v=38" alt=""><div><div class="brand-title pdf-brand-title">AIBioT<span style="color:#AE0000">ʀχiv</span></div><div class="brand-subtitle">AI BioTheory Archive</div></div></div><div class="pdf-title" contenteditable="${editable}">${escapeHtml(p.title||'')}</div><p class="pdf-authors" contenteditable="false"><strong>${memberAuthorLinks(p)}</strong></p><p class="pdf-meta" contenteditable="${editable}">${escapeHtml(p.affiliation||'')}<br>${escapeHtml(p.topic||'')} · ${escapeHtml(p.license||'')}</p><main id="${editorId}" class="pdf-word-editor" contenteditable="${editable}" spellcheck="true">${tmp.innerHTML}</main></div></div>`;
}
function memberBindToolbar(id){
  const toolbar=document.getElementById('memberBlogEditorToolbar');
  const editor=document.getElementById('memberWordPdfEditor');
  if(!toolbar||!editor)return;
  const save=()=>memberPersistLayoutEdits(id,{silent:true});
  toolbar.querySelectorAll('[data-cmd]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();document.execCommand(btn.dataset.cmd,false,null);editor.focus();save();}));
  toolbar.querySelectorAll('[data-format]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();document.execCommand('formatBlock',false,btn.dataset.format);editor.focus();save();}));
  toolbar.querySelector('[data-action="link"]')?.addEventListener('click',e=>{e.preventDefault();const url=prompt('Enter link URL');if(url)document.execCommand('createLink',false,url);editor.focus();save();});
  const selected=()=>editor.querySelector('.word-figure.selected');
  toolbar.querySelector('[data-figure-action="up"]')?.addEventListener('click',e=>{e.preventDefault();const fig=selected();if(fig)memberMoveFigure(id,fig.dataset.figureId,-1);});
  toolbar.querySelector('[data-figure-action="down"]')?.addEventListener('click',e=>{e.preventDefault();const fig=selected();if(fig)memberMoveFigure(id,fig.dataset.figureId,1);});
  const setScale=(v)=>{const fig=selected();if(!fig)return;const n=memberApplyFigureScale(fig,v);document.getElementById('memberFigureSizeRange').value=String(n);document.getElementById('memberFigureSizeValue').textContent=n+'%';save();};
  toolbar.querySelector('[data-figure-action="smaller"]')?.addEventListener('click',e=>{e.preventDefault();const fig=selected();if(fig)setScale(memberClampFigureScale(fig.dataset.figureScale)-5);});
  toolbar.querySelector('[data-figure-action="larger"]')?.addEventListener('click',e=>{e.preventDefault();const fig=selected();if(fig)setScale(memberClampFigureScale(fig.dataset.figureScale)+5);});
  toolbar.querySelector('[data-figure-action="reset"]')?.addEventListener('click',e=>{e.preventDefault();setScale(92);});
  toolbar.querySelector('#memberFigureSizeRange')?.addEventListener('input',e=>setScale(e.target.value));
  editor.addEventListener('input',()=>save());
  editor.addEventListener('click',e=>{const fig=e.target.closest?.('.word-figure');if(fig)memberSetSelectedFigure(fig);});
}
function memberOpenPdfBlobInPreviewWindow(win,blob,filename){
  const url=URL.createObjectURL(blob);
  if(win && !win.closed){
    win.location.href=url;
  }else{
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.download=filename||'AIBioTrXiv-preview.pdf';document.body.appendChild(a);a.click();a.remove();
  }
  setTimeout(()=>URL.revokeObjectURL(url),120000);
}
function memberRememberCanonicalPdfPreview(id,meta){
  if(!id||!meta||!meta.pdfKey)return;
  window.AIBIO_MEMBER_CANONICAL_PDF_PREVIEWS=window.AIBIO_MEMBER_CANONICAL_PDF_PREVIEWS||{};
  window.AIBIO_MEMBER_CANONICAL_PDF_PREVIEWS[id]={...meta,storedAt:new Date().toISOString()};
  const p=getPaper(id);
  if(p){
    upsertPaper({...p,canonicalPreviewPdfR2Key:meta.pdfKey,canonicalPreviewHtmlR2Key:meta.htmlKey||'',canonicalPreviewPdfSha256:meta.pdfSha256||'',canonicalPreviewHtmlSha256:meta.htmlSha256||'',canonicalPreviewStoredAt:new Date().toISOString()});
  }
}
function memberApplyRememberedCanonicalPdfPreview(record){
  const id=String(record?.id||record?.sourceSubmissionId||'');
  const cached=(window.AIBIO_MEMBER_CANONICAL_PDF_PREVIEWS||{})[id];
  if(cached&&cached.pdfKey){
    return {...record,canonicalPreviewPdfR2Key:cached.pdfKey,canonicalPreviewHtmlR2Key:cached.htmlKey||record.canonicalPreviewHtmlR2Key,canonicalPreviewPdfSha256:cached.pdfSha256||record.canonicalPreviewPdfSha256,canonicalPreviewHtmlSha256:cached.htmlSha256||record.canonicalPreviewHtmlSha256};
  }
  return record;
}
async function memberGenerateCloudflarePdfPreview(record){
  const articleId=String(record.siteId||record.articleId||record.versionGroupId||record.id||'AIBioTrXiv').replace(/[^A-Za-z0-9_-]+/g,'-');
  const version=String(record.version||'preview').replace(/[^A-Za-z0-9_-]+/g,'-');
  const filename=`${articleId}-${version}.pdf`;
  const htmlFragment=memberRenderWordProcessorDocument(record,'preview');
  const res=await fetch('/api/publish-pdf',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({previewOnly:true,mode:'preview',storeCanonicalPreview:true,record,articleId,version,filename,htmlFragment,sourceSubmissionId:record.sourceSubmissionId||record.id||'',acceptedId:record.sourceSubmissionId||record.id||''})});
  if(!res.ok){
    const text=await res.text().catch(()=>res.statusText);
    let detail=text;
    try{const data=JSON.parse(text);detail=data.detail||data.error||text;}catch(_){ }
    throw new Error(detail||'PDF preview generation failed.');
  }
  const meta={pdfKey:res.headers.get('x-aibiotrxiv-preview-pdf-key')||'',htmlKey:res.headers.get('x-aibiotrxiv-preview-html-key')||'',pdfSha256:res.headers.get('x-aibiotrxiv-preview-pdf-sha256')||'',htmlSha256:res.headers.get('x-aibiotrxiv-preview-html-sha256')||''};
  return {blob:await res.blob(),filename,meta};
}
async function memberPrintPdfPreview(id){
  const previewWindow=window.open('','_blank');
  if(previewWindow){previewWindow.document.write('<!doctype html><title>AIBioTrXiv PDF preview</title><p style="font-family:Arial,sans-serif;padding:24px">Generating canonical PDF preview with Cloudflare Browser Rendering...</p>');}
  try{
    const saved=await memberPersistLayoutEdits(id,{silent:true});
    if(!saved) throw new Error('The current PDF layout could not be saved before preview.');
    document.querySelectorAll('#memberWordPdfEditor .word-figure.selected').forEach(fig=>fig.classList.remove('selected'));
    const record=getPaper(id);
    if(!record) throw new Error('Revision draft not found.');
    const out=await memberGenerateCloudflarePdfPreview(record);
    if(out.meta&&out.meta.pdfKey)memberRememberCanonicalPdfPreview(id,out.meta);
    memberOpenPdfBlobInPreviewWindow(previewWindow,out.blob,out.filename);
  }catch(err){
    console.error(err);
    const msg='PDF preview could not be generated on the backend. This preview now uses Cloudflare Browser Rendering so that preview and publish PDFs stay consistent.\n\nError detail: '+((err&&err.message)||err);
    if(previewWindow && !previewWindow.closed){previewWindow.document.body.innerHTML='<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;padding:24px;color:#991b1b"></pre>';previewWindow.document.querySelector('pre').textContent=msg;}
    alert(msg);
  }
}
async function attachMemberPdfToPublishedRecord(record,acceptedId){
  record=memberApplyRememberedCanonicalPdfPreview(record);
  if(!record.canonicalPreviewPdfR2Key){
    throw new Error('Please click PDF preview first. The published PDF now uses the exact canonical preview PDF, so publishing is blocked until a Cloudflare Browser Rendering preview has been generated.');
  }
  const htmlFragment=memberRenderWordProcessorDocument(record,'preview');
  const articleId=String(record.siteId||record.articleId||record.id||'AIBioTrXiv').replace(/[^A-Za-z0-9_-]+/g,'-');
  const version=String(record.version||'v1').replace(/[^A-Za-z0-9_-]+/g,'-');
  const filename=`${articleId}-${version}.pdf`;
  const res=await fetch('/api/publish-pdf',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({record,articleId,version,filename,htmlFragment,canonicalPreviewPdfR2Key:record.canonicalPreviewPdfR2Key||'',canonicalPreviewHtmlR2Key:record.canonicalPreviewHtmlR2Key||'',sourceSubmissionId:record.sourceSubmissionId||record.id||'',acceptedId:acceptedId||record.id||''})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw new Error(data.detail||data.error||'PDF generation failed.');
  return {...record,...(data.record||{}),pdfGenerationMode:'cloudflare-browser-run-r2'};
}
function renderMemberRevisionLayout(id){
  const el=document.getElementById('memberVersions');if(!el)return;
  const p=getPaper(id);const m=currentMember();
  if(!m||!p||normEmail(p.memberEmail)!==normEmail(m.email)){el.innerHTML='<div class="auth-required"><h2>Revision draft not found</h2></div>';return;}
  el.innerHTML=`<div class="admin-card"><h2>Author PDF layout workspace</h2><p class="muted">This workspace is for post-publication versions. PDF preview is generated by the backend Cloudflare Browser Rendering engine, matching the publish PDF engine.</p></div><div class="single-layout-editor member-layout-editor"><section class="layout-editor-pane"><div class="panel-label no-print">Editing workspace</div><div class="layout-top-actions no-print"><button class="btn btn-ghost" onclick="AIBIO.memberPdfPreview('${p.id}')">PDF preview</button></div><div id="memberBlogEditorToolbar">${memberToolbarHtml(p.id)}</div>${memberRenderWordProcessorDocument(p,'layout')}</section></div><aside class="admin-card layout-tool single-layout-tool"><h3>Version tools</h3><p class="muted">Save layout edits before publishing. The newest published version becomes the PDF used by Download PDF on the public article page.</p><div class="hero-actions" style="margin-top:18px"><button class="btn btn-cyan" onclick="AIBIO.memberSaveLayout('${p.id}')">Save layout edits</button><button class="btn btn-cyan" onclick="AIBIO.memberSelfPublishRevision('${p.id}')">${p.graceUpdateOfVersion?'Update this version':'Publish new version'}</button><a class="btn btn-ghost" href="/member/submissions/versions/?article=${encodeURIComponent(p.articleId||p.versionGroupId||'')}">Back to versions</a></div></aside>`;
  memberAddFigureControls(document,p.id);
  memberBindToolbar(p.id);
}

function createRevisionDraft(articleId){
  const m=currentMember(); if(!m)return location.href='/member/login/';
  if(isSuspended(m))return alert(suspensionMessage(m));
  const versions=versionsForArticleId(articleId);
  if(!versions.length)return alert('Published article not found. Version numbers begin only after a manuscript has been published. Draft edits remain part of v1 and do not create new versions.');
  const latest=versions[versions.length-1];
  const latestN=versionNumber(latest.version);
  const articleRoot=publicArticleKey(latest);
  const grace=withinRevisionGrace(latest);
  const nextN=grace ? latestN : latestN+1;
  const next='v'+nextN;
  const feeRequired=!grace && revisionFeeRequired(next);
  const draft={...latest,
    id:'SUB-'+Date.now(),
    status:'revision_draft',
    paymentStatus:feeRequired?'unpaid_revision_fee':'not_required',
    reviewStatus:'revision_draft',
    isRevisionDraft:true,
    revisionSelfPublishAllowed:!feeRequired,
    revisionFeeRequired:feeRequired,
    revisionFeeAmountUsd:feeRequired?'5.00':'0.00',
    graceUpdateOfVersion:grace,
    graceUpdateOriginalPublishedId:grace?(latest.id||latest.siteId||''):'',
    previousVersionSiteId:latest.siteId||latest.id,
    versionGroupId:articleRoot,
    articleId:articleRoot,
    version:next,
    versionNote:'',
    createdAt:new Date().toISOString(),
    memberEmail:m.email,
    sourceSubmissionId:undefined,
    siteId:undefined,
    publishedAt:undefined,
    date:undefined,
    pdf:latest.pdf||'#'};
  upsertPaper(draft);
  location.href='/submit/new/?draft='+encodeURIComponent(draft.id);
}
async function selfPublishRevision(id){
  const m=currentMember();
  const p=getPaper(id);
  if(!m||!p||normEmail(p.memberEmail)!==normEmail(m.email))return alert('Revision draft not found for this account.');
  if(isSuspended(m))return alert(suspensionMessage(m));
  if(!p.isRevisionDraft)return alert('This is not a post-publication revision draft. Draft edits before first publication remain v1.');
  if(p.revisionFeeRequired && p.paymentStatus!=='paid_revision_fee'){
    location.href='/submit/payment/?id='+encodeURIComponent(p.id)+'&revision=1';
    return;
  }
  const versions=versionsForArticleId(p.articleId||p.versionGroupId||p.previousVersionSiteId);
  if(!versions.length)return alert('Original published article not found.');
  const latest=versions[versions.length-1];
  const articleId=p.articleId||p.versionGroupId||publicArticleKey(latest);
  const nowIso=new Date().toISOString();
  const today=nowIso.slice(0,10);
  let published;
  let pub=publishedList();
  if(p.graceUpdateOfVersion){
    published={...p,articleId,versionGroupId:articleId,siteId:latest.siteId||latest.id||articleId,id:latest.id||latest.siteId||articleId,status:'published',paymentStatus:latest.paymentStatus||'not_required',reviewStatus:'published',publishedAt:latest.publishedAt||latest.date||today,date:latest.date||latest.publishedAt||today,revisionSelfPublished:true,graceUpdatedAt:nowIso,revisionSubmittedAt:latest.revisionSubmittedAt||latest.publishedAt||nowIso,recordProtection:{...(p.recordProtection||{}),timestampedAt:p.recordProtection?.timestampedAt||latest.publishedAt||nowIso,versionPolicy:'This version was updated inside the 12-hour correction window. The version number did not change.'}};
    pub=pub.filter(x=>!(publicArticleKey(x)===articleId && String(x.version||'v1')===String(published.version||'v1')));
  }else{
    published={...p,articleId,versionGroupId:articleId,siteId:latest.siteId||latest.id||articleId,id:p.id,status:'published',paymentStatus:p.revisionFeeRequired?'paid_revision_fee':'not_required',reviewStatus:'published',publishedAt:today,date:today,revisionSelfPublished:true,revisionSubmittedAt:nowIso,recordProtection:{...(p.recordProtection||{}),timestampedAt:nowIso,versionPolicy:'After v1 publication, new versions v2-v15 are author self-published without editorial screening or additional PayPal payment. From v16 onward, each new version requires a US$5 platform maintenance fee, but does not enter editorial review. Earlier versions remain preserved for timestamp and credit traceability.'}};
    pub=pub.filter(x=>x.id!==published.id);
  }
  try{
    published=await attachMemberPdfToPublishedRecord(published,p.id);
  }catch(err){
    console.error(err);
    alert('PDF generation failed, so this version was not published. Error detail: '+((err&&err.message)||err));
    return;
  }
  pub.push(published);
  await safeSetAndWait('aibio_published',pub);
  const remaining=papers().filter(x=>x.id!==p.id);
  await setPapersAndWait(remaining.concat(published));
  alert((p.graceUpdateOfVersion?'This version was updated. ':'New version published. ')+'The Download PDF button now points to this latest version PDF.');
  location.href='/manuscripts/?id='+encodeURIComponent(articleId)+'&version='+encodeURIComponent(published.version||'v1');
}
function renderMemberPaperTable(rows,mode){
  if(!rows.length)return '<p class="muted">No records in this section.</p>';
  return `<table class="admin-table"><thead><tr><th>Manuscript</th><th>Category</th><th>Version</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(p=>{
    const articleId=publicArticleKey(p);
    const paid=p.paymentStatus==='waived'?'<span class="member-status-pill paid">Payment waived</span>':(p.paymentStatus==='paid'?'<span class="member-status-pill paid">Paid US$5</span>':(p.paymentStatus==='paid_revision_fee'?'<span class="member-status-pill paid">Revision fee paid</span>':(p.paymentStatus==='not_required'?'<span class="member-status-pill paid">No additional fee</span>':(p.paymentStatus==='unpaid_revision_fee'?'<span class="member-status-pill unpaid">US$5 revision fee required</span>':'<span class="member-status-pill unpaid">Unpaid</span>'))));
    let action='';
    if(mode==='drafts') action=p.isRevisionDraft?`<a class="btn btn-ghost" href="/submit/new/?draft=${encodeURIComponent(p.id)}">Edit text</a> <a class="btn btn-ghost" href="/member/submissions/versions/?id=${encodeURIComponent(p.id)}&layout=1">PDF layout</a> ${p.revisionFeeRequired&&p.paymentStatus!=='paid_revision_fee'?`<a class="btn btn-cyan" href="/submit/payment/?id=${encodeURIComponent(p.id)}&revision=1">Pay US$5 and publish</a>`:`<button class="btn btn-cyan" onclick="AIBIO.memberSelfPublishRevision('${p.id}')">${p.graceUpdateOfVersion?'Update this version':'Publish new version'}</button>`} <button class="btn btn-danger btn-delete" onclick="AIBIO.memberDeleteDraft('${p.id}')">Delete</button>`:`${(p.paymentStatus==='paid'||p.paymentStatus==='waived')?'<span class="muted">Locked after submission</span>':`<a class="btn btn-ghost" href="/submit/new/?draft=${encodeURIComponent(p.id)}">Edit draft</a> <a class="btn btn-cyan" href="/member/submissions/versions/?id=${encodeURIComponent(p.id)}">Version info</a> <button class="btn btn-danger btn-delete" onclick="AIBIO.memberDeleteDraft('${p.id}')">Delete</button>`}`;
    if(mode==='review') action=`<a class="btn btn-ghost" href="/member/submissions/versions/?id=${encodeURIComponent(p.id)}">View status</a>`;
    if(mode==='published') action=`<a class="btn btn-ghost" href="/manuscripts/?id=${encodeURIComponent(articleId)}">Open article</a> <a class="btn btn-cyan" href="/member/submissions/versions/?article=${encodeURIComponent(articleId)}">Versions</a> <button class="btn btn-ghost" onclick="AIBIO.memberCreateRevision('${articleId}')">Create/update version</button>`;
    return `<tr><td><strong>${escapeHtml(p.title||'Untitled manuscript')}</strong><br><span class="muted">${escapeHtml(p.id||p.siteId||'')}</span></td><td>${escapeHtml(p.submissionCategory||'AI Research')}</td><td>${escapeHtml(p.version||'draft')}</td><td>${mode==='published'?'<span class="member-status-pill paid">Published</span>':paid+' '+statusLabel(p)}</td><td>${action}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function initDashboard(){
  const el=document.getElementById('memberDashboard');if(!el)return;
  const m=currentMember();
  if(!m){el.innerHTML='<div class="auth-required"><h2>Member login required</h2><p>Please log in or register before viewing your member dashboard.</p><div class="hero-actions"><a class="btn btn-cyan" href="/member/login/">Login</a><a class="btn btn-ghost" href="/member/register/">Register</a></div></div>';return;}
  if(isSuspended(m)){el.innerHTML=`<div class="auth-required"><h2>Account suspended</h2><p>${escapeHtml(suspensionMessage(m))}</p><p class="muted">Suspended members cannot submit manuscripts, pay submission fees, or post peer comments until the account is restored by an administrator.</p><button class="btn btn-ghost" id="logoutBtn">Logout</button></div>`;document.getElementById('logoutBtn').onclick=logout;return;}
  const rows=memberPapers(m.email);
  const drafts=rows.filter(p=>p.status==='draft'||p.status==='revision_draft'||p.isRevisionDraft||(!p.paymentStatus||p.paymentStatus==='unpaid'));
  const underReview=rows.filter(p=>(p.paymentStatus==='paid'||p.paymentStatus==='waived')&&(p.reviewStatus==='under_review'||p.status==='submitted'||p.reviewStatus==='accepted'||p.status==='accepted'||p.reviewStatus==='rejected'||p.status==='rejected'));
  const published=latestPublishedByArticle(m.email);
  const verifyBlock=m.emailVerified?'':'<div class="auth-required"><h3>Email verification required</h3><p>You can draft manuscripts, but formal submission and PayPal payment require verified email.</p><a class="btn btn-cyan" href="'+verificationLink(m.email,createVerification(m.email))+'">Verify email</a></div>';
  el.innerHTML=`${verifyBlock}
    <div class="member-hero">
      <div>
        <h2>Welcome, ${escapeHtml(m.name||m.email)}</h2>
        <p class="muted">Manage drafts, payments, revisions, published versions, peer comments, and account status.</p>
        <p class="member-mini">${escapeHtml(m.email)} · ${m.emailVerified?'Email verified':'Email not verified'}</p>
      </div>
      <button class="btn btn-ghost" id="logoutBtn">Logout</button>
    </div>
    <div class="member-action-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin:24px 0;">
      <a class="member-action-card" style="display:flex;flex-direction:column;gap:8px;padding:22px;border:1px solid rgba(17,24,39,.12);border-radius:22px;background:#fff;box-shadow:0 12px 28px rgba(17,24,39,.08);text-decoration:none;" href="/submit/new/">
        <strong style="display:block;line-height:1.2;">Start new manuscript</strong>
        <span style="display:block;line-height:1.45;">Create an AI Research or AI Idea draft.</span>
      </a>
      <a class="member-action-card" style="display:flex;flex-direction:column;gap:8px;padding:22px;border:1px solid rgba(17,24,39,.12);border-radius:22px;background:#fff;box-shadow:0 12px 28px rgba(17,24,39,.08);text-decoration:none;" href="/member/submissions/">
        <strong style="display:block;line-height:1.2;">All submissions</strong>
        <span style="display:block;line-height:1.45;">See drafts, submitted manuscripts, and decisions.</span>
      </a>
      <a class="member-action-card" style="display:flex;flex-direction:column;gap:8px;padding:22px;border:1px solid rgba(17,24,39,.12);border-radius:22px;background:#fff;box-shadow:0 12px 28px rgba(17,24,39,.08);text-decoration:none;" href="/member/submissions/versions/">
        <strong style="display:block;line-height:1.2;">Version management</strong>
        <span style="display:block;line-height:1.45;">Create and track revised versions.</span>
      </a>
      <a class="member-action-card" style="display:flex;flex-direction:column;gap:8px;padding:22px;border:1px solid rgba(17,24,39,.12);border-radius:22px;background:#fff;box-shadow:0 12px 28px rgba(17,24,39,.08);text-decoration:none;" href="/guidelines/">
        <strong style="display:block;line-height:1.2;">Author guidelines</strong>
        <span style="display:block;line-height:1.45;">Prepare manuscripts and credit records.</span>
      </a>
    </div>
    <div class="dashboard-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:24px 0;">
      <div class="metric-card" style="padding:18px;border:1px solid rgba(17,24,39,.12);border-radius:20px;background:#fff;"><strong style="display:block;font-size:28px;line-height:1;">${drafts.length}</strong><span style="display:block;margin-top:8px;">Drafts</span></div>
      <div class="metric-card" style="padding:18px;border:1px solid rgba(17,24,39,.12);border-radius:20px;background:#fff;"><strong style="display:block;font-size:28px;line-height:1;">${underReview.length}</strong><span style="display:block;margin-top:8px;">Submitted / decisions</span></div>
      <div class="metric-card" style="padding:18px;border:1px solid rgba(17,24,39,.12);border-radius:20px;background:#fff;"><strong style="display:block;font-size:28px;line-height:1;">${published.length}</strong><span style="display:block;margin-top:8px;">Published articles</span></div>
    </div>
    <section class="dashboard-section"><h2>Drafts and unpaid manuscripts</h2>${renderMemberPaperTable(drafts,'drafts')}</section>
    <section class="dashboard-section"><h2>Submitted / decisions</h2>${renderMemberPaperTable(underReview,'review')}</section>
    <section class="dashboard-section"><h2>Published articles and versions</h2><p class="muted">Before first publication, draft edits remain v1. After publication, new public updates become preserved versions; Browse shows only the latest version. A published version may be corrected within 12 hours without changing the version number.</p>${renderMemberPaperTable(published,'published')}</section>`;
  document.getElementById('logoutBtn').onclick=logout;
}
function initMemberSubmissions(){
  const el=document.getElementById('memberSubmissions');if(!el)return;
  const m=currentMember();if(!m){el.innerHTML='<div class="auth-required"><h2>Login required</h2><a class="btn btn-cyan" href="/member/login/">Login</a></div>';return;}
  const rows=memberPapers(m.email);
  const published=latestPublishedByArticle(m.email);
  el.innerHTML=`<div class="dashboard-section"><h2>Drafts</h2>${renderMemberPaperTable(rows.filter(p=>p.status==='draft'||p.status==='revision_draft'||p.isRevisionDraft||(!p.paymentStatus||p.paymentStatus==='unpaid')),'drafts')}</div><div class="dashboard-section"><h2>Submitted / decisions</h2>${renderMemberPaperTable(rows.filter(p=>(p.paymentStatus==='paid'||p.paymentStatus==='waived')&&(p.reviewStatus==='under_review'||p.status==='submitted'||p.reviewStatus==='accepted'||p.status==='accepted'||p.reviewStatus==='rejected'||p.status==='rejected')),'review')}</div><div class="dashboard-section"><h2>Published</h2>${renderMemberPaperTable(published,'published')}</div>`;
}
function initMemberVersions(){
  const el=document.getElementById('memberVersions');if(!el)return;
  const m=currentMember();if(!m){el.innerHTML='<div class="auth-required"><h2>Login required</h2><a class="btn btn-cyan" href="/member/login/">Login</a></div>';return;}
  const qs=new URLSearchParams(location.search);
  let articleId=qs.get('article');
  const draftId=qs.get('id');
  if(draftId && qs.get('layout')==='1'){renderMemberRevisionLayout(draftId);return;}
  let draft=draftId?getPaper(draftId):null;
  if(!articleId && draft) articleId=draft.articleId||draft.versionGroupId||draft.previousVersionSiteId||'';
  const pubRows=articleId?versionsForArticleId(articleId):memberPublished(m.email).sort((a,b)=>String(a.siteId||a.id).localeCompare(String(b.siteId||b.id)));
  const draftRows=articleId?memberPapers(m.email).filter(p=>(p.articleId||p.versionGroupId)===articleId):memberPapers(m.email).filter(p=>p.isRevisionDraft);
  el.innerHTML=`<div class="admin-card"><h2>Version management</h2><p class="muted">Revisions are preserved as separate versions. The newest published version is used in Browse, while earlier versions remain accessible from the article page.</p><div class="policy-note warning"><strong>Published-version rule:</strong> before first publication, any number of draft edits still belong to v1. After publication, a version may be corrected within 12 hours without changing its version number. After that window closes, further changes must be published as the next version. Versions v2-v15 do not require another PayPal payment or editorial screening. From v16 onward, each new version requires a US$5 platform maintenance fee, but still does not enter editorial review. Do not add unlawful, abusive, fraudulent, unsafe, plagiarized, or misleading material. Reported violations may lead to account suspension and article unpublication.</div>${articleId?`<div class="hero-actions"><a class="btn btn-ghost" href="/manuscripts/?id=${encodeURIComponent(articleId)}">Open latest public version</a><button class="btn btn-cyan" onclick="AIBIO.memberCreateRevision('${articleId}')">Create new version draft</button></div>`:''}</div><section class="dashboard-section"><h2>Published version history</h2>${pubRows.length?`<table class="admin-table"><thead><tr><th>Version</th><th>Published</th><th>Article</th><th>Action</th></tr></thead><tbody>${pubRows.map(p=>`<tr><td><strong>${escapeHtml(p.version||'v1')}</strong></td><td>${escapeHtml(p.publishedAt||p.date||'')}</td><td>${escapeHtml(p.siteId||p.id)}</td><td><a class="btn btn-ghost" href="/manuscripts/?id=${encodeURIComponent(publicArticleKey(p))}&version=${encodeURIComponent(p.version||'v1')}">Open this version</a></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No published versions found yet.</p>'}</section><section class="dashboard-section"><h2>Revision drafts</h2>${renderMemberPaperTable(draftRows,'drafts')}</section>`;
}
function initPayment(){const el=document.getElementById('paypalPaymentBox');if(!el)return;const m=currentMember();const id=new URLSearchParams(location.search).get('id')||'';const p=getPaper(id);if(!m){el.innerHTML='<div class="auth-required"><h2>Please log in first</h2><p>You must be logged in before paying the processing fee.</p><a class="btn btn-cyan" href="/member/login/">Login</a></div>';return;} if(isSuspended(m)){el.innerHTML=`<div class="auth-required"><h2>Account suspended</h2><p>${escapeHtml(suspensionMessage(m))}</p></div>`;return;} if(!m.emailVerified){el.innerHTML='<div class="auth-required"><h2>Email verification required</h2><p>Please verify your email before payment and formal submission.</p><a class="btn btn-cyan" href="'+verificationLink(m.email,createVerification(m.email))+'">Verify email</a></div>';return;} if(!p||normEmail(p.memberEmail)!==normEmail(m.email)){el.innerHTML='<div class="auth-required"><h2>Draft not found</h2><p>This payment page could not find a draft owned by your account.</p><a class="btn btn-ghost" href="/member/dashboard/">Back to dashboard</a></div>';return;}
 const isRevisionFee=!!(p.isRevisionDraft&&p.revisionFeeRequired);
 if(isBypassEmail(m.email)&&!isRevisionFee){el.innerHTML='<div class="auth-required"><h2>Payment bypass account</h2><p>This verified testing account can submit directly to editorial review without PayPal.</p><button class="btn btn-cyan" id="bypassSubmitNow">Submit to review</button><a class="btn btn-ghost" href="/member/dashboard/">Back to dashboard</a></div>';document.getElementById('bypassSubmitNow').onclick=()=>submitWithoutPayment(id);return;}
 const headline=isRevisionFee?'Pay post-v15 version maintenance fee':'Pay submission processing fee';
 const body=isRevisionFee?'This US$5 platform maintenance fee is required because this article has reached v16 or later. Payment publishes this new version directly; it does not enter editorial review.':'This US$5 fee is required before AIBioTrXiv begins editorial screening of the first submitted version.';
 el.insertAdjacentHTML('beforebegin',`<div class="pay-card"><div class="hero-actions" style="align-items:flex-start;justify-content:space-between"><div><h2>${headline}</h2><p class="muted"><strong>${escapeHtml(p.title||'Untitled draft')}</strong></p><p>${body}</p></div><div class="price-badge">$5</div></div><div class="payment-note">${isRevisionFee?'After PayPal approval, this version will be published immediately and earlier versions will remain preserved.':'After PayPal approval, this manuscript will return to your dashboard as paid and under review.'}</div></div>`);
 async function markPaid(orderId='prototype'){
   try{
     if(isRevisionFee){
       const pending={...p,paymentStatus:'paid_revision_fee',paypalOrderId:orderId,revisionFeePaidAt:new Date().toISOString()};
       if(orderId!=='prototype-paid') await notifyAdminPayment(pending,orderId,'revision_fee');
       else recordLocalPaymentNotification({submissionId:p.id,title:p.title,memberEmail:p.memberEmail,paypalOrderId:orderId,amountUsd:'5.00',paymentPurpose:'revision_fee',localPrototype:true});
       await upsertPaperAndWait(pending);
       selfPublishRevision(pending.id);
       return;
     }
     const updated={...p,paymentStatus:'paid',paypalOrderId:orderId,status:'submitted',reviewStatus:'under_review',submittedAt:new Date().toISOString()};
     if(orderId!=='prototype-paid') await notifyAdminPayment(updated,orderId,'first_submission');
     else recordLocalPaymentNotification({submissionId:p.id,title:p.title,memberEmail:p.memberEmail,paypalOrderId:orderId,amountUsd:'5.00',paymentPurpose:'first_submission',localPrototype:true});
     await upsertPaperAndWait(updated);await copyPaidPaperToAdminQueueAndWait(updated);location.href='/member/dashboard/?paid=1';
   }catch(err){console.error(err);alert((err&&err.message)||'PayPal server-side verification failed. The manuscript was not marked as paid.');}
 }
 if(window.paypal&&paypal.Buttons){paypal.Buttons({style:{layout:'vertical',color:'gold',shape:'pill',label:'paypal'},createOrder:(data,actions)=>actions.order.create({purchase_units:[{description:isRevisionFee?'AIBioTrXiv post-v15 version platform maintenance fee':'AIBioTrXiv manuscript submission processing fee',amount:{currency_code:'USD',value:'5.00'}}]}),onApprove:(data,actions)=>actions.order.capture().then(()=>markPaid(data.orderID)),onError:(err)=>{console.error(err);alert('PayPal could not complete the payment. Please try again.');}}).render('#paypalPaymentBox');} else {el.innerHTML='<p class="muted">PayPal SDK did not load. Check the internet connection, browser blocker, or client ID.</p>';}
 document.getElementById('prototypePaidButton')?.addEventListener('click',()=>markPaid('prototype-paid'));
}
async function submitWithoutPayment(id){
  try{
    const m=currentMember();
    const p=getPaper(id);
    if(!m||!p||normEmail(p.memberEmail)!==normEmail(m.email))return alert('Draft not found for this account.');
    if(isSuspended(m))return alert(suspensionMessage(m));
    if(!isBypassEmail(m.email))return alert('This account is not authorized for payment bypass.');
    const updated={...p,paymentStatus:'waived',paymentWaived:true,paymentWaiverReason:'Testing/admin flow account',paypalOrderId:'payment-waived-test-account',status:'submitted',reviewStatus:'under_review',submittedAt:new Date().toISOString()};
    await upsertPaperAndWait(updated);
    await copyPaidPaperToAdminQueueAndWait(updated);
    await notifyAdminPayment(updated,'payment-waived-test-account');
    location.href='/member/dashboard/?submitted=1';
  }catch(err){
    console.error(err);
    alert((err&&err.message)||'The manuscript could not be submitted to the admin queue. Please try again before leaving this page.');
  }
}
window.AIBIO=window.AIBIO||{};Object.assign(window.AIBIO,{memberCreateRevision:createRevisionDraft,memberCurrent:currentMember,memberCurrentAsync:refreshServerMemberSession,memberServerSession:refreshServerMemberSession,memberEmail:currentEmail,memberPapers,memberUpsertPaper:upsertPaper,memberUpsertPaperAndWait:upsertPaperAndWait,memberGetPaper:getPaper,memberMarkPaidCopy:copyPaidPaperToAdminQueue,memberMarkPaidCopyAndWait:copyPaidPaperToAdminQueueAndWait,memberDeleteDraft:deleteDraft,memberVerificationLink:verificationLink,memberNotifyPayment:notifyAdminPayment,memberSubmitWithoutPayment:submitWithoutPayment,memberSelfPublishRevision:selfPublishRevision,memberSaveLayout:memberPersistLayoutEdits,memberPdfPreview:memberPrintPdfPreview,memberIsSuspended:isSuspended,memberSuspensionMessage:suspensionMessage,memberCommentRestricted:isCommentRestricted,memberCommentRestrictionMessage:commentRestrictionMessage,memberPaymentBypassEmail:PAYMENT_BYPASS_EMAIL,memberStorageReady:loadRemoteKv});
document.addEventListener('DOMContentLoaded',async()=>{await loadRemoteKv();await refreshServerMemberSession().catch(()=>null);try{await reconcileAdminQueueFromMemberPapers();}catch(e){console.error('Admin queue reconciliation failed',e);}updateMemberNav();initRegister();initVerify();initLogin();initDashboard();initMemberSubmissions();initMemberVersions();initPayment();});
})();
