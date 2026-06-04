
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
      return data.values;
    }
  }catch(e){console.error('D1 storage load failed',e);}
  window.AIBIO_REMOTE_KV.loaded=true;
  return window.AIBIO_REMOTE_KV.data;
}
function remoteKvLoaded(){return !!window.AIBIO_REMOTE_KV?.loaded;}
function writeRemoteKv(key,value){
  if(!AIBIO_REMOTE_KV_KEYS.includes(key)) return;
  window.AIBIO_REMOTE_KV.data[key]=value;
  fetch('/api/storage/kv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({key,value})}).catch(e=>console.error('D1 storage write failed',e));
}
function getRemoteValue(key){
  return window.AIBIO_REMOTE_KV?.data && Object.prototype.hasOwnProperty.call(window.AIBIO_REMOTE_KV.data,key) ? window.AIBIO_REMOTE_KV.data[key] : undefined;
}

function safeLocal(key,fallback=[]){
  try{
    const remote=getRemoteValue(key);
    if(remote!==undefined) return remote;
    return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));
  }catch(e){return fallback;}
}
function safeSet(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));}catch(e){console.warn('local cache write failed',e);}
  writeRemoteKv(key,value);
  return true;
}
function normEmail(email){return String(email||'').trim().toLowerCase();}

function getCookie(name){
  const parts = document.cookie.split(';').map(x=>x.trim());
  const row = parts.find(x=>x.startsWith(name+'='));
  return row ? decodeURIComponent(row.slice(name.length+1)) : '';
}
function oauthCookieMember(){
  const email = normEmail(getCookie('aibio_member_email'));
  if(!email) return null;
  const name = getCookie('aibio_member_name') || email;
  return { name, displayName:name, email, emailVerified:true, authProvider:getCookie('aibio_member_provider')||'oauth', status:'active', account_status:'active', commentStatus:'allowed' };
}

function normUser(u){return String(u||'').trim();}
function members(){return safeLocal(MEMBERS_KEY,[])}
function setMembers(list){return safeSet(MEMBERS_KEY,list)}
function tokens(){return safeLocal(VERIFY_KEY,[])}
function setTokens(list){return safeSet(VERIFY_KEY,list)}
function currentEmail(){return normEmail(localStorage.getItem(CURRENT_KEY)||getCookie('aibio_member_email')||'')}
function currentMember(){const email=currentEmail();return members().find(m=>normEmail(m.email)===email)||oauthCookieMember()||null}
function isBypassEmail(email){return normEmail(email)===PAYMENT_BYPASS_EMAIL;}
function isSuspended(member){return !!(member&&(member.suspended||member.status==='suspended'));}
function suspensionMessage(member){return member?.suspensionReason?`Account suspended: ${member.suspensionReason}`:'Account suspended. Please contact AIBioTrXiv if you believe this is an error.';}
function isCommentRestricted(member){return !!(member&&(member.commentSuspended||member.commentStatus==='restricted'||member.commentsRestricted));}
function commentRestrictionMessage(member){return member?.commentSuspensionReason?`Peer-comment privilege restricted: ${member.commentSuspensionReason}`:'Peer-comment privilege restricted. You may still submit manuscripts and manage published articles unless your full account is separately suspended.';}
function setCurrent(email){localStorage.setItem(CURRENT_KEY,normEmail(email));}
async function logout(){try{await fetch('/api/auth/logout',{method:'POST'});}catch(e){} localStorage.removeItem(CURRENT_KEY);document.cookie='aibio_member_email=; Max-Age=0; Path=/';document.cookie='aibio_member_name=; Max-Age=0; Path=/';document.cookie='aibio_member_provider=; Max-Age=0; Path=/';location.href='/member/login/'}
function papers(){return safeLocal(PAPERS_KEY,[])}
function setPapers(list){return safeSet(PAPERS_KEY,list)}
function memberPapers(email=currentEmail()){email=normEmail(email);return papers().filter(p=>normEmail(p.memberEmail)===email)}
function upsertPaper(p){const list=papers();const idx=list.findIndex(x=>x.id===p.id);if(idx>=0)list[idx]=p;else list.push(p);return setPapers(list)}
function getPaper(id){return papers().find(p=>p.id===id)||null}
function deleteDraft(id){const list=papers().filter(p=>p.id!==id);setPapers(list);location.reload();}
function paidAdminSubmissions(){try{return JSON.parse(localStorage.getItem('aibio_submissions')||'[]')}catch(e){return []}}
function setPaidAdminSubmissions(list){localStorage.setItem('aibio_submissions',JSON.stringify(list));}
function copyPaidPaperToAdminQueue(p){const admin=paidAdminSubmissions().filter(x=>x.id!==p.id);admin.push({...p,status:'submitted',paymentStatus:p.paymentStatus||'paid',reviewStatus:'under_review'});setPaidAdminSubmissions(admin);}
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
function statusLabel(p){if((p.paymentStatus==='paid'||p.paymentStatus==='waived')&&(p.reviewStatus==='under_review'||p.status==='submitted'))return '<span class="member-status-pill review">Under review</span>';if(p.status==='revision_draft'||p.isRevisionDraft){if(p.revisionFeeRequired&&p.paymentStatus!=='paid_revision_fee')return '<span class="member-status-pill unpaid">Revision draft · fee required</span>';return p.graceUpdateOfVersion?'<span class="member-status-pill review">12-hour update draft</span>':'<span class="member-status-pill review">Revision draft</span>';}
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
function selfPublishRevision(id){
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
    published={...p,articleId,versionGroupId:articleId,siteId:latest.siteId||latest.id||articleId,id:latest.id||latest.siteId||articleId,status:'published',paymentStatus:latest.paymentStatus||'not_required',reviewStatus:'published',publishedAt:latest.publishedAt||latest.date||today,date:latest.date||latest.publishedAt||today,pdf:p.pdf||latest.pdf||'#',revisionSelfPublished:true,graceUpdatedAt:nowIso,revisionSubmittedAt:latest.revisionSubmittedAt||latest.publishedAt||nowIso,recordProtection:{...(p.recordProtection||{}),timestampedAt:p.recordProtection?.timestampedAt||latest.publishedAt||nowIso,versionPolicy:'This version was updated inside the 12-hour correction window. The version number did not change.'}};
    pub=pub.filter(x=>!(publicArticleKey(x)===articleId && String(x.version||'v1')===String(published.version||'v1')));
    alert('This version was updated within the 12-hour correction window. The version number did not change.');
  }else{
    published={...p,articleId,versionGroupId:articleId,siteId:latest.siteId||latest.id||articleId,id:p.id,status:'published',paymentStatus:p.revisionFeeRequired?'paid_revision_fee':'not_required',reviewStatus:'published',publishedAt:today,date:today,pdf:p.pdf||latest.pdf||'#',revisionSelfPublished:true,revisionSubmittedAt:nowIso,recordProtection:{...(p.recordProtection||{}),timestampedAt:nowIso,versionPolicy:'After v1 publication, new versions v2-v15 are author self-published without editorial screening or additional PayPal payment. From v16 onward, each new version requires a US$5 platform maintenance fee, but does not enter editorial review. Earlier versions remain preserved for timestamp and credit traceability.'}};
    pub=pub.filter(x=>x.id!==published.id);
    alert((p.revisionFeeRequired?'Paid revision version published. ':'New version published. ')+'Earlier versions remain preserved for credit and timestamp traceability.');
  }
  pub.push(published);
  safeSet('aibio_published',pub);
  // Remove the editable revision draft after publication; published versions are preserved in aibio_published.
  const remaining=papers().filter(x=>x.id!==p.id);
  setPapers(remaining.concat(published));
  location.href='/manuscripts/?id='+encodeURIComponent(articleId)+'&version='+encodeURIComponent(published.version||'v1');
}
function renderMemberPaperTable(rows,mode){
  if(!rows.length)return '<p class="muted">No records in this section.</p>';
  return `<table class="admin-table"><thead><tr><th>Manuscript</th><th>Category</th><th>Version</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(p=>{
    const articleId=publicArticleKey(p);
    const paid=p.paymentStatus==='waived'?'<span class="member-status-pill paid">Payment waived</span>':(p.paymentStatus==='paid'?'<span class="member-status-pill paid">Paid US$5</span>':(p.paymentStatus==='paid_revision_fee'?'<span class="member-status-pill paid">Revision fee paid</span>':(p.paymentStatus==='not_required'?'<span class="member-status-pill paid">No additional fee</span>':(p.paymentStatus==='unpaid_revision_fee'?'<span class="member-status-pill unpaid">US$5 revision fee required</span>':'<span class="member-status-pill unpaid">Unpaid</span>'))));
    let action='';
    if(mode==='drafts') action=p.isRevisionDraft?`<a class="btn btn-ghost" href="/submit/new/?draft=${encodeURIComponent(p.id)}">Edit revision</a> ${p.revisionFeeRequired&&p.paymentStatus!=='paid_revision_fee'?`<a class="btn btn-cyan" href="/submit/payment/?id=${encodeURIComponent(p.id)}&revision=1">Pay US$5 and publish</a>`:`<button class="btn btn-cyan" onclick="AIBIO.memberSelfPublishRevision('${p.id}')">${p.graceUpdateOfVersion?'Update this version':'Publish new version'}</button>`} <button class="btn btn-danger btn-delete" onclick="AIBIO.memberDeleteDraft('${p.id}')">Delete</button>`:`${(p.paymentStatus==='paid'||p.paymentStatus==='waived')?'<span class="muted">Locked after submission</span>':`<a class="btn btn-ghost" href="/submit/new/?draft=${encodeURIComponent(p.id)}">Edit draft</a> <a class="btn btn-cyan" href="/member/submissions/versions/?id=${encodeURIComponent(p.id)}">Version info</a> <button class="btn btn-danger btn-delete" onclick="AIBIO.memberDeleteDraft('${p.id}')">Delete</button>`}`;
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
  const underReview=rows.filter(p=>(p.paymentStatus==='paid'||p.paymentStatus==='waived')&&(p.reviewStatus==='under_review'||p.status==='submitted'));
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
      <div class="metric-card" style="padding:18px;border:1px solid rgba(17,24,39,.12);border-radius:20px;background:#fff;"><strong style="display:block;font-size:28px;line-height:1;">${underReview.length}</strong><span style="display:block;margin-top:8px;">Under review</span></div>
      <div class="metric-card" style="padding:18px;border:1px solid rgba(17,24,39,.12);border-radius:20px;background:#fff;"><strong style="display:block;font-size:28px;line-height:1;">${published.length}</strong><span style="display:block;margin-top:8px;">Published articles</span></div>
    </div>
    <section class="dashboard-section"><h2>Drafts and unpaid manuscripts</h2>${renderMemberPaperTable(drafts,'drafts')}</section>
    <section class="dashboard-section"><h2>Submitted / under review</h2>${renderMemberPaperTable(underReview,'review')}</section>
    <section class="dashboard-section"><h2>Published articles and versions</h2><p class="muted">Before first publication, draft edits remain v1. After publication, new public updates become preserved versions; Browse shows only the latest version. A published version may be corrected within 12 hours without changing the version number.</p>${renderMemberPaperTable(published,'published')}</section>`;
  document.getElementById('logoutBtn').onclick=logout;
}
function initMemberSubmissions(){
  const el=document.getElementById('memberSubmissions');if(!el)return;
  const m=currentMember();if(!m){el.innerHTML='<div class="auth-required"><h2>Login required</h2><a class="btn btn-cyan" href="/member/login/">Login</a></div>';return;}
  const rows=memberPapers(m.email);
  const published=latestPublishedByArticle(m.email);
  el.innerHTML=`<div class="dashboard-section"><h2>Drafts</h2>${renderMemberPaperTable(rows.filter(p=>p.status==='draft'||p.status==='revision_draft'||p.isRevisionDraft||(!p.paymentStatus||p.paymentStatus==='unpaid')),'drafts')}</div><div class="dashboard-section"><h2>Under review</h2>${renderMemberPaperTable(rows.filter(p=>(p.paymentStatus==='paid'||p.paymentStatus==='waived')&&(p.reviewStatus==='under_review'||p.status==='submitted')),'review')}</div><div class="dashboard-section"><h2>Published</h2>${renderMemberPaperTable(published,'published')}</div>`;
}
function initMemberVersions(){
  const el=document.getElementById('memberVersions');if(!el)return;
  const m=currentMember();if(!m){el.innerHTML='<div class="auth-required"><h2>Login required</h2><a class="btn btn-cyan" href="/member/login/">Login</a></div>';return;}
  const qs=new URLSearchParams(location.search);
  let articleId=qs.get('article');
  const draftId=qs.get('id');
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
       upsertPaper(pending);
       selfPublishRevision(pending.id);
       return;
     }
     const updated={...p,paymentStatus:'paid',paypalOrderId:orderId,status:'submitted',reviewStatus:'under_review',submittedAt:new Date().toISOString()};
     if(orderId!=='prototype-paid') await notifyAdminPayment(updated,orderId,'first_submission');
     else recordLocalPaymentNotification({submissionId:p.id,title:p.title,memberEmail:p.memberEmail,paypalOrderId:orderId,amountUsd:'5.00',paymentPurpose:'first_submission',localPrototype:true});
     upsertPaper(updated);copyPaidPaperToAdminQueue(updated);location.href='/member/dashboard/?paid=1';
   }catch(err){console.error(err);alert((err&&err.message)||'PayPal server-side verification failed. The manuscript was not marked as paid.');}
 }
 if(window.paypal&&paypal.Buttons){paypal.Buttons({style:{layout:'vertical',color:'gold',shape:'pill',label:'paypal'},createOrder:(data,actions)=>actions.order.create({purchase_units:[{description:isRevisionFee?'AIBioTrXiv post-v15 version platform maintenance fee':'AIBioTrXiv manuscript submission processing fee',amount:{currency_code:'USD',value:'5.00'}}]}),onApprove:(data,actions)=>actions.order.capture().then(()=>markPaid(data.orderID)),onError:(err)=>{console.error(err);alert('PayPal could not complete the payment. Please try again.');}}).render('#paypalPaymentBox');} else {el.innerHTML='<p class="muted">PayPal SDK did not load. Check the internet connection, browser blocker, or client ID.</p>';}
 document.getElementById('prototypePaidButton')?.addEventListener('click',()=>markPaid('prototype-paid'));
}
async function submitWithoutPayment(id){
  const m=currentMember();
  const p=getPaper(id);
  if(!m||!p||normEmail(p.memberEmail)!==normEmail(m.email))return alert('Draft not found for this account.');
  if(isSuspended(m))return alert(suspensionMessage(m));
  if(!isBypassEmail(m.email))return alert('This account is not authorized for payment bypass.');
  const updated={...p,paymentStatus:'waived',paymentWaived:true,paymentWaiverReason:'Testing/admin flow account',paypalOrderId:'payment-waived-test-account',status:'submitted',reviewStatus:'under_review',submittedAt:new Date().toISOString()};
  upsertPaper(updated);copyPaidPaperToAdminQueue(updated);await notifyAdminPayment(updated,'payment-waived-test-account');location.href='/member/dashboard/?submitted=1';
}
window.AIBIO=window.AIBIO||{};Object.assign(window.AIBIO,{memberCreateRevision:createRevisionDraft,memberCurrent:currentMember,memberEmail:currentEmail,memberPapers,memberUpsertPaper:upsertPaper,memberGetPaper:getPaper,memberMarkPaidCopy:copyPaidPaperToAdminQueue,memberDeleteDraft:deleteDraft,memberVerificationLink:verificationLink,memberNotifyPayment:notifyAdminPayment,memberSubmitWithoutPayment:submitWithoutPayment,memberSelfPublishRevision:selfPublishRevision,memberIsSuspended:isSuspended,memberSuspensionMessage:suspensionMessage,memberCommentRestricted:isCommentRestricted,memberCommentRestrictionMessage:commentRestrictionMessage,memberPaymentBypassEmail:PAYMENT_BYPASS_EMAIL});
document.addEventListener('DOMContentLoaded',async()=>{await loadRemoteKv();updateMemberNav();initRegister();initVerify();initLogin();initDashboard();initMemberSubmissions();initMemberVersions();initPayment();});
})();
