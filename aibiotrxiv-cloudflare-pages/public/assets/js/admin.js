const AIBIO_ADMIN_REMOTE_KV_KEYS=[
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
async function loadAdminRemoteKv(){
  // Admin pages must perform their own full-key D1 load. app.js may have
  // already marked the shared cache as loaded after fetching only public keys.
  // Returning early in that situation leaves admin queues invisible.
  try{
    const res=await fetch('/api/storage/kv?keys='+encodeURIComponent(AIBIO_ADMIN_REMOTE_KV_KEYS.join(',')),{cache:'no-store',credentials:'include'});
    const data=await res.json().catch(()=>({}));
    if(res.ok&&data.ok&&data.values){
      window.AIBIO_REMOTE_KV.data={...(window.AIBIO_REMOTE_KV.data||{}),...data.values};
      window.AIBIO_REMOTE_KV.loaded=true;
      window.AIBIO_REMOTE_KV.adminLoaded=true;
      window.AIBIO_REMOTE_KV.loadOk=true;
      return window.AIBIO_REMOTE_KV.data;
    }
    window.AIBIO_REMOTE_KV.loadOk=false;
    console.error('D1 storage load returned an invalid response',data);
  }catch(e){
    window.AIBIO_REMOTE_KV.loadOk=false;
    console.error('D1 storage load failed; remote writes are disabled for this page load to protect production data.',e);
  }
  window.AIBIO_REMOTE_KV.loaded=true;
  return window.AIBIO_REMOTE_KV.data||{};
}
function adminRemoteKvLoaded(){return !!window.AIBIO_REMOTE_KV?.loaded;}
function writeAdminRemoteKv(key,value,options={}){
  if(!AIBIO_ADMIN_REMOTE_KV_KEYS.includes(key)) return;
  window.AIBIO_REMOTE_KV.data[key]=value;
  if(!window.AIBIO_REMOTE_KV.loadOk){
    console.warn('Skipped D1 write because remote storage was not loaded successfully. This prevents accidental overwriting of production D1 with stale local data.',key);
    return;
  }
  const body={key,value};
  if(options.allowEmptyOverwrite) body.allowEmptyOverwrite=true;
  fetch('/api/storage/kv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(body)}).catch(e=>console.error('D1 storage write failed',e));
}
async function writeAdminRemoteKvAndWait(key,value,options={}){
  if(!AIBIO_ADMIN_REMOTE_KV_KEYS.includes(key)) return false;
  window.AIBIO_REMOTE_KV.data[key]=value;
  if(!window.AIBIO_REMOTE_KV.loadOk){
    console.warn('Skipped D1 write because remote storage was not loaded successfully. This prevents accidental overwriting of production D1 with stale local data.',key);
    return false;
  }
  const body={key,value};
  if(options.allowEmptyOverwrite) body.allowEmptyOverwrite=true;
  const res=await fetch('/api/storage/kv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',cache:'no-store',body:JSON.stringify(body)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok) throw new Error((data&&data.error)||'D1 storage write failed: '+key);
  if(Array.isArray(data.blocked)&&data.blocked.includes(key)) throw new Error('D1 storage write was blocked for production data safety: '+key);
  return true;
}
function getAdminRemoteValue(key){
  return window.AIBIO_REMOTE_KV?.data && Object.prototype.hasOwnProperty.call(window.AIBIO_REMOTE_KV.data,key) ? window.AIBIO_REMOTE_KV.data[key] : undefined;
}

function safeLocal(key,fallback=[]){
  try{
    const remote=getAdminRemoteValue(key);
    if(remote!==undefined) return remote;
    return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));
  }catch(e){return fallback;}
}
function safeSetLocal(key,value,options={}){
  try{localStorage.setItem(key,JSON.stringify(value));}catch(err){console.warn('local cache write failed',err);}
  writeAdminRemoteKv(key,value,options);
  return true;
}
async function safeSetLocalAndWait(key,value,options={}){
  try{localStorage.setItem(key,JSON.stringify(value));}catch(err){console.warn('local cache write failed',err);}
  return await writeAdminRemoteKvAndWait(key,value,options);
}
function sanitizeRich(html=''){
  const template=document.createElement('template');template.innerHTML=html;
  const allowed=new Set(['B','STRONG','I','EM','SUP','SUB','BR','P','DIV','SPAN','UL','OL','LI']);
  const walk=node=>{[...node.childNodes].forEach(child=>{if(child.nodeType===Node.ELEMENT_NODE){if(!allowed.has(child.tagName)){const frag=document.createDocumentFragment();while(child.firstChild)frag.appendChild(child.firstChild);child.replaceWith(frag);walk(node);}else{[...child.attributes].forEach(a=>child.removeAttribute(a.name));walk(child);}}});};
  walk(template.content);return template.innerHTML.trim();
}
function richPlain(html=''){const d=document.createElement('div');d.innerHTML=html||'';return d.textContent||'';}
function cleanRichForPdf(html=''){
  const root=document.createElement('div');
  root.innerHTML=sanitizeRich(html||'');
  root.querySelectorAll('p,div,span,li').forEach(el=>{
    const txt=(el.textContent||'').replace(/\u00a0/g,' ').trim();
    const hasMedia=el.querySelector('img,table');
    if(!txt && !hasMedia) el.remove();
  });
  let out=root.innerHTML
    .replace(/(<br\s*\/?>(\s|&nbsp;)*){2,}/gi,'<br>')
    .replace(/<p>\s*<\/p>/gi,'')
    .replace(/<div>\s*<\/div>/gi,'')
    .trim();
  return out;
}
function escapeHtml(str=''){return String(str).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
function makeToolbar(){return `<div class="rich-toolbar"><button type="button" data-command="bold"><strong>B</strong></button><button type="button" data-command="italic"><em>I</em></button></div>`;}
function bindRichToolbar(scope){scope.querySelectorAll('.rich-toolbar button').forEach(btn=>btn.addEventListener('click',()=>{const ed=scope.querySelector('.review-rich-text');ed.focus();document.execCommand(btn.dataset.command,false,null);}));}
function defaultSubmission(){const base={id:'SUB-2026-DEMO',status:'submitted',title:'A generative framework for morphospace expansion during adaptive radiation',authorList:[{name:'The Sound of Evolution Research Group',email:'author@example.org'}],authors:'The Sound of Evolution Research Group',email:'author@example.org',affiliation:'The Sound of Evolution, AI BioTheory Archive',topic:'AI Evolutionary Biology',abstract:'This pilot submission demonstrates the editorial review interface.',createdAt:'2026-06-01T00:00:00Z',license:'CC BY 4.0',sections:window.AIBIO.sampleSections,paymentStatus:'paid',paypalOrderId:'DEMO-PAID'};return safeLocal('aibio_demo_submission',base);}
function normalizeSubmission(s){const authorList=Array.isArray(s.authorList)&&s.authorList.length?s.authorList:(s.authors?String(s.authors).split(',').map((name,i)=>({name:name.trim(),email:i===0?(s.email||''):''})).filter(a=>a.name):[]);return {...s,authorList,authors:authorList.map(a=>a.name).filter(Boolean).join(', ') || s.authors || '',email:authorList[0]?.email || s.email || '',affiliation:s.affiliation||'',sections:s.sections||[],status:s.status||'submitted'};}
function authorLinks(s){const authors=(s.authorList&&s.authorList.length?s.authorList:normalizeSubmission(s).authorList);return authors.map(a=>a.email?`<a href="mailto:${escapeHtml(a.email)}">${escapeHtml(a.name||a.email)}</a>`:escapeHtml(a.name||'')).join(', ');}
function authorNames(s){return (normalizeSubmission(s).authorList||[]).map(a=>a.name).filter(Boolean).join(', ') || s.authors || '' ;}
function userSubmissions(){return safeLocal('aibio_submissions',[]).map(normalizeSubmission);}
function setUserSubmissions(list){return safeSetLocal('aibio_submissions',list.filter(x=>x.id!=='SUB-2026-DEMO'))}
async function setUserSubmissionsAndWait(list,options={}){return await safeSetLocalAndWait('aibio_submissions',list.filter(x=>x.id!=='SUB-2026-DEMO'),options)}
function submittedMemberPapersForAdmin(){
  const rows=safeLocal('aibio_member_papers',[]);
  if(!Array.isArray(rows))return [];
  return rows.filter(p=>(p.paymentStatus==='paid'||p.paymentStatus==='waived')&&(p.reviewStatus==='under_review'||p.status==='submitted'||p.status==='rejected'||p.reviewStatus==='rejected')).map(p=>normalizeSubmission({...p,status:p.status==='rejected'||p.reviewStatus==='rejected'?'rejected':'submitted'}));
}
function mergeRecordsById(...groups){
  const map=new Map();
  groups.flat().forEach(item=>{
    if(!item)return;
    const id=String(item.id||item.sourceSubmissionId||'').trim();
    if(!id)return;
    map.set(id,{...(map.get(id)||{}),...item});
  });
  return [...map.values()].map(normalizeSubmission);
}
function syncMemberPaperFromAdmin(record){
  if(!record||record.id==='SUB-2026-DEMO')return false;
  const rows=safeLocal('aibio_member_papers',[]);
  if(!Array.isArray(rows)||!rows.length)return false;
  let changed=false;
  const next=rows.map(p=>{
    if(String(p.id||'')!==String(record.id||''))return p;
    changed=true;
    return {...p,...record,memberEmail:p.memberEmail||record.memberEmail,status:record.status||p.status,reviewStatus:record.reviewStatus||record.status||p.reviewStatus};
  });
  if(changed)safeSetLocal('aibio_member_papers',next);
  return changed;
}
async function syncMemberPaperFromAdminAndWait(record){
  if(!record||record.id==='SUB-2026-DEMO')return false;
  const rows=safeLocal('aibio_member_papers',[]);
  if(!Array.isArray(rows)||!rows.length)return false;
  let changed=false;
  const next=rows.map(p=>{
    if(String(p.id||'')!==String(record.id||''))return p;
    changed=true;
    return {...p,...record,memberEmail:p.memberEmail||record.memberEmail,status:record.status||p.status,reviewStatus:record.reviewStatus||record.status||p.reviewStatus};
  });
  if(changed)await safeSetLocalAndWait('aibio_member_papers',next);
  return changed;
}
function acceptedList(){return safeLocal('aibio_accepted',[]).map(normalizeSubmission);}
function setAccepted(list,options={}){return safeSetLocal('aibio_accepted',list,options);}
async function setAcceptedAndWait(list,options={}){return await safeSetLocalAndWait('aibio_accepted',list,options);}
function publishedList(){return safeLocal('aibio_published',[]).map(normalizeSubmission);}
function setPublished(list,options={}){return safeSetLocal('aibio_published',list,options);}
async function setPublishedAndWait(list,options={}){return await safeSetLocalAndWait('aibio_published',list,options);}
function unpublishedList(){return safeLocal('aibio_unpublished',[]).map(normalizeSubmission);}
function setUnpublished(list,options={}){return safeSetLocal('aibio_unpublished',list,options);}
async function setUnpublishedAndWait(list,options={}){return await safeSetLocalAndWait('aibio_unpublished',list,options);}
function trashList(){return safeLocal('aibio_trash',[]).map(x=>({...normalizeSubmission(x),deletedFrom:x.deletedFrom||x.status||'unknown',deletedAt:x.deletedAt||''}));}
function setTrash(list){return safeSetLocal('aibio_trash',list);}
function auditAdminAction(eventType,targetType,targetId,data={}){const rows=safeLocal('aibio_security_audit_events',[]);rows.push({id:'AUD-'+Date.now()+'-'+Math.random().toString(16).slice(2),eventType,targetType,targetId,data,createdAt:new Date().toISOString()});safeSetLocal('aibio_security_audit_events',rows.slice(-2000));}
function markPurgeRequested(record,reason){return {...record,purgeRequested:true,purgeRequestedAt:new Date().toISOString(),purgeReason:reason||'Admin requested permanent purge. Pending external backup review.'};}
function allSubmissions(){return [defaultSubmission(),...mergeRecordsById(submittedMemberPapersForAdmin(),userSubmissions())];}
function getSubmissionById(id){return allSubmissions().find(s=>s.id===id)||acceptedList().find(s=>s.id===id)||publishedList().find(s=>(s.sourceSubmissionId||s.id)===id||s.siteId===id)||unpublishedList().find(s=>(s.sourceSubmissionId||s.id)===id||s.siteId===id)||defaultSubmission();}
function getCurrentId(){return new URLSearchParams(location.search).get('id')||'SUB-2026-DEMO';}
function getSubmission(){return getSubmissionById(getCurrentId());}
function publicSlug(siteId){return String(siteId).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function updateSubmissionRecord(updated){updated=normalizeSubmission(updated);if(updated.id==='SUB-2026-DEMO'){localStorage.setItem('aibio_demo_submission',JSON.stringify(updated));return updated;}const list=userSubmissions();const idx=list.findIndex(x=>x.id===updated.id);if(idx>=0)list[idx]=updated;else list.push(updated);setUserSubmissions(list);syncMemberPaperFromAdmin(updated);return updated;}
async function updateSubmissionRecordAndWait(updated){updated=normalizeSubmission(updated);if(updated.id==='SUB-2026-DEMO'){localStorage.setItem('aibio_demo_submission',JSON.stringify(updated));return updated;}const list=userSubmissions();const idx=list.findIndex(x=>x.id===updated.id);if(idx>=0)list[idx]=updated;else list.push(updated);await setUserSubmissionsAndWait(list);await syncMemberPaperFromAdminAndWait(updated);return updated;}
function removeUserSubmission(id){if(id==='SUB-2026-DEMO')return;setUserSubmissions(userSubmissions().filter(s=>s.id!==id));}
async function removeUserSubmissionAndWait(id){
  if(id==='SUB-2026-DEMO')return;
  // Accepting the last manuscript intentionally makes the review queue empty.
  // This write must bypass the generic empty-array protection; otherwise admin
  // decisions are blocked even though the manuscript has been moved to Accepted.
  await setUserSubmissionsAndWait(userSubmissions().filter(s=>s.id!==id),{allowEmptyOverwrite:true});
}
function moveToTrash(record,deletedFrom){if(!record||record.id==='SUB-2026-DEMO'){alert('The demo record cannot be deleted.');return false;}const key=record.siteId||record.id;const next=trashList().filter(x=>(x.siteId||x.id)!==key);next.push({...record,deletedFrom,deletedAt:new Date().toISOString().slice(0,10),deletedAtFull:new Date().toISOString(),status:'deleted'});auditAdminAction('soft_delete','paper',key,{deletedFrom});return setTrash(next);}
function tinyDelete(label,handler){return `<button class="btn btn-danger btn-delete" onclick="${handler}">${label||'Delete'}</button>`;}
function submissionRow(s,kind='queue'){
  const review=`<a class="btn btn-ghost" href="/admin/submissions/detail.html?id=${encodeURIComponent(s.id)}">Review</a>`;
  const del=s.id==='SUB-2026-DEMO'?'':tinyDelete('Delete',`deleteSubmissionRecord('${s.id}')`);
  const recover=kind==='rejected'&&s.id!=='SUB-2026-DEMO'?` <button class="btn btn-ghost" onclick="recoverRejected('${s.id}')">Recover</button>`:'';
  return `<tr><td>${s.id}</td><td><strong>${escapeHtml(s.title)}</strong><br><span class="muted">${escapeHtml(authorNames(s))}</span></td><td>${escapeHtml(s.topic||'')}</td><td>${(s.paymentStatus==='paid'||s.paymentStatus==='waived')?'<span class="member-status-pill paid">Paid US$5</span>':'<span class="member-status-pill unpaid">Unpaid</span>'}</td><td><span class="status ${s.status}">${s.status}</span></td><td>${review}${del}${recover}</td></tr>`;
}
function renderAdminSubmissions(){const el=document.getElementById('adminSubmissions');if(!el)return;const rows=allSubmissions();const queue=rows.filter(s=>(s.paymentStatus==='paid'||s.paymentStatus==='waived') && !['accepted','published','unpublished','rejected','deleted'].includes(s.status));const rejected=rows.filter(s=>s.status==='rejected');const table=(items,kind)=>`<table class="admin-table"><thead><tr><th>ID</th><th>Title</th><th>Topic</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>${items.map(s=>submissionRow(s,kind)).join('')}</tbody></table>`;el.innerHTML=`<h2>Review queue</h2>${queue.length?table(queue,'queue'):'<p class="muted">No submitted manuscripts are waiting for review.</p>'}<h2 style="margin-top:34px">Rejected manuscripts</h2>${rejected.length?table(rejected,'rejected'):'<p class="muted">No rejected manuscripts.</p>'}`;}
async function deleteSubmissionRecord(id){const s=getSubmissionById(id);if(confirm('Move this submission to the paper trash?')){if(moveToTrash(s,s.status==='rejected'?'rejected':'submitted')){try{await syncMemberPaperFromAdminAndWait({...s,status:'deleted',reviewStatus:'deleted'});await removeUserSubmissionAndWait(id);}catch(err){console.error(err);}location.reload();}}}
async function recoverRejected(id){try{const s=getSubmissionById(id);await updateSubmissionRecordAndWait({...s,status:'submitted',reviewStatus:'under_review'});location.reload();}catch(err){console.error(err);alert((err&&err.message)||'The rejected manuscript could not be recovered.');}}
function adminAuthorRow(a={name:'',email:''}){return `<div class="author-row"><input class="admin-author-name" placeholder="Author name" value="${escapeHtml(a.name||'')}"><input class="admin-author-email" type="email" placeholder="email@example.org" value="${escapeHtml(a.email||'')}"><button type="button" class="author-remove" aria-label="Remove author">×</button></div>`;}
function renderAdminAuthorSheet(s){const rows=normalizeSubmission(s).authorList;const init=rows.length?rows:[{name:'',email:''}];return `<label>Author names and emails</label><div id="adminAuthorSheet" class="author-sheet"><div class="author-row author-row-head"><strong>Author name</strong><strong>Email</strong><span></span></div>${init.map(adminAuthorRow).join('')}</div><button type="button" class="btn btn-ghost" id="addAdminAuthor" style="margin-top:10px">Add author</button>`;}
function bindAdminAuthorSheet(){const sheet=document.getElementById('adminAuthorSheet');if(!sheet)return;const bindRemove=()=>sheet.querySelectorAll('.author-remove').forEach(btn=>btn.onclick=()=>{if(sheet.querySelectorAll('.author-row:not(.author-row-head)').length>1)btn.closest('.author-row').remove();});bindRemove();document.getElementById('addAdminAuthor')?.addEventListener('click',()=>{sheet.insertAdjacentHTML('beforeend',adminAuthorRow());bindRemove();});}
function collectAdminAuthors(){return [...document.querySelectorAll('#adminAuthorSheet .author-row:not(.author-row-head)')].map(row=>({name:row.querySelector('.admin-author-name')?.value.trim()||'',email:row.querySelector('.admin-author-email')?.value.trim()||''})).filter(a=>a.name||a.email);}
function renderEditableSection(sec,i){const heading=escapeHtml(sec.heading||'Section');const html=sanitizeRich(sec.text||'');const legend=sec.legend||'';return `<article class="review-section editable-review" data-index="${i}"><div class="review-display"><h3>${heading}</h3><div class="rich-display-text">${html||'<span class="muted">No text entered.</span>'}</div><button class="btn btn-ghost edit-review-section" type="button">Edit</button></div><div class="review-figure-display">${sec.image?`<div class="image-preview"><img src="${sec.image}" alt="Figure"></div>`:'<div class="image-preview">No figure</div>'}<p class="muted" style="white-space:pre-wrap">${escapeHtml(legend)}</p></div><div class="review-editor" hidden><div><h3>${heading}</h3><label>Text</label>${makeToolbar()}<div class="review-rich-text" contenteditable="true">${html}</div><label>Legend</label><textarea class="review-legend">${escapeHtml(legend)}</textarea><button class="btn btn-cyan save-review-section" type="button">OK</button></div><div>${sec.image?`<div class="image-preview"><img src="${sec.image}" alt="Figure"></div>`:'<div class="image-preview">No figure</div>'}<p class="muted">Image replacement will be connected to R2 in the production backend.</p></div></div></article>`;}
function collectAdminEdits(save=true){const s=getSubmission();const sections=[...document.querySelectorAll('.editable-review')].map((row,i)=>{const old=s.sections[i]||{};const editor=row.querySelector('.review-editor');return {...old,text:sanitizeRich(editor.querySelector('.review-rich-text').innerHTML),plainText:richPlain(editor.querySelector('.review-rich-text').innerHTML),legend:editor.querySelector('.review-legend').value};});const authorList=collectAdminAuthors();const updated={...s,title:document.getElementById('adminTitle')?.value||s.title,abstract:document.getElementById('adminAbstract')?.value||s.abstract,authorList,authors:authorList.map(a=>a.name).filter(Boolean).join(', '),email:authorList[0]?.email||'',affiliation:document.getElementById('adminAffiliation')?.value||s.affiliation,topic:document.getElementById('adminTopic')?.value||s.topic,license:document.getElementById('adminLicense')?.value||s.license,sections};return save?updateSubmissionRecord(updated):normalizeSubmission(updated);}
async function saveAdminMetadataEdits(){try{await updateSubmissionRecordAndWait(collectAdminEdits(false));alert('Edits saved.');}catch(err){console.error(err);alert((err&&err.message)||'Edits could not be saved to D1.');}}
function bindReviewEditButtons(){document.querySelectorAll('.editable-review').forEach(row=>{bindRichToolbar(row);const rich=row.querySelector('.review-rich-text');rich?.addEventListener('paste',()=>setTimeout(()=>{rich.innerHTML=sanitizeRich(rich.innerHTML);},0));});document.querySelectorAll('.edit-review-section').forEach(btn=>btn.addEventListener('click',()=>{const row=btn.closest('.editable-review');row.querySelector('.review-display').hidden=true;row.querySelector('.review-figure-display').hidden=true;row.querySelector('.review-editor').hidden=false;}));document.querySelectorAll('.save-review-section').forEach(btn=>btn.addEventListener('click',()=>{const row=btn.closest('.editable-review');const i=Number(row.dataset.index);const s=collectAdminEdits();const sec=s.sections[i];row.querySelector('.review-display .rich-display-text').innerHTML=sanitizeRich(sec.text)||'<span class="muted">No text entered.</span>';row.querySelector('.review-figure-display .muted').textContent=sec.legend||'';row.querySelector('.review-display').hidden=false;row.querySelector('.review-figure-display').hidden=false;row.querySelector('.review-editor').hidden=true;}));}
function renderSubmissionDetail(){const el=document.getElementById('submissionDetail');if(!el)return;const s=getSubmission();el.innerHTML=`<div class="admin-card"><h2>Review submission</h2><div class="form-grid"><div><label>Title</label><input id="adminTitle" value="${escapeHtml(s.title||'')}">${renderAdminAuthorSheet(s)}</div><div><label>Affiliation</label><input id="adminAffiliation" value="${escapeHtml(s.affiliation||'')}"><label>Topic</label><select id="adminTopic">${window.AIBIO.researchAreas.map(a=>`<option value="${a.name}" ${a.name===s.topic?'selected':''}>${a.name}</option>`).join('')}</select><label>License</label><input id="adminLicense" value="${escapeHtml(s.license||'')}"></div></div><label>Abstract</label><textarea id="adminAbstract">${escapeHtml(s.abstract||'')}</textarea><button class="btn btn-cyan" type="button" onclick="saveAdminMetadataEdits()">Save metadata edits</button></div><div class="section-builder">${(s.sections||[]).map(renderEditableSection).join('')}</div><div class="admin-card" style="margin-top:20px"><label>Editorial note</label><textarea id="editorNote" placeholder="Internal note or rejection reason."></textarea><div class="hero-actions"><button class="btn btn-cyan" onclick="markSubmission('accepted')">Accept</button><button class="btn btn-danger" onclick="markSubmission('rejected')">Reject</button><a class="btn btn-ghost" href="/admin/submissions/">Back</a></div></div>`;bindAdminAuthorSheet();bindReviewEditButtons();}
async function markSubmission(status){
  try{
    const base=collectAdminEdits(false);
    const reviewStatus=status==='accepted'?'accepted':(status==='rejected'?'rejected':status);
    const s={...base,status,reviewStatus};
    if(status==='accepted'){
      const acceptedRecord={...s,status:'accepted',reviewStatus:'accepted'};
      const accepted=acceptedList().filter(x=>x.id!==s.id);
      accepted.push(acceptedRecord);
      await setAcceptedAndWait(accepted);
      await syncMemberPaperFromAdminAndWait(acceptedRecord);
      if(s.id!=='SUB-2026-DEMO')await removeUserSubmissionAndWait(s.id);
      else localStorage.setItem('aibio_demo_submission',JSON.stringify(acceptedRecord));
      location.href='/admin/accepted/';
      return;
    }
    await updateSubmissionRecordAndWait(s);
    alert('Submission marked as '+status);
    location.href='/admin/submissions/';
  }catch(err){
    console.error(err);
    alert((err&&err.message)||'The admin decision could not be saved to D1. Please try again before leaving this page.');
  }
}
function renderAccepted(){const el=document.getElementById('acceptedList');if(!el)return;const publishedIds=new Set(publishedList().map(p=>p.sourceSubmissionId||p.id));const rows=acceptedList().filter(s=>!publishedIds.has(s.id));const demoRows=rows.length?rows:(publishedIds.has('SUB-2026-DEMO')?[]:[{...defaultSubmission(),status:'accepted'}]);el.innerHTML=demoRows.length?`<table class="admin-table"><thead><tr><th>Submission</th><th>Topic</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>${demoRows.map(s=>`<tr><td><strong>${escapeHtml(s.title)}</strong><br>${s.id}</td><td>${escapeHtml(s.topic)}</td><td><span class="status accepted">accepted</span></td><td><a class="btn btn-cyan" href="/admin/accepted/layout.html?id=${encodeURIComponent(s.id)}">Open PDF layout</a> ${tinyDelete('Delete',`deleteAccepted('${s.id}')`)} <button class="btn btn-ghost" onclick="recoverAccepted('${s.id}')">Recover</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No accepted manuscripts are waiting for layout.</p>';}
function deleteAccepted(id){const s=acceptedList().find(x=>x.id===id);if(!s){alert('Accepted manuscript not found. No record was deleted.');return;}if(confirm('Move this accepted manuscript to the paper trash?')){if(moveToTrash(s,'accepted')){setAccepted(acceptedList().filter(x=>x.id!==id));location.reload();}}}
async function recoverAccepted(id){const s=acceptedList().find(x=>x.id===id);if(!s){alert('Accepted manuscript not found. No record was recovered.');return;}try{await setUserSubmissionsAndWait([...userSubmissions().filter(x=>x.id!==id),{...s,status:'submitted',reviewStatus:'under_review'}]);await setAcceptedAndWait(acceptedList().filter(x=>x.id!==id));await syncMemberPaperFromAdminAndWait({...s,status:'submitted',reviewStatus:'under_review'});location.href='/admin/submissions/';}catch(err){console.error(err);alert((err&&err.message)||'The accepted manuscript could not be recovered.');}}
function findAcceptedOrSubmission(id){return acceptedList().find(s=>s.id===id)||getSubmissionById(id);}
function splitTextIntoChunks(text, target=2300){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  if(!clean) return [];
  const chunks=[];let current='';
  const words=clean.split(' ');
  words.forEach(w=>{
    const next=(current+' '+w).trim();
    if(next.length>target && current){chunks.push(current.trim());current=w;}
    else current=next;
  });
  if(current) chunks.push(current.trim());
  if(chunks.length>1 && chunks[chunks.length-1].length<180){
    chunks[chunks.length-2]+=' '+chunks.pop();
  }
  return chunks;
}
function htmlToBlockParts(html){
  const root=document.createElement('div');
  root.innerHTML=cleanRichForPdf(html||'');
  const blocks=[];
  let inlineBuffer='';
  const flushInline=()=>{
    const clean=inlineBuffer.trim();
    if(clean){blocks.push(`<p>${clean}</p>`);}
    inlineBuffer='';
  };
  [...root.childNodes].forEach(node=>{
    if(node.nodeType===Node.TEXT_NODE){
      const txt=(node.textContent||'').replace(/\s+/g,' ').trim();
      if(txt) inlineBuffer+=(inlineBuffer?' ':'')+escapeHtml(txt);
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    if(node.tagName==='BR'){
      // Preserve manual line breaks inside the current paragraph, but do not create empty standalone blocks.
      if(inlineBuffer.trim()) inlineBuffer+='<br>';
      return;
    }
    const text=(node.textContent||'').replace(/\s+/g,' ').trim();
    if(!text)return;
    if(['P','DIV','LI'].includes(node.tagName)){
      flushInline();
      let outer=cleanRichForPdf(node.outerHTML||node.innerHTML||'');
      if(!/^<(p|div|li)\b/i.test(outer)) outer=`<p>${outer}</p>`;
      blocks.push(outer);
    }else if(['UL','OL'].includes(node.tagName)){
      flushInline();
      blocks.push(cleanRichForPdf(node.outerHTML));
    }else{
      inlineBuffer+=cleanRichForPdf(node.outerHTML||node.innerHTML||'');
    }
  });
  flushInline();
  if(!blocks.length){
    const plain=(root.textContent||'').replace(/\s+/g,' ').trim();
    return plain?[`<p>${escapeHtml(plain)}</p>`]:[];
  }
  const merged=[];
  blocks.forEach(block=>{
    block=cleanRichForPdf(block);
    const plain=richPlain(block).replace(/\s+/g,' ').trim();
    if(!plain)return;
    const isTiny=plain.length<55 && !/[.!?;:]$/.test(plain);
    if(isTiny && merged.length){
      merged[merged.length-1]=merged[merged.length-1]
        .replace(/<\/p>\s*$/i,'')+' '+block.replace(/^<p>/i,'').replace(/^<div>/i,'').replace(/^<li>/i,'').replace(/<\/(p|div|li)>$/i,'')+'</p>';
    }else{
      merged.push(/^<(p|div|ul|ol|li)\b/i.test(block)?block:`<p>${block}</p>`);
    }
  });
  return merged;
}
function paragraphBlocks(heading,html){
  const parts=htmlToBlockParts(html);
  if(!parts.length && heading) return [{type:'text',heading,html:''}];
  return parts.map((part,i)=>({type:'text',heading:i===0?heading:'',html:part}));
}
function normalizedPdfHeading(heading,seen){
  const h=String(heading||'Section').trim();
  if(/^results$/i.test(h)){
    if(seen.results) return '';
    seen.results=true;
    return 'Results';
  }
  return h;
}
function pdfNaturalBlocks(s){
  const blocks=[];
  const seen={results:false};
  if((s.abstract||'').trim()){
    blocks.push({id:'abstract',type:'abstract',heading:'Abstract',html:`<p>${escapeHtml(s.abstract)}</p>`});
  }
  (s.sections||[]).forEach((sec,si)=>{
    const h=normalizedPdfHeading(sec.heading||'Section',seen);
    const parts=htmlToBlockParts(sec.text||'');
    if(parts.length){
      parts.forEach((part,pi)=>blocks.push({id:`s${si}-p${pi}`,type:'text',heading:pi===0?h:'',html:part}));
    }else if(h){
      blocks.push({id:`s${si}-empty`,type:'text',heading:h,html:''});
    }
    if(sec.image){
      blocks.push({id:`s${si}-fig`,type:'figure',image:sec.image,legend:sec.legend||''});
    }
  });
  return blocks;
}
function orderedPdfBlocks(s){
  const natural=pdfNaturalBlocks(s);
  const byId=new Map(natural.map(b=>[b.id,b]));
  const saved=Array.isArray(s.pdfBlockOrder)?s.pdfBlockOrder:[];
  const ordered=[];
  saved.forEach(id=>{if(byId.has(id)){ordered.push(byId.get(id));byId.delete(id);}});
  natural.forEach(b=>{if(byId.has(b.id)){ordered.push(b);byId.delete(b.id);}});
  return ordered;
}
function savePdfBlockOrder(id,order){
  let s=findAcceptedOrSubmission(id);
  const updated={...s,pdfBlockOrder:order};
  if(id==='SUB-2026-DEMO'){
    localStorage.setItem('aibio_demo_submission',JSON.stringify(updated));
    return true;
  }
  const accepted=acceptedList();
  if(accepted.some(x=>x.id===id)){
    return setAccepted(accepted.map(x=>x.id===id?updated:x));
  }
  const published=publishedList();
  if(published.some(x=>(x.siteId||x.id)===id || x.id===id)){
    return setPublished(published.map(x=>((x.siteId||x.id)===id || x.id===id)?updated:x));
  }
  const unpublished=unpublishedList();
  if(unpublished.some(x=>(x.siteId||x.id)===id || x.id===id)){
    return setUnpublished(unpublished.map(x=>((x.siteId||x.id)===id || x.id===id)?updated:x));
  }
  updateSubmissionRecord(updated);
  return true;
}
function movePdfFigure(submissionId,blockId,dir){
  const s=findAcceptedOrSubmission(submissionId);
  const blocks=orderedPdfBlocks(s);
  const ids=blocks.map(b=>b.id);
  const i=ids.indexOf(blockId);
  if(i<0)return;
  const j=i+dir;
  if(j<0||j>=ids.length)return;
  [ids[i],ids[j]]=[ids[j],ids[i]];
  if(savePdfBlockOrder(submissionId,ids)) location.reload();
}
function estimateBlockHeight(b){
  if(b.type==='figure'){
    const legendChars=(b.legend||'').length;
    return 300 + Math.min(90, Math.ceil(legendChars/100)*18);
  }
  const text=richPlain(b.html||'').replace(/\s+/g,' ').trim();
  const charsPerLine=108;
  const lines=Math.max(1,Math.ceil(text.length/charsPerLine));
  const headingH=b.heading?26:0;
  const paragraphCount=(String(b.html||'').match(/<(p|div|li)\b/gi)||[]).length || 1;
  const base=headingH + lines*18.5 + Math.min(22, paragraphCount*4) + 6;
  return b.type==='abstract' ? base + 36 : base;
}
function paginateBlocks(blocks){
  const pages=[];
  let page=[];
  let used=0;
  const firstLimit=720;
  const otherLimit=950;
  const currentLimit=()=>pages.length===0?firstLimit:otherLimit;
  function newPage(){
    if(page.length) pages.push(page);
    page=[];
    used=0;
  }
  blocks.forEach(b=>{
    let h=estimateBlockHeight(b);
    if(b.type==='figure')h=Math.min(h,currentLimit()-24);
    if(page.length && used+h>currentLimit()) newPage();
    page.push({...b,estimatedHeight:h});
    used+=h;
  });
  if(page.length) pages.push(page);
  return pages.length?pages:[[]];
}
function renderPdfBlock(b,submissionId){
  if(b.type==='figure'){
    return `<figure class="pdf-figure-one pdf-movable-figure" data-block-id="${escapeHtml(b.id)}" contenteditable="false"><div class="figure-move-controls no-print"><button type="button" title="Move figure up" onclick="movePdfFigure('${escapeHtml(submissionId)}','${escapeHtml(b.id)}',-1)">▲</button><button type="button" title="Move figure down" onclick="movePdfFigure('${escapeHtml(submissionId)}','${escapeHtml(b.id)}',1)">▼</button></div><img src="${b.image}"><figcaption contenteditable="true">${escapeHtml(b.legend)}</figcaption></figure>`;
  }
  const cls=b.type==='abstract'?'pdf-text-block pdf-abstract-block':'pdf-text-block';
  return `<section class="${cls}" data-block-id="${escapeHtml(b.id)}">${b.heading?`<h3 contenteditable="true">${escapeHtml(b.heading)}</h3>`:''}<div class="pdf-editable-text" contenteditable="true">${cleanRichForPdf(b.html)}</div></section>`;
}
function renderPdfPage(s,pageBlocks,pageNo,total){
  return `<div class="pdf-page printable-pdf ${pageNo===1?'first-pdf-page':''}"><div class="pdf-brand"><img src="/assets/img/Brand.jpg?v=38" alt=""><div><div class="brand-title pdf-brand-title">AIBioT<span style="color:#AE0000">ʀχiv</span></div><div class="brand-subtitle">AI BioTheory Archive</div></div></div>${pageNo===1?`<div class="pdf-title" contenteditable="true">${escapeHtml(s.title||'')}</div><p class="pdf-authors"><strong>${authorLinks(s)}</strong></p><p class="pdf-meta" contenteditable="true">${escapeHtml(s.affiliation||'')}<br>${escapeHtml(s.topic||'')} · ${escapeHtml(s.license||'')}</p>`:''}<main class="pdf-single-flow pdf-continuous-flow" lang="en">${(pageBlocks||[]).map(b=>renderPdfBlock(b,s.id)).join('')}</main><div class="pdf-footer">Page ${pageNo} of ${total}</div></div>`;
}
function renderPdfDocument(s){
  const pages=paginateBlocks(orderedPdfBlocks(s));
  return `<div class="pdf-document pdf-document-onecol pdf-document-continuous">${pages.map((blocks,i)=>renderPdfPage(s,blocks,i+1,pages.length)).join('')}</div>`;
}
function renderLayout(){
  const el=document.getElementById('layoutWorkspace');if(!el)return;
  const s=findAcceptedOrSubmission(getCurrentId());
  el.innerHTML=`<div>${renderPdfDocument(s)}</div><aside class="admin-card layout-tool"><h3>PDF layout tools</h3><p class="muted">The workspace now keeps the manuscript text in a continuous one-column flow. Figures are treated as movable blocks. Hover over a figure and use the arrows on the left side of the figure to move it up or down. The controls are now inside the page area so they will not be clipped.</p><label>Layout style</label><select><option>Single-column continuous paper layout</option></select><div class="hero-actions" style="margin-top:18px"><a class="btn btn-ghost" href="/admin/accepted/preview.html?id=${encodeURIComponent(s.id)}">Preview PDF</a><button class="btn btn-cyan" onclick="publishAccepted('${s.id}')">Publish</button></div></aside>`;
}
function renderPreview(){
  const el=document.getElementById('pdfPreview');if(!el)return;
  document.body.classList.add('pdf-preview-mode');
  const s=findAcceptedOrSubmission(getCurrentId());
  el.innerHTML=`<div class="hero-actions no-print" style="margin-bottom:20px"><button class="btn btn-primary" onclick="printLivePdfPreview()">PDF preview</button><button class="btn btn-cyan" onclick="publishAccepted('${s.id}')">Publish</button><a class="btn btn-ghost" href="/admin/accepted/layout.html?id=${encodeURIComponent(s.id)}">Back to layout</a></div>${renderPdfDocument(s)}`;
}

function loadScriptOnce(src){
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){
      if(existing.dataset.loaded==='1') return resolve();
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error('Could not load '+src)),{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=src;
    s.async=true;
    s.dataset.loaded='0';
    s.addEventListener('load',()=>{s.dataset.loaded='1';resolve();},{once:true});
    s.addEventListener('error',()=>reject(new Error('Could not load '+src)),{once:true});
    document.head.appendChild(s);
  });
}
async function loadPdfGenerator(){
  if(window.html2pdf) return;
  const sources=[
    '/assets/vendor/html2pdf.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js',
    'https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
  ];
  const errors=[];
  for(const src of sources){
    try{
      await loadScriptOnce(src);
      if(window.html2pdf) return;
      errors.push(src+' loaded but window.html2pdf was unavailable');
    }catch(err){
      errors.push((err&&err.message)||String(err));
    }
  }
  throw new Error('Could not load the PDF generator. Tried: '+errors.join(' | '));
}
function makePdfFilename(record){
  const id=String(record.siteId||record.articleId||record.id||'AIBioTrXiv').replace(/[^A-Za-z0-9_-]+/g,'-');
  const version=String(record.version||'v1').replace(/[^A-Za-z0-9_-]+/g,'-');
  return `${id}-${version}.pdf`;
}

async function waitForPdfExportImages(root){
  const imgs=[...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img=>new Promise(resolve=>{
    try{
      if(img.complete && img.naturalWidth>0) return resolve();
      img.crossOrigin='anonymous';
      img.addEventListener('load',()=>resolve(),{once:true});
      img.addEventListener('error',()=>resolve(),{once:true});
      const src=img.getAttribute('src')||'';
      if(src && src.startsWith('/')) img.src=new URL(src,location.origin).href;
      setTimeout(resolve,2500);
    }catch(_){resolve();}
  })));
}
function addAibioPreviewHeaderFooterToJsPdf(pdf){
  try{
    const pageCount=pdf.internal.getNumberOfPages();
    const pageSize=pdf.internal.pageSize;
    const w=pageSize.getWidth();
    const h=pageSize.getHeight();
    pdf.setTextColor(31,58,95);
    for(let i=1;i<=pageCount;i++){
      pdf.setPage(i);
      if(i>1){
        pdf.setFont('helvetica','bold');
        pdf.setFontSize(8.5);
        pdf.text('AIBioTrXiv AI BIOTHEORY ARCHIVE',36,18);
      }
      pdf.setFont('helvetica','normal');
      pdf.setFontSize(9);
      pdf.text('Page '+i,w/2,h-18,{align:'center'});
    }
  }catch(err){
    console.warn('Could not add PDF header/footer overlay',err);
  }
}
async function generatePdfDataUriForPublishedRecord(record){
  await loadPdfGenerator();
  if(!window.html2pdf) throw new Error('PDF generator did not load.');
  const host=document.createElement('div');
  host.className='pdf-export-host pdf-preview-mode print-editor-preview-only';
  host.style.position='fixed';
  host.style.left='-10000px';
  host.style.top='0';
  host.style.width='794px';
  host.style.background='#fff';
  host.style.zIndex='-1';
  host.innerHTML=renderWordProcessorDocument(record,'preview',{prefix:'export',editorId:'exportWordPdfEditor',titleId:'exportPdfTitle',metaId:'exportPdfMeta',docClass:'export-pdf-document'});
  host.querySelectorAll('.figure-move-controls').forEach(n=>n.remove());
  host.querySelectorAll('.word-figure.selected').forEach(n=>n.classList.remove('selected'));
  document.body.appendChild(host);
  const page=host.querySelector('.pdf-word-page') || host;
  try{
    await waitForPdfExportImages(host);
    const opt={
      margin:[30,0,34,0],
      filename:makePdfFilename(record),
      image:{type:'jpeg',quality:0.94},
      html2canvas:{scale:1.8,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,imageTimeout:6000},
      jsPDF:{unit:'pt',format:'a4',orientation:'portrait'},
      pagebreak:{mode:['css','legacy']}
    };
    const worker=window.html2pdf().set(opt).from(page).toPdf();
    const pdf=await worker.get('pdf');
    addAibioPreviewHeaderFooterToJsPdf(pdf);
    return pdf.output('datauristring');
  }finally{
    host.remove();
  }
}

function dataUriToBase64(dataUri){
  const m=String(dataUri||'').match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if(!m) throw new Error('Invalid PDF data URI.');
  return {mimeType:m[1]||'application/pdf',base64:m[3]||''};
}
async function uploadPublishedPdfToR2(record,pdfDataUri){
  const {mimeType,base64}=dataUriToBase64(pdfDataUri);
  const articleId=String(record.siteId||record.articleId||record.id||'AIBioTrXiv').replace(/[^A-Za-z0-9_-]+/g,'-');
  const version=String(record.version||'v1').replace(/[^A-Za-z0-9_-]+/g,'-');
  const filename=makePdfFilename(record);
  const key=`published/${articleId}/${version}/${filename}`;
  const res=await fetch('/api/storage/r2-object',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'include',
    body:JSON.stringify({key,base64,mimeType,filename,ownerType:'published_article',objectRole:'published_pdf',ownerId:articleId})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok) throw new Error(data.error||'R2 PDF upload failed.');
  return data;
}
function utf8ToBase64(value){
  const bytes=new TextEncoder().encode(String(value||''));
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
  }
  return btoa(binary);
}
async function uploadPublishedHtmlSnapshotToR2(record,htmlFragment){
  const articleId=String(record.siteId||record.articleId||record.id||'AIBioTrXiv').replace(/[^A-Za-z0-9_-]+/g,'-');
  const version=String(record.version||'v1').replace(/[^A-Za-z0-9_-]+/g,'-');
  const filename=`${articleId}-${version}.html`;
  const key=`published/${articleId}/${version}/${filename}`;
  const fullHtml='<!doctype html><html><head><meta charset="utf-8"><title>'+String(record.title||articleId).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]))+'</title><link rel="stylesheet" href="/assets/css/style.css"></head><body class="pdf-preview-mode print-editor-preview-only">'+String(htmlFragment||'')+'</body></html>';
  const res=await fetch('/api/storage/r2-object',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'include',
    body:JSON.stringify({key,base64:utf8ToBase64(fullHtml),mimeType:'text/html; charset=utf-8',filename,ownerType:'published_article',objectRole:'published_html',ownerId:articleId})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok) throw new Error(data.error||'R2 HTML snapshot upload failed.');
  return data;
}
async function attachAutoPdfToPublishedRecord(record){
  if(!record.canonicalPreviewPdfR2Key){
    alert('Please click PDF preview first. The published PDF now uses the exact canonical preview PDF, so publishing is blocked until a Cloudflare Browser Rendering preview has been generated.');
    return null;
  }
  const pdfHtml=renderWordProcessorDocument(record,'preview',{prefix:'server',editorId:'serverWordPdfEditor',titleId:'serverPdfTitle',metaId:'serverPdfMeta',docClass:'server-pdf-document'});
  const articleId=String(record.siteId||record.articleId||record.id||'AIBioTrXiv').replace(/[^A-Za-z0-9_-]+/g,'-');
  const version=String(record.version||'v1').replace(/[^A-Za-z0-9_-]+/g,'-');
  const filename=makePdfFilename(record);
  try{
    const res=await fetch('/api/publish-pdf',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({
        record,
        articleId,
        version,
        filename,
        htmlFragment:pdfHtml,
        canonicalPreviewPdfR2Key:record.canonicalPreviewPdfR2Key||'',
        canonicalPreviewHtmlR2Key:record.canonicalPreviewHtmlR2Key||'',
        sourceSubmissionId:record.sourceSubmissionId||record.id||'',
        acceptedId:record.sourceSubmissionId||record.id||''
      })
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok){
      throw new Error(data.detail||data.error||'Server-side PDF generation failed.');
    }
    return {...record,...(data.record||{}),pdfGenerationMode:'cloudflare-browser-run-r2',pdfGeneratedAt:new Date().toISOString()};
  }catch(serverErr){
    console.error('Server-side PDF generation failed; publish was stopped to avoid creating a mismatched PDF.',serverErr);
    alert('Publish stopped because the exact preview-style PDF could not be generated on the backend. No public article was created and no mismatched browser-fallback PDF was uploaded.\n\nError detail: '+((serverErr&&serverErr.message)||serverErr)+'\n\nCheck CF_ACCOUNT_ID, CF_BROWSER_TOKEN, the R2 binding AIBIO_STORAGE, and the D1 binding DB in Cloudflare Pages.');
    return null;
  }
}


function recordPdfKeys(record){
  return [record?.pdfR2Key,record?.htmlR2Key].filter(Boolean);
}
async function deleteR2ObjectsForRecord(record){
  const keys=recordPdfKeys(record);
  if(!keys.length)return;
  try{
    await fetch('/api/storage/r2-object',{method:'DELETE',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({keys})});
  }catch(e){console.error('R2 cleanup failed',e);}
}
function stripPublishedAssets(record){
  const next={...record};
  delete next.pdf;
  delete next.pdfR2Key;
  delete next.htmlR2Key;
  delete next.pdfFileName;
  delete next.pdfGeneratedAt;
  delete next.pdfGenerationMode;
  delete next.pdfSha256;
  delete next.htmlSha256;
  return next;
}
function markMemberPaperPublished(record){
  const papers=safeLocal('aibio_member_papers',[]);
  if(!Array.isArray(papers)||!papers.length)return;
  const source=String(record.sourceSubmissionId||record.id||'');
  const site=String(record.siteId||record.articleId||'');
  let changed=false;
  const next=papers.map(p=>{
    const match=String(p.id||'')===source || String(p.sourceSubmissionId||'')===source || (site && String(p.articleId||p.versionGroupId||p.siteId||'')===site);
    if(!match)return p;
    changed=true;
    return {...p,status:'published',reviewStatus:'published',paymentStatus:p.paymentStatus||'paid',articleId:record.articleId,versionGroupId:record.versionGroupId||record.articleId,siteId:record.siteId||record.articleId,version:record.version||p.version||'v1',publishedAt:record.publishedAt||record.date||new Date().toISOString(),pdf:record.pdf,pdfR2Key:record.pdfR2Key,htmlR2Key:record.htmlR2Key};
  });
  if(changed)safeSetLocal('aibio_member_papers',next);
}
function markMemberPaperAccepted(record){
  const papers=safeLocal('aibio_member_papers',[]);
  if(!Array.isArray(papers)||!papers.length)return false;
  const source=String(record.sourceSubmissionId||record.id||'');
  const site=String(record.siteId||record.articleId||'');
  let changed=false;
  const next=papers.map(p=>{
    const match=String(p.id||'')===source || String(p.sourceSubmissionId||'')===source || (site && String(p.articleId||p.versionGroupId||p.siteId||'')===site);
    if(!match)return p;
    changed=true;
    const q={...p,status:'accepted',reviewStatus:'accepted'};
    delete q.pdf;delete q.pdfR2Key;delete q.htmlR2Key;delete q.pdfFileName;delete q.pdfGeneratedAt;delete q.pdfGenerationMode;delete q.htmlR2Key;
    return q;
  });
  if(changed)safeSetLocal('aibio_member_papers',next);
  return changed;
}
async function markMemberPaperAcceptedAndWait(record){
  const papers=safeLocal('aibio_member_papers',[]);
  if(!Array.isArray(papers)||!papers.length)return false;
  const source=String(record.sourceSubmissionId||record.id||'');
  const site=String(record.siteId||record.articleId||'');
  let changed=false;
  const next=papers.map(p=>{
    const match=String(p.id||'')===source || String(p.sourceSubmissionId||'')===source || (site && String(p.articleId||p.versionGroupId||p.siteId||'')===site);
    if(!match)return p;
    changed=true;
    const q={...p,status:'accepted',reviewStatus:'accepted'};
    delete q.pdf;delete q.pdfR2Key;delete q.htmlR2Key;delete q.pdfFileName;delete q.pdfGeneratedAt;delete q.pdfGenerationMode;delete q.htmlR2Key;
    return q;
  });
  if(changed)await safeSetLocalAndWait('aibio_member_papers',next);
  return changed;
}
function acceptedRecordFromPublishedRecord(record){
  const s={...stripPublishedAssets(record),status:'accepted',reviewStatus:'accepted',id:record.sourceSubmissionId||record.id};
  delete s.siteId;delete s.articleId;delete s.versionGroupId;delete s.slug;delete s.publishedAt;delete s.date;delete s.versionPublishedAt;delete s.unpublishedAt;
  return normalizeSubmission(s);
}
async function moveNonPublishedRecordToAccepted(record,fromKey){
  if(!record)return false;
  const articleKey=String(record.siteId||record.articleId||record.id||'');
  const acceptedRecord=acceptedRecordFromPublishedRecord(record);
  await deleteR2ObjectsForRecord(record);
  const acceptedNext=[...acceptedList().filter(x=>String(x.id||'')!==String(acceptedRecord.id||'')),acceptedRecord];
  await setAcceptedAndWait(acceptedNext);
  if(fromKey==='published') await setPublishedAndWait(publishedList().filter(x=>String(x.siteId||x.id)!==articleKey),{allowEmptyOverwrite:true});
  if(fromKey==='unpublished') await setUnpublishedAndWait(unpublishedList().filter(x=>String(x.siteId||x.articleId||x.id)!==articleKey),{allowEmptyOverwrite:true});
  await markMemberPaperAcceptedAndWait(record);
  return true;
}

function versionNumber(v){const m=String(v||'v1').match(/(\d+)/);return m?Number(m[1]):1;}
async function publishAccepted(id){
  if(document.getElementById('wordPdfEditor')){
    const saved=await persistWordLayoutEditsAndWait(id,{silent:true});
    if(!saved){ alert('The current PDF layout could not be saved. Publish was stopped.'); return; }
  }
  let s=currentWordLayoutRecordForPublish(id);
  s=ensureAcceptedCanonicalPublicationIdentity(id,s);
  const currentPublished=publishedList();
  const today=new Date().toISOString().slice(0,10);
  const isRevision=!!s.versionGroupId;
  const articleId=isRevision?s.versionGroupId:(s.articleId||s.siteId||plannedNewArticleId());
  const related=currentPublished.filter(p=>(p.articleId||p.versionGroupId||p.siteId||p.id)===articleId);
  const nextVersion=isRevision?(isCanonicalVersionLabel(s.version)?s.version:('v'+(Math.max(1,...related.map(p=>versionNumber(p.version)))+1))):(isCanonicalVersionLabel(s.version)?s.version:'v1');
  const sanitizedPdfEditedHtml=s.pdfEditedHtml?cleanWordEditorForStorage(s.pdfEditedHtml):s.pdfEditedHtml;
  let record={...s,pdfEditedHtml:sanitizedPdfEditedHtml,status:'published',sourceSubmissionId:s.id,articleId,versionGroupId:articleId,siteId:articleId,publishedAt:today,date:today,version:nextVersion,slug:publicSlug(articleId),pdf:s.pdf||'#',versionNote:s.versionNote||'',versionPublishedAt:today};
  record=applyRememberedCanonicalPdfPreview(record);
  record=await attachAutoPdfToPublishedRecord(record);
  if(!record)return;
  if(s.id!=='SUB-2026-DEMO')setAccepted(acceptedList().filter(x=>x.id!==s.id));
  const next=currentPublished.filter(x=>!(String(x.id||'')===String(record.id||'') && String(x.version||'v1')===String(record.version||'v1')) && !(String(x.sourceSubmissionId||'')===String(record.sourceSubmissionId||'') && String(x.version||'v1')===String(record.version||'v1')));
  next.push(record);
  await removeUserSubmissionAndWait(s.id);
  markMemberPaperPublished(record);
  if(await setPublishedAndWait(next))location.href='/admin/published/';
}
function renderPublished(){const el=document.getElementById('publishedList');if(!el)return;const rows=publishedList().filter(p=>(p.status||'published')==='published');el.innerHTML=rows.length?`<table class="admin-table"><thead><tr><th>Paper</th><th>Published</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${escapeHtml(p.title)}</strong><br>${p.siteId||p.id}<br><a class="small-link" href="/manuscripts/?id=${encodeURIComponent(p.siteId||p.id)}">Open public HTML page →</a></td><td>${p.publishedAt||p.date}</td><td><span class="status">published</span></td><td><button class="btn btn-danger" onclick="unpublish('${p.siteId||p.id}')">Unpublish to accepted</button> ${tinyDelete('Delete',`deletePublished('${p.siteId||p.id}')`)} <button class="btn btn-ghost" onclick="recoverPublished('${p.siteId||p.id}')">Recover to accepted</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No locally published manuscripts yet.</p>';}
async function deletePublished(id){
  const rows=publishedList();const p=rows.find(x=>(x.siteId||x.id)===id);if(!p)return;
  if(confirm('Move this published manuscript to the paper trash? The published PDF/HTML files in R2 will be deleted.')){
    await deleteR2ObjectsForRecord(p);
    if(moveToTrash(stripPublishedAssets(p),'published')){await setPublishedAndWait(rows.filter(x=>(x.siteId||x.id)!==id),{allowEmptyOverwrite:true});location.reload();}
  }
}
async function recoverPublished(id){
  const rows=publishedList();const p=rows.find(x=>(x.siteId||x.id)===id);if(!p)return;
  try{
    if(await moveNonPublishedRecordToAccepted(p,'published'))location.href='/admin/accepted/';
  }catch(err){console.error(err);alert((err&&err.message)||'The published manuscript could not be recovered to accepted papers.');}
}
async function unpublish(id){
  const published=publishedList();const paper=published.find(p=>(p.siteId||p.id)===id);if(!paper)return;
  if(!confirm('Unpublish this paper and return it to Accepted papers? The public HTML and PDF files in R2 will be deleted.'))return;
  try{
    if(await moveNonPublishedRecordToAccepted(paper,'published'))location.href='/admin/accepted/';
  }catch(err){console.error(err);alert((err&&err.message)||'The manuscript could not be unpublished to accepted papers.');}
}
function renderUnpublished(){const el=document.getElementById('unpublishedList');if(!el)return;const rows=unpublishedList();el.innerHTML=rows.length?`<table class="admin-table"><thead><tr><th>Paper</th><th>Unpublished</th><th>Action</th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${escapeHtml(p.title)}</strong><br>${p.siteId||p.id}</td><td>${p.unpublishedAt||''}</td><td>${tinyDelete('Delete',`deleteUnpublished('${p.siteId||p.id}')`)} <button class="btn btn-ghost" onclick="recoverUnpublished('${p.siteId||p.id}')">Recover to accepted</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No unpublished manuscripts.</p>';}
async function deleteUnpublished(id){const rows=unpublishedList();const p=rows.find(x=>(x.siteId||x.id)===id);if(!p)return;if(confirm('Move this unpublished manuscript to the paper trash?')){await deleteR2ObjectsForRecord(p);if(moveToTrash(stripPublishedAssets(p),'unpublished')){await setUnpublishedAndWait(rows.filter(x=>(x.siteId||x.id)!==id),{allowEmptyOverwrite:true});location.reload();}}}
async function recoverUnpublished(id){
  const rows=unpublishedList();const p=rows.find(x=>(x.siteId||x.id)===id);if(!p)return;
  try{
    if(await moveNonPublishedRecordToAccepted(p,'unpublished'))location.href='/admin/accepted/';
  }catch(err){console.error(err);alert((err&&err.message)||'The unpublished manuscript could not be recovered to accepted papers.');}
}
function renderTrash(){const el=document.getElementById('trashList');if(!el)return;const rows=trashList();el.innerHTML=rows.length?`<div class="hero-actions" style="margin-bottom:14px"><button class="btn btn-ghost" onclick="toggleTrashSelection(true)">Select all</button><button class="btn btn-ghost" onclick="toggleTrashSelection(false)">Clear selection</button><button class="btn btn-danger" onclick="permanentlyDeleteSelected()">Request permanent purge</button></div><p class="muted">Security mode: permanent deletion is converted into a purge request. Records stay recoverable until you verify backups and complete a manual purge from the database / storage layer.</p><table class="admin-table trash-table"><thead><tr><th><input type="checkbox" id="trashSelectAll"></th><th>Paper</th><th>Deleted from</th><th>Deleted at</th><th>Purge</th><th>Action</th></tr></thead><tbody>${rows.map(p=>`<tr><td><input class="trash-check" type="checkbox" value="${escapeHtml(p.siteId||p.id)}"></td><td><strong>${escapeHtml(p.title)}</strong><br>${p.siteId||p.id}</td><td>${escapeHtml(p.deletedFrom||'')}</td><td>${escapeHtml(p.deletedAt||'')}</td><td>${p.purgeRequested?'<span class="status rejected">purge requested</span>':'<span class="muted">recoverable</span>'}</td><td><button class="btn btn-ghost" onclick="restoreFromTrash('${p.siteId||p.id}')">Restore</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">The paper trash is empty.</p>';document.getElementById('trashSelectAll')?.addEventListener('change',e=>toggleTrashSelection(e.target.checked));}
function toggleTrashSelection(on){document.querySelectorAll('.trash-check').forEach(cb=>cb.checked=!!on);const all=document.getElementById('trashSelectAll');if(all)all.checked=!!on;}
function permanentlyDeleteSelected(){const ids=[...document.querySelectorAll('.trash-check:checked')].map(cb=>cb.value);if(!ids.length){alert('No papers selected.');return;}const reason=prompt('Security mode: this will not physically erase data. It creates a purge request only. Enter a reason for the purge request:','Duplicate test record / policy cleanup');if(reason===null)return;const rows=trashList().map(p=>ids.includes(p.siteId||p.id)?markPurgeRequested(p,reason):p);ids.forEach(id=>auditAdminAction('purge_requested','paper',id,{reason}));if(setTrash(rows)){alert('Purge request recorded. The paper remains recoverable until backup verification and manual database/storage purge.');location.reload();}}
function restoreFromTrash(id){
  const rows=trashList();
  const p=rows.find(x=>(x.siteId||x.id)===id);
  if(!p)return;
  const from=p.deletedFrom;
  const restored={...p};
  delete restored.deletedFrom;delete restored.deletedAt;
  let ok=false, dest='/admin/submissions/';
  if(from==='accepted'){
    restored.status='accepted';
    ok=setAccepted([...acceptedList().filter(x=>x.id!==restored.id),restored]);
    dest='/admin/accepted/';
  }else if(from==='published'){
    restored.status='published';
    ok=setPublished([...publishedList().filter(x=>(x.siteId||x.id)!==id),restored]);
    dest='/admin/published/';
  }else if(from==='unpublished'){
    restored.status='unpublished';
    ok=setUnpublished([...unpublishedList().filter(x=>(x.siteId||x.id)!==id),restored]);
    dest='/admin/unpublished/';
  }else{
    restored.status=from==='rejected'?'rejected':'submitted';
    ok=setUserSubmissions([...userSubmissions().filter(x=>x.id!==restored.id),restored]);
  }
  if(ok){auditAdminAction('restore_from_trash','paper',id,{restoredFrom:from});setTrash(rows.filter(x=>(x.siteId||x.id)!==id));location.href=dest;}
}

const MEMBERS_KEY='aibio_members';
function adminMembers(){return safeLocal(MEMBERS_KEY,[]);}
function setAdminMembers(list){return safeSetLocal(MEMBERS_KEY,list);}
function normAdminEmail(email){return String(email||'').trim().toLowerCase();}
function memberPaperCounts(email){email=normAdminEmail(email);const rows=safeLocal('aibio_member_papers',[]).filter(p=>normAdminEmail(p.memberEmail)===email);return {total:rows.length,drafts:rows.filter(p=>p.status==='draft').length,submitted:rows.filter(p=>p.status==='submitted'||p.reviewStatus==='under_review').length,published:publishedList().filter(p=>normAdminEmail(p.memberEmail)===email||((p.authorList||[]).some(a=>normAdminEmail(a.email)===email))).length};}
function memberAccountSuspended(m){return !!(m&&(m.suspended||m.status==='suspended'));}
function memberCommentRestricted(m){return !!(m&&(m.commentSuspended||m.commentStatus==='restricted'||m.commentsRestricted));}
function renderMemberRow(m){
  const c=memberPaperCounts(m.email);
  const accountStatus=memberAccountSuspended(m)?'<span class="status rejected">Account suspended</span>':'<span class="status accepted">Account active</span>';
  const commentStatus=memberCommentRestricted(m)?'<span class="status rejected">Comments restricted</span>':'<span class="status accepted">Comments allowed</span>';
  return `<tr><td><strong>${escapeHtml(m.name||'')}</strong><br><span class="muted">${escapeHtml(m.email||'')}</span></td><td>${accountStatus}<br>${commentStatus}<br><span class="muted">${m.emailVerified?'Email verified':'Email not verified'}</span></td><td>Total ${c.total}<br><span class="muted">Drafts ${c.drafts} · submitted ${c.submitted} · published ${c.published}</span></td><td><div class="admin-member-actions">${memberAccountSuspended(m)?`<button class="btn btn-cyan" onclick="restoreMemberAccount('${escapeHtml(m.email)}')">Restore account</button>`:`<button class="btn btn-danger" onclick="suspendMemberAccount('${escapeHtml(m.email)}')">Suspend account</button>`}${memberCommentRestricted(m)?`<button class="btn btn-cyan" onclick="restoreMemberComments('${escapeHtml(m.email)}')">Restore comments</button>`:`<button class="btn btn-ghost" onclick="restrictMemberComments('${escapeHtml(m.email)}')">Restrict comments</button>`}</div></td></tr>`;
}
function renderMembersAdmin(){const box=document.getElementById('adminMembersList');if(!box)return;const q=(document.getElementById('memberSearch')?.value||'').trim().toLowerCase();const rows=adminMembers().filter(m=>!q||String(m.email||'').toLowerCase().includes(q)||String(m.name||'').toLowerCase().includes(q));box.innerHTML=rows.length?`<table class="admin-table"><thead><tr><th>Member</th><th>Status</th><th>Manuscripts</th><th>Moderation action</th></tr></thead><tbody>${rows.map(renderMemberRow).join('')}</tbody></table>`:'<p class="muted">No matching members.</p>';}
function suspendMemberAccount(email){const reason=prompt('Reason for full account suspension. This blocks submissions, payments, revisions, and peer comments but does not delete the account or existing articles.','Serious policy violation');if(reason===null)return;const rows=adminMembers().map(m=>normAdminEmail(m.email)===normAdminEmail(email)?{...m,status:'suspended',suspended:true,suspensionReason:reason,suspendedAt:new Date().toISOString()}:m);setAdminMembers(rows);renderMembersAdmin();}
function restoreMemberAccount(email){if(!confirm('Restore this member account?'))return;const rows=adminMembers().map(m=>normAdminEmail(m.email)===normAdminEmail(email)?{...m,status:'active',suspended:false,suspensionReason:'',restoredAt:new Date().toISOString()}:m);setAdminMembers(rows);renderMembersAdmin();}
function restrictMemberComments(email){const reason=prompt('Reason for restricting peer-comment activity only. This should not affect manuscript submission or already published articles.','Improper peer comments, spam, harassment, or repeated off-topic comments');if(reason===null)return;const rows=adminMembers().map(m=>normAdminEmail(m.email)===normAdminEmail(email)?{...m,commentStatus:'restricted',commentSuspended:true,commentsRestricted:true,commentSuspensionReason:reason,commentSuspendedAt:new Date().toISOString()}:m);setAdminMembers(rows);renderMembersAdmin();}
function restoreMemberComments(email){if(!confirm('Restore this member peer-comment privilege?'))return;const rows=adminMembers().map(m=>normAdminEmail(m.email)===normAdminEmail(email)?{...m,commentStatus:'allowed',commentSuspended:false,commentsRestricted:false,commentSuspensionReason:'',commentRestoredAt:new Date().toISOString()}:m);setAdminMembers(rows);renderMembersAdmin();}

async function renderStorageResetPanel(){
  const panel=document.getElementById('adminStorageResetPanel');
  const box=document.getElementById('adminStorageResetStatus');
  if(!panel||!box)return;
  let meta={};
  try{
    const res=await fetch('/api/admin/reset-storage',{cache:'no-store',credentials:'include'});
    meta=await res.json().catch(()=>({}));
    if(!res.ok||!meta.ok){
      box.innerHTML='<p class="muted">Reset endpoint is not ready: '+escapeHtml(meta.error||'unknown error')+'</p>';
      return;
    }
  }catch(err){
    box.innerHTML='<p class="muted">Reset endpoint could not be reached: '+escapeHtml((err&&err.message)||String(err||'unknown error'))+'</p>';
    return;
  }
  const disabled=!meta.enabled;
  const diag=meta.diagnostics&&meta.diagnostics.allowFullStorageReset?meta.diagnostics.allowFullStorageReset:null;
  const alt=(meta.diagnostics&&Array.isArray(meta.diagnostics.alternativeToggleNames))?meta.diagnostics.alternativeToggleNames:[];
  const diagHtml=diag?`<div class="muted" style="margin-top:10px"><strong>Backend diagnostic:</strong><br><code>${escapeHtml(diag.name)}</code>: present=${diag.present?'yes':'no'}, type=${escapeHtml(diag.type||'unknown')}, normalized=<code>${escapeHtml(diag.normalized||'')}</code>, length=${escapeHtml(String(diag.length||0))}${alt.length?`<br><span class="muted">Alternative accepted names: ${alt.map(x=>`<code>${escapeHtml(x.name)}</code> present=${x.present?'yes':'no'}`).join(' · ')}</span>`:''}</div>`:'';
  box.innerHTML=`<div class="admin-reset-box">
    <p class="muted">Endpoint status: ${disabled?'<span class="status rejected">Disabled</span>':'<span class="status accepted">Enabled</span>'}</p>
    ${diagHtml}
    ${disabled?'<p class="muted">The endpoint is running, but this deployment cannot read an enabled reset toggle. Confirm the exact variable name is <code>ALLOW_FULL_STORAGE_RESET</code>, the value is <code>true</code>, it is set under the same Production/Preview environment as the URL you are opening, and that deployment was redeployed after the variable was added.</p>':''}
    <label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px"><input id="storageResetUnderstand" type="checkbox" ${disabled?'disabled':''}><span>I understand this will delete D1 operational data, all member accounts, all manuscript/payment/comment records, and every R2 object in this environment.</span></label>
    <label style="margin-top:14px">Type <code>${escapeHtml(meta.confirmationText||'RESET AIBIOTRXIV')}</code> to unlock</label>
    <input id="storageResetPhrase" placeholder="RESET AIBIOTRXIV" autocomplete="off" ${disabled?'disabled':''}>
    <label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px"><input id="storageResetFinal" type="checkbox" ${disabled?'disabled':''}><span>This is the test site / test database / test R2 bucket. I want to reset it now.</span></label>
    <button class="btn btn-danger" id="storageResetButton" type="button" ${disabled?'disabled':''} style="margin-top:14px">Reset all D1 and R2 data</button>
    <pre id="storageResetResult" class="code-block" style="display:none;white-space:pre-wrap;margin-top:16px"></pre>
  </div>`;
  const btn=document.getElementById('storageResetButton');
  btn?.addEventListener('click',async()=>{
    const understand=document.getElementById('storageResetUnderstand')?.checked;
    const phrase=document.getElementById('storageResetPhrase')?.value||'';
    const final=document.getElementById('storageResetFinal')?.checked;
    const result=document.getElementById('storageResetResult');
    if(!understand||phrase!==(meta.confirmationText||'RESET AIBIOTRXIV')||!final){
      alert('Reset is locked. Check both boxes and type the confirmation phrase exactly.');
      return;
    }
    const again=prompt('Final confirmation: type DELETE TEST DATA to continue.');
    if(again!=='DELETE TEST DATA')return;
    btn.disabled=true;
    btn.textContent='Resetting D1 and R2...';
    if(result){result.style.display='block';result.textContent='Reset request sent. Please wait; large R2 buckets may take time.';}
    try{
      const res=await fetch('/api/admin/reset-storage',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',cache:'no-store',body:JSON.stringify({scope:meta.confirmationScope||'D1_R2_FULL_RESET',confirmationText:phrase,confirmFinal:true})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok)throw new Error(data.error||'Reset failed.');
      try{
        ['aibio_demo_submission','aibio_submissions','aibio_accepted','aibio_published','aibio_unpublished','aibio_trash','aibio_security_audit_events','aibio_members','aibio_member_papers','aibio_payment_notifications','aibio_email_verifications','aibio_member_session'].forEach(k=>localStorage.removeItem(k));
      }catch(_){ }
      if(result)result.textContent='Reset completed.\n\n'+JSON.stringify(data,null,2)+'\n\nReloading the admin page is recommended.';
      btn.textContent='Reset completed';
    }catch(err){
      console.error(err);
      if(result)result.textContent='Reset failed: '+((err&&err.message)||String(err||'unknown error'));
      btn.disabled=false;
      btn.textContent='Reset all D1 and R2 data';
    }
  });
}

// Backward-compatible names used by older buttons.
function suspendMember(email){suspendMemberAccount(email)}
function restoreMember(email){restoreMemberAccount(email)}
function bindMembersAdmin(){const input=document.getElementById('memberSearch');if(input){input.addEventListener('input',renderMembersAdmin);renderMembersAdmin();}}

document.addEventListener('DOMContentLoaded',async()=>{
  try{
    await loadAdminRemoteKv();
    renderAdminSubmissions();
    renderSubmissionDetail();
    renderAccepted();
    renderLayout();
    renderPreview();
    renderPublished();
    renderUnpublished();
    renderTrash();
    bindMembersAdmin();
    await renderStorageResetPanel();
  }catch(err){
    console.error('Admin page initialization failed',err);
    const target=document.getElementById('adminSubmissions')||document.getElementById('acceptedList')||document.getElementById('publishedList')||document.getElementById('trashList')||document.querySelector('main .site-shell');
    if(target){
      target.innerHTML='<div class="admin-card"><h2>Admin page could not load</h2><p class="muted">The admin JavaScript stopped before the data table could render. Open the browser console for details, then redeploy the fixed package.</p><p class="muted">Error: '+escapeHtml((err&&err.message)||String(err||'Unknown error'))+'</p></div>';
    }
  }
});

/* v15 Word-like PDF layout workspace overrides */
function buildWordArticleHtmlFromSubmission(s){
  const seen={results:false};
  const out=[];
  if((s.abstract||'').trim()){
    out.push(`<section class="word-abstract-box"><h2>Abstract</h2><p>${escapeHtml(s.abstract)}</p></section>`);
  }
  (s.sections||[]).forEach((sec,si)=>{
    let heading=String(sec.heading||'Section').trim();
    if(/^results$/i.test(heading)){
      if(seen.results) heading='';
      else {heading='Results';seen.results=true;}
    }
    if(heading) out.push(`<h2>${escapeHtml(heading)}</h2>`);
    const clean=cleanRichForPdf(sec.text||'');
    if(clean) out.push(`<div class="word-section-text">${clean}</div>`);
    if(sec.image){
      out.push(`<figure class="word-figure" data-figure-id="fig-${si}" data-figure-scale="92" style="width:92%;max-width:100%" contenteditable="false"><img src="${sec.image}" alt="Figure"><figcaption contenteditable="true">${escapeHtml(sec.legend||'')}</figcaption></figure>`);
    }
  });
  return out.join('\n');
}
function clampWordFigureScale(value){
  const n=Number(value);
  if(!Number.isFinite(n)) return 92;
  return Math.max(30,Math.min(100,Math.round(n)));
}
function applyWordFigureScale(fig,scale){
  const n=clampWordFigureScale(scale);
  fig.dataset.figureScale=String(n);
  fig.style.width=n+'%';
  fig.style.maxWidth='100%';
  return n;
}
function setSelectedWordFigure(fig){
  document.querySelectorAll('#wordPdfEditor .word-figure.selected').forEach(f=>f.classList.remove('selected'));
  if(fig) fig.classList.add('selected');
  updateFigureSizeToolbar(fig);
}
function updateFigureSizeToolbar(fig){
  const range=document.getElementById('blogFigureSizeRange');
  const out=document.getElementById('blogFigureSizeValue');
  const label=document.getElementById('blogSelectedFigureLabel');
  if(!range||!out||!label)return;
  if(!fig){
    range.disabled=true;
    out.textContent='—';
    label.textContent='No figure selected';
    return;
  }
  const scale=clampWordFigureScale(fig.dataset.figureScale || parseInt(fig.style.maxWidth,10) || 92);
  range.disabled=false;
  range.value=String(scale);
  out.textContent=scale+'%';
  label.textContent='Selected figure';
}
function setSelectedFigureScale(value,submissionId){
  const fig=document.querySelector('#wordPdfEditor .word-figure.selected');
  if(!fig)return;
  applyWordFigureScale(fig,value);
  updateFigureSizeToolbar(fig);
  persistWordLayoutEdits(submissionId,{silent:true});
  updateLivePdfPreview();
}
function adjustSelectedFigureScale(delta,submissionId){
  const fig=document.querySelector('#wordPdfEditor .word-figure.selected');
  if(!fig)return;
  setSelectedFigureScale(clampWordFigureScale(fig.dataset.figureScale)+delta,submissionId);
}
function addWordFigureControls(root,submissionId){
  root.querySelectorAll('.word-figure').forEach((fig,i)=>{
    if(!fig.dataset.figureId) fig.dataset.figureId='fig-'+i;
    applyWordFigureScale(fig,fig.dataset.figureScale || parseInt(fig.style.maxWidth,10) || 92);
    fig.querySelector('.figure-move-controls')?.remove();
    const controls=document.createElement('div');
    controls.className='figure-move-controls no-print';
    controls.setAttribute('contenteditable','false');
    controls.innerHTML=`<button type="button" title="Move figure up">▲</button><button type="button" title="Move figure down">▼</button>`;
    controls.children[0].addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setSelectedWordFigure(fig);moveWordFigure(submissionId,fig.dataset.figureId,-1);});
    controls.children[1].addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setSelectedWordFigure(fig);moveWordFigure(submissionId,fig.dataset.figureId,1);});
    fig.addEventListener('click',()=>setSelectedWordFigure(fig));
    fig.prepend(controls);
  });
}
function wordEditorHtmlFor(s){
  return s.pdfEditedHtml || buildWordArticleHtmlFromSubmission(s);
}

function blogEditorToolbarHtml(submissionId){
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
    <span id="blogSelectedFigureLabel" class="blog-figure-label">No figure selected</span>
    <button type="button" title="Move selected figure up" data-figure-action="up">▲</button>
    <button type="button" title="Move selected figure down" data-figure-action="down">▼</button>
    <button type="button" title="Make selected figure smaller" data-figure-action="smaller">−</button>
    <input id="blogFigureSizeRange" type="range" min="30" max="100" step="1" value="92" disabled title="Resize selected figure">
    <button type="button" title="Make selected figure larger" data-figure-action="larger">＋</button>
    <button type="button" title="Reset selected figure size" data-figure-action="reset">Reset</button>
    <output id="blogFigureSizeValue">—</output>
  </div>`;
}
function bindBlogEditorToolbar(submissionId){
  const toolbar=document.getElementById('blogEditorToolbar');
  const editor=document.getElementById('wordPdfEditor');
  if(!toolbar||!editor)return;
  toolbar.querySelectorAll('[data-cmd]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.preventDefault();
      document.execCommand(btn.dataset.cmd,false,null);
      editor.focus();
      scheduleLivePdfPreviewUpdate();
      persistWordLayoutEdits(submissionId,{silent:true});
    });
  });
  toolbar.querySelectorAll('[data-format]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.preventDefault();
      document.execCommand('formatBlock',false,btn.dataset.format);
      editor.focus();
      scheduleLivePdfPreviewUpdate();
      persistWordLayoutEdits(submissionId,{silent:true});
    });
  });
  toolbar.querySelector('[data-action="link"]')?.addEventListener('click',e=>{
    e.preventDefault();
    const url=prompt('Enter link URL');
    if(url) document.execCommand('createLink',false,url);
    editor.focus();
    scheduleLivePdfPreviewUpdate();
    persistWordLayoutEdits(submissionId,{silent:true});
  });
  toolbar.querySelector('[data-figure-action="up"]')?.addEventListener('click',e=>{
    e.preventDefault();
    const fig=editor.querySelector('.word-figure.selected');
    if(fig)moveWordFigure(submissionId,fig.dataset.figureId,-1);
  });
  toolbar.querySelector('[data-figure-action="down"]')?.addEventListener('click',e=>{
    e.preventDefault();
    const fig=editor.querySelector('.word-figure.selected');
    if(fig)moveWordFigure(submissionId,fig.dataset.figureId,1);
  });
  toolbar.querySelector('[data-figure-action="smaller"]')?.addEventListener('click',e=>{e.preventDefault();adjustSelectedFigureScale(-5,submissionId);});
  toolbar.querySelector('[data-figure-action="larger"]')?.addEventListener('click',e=>{e.preventDefault();adjustSelectedFigureScale(5,submissionId);});
  toolbar.querySelector('[data-figure-action="reset"]')?.addEventListener('click',e=>{e.preventDefault();setSelectedFigureScale(92,submissionId);});
  toolbar.querySelector('#blogFigureSizeRange')?.addEventListener('input',e=>{setSelectedFigureScale(e.target.value,submissionId);});
  editor.addEventListener('click',e=>{
    const fig=e.target.closest?.('.word-figure');
    if(fig) setSelectedWordFigure(fig);
  });
}

function renderWordProcessorDocument(s,mode='layout',opts={}){
  const tmp=document.createElement('div');
  tmp.innerHTML=wordEditorHtmlFor(s);
  if(mode!=='preview') addWordFigureControls(tmp,s.id);
  const editable=mode==='preview'?'false':'true';
  const prefix=opts.prefix || (mode==='preview'?'preview':'layout');
  const editorId=opts.editorId || (mode==='preview' ? `${prefix}WordPdfEditor` : 'wordPdfEditor');
  const titleId=opts.titleId || `${prefix}PdfTitle`;
  const metaId=opts.metaId || `${prefix}PdfMeta`;
  const docClass=opts.docClass ? ` ${opts.docClass}` : '';
  return `<div class="pdf-word-document${docClass}"><div class="pdf-word-page printable-pdf"><div class="pdf-brand" contenteditable="false"><img src="/assets/img/Brand.jpg?v=38" alt=""><div><div class="brand-title pdf-brand-title">AIBioT<span style="color:#AE0000">ʀχiv</span></div><div class="brand-subtitle">AI BioTheory Archive</div></div></div><div id="${titleId}" class="pdf-title" contenteditable="${editable}">${escapeHtml(s.title||'')}</div><p class="pdf-authors" contenteditable="false"><strong>${authorLinks(s)}</strong></p><p id="${metaId}" class="pdf-meta" contenteditable="${editable}">${escapeHtml(s.affiliation||'')}<br>${escapeHtml(s.topic||'')} · ${escapeHtml(s.license||'')}</p><main id="${editorId}" class="pdf-word-editor" contenteditable="${editable}" spellcheck="true">${tmp.innerHTML}</main></div></div>`;
}
function cleanWordEditorForStorage(html){
  const root=document.createElement('div');
  root.innerHTML=html||'';
  root.querySelectorAll('.figure-move-controls').forEach(n=>n.remove());
  root.querySelectorAll('.word-figure.selected').forEach(fig=>fig.classList.remove('selected'));
  root.querySelectorAll('.word-figure').forEach((fig,i)=>{
    fig.setAttribute('contenteditable','false');
    if(!fig.dataset.figureId) fig.dataset.figureId='fig-'+i;
    const scale=clampWordFigureScale(fig.dataset.figureScale || parseInt(fig.style.width,10) || parseInt(fig.style.maxWidth,10) || 92);
    fig.dataset.figureScale=String(scale);
    fig.style.width=scale+'%';
    fig.style.maxWidth='100%';
  });
  return root.innerHTML.trim();
}
function currentWordLayoutRecordForPublish(id){
  const base=findAcceptedOrSubmission(id);
  const editor=document.getElementById('wordPdfEditor');
  if(!editor) return base;
  const titleEl=document.getElementById('layoutPdfTitle');
  const metaEl=document.getElementById('layoutPdfMeta');
  const updated={...base,pdfEditedHtml:cleanWordEditorForStorage(editor.innerHTML)};
  if(titleEl){
    const title=String(titleEl.textContent||'').trim();
    if(title) updated.title=title;
  }
  if(metaEl){
    const lines=String(metaEl.innerText||metaEl.textContent||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
    if(lines[0]) updated.affiliation=lines[0];
    if(lines[1]){
      const parts=lines[1].split('·').map(x=>x.trim());
      if(parts[0]) updated.topic=parts[0];
      if(parts[1]) updated.license=parts.slice(1).join(' · ');
    }
  }
  return updated;
}
async function persistWordLayoutEditsAndWait(id,{silent=false}={}){
  const editor=document.getElementById('wordPdfEditor');
  if(!editor) return false;
  const updated=currentWordLayoutRecordForPublish(id);
  let ok=false;
  if(id==='SUB-2026-DEMO'){
    localStorage.setItem('aibio_demo_submission',JSON.stringify(updated));ok=true;
  }else if(acceptedList().some(x=>x.id===id)){
    ok=await setAcceptedAndWait(acceptedList().map(x=>x.id===id?updated:x));
  }else if(publishedList().some(x=>(x.siteId||x.id)===id || x.id===id)){
    ok=await setPublishedAndWait(publishedList().map(x=>((x.siteId||x.id)===id || x.id===id)?updated:x));
  }else if(unpublishedList().some(x=>(x.siteId||x.id)===id || x.id===id)){
    ok=await setUnpublishedAndWait(unpublishedList().map(x=>((x.siteId||x.id)===id || x.id===id)?updated:x));
  }else{
    updateSubmissionRecord(updated);ok=true;
  }
  if(ok && !silent) alert('Layout edits saved.');
  return ok;
}
function persistWordLayoutEdits(id,{silent=false}={}){
  const editor=document.getElementById('wordPdfEditor');
  if(!editor) return false;
  const s=findAcceptedOrSubmission(id);
  const updated={...s,pdfEditedHtml:cleanWordEditorForStorage(editor.innerHTML)};
  let ok=false;
  if(id==='SUB-2026-DEMO'){
    localStorage.setItem('aibio_demo_submission',JSON.stringify(updated));ok=true;
  }else if(acceptedList().some(x=>x.id===id)){
    ok=setAccepted(acceptedList().map(x=>x.id===id?updated:x));
  }else if(publishedList().some(x=>(x.siteId||x.id)===id || x.id===id)){
    ok=setPublished(publishedList().map(x=>((x.siteId||x.id)===id || x.id===id)?updated:x));
  }else if(unpublishedList().some(x=>(x.siteId||x.id)===id || x.id===id)){
    ok=setUnpublished(unpublishedList().map(x=>((x.siteId||x.id)===id || x.id===id)?updated:x));
  }else{
    updateSubmissionRecord(updated);ok=true;
  }
  if(ok && !silent) alert('Layout edits saved.');
  return ok;
}
function moveWordFigure(submissionId,figureId,dir){
  const editor=document.getElementById('wordPdfEditor');
  const fig=editor?.querySelector(`.word-figure[data-figure-id="${CSS.escape(figureId)}"]`);
  if(!editor||!fig) return;
  if(dir<0){
    let prev=fig.previousElementSibling;
    while(prev && prev.classList.contains('figure-move-controls')) prev=prev.previousElementSibling;
    if(prev) editor.insertBefore(fig,prev);
  }else{
    const next=fig.nextElementSibling;
    if(next) editor.insertBefore(fig,next.nextElementSibling);
  }
  persistWordLayoutEdits(submissionId,{silent:true});
  updateLivePdfPreview();
}
function cleanWordEditorForPreview(html){
  const root=document.createElement('div');
  root.innerHTML=html||'';
  root.querySelectorAll('.figure-move-controls').forEach(n=>n.remove());
  root.querySelectorAll('.word-figure.selected').forEach(fig=>fig.classList.remove('selected'));
  root.querySelectorAll('[contenteditable]').forEach(el=>el.setAttribute('contenteditable','false'));
  return root.innerHTML.trim();
}
let livePreviewTimer=null;
function updateLivePdfPreview(){
  const editor=document.getElementById('wordPdfEditor');
  const previewEditor=document.getElementById('liveWordPdfPreviewEditor');
  if(!editor||!previewEditor)return;
  const srcTitle=document.getElementById('layoutPdfTitle');
  const srcMeta=document.getElementById('layoutPdfMeta');
  const dstTitle=document.getElementById('livePdfTitle');
  const dstMeta=document.getElementById('livePdfMeta');
  if(srcTitle&&dstTitle)dstTitle.innerHTML=srcTitle.innerHTML;
  if(srcMeta&&dstMeta)dstMeta.innerHTML=srcMeta.innerHTML;
  previewEditor.innerHTML=cleanWordEditorForPreview(editor.innerHTML);
}
function scheduleLivePdfPreviewUpdate(){
  clearTimeout(livePreviewTimer);
  livePreviewTimer=setTimeout(updateLivePdfPreview,120);
}
function bindLivePdfPreviewSync(submissionId){
  ['wordPdfEditor','layoutPdfTitle','layoutPdfMeta'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('input',scheduleLivePdfPreviewUpdate);
  });
  updateLivePdfPreview();
}
function openPdfBlobInPreviewWindow(win,blob,filename){
  const url=URL.createObjectURL(blob);
  if(win && !win.closed){
    win.location.href=url;
  }else{
    const a=document.createElement('a');
    a.href=url;a.target='_blank';a.rel='noopener';a.textContent='Open PDF preview';
    a.download=filename||'AIBioTrXiv-preview.pdf';
    document.body.appendChild(a);a.click();a.remove();
  }
  setTimeout(()=>URL.revokeObjectURL(url),120000);
}
function rememberCanonicalPdfPreview(id,meta){
  if(!id||!meta||!meta.pdfKey)return;
  window.AIBIO_CANONICAL_PDF_PREVIEWS=window.AIBIO_CANONICAL_PDF_PREVIEWS||{};
  window.AIBIO_CANONICAL_PDF_PREVIEWS[id]={...meta,storedAt:new Date().toISOString()};
  const rows=acceptedList();
  const next=rows.map(r=>String(r.id||'')===String(id)?{...r,canonicalPreviewPdfR2Key:meta.pdfKey,canonicalPreviewHtmlR2Key:meta.htmlKey||'',canonicalPreviewPdfSha256:meta.pdfSha256||'',canonicalPreviewHtmlSha256:meta.htmlSha256||'',canonicalPreviewStoredAt:new Date().toISOString()}:r);
  safeSetLocal('aibio_accepted',next);
}
function applyRememberedCanonicalPdfPreview(record){
  const id=String(record?.sourceSubmissionId||record?.id||'');
  const cached=(window.AIBIO_CANONICAL_PDF_PREVIEWS||{})[id];
  if(cached&&cached.pdfKey){
    return {...record,canonicalPreviewPdfR2Key:cached.pdfKey,canonicalPreviewHtmlR2Key:cached.htmlKey||record.canonicalPreviewHtmlR2Key,canonicalPreviewPdfSha256:cached.pdfSha256||record.canonicalPreviewPdfSha256,canonicalPreviewHtmlSha256:cached.htmlSha256||record.canonicalPreviewHtmlSha256};
  }
  return record;
}
function isCanonicalVersionLabel(v){return /^v\d+$/i.test(String(v||''));}
function plannedNewArticleId(){
  const currentPublished=publishedList();
  return 'AIBioTrXiv-'+new Date().getFullYear()+'-'+String(currentPublished.filter(p=>!p.versionGroupId && !p.articleId).length+(window.AIBIO.manuscripts||[]).length+1).padStart(4,'0');
}
function ensureAcceptedCanonicalPublicationIdentity(id,record){
  if(!record)return record;
  const isRevision=!!record.versionGroupId;
  const articleId=isRevision?(record.versionGroupId||record.articleId||record.siteId):(record.articleId||record.siteId||record.versionGroupId||plannedNewArticleId());
  const version=isRevision?(isCanonicalVersionLabel(record.version)?record.version:'v1'):(isCanonicalVersionLabel(record.version)?record.version:'v1');
  const updated={...record,articleId,versionGroupId:articleId,siteId:articleId,version};
  const rows=acceptedList();
  if(rows.some(r=>String(r.id||'')===String(id))){
    safeSetLocal('aibio_accepted',rows.map(r=>String(r.id||'')===String(id)?{...r,articleId,versionGroupId:articleId,siteId:articleId,version}:r));
  }
  return updated;
}
async function generateCloudflarePdfPreview(record,{acceptedId='',sourceSubmissionId=''}={}){
  const articleId=String(record.siteId||record.articleId||record.versionGroupId||record.id||'AIBioTrXiv').replace(/[^A-Za-z0-9_-]+/g,'-');
  const version=String(record.version||'preview').replace(/[^A-Za-z0-9_-]+/g,'-');
  const filename=(typeof makePdfFilename==='function'?makePdfFilename(record):`${articleId}-${version}.pdf`);
  const htmlFragment=renderWordProcessorDocument(record,'preview',{prefix:'serverPreview',editorId:'serverPreviewWordPdfEditor',titleId:'serverPreviewPdfTitle',metaId:'serverPreviewPdfMeta',docClass:'server-preview-pdf-document'});
  const res=await fetch('/api/publish-pdf',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({previewOnly:true,mode:'preview',storeCanonicalPreview:true,record,articleId,version,filename,htmlFragment,sourceSubmissionId:sourceSubmissionId||record.sourceSubmissionId||record.id||'',acceptedId:acceptedId||record.sourceSubmissionId||record.id||''})});
  if(!res.ok){
    const text=await res.text().catch(()=>res.statusText);
    let detail=text;
    try{const data=JSON.parse(text);detail=data.detail||data.error||text;}catch(_){ }
    throw new Error(detail||'PDF preview generation failed.');
  }
  const meta={
    pdfKey:res.headers.get('x-aibiotrxiv-preview-pdf-key')||'',
    htmlKey:res.headers.get('x-aibiotrxiv-preview-html-key')||'',
    pdfSha256:res.headers.get('x-aibiotrxiv-preview-pdf-sha256')||'',
    htmlSha256:res.headers.get('x-aibiotrxiv-preview-html-sha256')||''
  };
  return {blob:await res.blob(),filename,meta};
}
async function printLivePdfPreview(){
  const id=getCurrentId();
  const previewWindow=window.open('','_blank');
  if(previewWindow){previewWindow.document.write('<!doctype html><title>AIBioTrXiv PDF preview</title><p style="font-family:Arial,sans-serif;padding:24px">Generating canonical PDF preview with Cloudflare Browser Rendering...</p>');}
  try{
    const saved=await persistWordLayoutEditsAndWait(id,{silent:true});
    if(!saved) throw new Error('The current PDF layout could not be saved before preview.');
    document.querySelectorAll('#wordPdfEditor .word-figure.selected').forEach(fig=>fig.classList.remove('selected'));
    let record=currentWordLayoutRecordForPublish(id);
    record=ensureAcceptedCanonicalPublicationIdentity(id,record);
    const out=await generateCloudflarePdfPreview(record,{acceptedId:id,sourceSubmissionId:id});
    if(out.meta&&out.meta.pdfKey)rememberCanonicalPdfPreview(id,out.meta);
    openPdfBlobInPreviewWindow(previewWindow,out.blob,out.filename);
  }catch(err){
    console.error(err);
    const msg='PDF preview could not be generated on the backend. This preview now uses Cloudflare Browser Rendering so that preview and publish PDFs stay consistent.\n\nError detail: '+((err&&err.message)||err);
    if(previewWindow && !previewWindow.closed){previewWindow.document.body.innerHTML='<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;padding:24px;color:#991b1b"></pre>';previewWindow.document.querySelector('pre').textContent=msg;}
    alert(msg);
  }
}
function renderPdfDocument(s){
  return renderWordProcessorDocument(s,'layout');
}
function renderLayout(){
  const el=document.getElementById('layoutWorkspace');if(!el)return;
  const s=findAcceptedOrSubmission(getCurrentId());
  el.classList.add('word-layout-workspace','live-pdf-workspace','single-editor-workspace');
  el.innerHTML=`<div class="single-layout-editor"><section class="layout-editor-pane"><div class="panel-label no-print">Editing workspace</div><div class="layout-top-actions no-print"><button class="btn btn-ghost" onclick="persistWordLayoutEdits('${s.id}',{silent:true});printLivePdfPreview()">PDF preview</button></div><div id="blogEditorToolbar">${blogEditorToolbarHtml(s.id)}</div>${renderWordProcessorDocument(s,'layout',{prefix:'layout',editorId:'wordPdfEditor',docClass:'editor-document blog-edit-document'})}</section></div><aside class="admin-card layout-tool single-layout-tool"><h3>PDF layout tools</h3><p class="muted">Edit the manuscript in the centered workspace. Use PDF preview above the editor to generate the canonical backend PDF with Cloudflare Browser Rendering. The same engine is used for publishing.</p><div class="hero-actions" style="margin-top:18px"><button class="btn btn-cyan" onclick="persistWordLayoutEdits('${s.id}')">Save layout edits</button><button class="btn btn-cyan" onclick="publishAccepted('${s.id}')">Publish</button></div></aside>`;
  addWordFigureControls(document,s.id);
  bindLivePdfPreviewSync(s.id);
  bindBlogEditorToolbar(s.id);
}
function renderPreview(){
  const el=document.getElementById('pdfPreview');if(!el)return;
  const s=findAcceptedOrSubmission(getCurrentId());
  el.innerHTML=`<div class="hero-actions no-print" style="margin-bottom:20px"><button class="btn btn-primary" onclick="printLivePdfPreview()">PDF preview</button><button class="btn btn-cyan" onclick="publishAccepted('${s.id}')">Publish</button><a class="btn btn-ghost" href="/admin/accepted/layout.html?id=${encodeURIComponent(s.id)}">Back to layout</a></div>${renderWordProcessorDocument(s,'preview',{prefix:'standalonePreview',editorId:'standalonePreviewWordPdfEditor',titleId:'standalonePreviewPdfTitle',metaId:'standalonePreviewPdfMeta'})}`;
}
