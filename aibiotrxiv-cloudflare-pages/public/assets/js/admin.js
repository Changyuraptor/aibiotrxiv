function safeLocal(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(e){return fallback;}}
function safeSetLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(err){console.error(err);alert('Browser local storage is full. In production, text should be stored in Cloudflare D1 and figures/PDF files in R2. For local testing, delete old test records or use smaller figures.');return false;}}
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
function acceptedList(){return safeLocal('aibio_accepted',[]).map(normalizeSubmission);}
function setAccepted(list){return safeSetLocal('aibio_accepted',list);}
function publishedList(){return safeLocal('aibio_published',[]).map(normalizeSubmission);}
function setPublished(list){return safeSetLocal('aibio_published',list);}
function unpublishedList(){return safeLocal('aibio_unpublished',[]).map(normalizeSubmission);}
function setUnpublished(list){return safeSetLocal('aibio_unpublished',list);}
function trashList(){return safeLocal('aibio_trash',[]).map(x=>({...normalizeSubmission(x),deletedFrom:x.deletedFrom||x.status||'unknown',deletedAt:x.deletedAt||''}));}
function setTrash(list){return safeSetLocal('aibio_trash',list);}
function auditAdminAction(eventType,targetType,targetId,data={}){const rows=safeLocal('aibio_security_audit_events',[]);rows.push({id:'AUD-'+Date.now()+'-'+Math.random().toString(16).slice(2),eventType,targetType,targetId,data,createdAt:new Date().toISOString()});safeSetLocal('aibio_security_audit_events',rows.slice(-2000));}
function markPurgeRequested(record,reason){return {...record,purgeRequested:true,purgeRequestedAt:new Date().toISOString(),purgeReason:reason||'Admin requested permanent purge. Pending external backup review.'};}
function allSubmissions(){return [defaultSubmission(),...userSubmissions()];}
function getSubmissionById(id){return allSubmissions().find(s=>s.id===id)||acceptedList().find(s=>s.id===id)||publishedList().find(s=>(s.sourceSubmissionId||s.id)===id||s.siteId===id)||unpublishedList().find(s=>(s.sourceSubmissionId||s.id)===id||s.siteId===id)||defaultSubmission();}
function getCurrentId(){return new URLSearchParams(location.search).get('id')||'SUB-2026-DEMO';}
function getSubmission(){return getSubmissionById(getCurrentId());}
function publicSlug(siteId){return String(siteId).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function updateSubmissionRecord(updated){updated=normalizeSubmission(updated);if(updated.id==='SUB-2026-DEMO'){localStorage.setItem('aibio_demo_submission',JSON.stringify(updated));return updated;}const list=userSubmissions();const idx=list.findIndex(x=>x.id===updated.id);if(idx>=0)list[idx]=updated;else list.push(updated);setUserSubmissions(list);return updated;}
function removeUserSubmission(id){if(id==='SUB-2026-DEMO')return;setUserSubmissions(userSubmissions().filter(s=>s.id!==id));}
function moveToTrash(record,deletedFrom){if(!record||record.id==='SUB-2026-DEMO'){alert('The demo record cannot be deleted.');return false;}const key=record.siteId||record.id;const next=trashList().filter(x=>(x.siteId||x.id)!==key);next.push({...record,deletedFrom,deletedAt:new Date().toISOString().slice(0,10),deletedAtFull:new Date().toISOString(),status:'deleted'});auditAdminAction('soft_delete','paper',key,{deletedFrom});return setTrash(next);}
function tinyDelete(label,handler){return `<button class="btn btn-danger btn-delete" onclick="${handler}">${label||'Delete'}</button>`;}
function submissionRow(s,kind='queue'){
  const review=`<a class="btn btn-ghost" href="/admin/submissions/detail.html?id=${encodeURIComponent(s.id)}">Review</a>`;
  const del=s.id==='SUB-2026-DEMO'?'':tinyDelete('Delete',`deleteSubmissionRecord('${s.id}')`);
  const recover=kind==='rejected'&&s.id!=='SUB-2026-DEMO'?` <button class="btn btn-ghost" onclick="recoverRejected('${s.id}')">Recover</button>`:'';
  return `<tr><td>${s.id}</td><td><strong>${escapeHtml(s.title)}</strong><br><span class="muted">${escapeHtml(authorNames(s))}</span></td><td>${escapeHtml(s.topic||'')}</td><td>${(s.paymentStatus==='paid'||s.paymentStatus==='waived')?'<span class="member-status-pill paid">Paid US$5</span>':'<span class="member-status-pill unpaid">Unpaid</span>'}</td><td><span class="status ${s.status}">${s.status}</span></td><td>${review}${del}${recover}</td></tr>`;
}
function renderAdminSubmissions(){const el=document.getElementById('adminSubmissions');if(!el)return;const rows=allSubmissions();const queue=rows.filter(s=>(s.paymentStatus==='paid'||s.paymentStatus==='waived') && !['accepted','published','unpublished','rejected','deleted'].includes(s.status));const rejected=rows.filter(s=>s.status==='rejected');const table=(items,kind)=>`<table class="admin-table"><thead><tr><th>ID</th><th>Title</th><th>Topic</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>${items.map(s=>submissionRow(s,kind)).join('')}</tbody></table>`;el.innerHTML=`<h2>Review queue</h2>${queue.length?table(queue,'queue'):'<p class="muted">No submitted manuscripts are waiting for review.</p>'}<h2 style="margin-top:34px">Rejected manuscripts</h2>${rejected.length?table(rejected,'rejected'):'<p class="muted">No rejected manuscripts.</p>'}`;}
function deleteSubmissionRecord(id){const s=getSubmissionById(id);if(confirm('Move this submission to the paper trash?')){if(moveToTrash(s,s.status==='rejected'?'rejected':'submitted')){removeUserSubmission(id);location.reload();}}}
function recoverRejected(id){const s=getSubmissionById(id);updateSubmissionRecord({...s,status:'submitted'});location.reload();}
function adminAuthorRow(a={name:'',email:''}){return `<div class="author-row"><input class="admin-author-name" placeholder="Author name" value="${escapeHtml(a.name||'')}"><input class="admin-author-email" type="email" placeholder="email@example.org" value="${escapeHtml(a.email||'')}"><button type="button" class="author-remove" aria-label="Remove author">×</button></div>`;}
function renderAdminAuthorSheet(s){const rows=normalizeSubmission(s).authorList;const init=rows.length?rows:[{name:'',email:''}];return `<label>Author names and emails</label><div id="adminAuthorSheet" class="author-sheet"><div class="author-row author-row-head"><strong>Author name</strong><strong>Email</strong><span></span></div>${init.map(adminAuthorRow).join('')}</div><button type="button" class="btn btn-ghost" id="addAdminAuthor" style="margin-top:10px">Add author</button>`;}
function bindAdminAuthorSheet(){const sheet=document.getElementById('adminAuthorSheet');if(!sheet)return;const bindRemove=()=>sheet.querySelectorAll('.author-remove').forEach(btn=>btn.onclick=()=>{if(sheet.querySelectorAll('.author-row:not(.author-row-head)').length>1)btn.closest('.author-row').remove();});bindRemove();document.getElementById('addAdminAuthor')?.addEventListener('click',()=>{sheet.insertAdjacentHTML('beforeend',adminAuthorRow());bindRemove();});}
function collectAdminAuthors(){return [...document.querySelectorAll('#adminAuthorSheet .author-row:not(.author-row-head)')].map(row=>({name:row.querySelector('.admin-author-name')?.value.trim()||'',email:row.querySelector('.admin-author-email')?.value.trim()||''})).filter(a=>a.name||a.email);}
function renderEditableSection(sec,i){const heading=escapeHtml(sec.heading||'Section');const html=sanitizeRich(sec.text||'');const legend=sec.legend||'';return `<article class="review-section editable-review" data-index="${i}"><div class="review-display"><h3>${heading}</h3><div class="rich-display-text">${html||'<span class="muted">No text entered.</span>'}</div><button class="btn btn-ghost edit-review-section" type="button">Edit</button></div><div class="review-figure-display">${sec.image?`<div class="image-preview"><img src="${sec.image}" alt="Figure"></div>`:'<div class="image-preview">No figure</div>'}<p class="muted" style="white-space:pre-wrap">${escapeHtml(legend)}</p></div><div class="review-editor" hidden><div><h3>${heading}</h3><label>Text</label>${makeToolbar()}<div class="review-rich-text" contenteditable="true">${html}</div><label>Legend</label><textarea class="review-legend">${escapeHtml(legend)}</textarea><button class="btn btn-cyan save-review-section" type="button">OK</button></div><div>${sec.image?`<div class="image-preview"><img src="${sec.image}" alt="Figure"></div>`:'<div class="image-preview">No figure</div>'}<p class="muted">Image replacement will be connected to R2 in the production backend.</p></div></div></article>`;}
function collectAdminEdits(){const s=getSubmission();const sections=[...document.querySelectorAll('.editable-review')].map((row,i)=>{const old=s.sections[i]||{};const editor=row.querySelector('.review-editor');return {...old,text:sanitizeRich(editor.querySelector('.review-rich-text').innerHTML),plainText:richPlain(editor.querySelector('.review-rich-text').innerHTML),legend:editor.querySelector('.review-legend').value};});const authorList=collectAdminAuthors();const updated={...s,title:document.getElementById('adminTitle')?.value||s.title,abstract:document.getElementById('adminAbstract')?.value||s.abstract,authorList,authors:authorList.map(a=>a.name).filter(Boolean).join(', '),email:authorList[0]?.email||'',affiliation:document.getElementById('adminAffiliation')?.value||s.affiliation,topic:document.getElementById('adminTopic')?.value||s.topic,license:document.getElementById('adminLicense')?.value||s.license,sections};return updateSubmissionRecord(updated);}
function bindReviewEditButtons(){document.querySelectorAll('.editable-review').forEach(row=>{bindRichToolbar(row);const rich=row.querySelector('.review-rich-text');rich?.addEventListener('paste',()=>setTimeout(()=>{rich.innerHTML=sanitizeRich(rich.innerHTML);},0));});document.querySelectorAll('.edit-review-section').forEach(btn=>btn.addEventListener('click',()=>{const row=btn.closest('.editable-review');row.querySelector('.review-display').hidden=true;row.querySelector('.review-figure-display').hidden=true;row.querySelector('.review-editor').hidden=false;}));document.querySelectorAll('.save-review-section').forEach(btn=>btn.addEventListener('click',()=>{const row=btn.closest('.editable-review');const i=Number(row.dataset.index);const s=collectAdminEdits();const sec=s.sections[i];row.querySelector('.review-display .rich-display-text').innerHTML=sanitizeRich(sec.text)||'<span class="muted">No text entered.</span>';row.querySelector('.review-figure-display .muted').textContent=sec.legend||'';row.querySelector('.review-display').hidden=false;row.querySelector('.review-figure-display').hidden=false;row.querySelector('.review-editor').hidden=true;}));}
function renderSubmissionDetail(){const el=document.getElementById('submissionDetail');if(!el)return;const s=getSubmission();el.innerHTML=`<div class="admin-card"><h2>Review submission</h2><div class="form-grid"><div><label>Title</label><input id="adminTitle" value="${escapeHtml(s.title||'')}">${renderAdminAuthorSheet(s)}</div><div><label>Affiliation</label><input id="adminAffiliation" value="${escapeHtml(s.affiliation||'')}"><label>Topic</label><select id="adminTopic">${window.AIBIO.researchAreas.map(a=>`<option value="${a.name}" ${a.name===s.topic?'selected':''}>${a.name}</option>`).join('')}</select><label>License</label><input id="adminLicense" value="${escapeHtml(s.license||'')}"></div></div><label>Abstract</label><textarea id="adminAbstract">${escapeHtml(s.abstract||'')}</textarea><button class="btn btn-cyan" type="button" onclick="collectAdminEdits();alert('Edits saved.')">Save metadata edits</button></div><div class="section-builder">${(s.sections||[]).map(renderEditableSection).join('')}</div><div class="admin-card" style="margin-top:20px"><label>Editorial note</label><textarea id="editorNote" placeholder="Internal note or rejection reason."></textarea><div class="hero-actions"><button class="btn btn-cyan" onclick="markSubmission('accepted')">Accept</button><button class="btn btn-danger" onclick="markSubmission('rejected')">Reject</button><a class="btn btn-ghost" href="/admin/submissions/">Back</a></div></div>`;bindAdminAuthorSheet();bindReviewEditButtons();}
function markSubmission(status){const s={...collectAdminEdits(),status};if(status==='accepted'){if(s.id!=='SUB-2026-DEMO')removeUserSubmission(s.id);else localStorage.setItem('aibio_demo_submission',JSON.stringify(s));const accepted=acceptedList().filter(x=>x.id!==s.id);accepted.push({...s,status:'accepted'});setAccepted(accepted);location.href='/admin/accepted/';return;}updateSubmissionRecord(s);alert('Submission marked as '+status);location.href='/admin/submissions/';}
function renderAccepted(){const el=document.getElementById('acceptedList');if(!el)return;const publishedIds=new Set(publishedList().map(p=>p.sourceSubmissionId||p.id));const rows=acceptedList().filter(s=>!publishedIds.has(s.id));const demoRows=rows.length?rows:(publishedIds.has('SUB-2026-DEMO')?[]:[{...defaultSubmission(),status:'accepted'}]);el.innerHTML=demoRows.length?`<table class="admin-table"><thead><tr><th>Submission</th><th>Topic</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>${demoRows.map(s=>`<tr><td><strong>${escapeHtml(s.title)}</strong><br>${s.id}</td><td>${escapeHtml(s.topic)}</td><td><span class="status accepted">accepted</span></td><td><a class="btn btn-cyan" href="/admin/accepted/layout.html?id=${encodeURIComponent(s.id)}">Open PDF layout</a> ${tinyDelete('Delete',`deleteAccepted('${s.id}')`)} <button class="btn btn-ghost" onclick="recoverAccepted('${s.id}')">Recover</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No accepted manuscripts are waiting for layout.</p>';}
function deleteAccepted(id){const s=acceptedList().find(x=>x.id===id);if(!s){alert('Accepted manuscript not found. No record was deleted.');return;}if(confirm('Move this accepted manuscript to the paper trash?')){if(moveToTrash(s,'accepted')){setAccepted(acceptedList().filter(x=>x.id!==id));location.reload();}}}
function recoverAccepted(id){const s=acceptedList().find(x=>x.id===id);if(!s){alert('Accepted manuscript not found. No record was recovered.');return;}if(setUserSubmissions([...userSubmissions().filter(x=>x.id!==id),{...s,status:'submitted'}])){setAccepted(acceptedList().filter(x=>x.id!==id));location.href='/admin/submissions/';}}
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
  el.innerHTML=`<div class="hero-actions no-print" style="margin-bottom:20px"><button class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button><button class="btn btn-cyan" onclick="publishAccepted('${s.id}')">Publish</button><a class="btn btn-ghost" href="/admin/accepted/layout.html?id=${encodeURIComponent(s.id)}">Back to layout</a></div>${renderPdfDocument(s)}`;
}
function versionNumber(v){const m=String(v||'v1').match(/(\d+)/);return m?Number(m[1]):1;}
function publishAccepted(id){
  const s=findAcceptedOrSubmission(id);
  const currentPublished=publishedList();
  const today=new Date().toISOString().slice(0,10);
  const isRevision=!!s.versionGroupId;
  const articleId=isRevision?s.versionGroupId:(s.articleId||s.siteId||('AIBioTrXiv-'+new Date().getFullYear()+'-'+String(currentPublished.filter(p=>!p.versionGroupId && !p.articleId).length+(window.AIBIO.manuscripts||[]).length+1).padStart(4,'0')));
  const related=currentPublished.filter(p=>(p.articleId||p.versionGroupId||p.siteId||p.id)===articleId);
  const nextVersion=isRevision?(s.version||('v'+(Math.max(1,...related.map(p=>versionNumber(p.version)))+1))):(s.version||'v1');
  const record={...s,status:'published',sourceSubmissionId:s.id,articleId,versionGroupId:articleId,siteId:articleId,publishedAt:today,date:today,version:nextVersion,slug:publicSlug(articleId),pdf:s.pdf||'#',versionNote:s.versionNote||'',versionPublishedAt:today};
  if(s.id!=='SUB-2026-DEMO')setAccepted(acceptedList().filter(x=>x.id!==s.id));
  const next=currentPublished.filter(x=>x.id!==s.id && x.sourceSubmissionId!==s.id);
  next.push(record);
  if(setPublished(next))location.href='/admin/published/';
}
function renderPublished(){const el=document.getElementById('publishedList');if(!el)return;const rows=publishedList().filter(p=>(p.status||'published')==='published');el.innerHTML=rows.length?`<table class="admin-table"><thead><tr><th>Paper</th><th>Published</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${escapeHtml(p.title)}</strong><br>${p.siteId||p.id}<br><a class="small-link" href="/manuscripts/?id=${encodeURIComponent(p.siteId||p.id)}">Open public HTML page →</a></td><td>${p.publishedAt||p.date}</td><td><span class="status">published</span></td><td><button class="btn btn-danger" onclick="unpublish('${p.siteId||p.id}')">Unpublish</button> ${tinyDelete('Delete',`deletePublished('${p.siteId||p.id}')`)} <button class="btn btn-ghost" onclick="recoverPublished('${p.siteId||p.id}')">Recover</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No locally published manuscripts yet.</p>';}
function deletePublished(id){const rows=publishedList();const p=rows.find(x=>(x.siteId||x.id)===id);if(!p)return;if(confirm('Move this published manuscript to the paper trash?')){if(moveToTrash(p,'published')){setPublished(rows.filter(x=>(x.siteId||x.id)!==id));location.reload();}}}
function recoverPublished(id){const rows=publishedList();const p=rows.find(x=>(x.siteId||x.id)===id);if(!p)return;setPublished(rows.filter(x=>(x.siteId||x.id)!==id));const s={...p,status:'accepted',id:p.sourceSubmissionId||p.id};delete s.siteId;delete s.publishedAt;setAccepted([...acceptedList().filter(x=>x.id!==s.id),s]);location.href='/admin/accepted/';}
function unpublish(id){const published=publishedList();const idx=published.findIndex(p=>(p.siteId||p.id)===id);if(idx<0)return;const [paper]=published.splice(idx,1);paper.status='unpublished';paper.unpublishedAt=new Date().toISOString().slice(0,10);const unpub=unpublishedList().filter(p=>(p.siteId||p.id)!==id);unpub.push(paper);setUnpublished(unpub);setPublished(published);location.href='/admin/unpublished/';}
function renderUnpublished(){const el=document.getElementById('unpublishedList');if(!el)return;const rows=unpublishedList();el.innerHTML=rows.length?`<table class="admin-table"><thead><tr><th>Paper</th><th>Unpublished</th><th>Action</th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${escapeHtml(p.title)}</strong><br>${p.siteId||p.id}</td><td>${p.unpublishedAt||''}</td><td>${tinyDelete('Delete',`deleteUnpublished('${p.siteId||p.id}')`)} <button class="btn btn-ghost" onclick="recoverUnpublished('${p.siteId||p.id}')">Recover</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No unpublished manuscripts.</p>';}
function deleteUnpublished(id){const rows=unpublishedList();const p=rows.find(x=>(x.siteId||x.id)===id);if(!p)return;if(confirm('Move this unpublished manuscript to the paper trash?')){if(moveToTrash(p,'unpublished')){setUnpublished(rows.filter(x=>(x.siteId||x.id)!==id));location.reload();}}}
function recoverUnpublished(id){const rows=unpublishedList();const p=rows.find(x=>(x.siteId||x.id)===id);if(!p)return;setUnpublished(rows.filter(x=>(x.siteId||x.id)!==id));p.status='published';delete p.unpublishedAt;setPublished([...publishedList().filter(x=>(x.siteId||x.id)!==id),p]);location.href='/admin/published/';}
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
// Backward-compatible names used by older buttons.
function suspendMember(email){suspendMemberAccount(email)}
function restoreMember(email){restoreMemberAccount(email)}
function bindMembersAdmin(){const input=document.getElementById('memberSearch');if(input){input.addEventListener('input',renderMembersAdmin);renderMembersAdmin();}}

document.addEventListener('DOMContentLoaded',()=>{renderAdminSubmissions();renderSubmissionDetail();renderAccepted();renderLayout();renderPreview();renderPublished();renderUnpublished();renderTrash();bindMembersAdmin();});

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
function printLivePdfPreview(){
  const id=getCurrentId();
  persistWordLayoutEdits(id,{silent:true});
  updateLivePdfPreview();
  document.body.classList.add('print-live-preview-only');
  setTimeout(()=>{
    window.print();
    setTimeout(()=>document.body.classList.remove('print-live-preview-only'),500);
  },80);
}
function renderPdfDocument(s){
  return renderWordProcessorDocument(s,'layout');
}
function renderLayout(){
  const el=document.getElementById('layoutWorkspace');if(!el)return;
  const s=findAcceptedOrSubmission(getCurrentId());
  el.classList.add('word-layout-workspace','live-pdf-workspace');
  el.innerHTML=`<div class="live-layout-grid"><section class="layout-editor-pane"><div class="panel-label no-print">Editing workspace</div><div id="blogEditorToolbar">${blogEditorToolbarHtml(s.id)}</div>${renderWordProcessorDocument(s,'layout',{prefix:'layout',editorId:'wordPdfEditor',docClass:'editor-document blog-edit-document'})}</section><section class="layout-preview-pane"><div class="panel-label no-print">Live PDF preview / Print / Save as PDF</div><div class="hero-actions no-print live-preview-actions"><button class="btn btn-primary" onclick="printLivePdfPreview()">Print / Save as PDF</button><a class="btn btn-ghost" onclick="persistWordLayoutEdits('${s.id}',{silent:true})" href="/admin/accepted/preview.html?id=${encodeURIComponent(s.id)}">Open full preview</a></div><div id="livePdfPreview" class="pdf-live-preview-shell">${renderWordProcessorDocument(s,'preview',{prefix:'live',editorId:'liveWordPdfPreviewEditor',titleId:'livePdfTitle',metaId:'livePdfMeta',docClass:'live-preview-document'})}</div></section></div><aside class="admin-card layout-tool"><h3>PDF layout tools</h3><p class="muted">The accepted manuscript is displayed as one continuous blog-style article editor. Use the toolbar above the editor for basic text formatting. Click a figure, then use the figure tools in the toolbar to resize or move that individual figure.</p><div class="hero-actions" style="margin-top:18px"><button class="btn btn-cyan" onclick="persistWordLayoutEdits('${s.id}')">Save layout edits</button><a class="btn btn-ghost" onclick="persistWordLayoutEdits('${s.id}',{silent:true})" href="/admin/accepted/preview.html?id=${encodeURIComponent(s.id)}">Preview PDF</a><button class="btn btn-cyan" onclick="persistWordLayoutEdits('${s.id}',{silent:true});publishAccepted('${s.id}')">Publish</button></div></aside>`;
  addWordFigureControls(document,s.id);
  bindLivePdfPreviewSync(s.id);
  bindBlogEditorToolbar(s.id);
}
function renderPreview(){
  const el=document.getElementById('pdfPreview');if(!el)return;
  const s=findAcceptedOrSubmission(getCurrentId());
  el.innerHTML=`<div class="hero-actions no-print" style="margin-bottom:20px"><button class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button><button class="btn btn-cyan" onclick="publishAccepted('${s.id}')">Publish</button><a class="btn btn-ghost" href="/admin/accepted/layout.html?id=${encodeURIComponent(s.id)}">Back to layout</a></div>${renderWordProcessorDocument(s,'preview',{prefix:'standalonePreview',editorId:'standalonePreviewWordPdfEditor',titleId:'standalonePreviewPdfTitle',metaId:'standalonePreviewPdfMeta'})}`;
}
