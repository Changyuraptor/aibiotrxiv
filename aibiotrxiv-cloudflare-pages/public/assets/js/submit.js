
function currentMember(){return (window.AIBIO&&window.AIBIO.memberCurrent)?window.AIBIO.memberCurrent():null;}
function memberPapers(){return JSON.parse(localStorage.getItem('aibio_member_papers')||'[]');}
function setMemberPapers(list){try{localStorage.setItem('aibio_member_papers',JSON.stringify(list));return true;}catch(e){console.error(e);alert('Browser local storage is full. In production this will be stored in Cloudflare D1/R2.');return false;}}
function upsertMemberPaper(p){const list=memberPapers();const idx=list.findIndex(x=>x.id===p.id);if(idx>=0)list[idx]=p;else list.push(p);return setMemberPapers(list);}
function findDraft(id){return memberPapers().find(p=>p.id===id)||null;}

function areaOptions(){return window.AIBIO.researchAreas.map(a=>`<option value="${a.name}">${a.name}</option>`).join('');}
let resultCount=0;
function escapeHtml(str=''){return String(str).replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));}
function sanitizeRich(html=''){
  const template=document.createElement('template');
  template.innerHTML=html;
  const allowed=new Set(['B','STRONG','I','EM','SUP','SUB','BR','P','DIV','SPAN','UL','OL','LI']);
  const walk=node=>{
    [...node.childNodes].forEach(child=>{
      if(child.nodeType===Node.ELEMENT_NODE){
        if(!allowed.has(child.tagName)){
          const frag=document.createDocumentFragment();
          while(child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag);
          walk(node);
        }else{
          [...child.attributes].forEach(a=>child.removeAttribute(a.name));
          walk(child);
        }
      }
    });
  };
  walk(template.content);
  return template.innerHTML.trim();
}
function richToPlain(html=''){
  const div=document.createElement('div');
  div.innerHTML=html;
  return div.textContent.trim();
}
function richTextToDisplay(html=''){
  const clean=sanitizeRich(html);
  return clean || '<span class="muted">No text entered.</span>';
}
function makeToolbar(){return `<div class="rich-toolbar"><button type="button" data-command="bold"><strong>B</strong></button><button type="button" data-command="italic"><em>I</em></button></div>`;}
function bindToolbar(editor){
  editor.querySelectorAll('.rich-toolbar button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const target=editor.querySelector('.section-rich-text');
      target.focus();
      document.execCommand(btn.dataset.command,false,null);
    });
  });
}
function makeEditor({id, heading, allowFigure=false, html='', legend='', image=''}){
  const div=document.createElement('article');
  div.className='paper-section-editor';
  div.dataset.section=id;
  div.dataset.heading=heading;
  div.dataset.allowFigure=allowFigure ? 'true' : 'false';
  div.dataset.saved='false';
  div.classList.add('editing');
  div.dataset.image=image || '';
  div.innerHTML=`
    <div class="section-input-pane">
      <div class="section-label">${heading}</div>
      <label>Text</label>
      ${makeToolbar()}
      <div class="section-rich-text" contenteditable="true" data-placeholder="Paste or write the ${heading} text here.">${sanitizeRich(html)}</div>
      <button type="button" class="btn btn-ghost section-ok">OK</button>
    </div>
    <div class="section-figure-pane ${allowFigure ? '' : 'hidden-pane'}">
      <label>Figure image <span class="muted">JPG or PNG only</span></label>
      <input class="section-image" type="file" accept="image/jpeg,image/png">
      <div class="image-preview">${image ? `<img src="${image}" alt="Uploaded figure preview">` : 'No image uploaded'}</div>
      <label>Legend</label>
      <textarea class="section-legend" placeholder="Figure legend for this section.">${escapeHtml(legend)}</textarea>
    </div>
    <div class="section-display" hidden>
      <div class="section-display-text"></div>
      <div class="section-display-figure"></div>
    </div>`;
  div.querySelector('.section-ok').addEventListener('click',()=>saveSection(div));
  bindToolbar(div);
  const rich=div.querySelector('.section-rich-text');
  rich.addEventListener('paste',()=>setTimeout(()=>{rich.innerHTML=sanitizeRich(rich.innerHTML);},0));
  const imgInput=div.querySelector('.section-image');
  if(imgInput) imgInput.addEventListener('change',()=>previewImage(imgInput));
  return div;
}
function addAuthorRow(name='',email=''){
  const sheet=document.getElementById('authorSheet');
  if(!sheet) return;
  const row=document.createElement('div');
  row.className='author-row';
  row.innerHTML=`<input class="author-name" placeholder="Author name" value="${escapeHtml(name)}"><input class="author-email" type="email" placeholder="email@example.org" value="${escapeHtml(email)}"><button type="button" class="author-remove" aria-label="Remove author">×</button>`;
  row.querySelector('.author-remove').addEventListener('click',()=>{if(document.querySelectorAll('.author-row:not(.author-row-head)').length>1) row.remove();});
  sheet.appendChild(row);
}
function collectAuthors(){
  const rows=[...document.querySelectorAll('.author-row:not(.author-row-head)')].map(row=>({name:row.querySelector('.author-name')?.value.trim()||'',email:row.querySelector('.author-email')?.value.trim()||''})).filter(a=>a.name||a.email);
  return rows;
}
function addResultsSection(scroll=true){
  resultCount++;
  const wrap=document.getElementById('resultsSections');
  const div=makeEditor({id:'results-'+resultCount,heading:'Results',allowFigure:true});
  wrap.appendChild(div);
  if(scroll) div.scrollIntoView({behavior:'smooth',block:'center'});
}
function compressImageFile(file, maxWidth=1200, quality=0.72){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Could not read image file.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('Could not load image file.'));
      img.onload=()=>{
        const scale=Math.min(1, maxWidth/img.width);
        const canvas=document.createElement('canvas');
        canvas.width=Math.round(img.width*scale);
        canvas.height=Math.round(img.height*scale);
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const type=file.type==='image/png' && file.size < 600000 ? 'image/png' : 'image/jpeg';
        const dataUrl=canvas.toDataURL(type, type==='image/jpeg' ? quality : undefined);
        resolve(dataUrl);
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function previewImage(input){
  const file=input.files[0];const editor=input.closest('.paper-section-editor');const box=editor.querySelector('.image-preview');
  if(!file){box.textContent='No image uploaded';editor.dataset.image='';return;}
  if(!['image/jpeg','image/png'].includes(file.type)){alert('Only JPG and PNG files are allowed.');input.value='';return;}
  box.textContent='Processing image...';
  try{
    const dataUrl=await compressImageFile(file);
    editor.dataset.image=dataUrl;
    box.innerHTML=`<img src="${dataUrl}" alt="Uploaded figure preview">`;
  }catch(err){
    console.error(err);
    alert('The image could not be processed. Please choose another JPG or PNG file.');
    input.value='';box.textContent='No image uploaded';editor.dataset.image='';
  }
}
function saveSubmissionToLocalStorage(submission){
  const list=JSON.parse(localStorage.getItem('aibio_submissions')||'[]');
  list.push(submission);
  try{
    localStorage.setItem('aibio_submissions',JSON.stringify(list));
    return true;
  }catch(err){
    if(err && (err.name==='QuotaExceededError' || String(err).includes('quota'))){
      const slim={...submission,sections:submission.sections.map(sec=>({...sec,image:''}))};
      const slimList=list.slice(0,-1).concat(slim);
      try{
        localStorage.setItem('aibio_submissions',JSON.stringify(slimList));
        alert('Your manuscript text was saved, but the browser local preview storage is full, so figure images were not stored. This is a local prototype limitation. In the Cloudflare D1/R2 version, figures should be stored in R2 instead of localStorage.');
        return true;
      }catch(e2){
        alert('The browser local storage is full. Please clear this site data or test with smaller images. The production version should store files in Cloudflare R2.');
        return false;
      }
    }
    throw err;
  }
}
function saveSection(editor){
  const html=sanitizeRich(editor.querySelector('.section-rich-text').innerHTML);
  const legend=editor.querySelector('.section-legend')?.value.trim() || '';
  const image=editor.dataset.image || '';
  const allowFigure=editor.dataset.allowFigure==='true';
  const display=editor.querySelector('.section-display');
  const resultEditors=[...document.querySelectorAll('[data-section^="results-"]')];
  const showHeading=!(String(editor.dataset.heading).toLowerCase()==='results' && resultEditors.indexOf(editor)>0);
  display.querySelector('.section-display-text').innerHTML=`${showHeading?`<h3>${escapeHtml(editor.dataset.heading)}</h3>`:''}<div class="rich-display-text">${richTextToDisplay(html)}</div><button type="button" class="btn btn-ghost section-edit">Edit</button>`;
  display.querySelector('.section-display-figure').innerHTML=allowFigure && image ? `<figure><img src="${image}" alt="Submitted figure"><figcaption>${escapeHtml(legend).replace(/\n/g,'<br>') || 'No legend entered.'}</figcaption></figure>` : (allowFigure ? '<p class="muted">No figure uploaded.</p>' : '');
  editor.querySelector('.section-input-pane').hidden=true;
  const figPane=editor.querySelector('.section-figure-pane'); if(figPane) figPane.hidden=true;
  display.hidden=false;
  editor.dataset.saved='true';
  editor.classList.add('section-saved');
  editor.classList.remove('editing');
  display.querySelector('.section-edit').addEventListener('click',()=>editSection(editor));
}
function editSection(editor){
  editor.querySelector('.section-input-pane').hidden=false;
  const figPane=editor.querySelector('.section-figure-pane'); if(figPane && !figPane.classList.contains('hidden-pane')) figPane.hidden=false;
  editor.querySelector('.section-display').hidden=true;
  editor.dataset.saved='false';
  editor.classList.remove('section-saved');
  editor.classList.add('editing');
}
function sectionData(editor, order){
  const html=sanitizeRich(editor.querySelector('.section-rich-text').innerHTML);
  return {order,heading:editor.dataset.heading,text:html,plainText:richToPlain(html),legend:editor.querySelector('.section-legend')?.value || '',image:editor.dataset.image || ''};
}
function collectSubmission(){
  const editors=[...document.querySelectorAll('.paper-section-editor')];
  const sections=editors.map((el,i)=>sectionData(el,i+1));
  const authorList=collectAuthors();
  const member=currentMember();
  const draftId=new URLSearchParams(location.search).get('draft');
  const previous=draftId?findDraft(draftId):null;
  return{...(previous||{}),title:document.getElementById('title').value.trim(),abstract:document.getElementById('abstract').value.trim(),submissionCategory:document.getElementById('submissionCategory')?.value||'AI Research',topic:document.getElementById('topic').value,type:document.getElementById('manuscriptType').value,authors:authorList.map(a=>a.name).filter(Boolean).join(', '),email:authorList[0]?.email||'',authorList,affiliation:document.getElementById('affiliation').value.trim(),aiUse:document.getElementById('aiUse').value.trim(),license:document.querySelector('input[name="license"]:checked')?.value,sections,createdAt:(previous&&previous.createdAt)||new Date().toISOString(),updatedAt:new Date().toISOString(),status:(previous&&previous.isRevisionDraft)?'revision_draft':'draft',paymentStatus:(previous&&previous.isRevisionDraft)?(previous.paymentStatus||'not_required'):((previous&&previous.paymentStatus&&previous.paymentStatus!=='paid'&&previous.paymentStatus!=='waived')?previous.paymentStatus:'unpaid'),reviewStatus:(previous&&previous.isRevisionDraft)?'revision_draft':'draft',memberEmail:member?.email||'',id:draftId||'SUB-'+Date.now()};
}

function validateSubmission(){
  if(!document.getElementById('title').value.trim()){alert('Please enter a manuscript title.');return false;}
  if(!document.getElementById('abstract').value.trim()){alert('Please enter an abstract.');return false;}
  const authors=collectAuthors();
  if(!authors.length || !authors[0].name || !authors[0].email){alert('Please enter at least one author name and email.');return false;}
  if(!document.getElementById('rightsConfirm').checked){alert('Please confirm the rights and permissions statement.');return false;}
  if(!document.getElementById('creditConfirm')?.checked){alert('Please confirm the creator credit statement.');return false;}
  if(!document.getElementById('timestampConfirm')?.checked){alert('Please confirm the timestamp and record-protection statement.');return false;}
  return true;
}

function loadDraftIntoForm(draft){
  if(!draft) return;
  document.getElementById('title').value=draft.title||'';
  document.getElementById('abstract').value=draft.abstract||'';
  const cat=document.getElementById('submissionCategory'); if(cat)cat.value=draft.submissionCategory||'AI Research';
  document.getElementById('topic').value=draft.topic||document.getElementById('topic').value;
  document.getElementById('manuscriptType').value=draft.type||document.getElementById('manuscriptType').value;
  document.getElementById('affiliation').value=draft.affiliation||'';
  document.getElementById('aiUse').value=draft.aiUse||'';
  const authors=Array.isArray(draft.authorList)?draft.authorList:[];
  const sheet=document.getElementById('authorSheet');
  if(sheet){[...sheet.querySelectorAll('.author-row:not(.author-row-head)')].forEach(r=>r.remove());(authors.length?authors:[{name:'',email:''}]).forEach(a=>addAuthorRow(a.name,a.email));}
  if(draft.license){const radio=document.querySelector(`input[name="license"][value="${draft.license}"]`); if(radio)radio.checked=true;}
  const byHeading={};(draft.sections||[]).forEach(sec=>{const key=String(sec.heading||'').toLowerCase();(byHeading[key]=byHeading[key]||[]).push(sec);});
  function setEditor(containerId,sec){const ed=document.querySelector(`#${containerId} .paper-section-editor`);if(!ed||!sec)return;ed.querySelector('.section-rich-text').innerHTML=sanitizeRich(sec.text||'');const lg=ed.querySelector('.section-legend');if(lg)lg.value=sec.legend||'';ed.dataset.image=sec.image||'';const prev=ed.querySelector('.image-preview');if(prev&&sec.image)prev.innerHTML=`<img src="${sec.image}" alt="Uploaded figure preview">`;}
  setEditor('introductionSection',(byHeading['introduction']||[])[0]);
  setEditor('discussionSection',(byHeading['discussion']||[])[0]);
  setEditor('methodsSection',(byHeading['materials and methods']||[])[0]);
  setEditor('referencesSection',(byHeading['references']||[])[0]);
  const results=(byHeading['results']||[]);const resultBox=document.getElementById('resultsSections');if(resultBox&&results.length){resultBox.innerHTML='';results.forEach((sec,i)=>{const ed=makeEditor({id:'results-'+i,heading:'Results',allowFigure:true,html:sec.text||'',legend:sec.legend||'',image:sec.image||''});resultBox.appendChild(ed);});}
}


function simpleFingerprint(str=''){
  let h=2166136261;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return ('00000000'+(h>>>0).toString(16)).slice(-8);
}
function buildRecordProtection(submission){
  const canonical=JSON.stringify({title:submission.title,abstract:submission.abstract,authors:submission.authorList,topic:submission.topic,category:submission.submissionCategory,sections:(submission.sections||[]).map(s=>({heading:s.heading,text:s.plainText||'',legend:s.legend||''})),license:submission.license});
  return {
    creditRecord:true,
    creatorCreditNotice:'Credit remains with the listed authors. AIBioTrXiv provides a timestamped public record and does not claim ownership of the submitted idea or manuscript.',
    timestampedAt:new Date().toISOString(),
    localFingerprint:simpleFingerprint(canonical),
    storagePlan:'Production: metadata and fingerprints in Cloudflare D1; figures and generated PDFs in Cloudflare R2; payment confirmation linked to PayPal order ID.'
  };
}

function bindSubmit(){
  const topic=document.getElementById('topic');if(topic)topic.innerHTML=areaOptions();
  const form=document.getElementById('submissionForm');if(!form)return;
  const member=currentMember();
  const notice=document.getElementById('submitAuthNotice');
  if(!member){
    if(notice){notice.style.display='block';notice.innerHTML='<h2>Member registration required</h2><p>You must register or log in before drafting and submitting a manuscript. Each formal submission requires a US$5 PayPal processing fee before review begins.</p><div class=\"hero-actions\"><a class=\"btn btn-cyan\" href=\"/member/register/\">Register</a><a class=\"btn btn-ghost\" href=\"/member/login/\">Login</a></div>'; }
    form.style.display='none';
    return;
  }
  if(window.AIBIO?.memberIsSuspended?.(member)){
    if(notice){notice.style.display='block';notice.innerHTML='<h2>Account suspended</h2><p>'+window.AIBIO.memberSuspensionMessage(member)+'</p>';}
    form.style.display='none';
    return;
  }
  if(!member.emailVerified){
    if(notice){notice.style.display='block';notice.innerHTML='<h2>Email verification required</h2><p>Please verify your email before drafting and submitting a manuscript.</p><a class=\"btn btn-cyan\" href=\"'+(window.AIBIO.memberVerificationLink?window.AIBIO.memberVerificationLink(member.email, Math.random().toString(36).slice(2)+Date.now().toString(36)):'/member/verify/')+'\">Verify email</a>'; }
    form.style.display='none';
    return;
  }
  const draftIdForNotice=new URLSearchParams(location.search).get('draft');
  const noticeDraft=draftIdForNotice?findDraft(draftIdForNotice):null;
  if(notice){
    notice.style.display='block';
    if(noticeDraft&&noticeDraft.isRevisionDraft){
      notice.innerHTML='<div class="policy-note warning"><strong>Published-version notice:</strong> draft edits before first publication remain v1. After publication, a version can be corrected within 12 hours without changing its version number. After 12 hours, further changes must be published as the next preserved version. Versions v2-v15 do not require another PayPal payment or editorial review. From v16 onward, each new version requires a US$5 platform maintenance fee and then publishes directly. You are fully responsible for any new content; reported violations may lead to account suspension and article unpublication.</div>';
    }else{
      notice.innerHTML='<p class=\"member-mini\">Signed in as '+member.email+'. Manuscripts are saved as drafts first; '+((window.AIBIO?.memberPaymentBypassEmail||'')===String(member.email||'').toLowerCase()?'this testing account may submit directly to editorial review without PayPal.':'PayPal payment is required when you formally submit.')+'</p>';
    }
  }
  for(let i=0;i<4;i++) addAuthorRow();
  document.getElementById('addAuthorRow')?.addEventListener('click',()=>addAuthorRow());
  document.getElementById('introductionSection').appendChild(makeEditor({id:'introduction',heading:'Introduction',allowFigure:true}));
  addResultsSection(false);
  document.getElementById('discussionSection').appendChild(makeEditor({id:'discussion',heading:'Discussion',allowFigure:true}));
  document.getElementById('methodsSection').appendChild(makeEditor({id:'methods',heading:'Materials and Methods',allowFigure:false}));
  document.getElementById('referencesSection').appendChild(makeEditor({id:'references',heading:'References',allowFigure:false}));
  document.getElementById('addResultsSection').addEventListener('click',addResultsSection);
  const draftId=new URLSearchParams(location.search).get('draft');
  if(draftId) loadDraftIntoForm(findDraft(draftId));
  form.addEventListener('submit',e=>{e.preventDefault();
    if(!validateSubmission()) return;
    document.querySelectorAll('.paper-section-editor').forEach(editor=>{if(editor.dataset.saved!=='true')saveSection(editor);});
    const submission=collectSubmission();
    submission.recordProtection = buildRecordProtection(submission);
    if(!upsertMemberPaper(submission)) return;
    if(submission.isRevisionDraft && window.AIBIO?.memberSelfPublishRevision){
      window.AIBIO.memberSelfPublishRevision(submission.id);
      return;
    }
    if((window.AIBIO?.memberPaymentBypassEmail||'')===String(member.email||'').toLowerCase()){
      window.AIBIO.memberSubmitWithoutPayment(submission.id);
      return;
    }
    location.href='/submit/payment/?id='+encodeURIComponent(submission.id);
  });
}
document.addEventListener('DOMContentLoaded',bindSubmit);
