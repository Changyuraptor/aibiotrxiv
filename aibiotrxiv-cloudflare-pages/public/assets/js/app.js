const AIBIO_REMOTE_KV_KEYS=[
'aibio_published',
'aibio_submissions',
'aibio_accepted',
'aibio_unpublished',
'aibio_trash',
'aibio_member_papers'
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
function getRemoteValue(key){
  return window.AIBIO_REMOTE_KV?.data && Object.prototype.hasOwnProperty.call(window.AIBIO_REMOTE_KV.data,key) ? window.AIBIO_REMOTE_KV.data[key] : undefined;
}
function areaList(){return window.AIBIO.researchAreas || [];}
function areaNameFromSlug(slug){return (window.AIBIO.areaNameBySlug || {})[slug] || ''}
function areaSlugFromName(name){return (window.AIBIO.areaSlugByName || {})[name] || 'other'}

function escapeHtml(str=''){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function normalizeAuthors(m){
  if(Array.isArray(m.authorList)&&m.authorList.length) return m.authorList;
  return String(m.authors||'Unknown authors').split(',').map((name,i)=>({name:name.trim(),email:i===0?(m.email||''):''})).filter(a=>a.name||a.email);
}
function authorNames(m){return normalizeAuthors(m).map(a=>a.name).filter(Boolean).join(', ') || m.authors || 'Unknown authors';}
function authorLinks(m){return normalizeAuthors(m).map(a=>a.email?`<a href="mailto:${escapeHtml(a.email)}">${escapeHtml(a.name||a.email)}</a>`:escapeHtml(a.name||'')).join(', ');}

function licenseUrl(license=''){
  const key=String(license||'').toUpperCase().replace(/\s+/g,' ').trim();
  const map={
    'CC BY 4.0':'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-SA 4.0':'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC 4.0':'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-NC-SA 4.0':'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'CC BY-ND 4.0':'https://creativecommons.org/licenses/by-nd/4.0/',
    'CC BY-NC-ND 4.0':'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'CC0 1.0':'https://creativecommons.org/publicdomain/zero/1.0/'
  };
  return map[key]||'';
}
function licenseHtml(license=''){
  const text=license||'The author-selected license will be displayed here.';
  const url=licenseUrl(text);
  return url?`<a href="${url}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`:escapeHtml(text);
}
function pdfButtonHtml(pdf){
  const href=pdf&&pdf!=='#'?pdf:'#';
  const disabled=href==='#';
  return `<a class="btn btn-primary pdf-download-btn${disabled?' disabled':''}" href="${href}" ${disabled?'aria-disabled="true" onclick="return false"':''}><span>Download PDF</span></a>`;
}

function safeLocal(key, fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(e){return fallback;}}
function storedPublished(){return safeLocal('aibio_published',[]).filter(p=>(p.status||'published')==='published');}

function versionNumber(v){const m=String(v||'v1').match(/(\d+)/);return m?Number(m[1]):1;}
function articleKey(m){return m.articleId||m.versionGroupId||m.siteId||m.id||m.slug;}
function allPublicManuscriptVersions(){
  const local=storedPublished().map(manuscriptToPublic).map(m=>({...m,articleId:articleKey(m)}));
  const staticRows=(window.AIBIO.manuscripts||[]).map(manuscriptToPublic).map(m=>({...m,articleId:articleKey(m)}));
  return [...local,...staticRows];
}
function latestVersionRows(rows){
  const by=new Map();
  rows.forEach(m=>{
    const k=articleKey(m);
    const old=by.get(k);
    if(!old || versionNumber(m.version)>versionNumber(old.version) || String(m.date||'')>String(old.date||'')) by.set(k,m);
  });
  return [...by.values()].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function versionsForArticle(m){
  const k=articleKey(m);
  return allPublicManuscriptVersions().filter(x=>articleKey(x)===k).sort((a,b)=>versionNumber(a.version)-versionNumber(b.version));
}
function versionHref(m){
  const root=articleKey(m);
  return m.dynamic?`/manuscripts/?id=${encodeURIComponent(root)}&version=${encodeURIComponent(m.version||'v1')}`:`/manuscripts/${m.slug}/`;
}
function manuscriptToPublic(p){
  const siteId=p.siteId||p.id;
  const slug=p.slug||String(siteId).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return {...p,id:siteId,slug,authors:authorNames(p),authorList:normalizeAuthors(p),date:p.publishedAt||p.date||'',version:p.version||'v1',abstract:p.abstract||'',keywords:p.keywords||[],pdf:p.pdf||'#',dynamic:!!p.siteId};
}
function publicManuscripts(){return latestVersionRows(allPublicManuscriptVersions());}
function manuscriptHref(m){return m.dynamic?`/manuscripts/?id=${encodeURIComponent(articleKey(m))}`:`/manuscripts/${m.slug}/`;}
function renderAreas(targetId){
  const el=document.getElementById(targetId);if(!el)return;
  const limit=Number(el.dataset.areaLimit||0);
  const rows=limit ? areaList().slice(0,limit) : areaList();
  el.innerHTML=rows.map(area=>`<a class="topic" href="/topics/${area.slug}/"><strong>${area.name}</strong><span>${area.desc}</span></a>`).join('');
}
function getPresetArea(){
  const fromDataset=document.body.dataset.topicArea || '';
  if(fromDataset) return fromDataset;
  const params=new URLSearchParams(location.search);
  const area=params.get('area') || '';
  if(area) return area;
  const pathMatch=location.pathname.match(/\/topics\/([^/]+)\/?$/);
  if(pathMatch) return areaNameFromSlug(pathMatch[1]);
  return '';
}
function renderBrowse(targetId){
  const el=document.getElementById(targetId);if(!el)return;
  const params=new URLSearchParams(location.search);
  const q=params.get('q')||'';
  const presetArea=getPresetArea();
  const input=document.getElementById('searchInput');
  const select=document.getElementById('topicFilter');
  const catResearch=document.getElementById('filterResearch');
  const catIdea=document.getElementById('filterIdea');
  if(input)input.value=q;
  if(select){
    select.innerHTML='<option value="">All research areas</option>'+areaList().map(a=>`<option value="${a.name}" ${a.name===presetArea?'selected':''}>${a.name}</option>`).join('');
    if(document.body.dataset.lockTopic==='true') select.disabled=true;
  }
  const draw=()=>{
    const query=(input?.value||'').toLowerCase();
    const chosen=select?.value||presetArea;
    const activeCats=[]; if(catResearch?.checked)activeCats.push('AI Research'); if(catIdea?.checked)activeCats.push('AI Idea');
    const rows=publicManuscripts().filter(m=>(!chosen||m.topic===chosen)&&(!activeCats.length||activeCats.includes(m.submissionCategory||'AI Research'))&&[m.title,authorNames(m),m.topic,m.abstract,m.id,...(m.keywords||[])].join(' ').toLowerCase().includes(query));
    el.innerHTML=rows.map(m=>`<article class="paper"><div class="paper-top">${(m.submissionCategory||'AI Research')==='AI Idea'?'<span class=\"tag rose\">Idea</span>':'<span class=\"tag cyan\">Research</span>'}<span class="tag cyan">${m.topic||'Other'}</span><span class="tag orange">${m.version||'v1'}</span><span class="tag">${articleKey(m)}</span></div><h3><a href="${manuscriptHref(m)}">${(m.submissionCategory||'AI Research')==='AI Idea'?'[Idea] ':''}${m.title}</a></h3><div class="paper-meta">${authorNames(m)} · Published ${m.date||'Pending date'}</div><p class="abstract-snippet">${m.abstract}</p><div class="paper-actions"><a class="small-link" href="${manuscriptHref(m)}">Read manuscript →</a><a class="small-link" href="${m.pdf&&m.pdf!=='#'?m.pdf:manuscriptHref(m)}">PDF / article →</a><a class="small-link" href="${manuscriptHref(m)}#citation">Citation →</a></div></article>`).join('')||'<p class="muted">No manuscripts matched this area or search term yet.</p>';
  };
  input?.addEventListener('input',draw);select?.addEventListener('change',draw);catResearch?.addEventListener('change',draw);catIdea?.addEventListener('change',draw);draw();
}
function bindSearchForms(){document.querySelectorAll('[data-global-search]').forEach(form=>{form.addEventListener('submit',e=>{e.preventDefault();const q=form.querySelector('input')?.value||'';location.href='/browse/?q='+encodeURIComponent(q);});});}
function findDynamicManuscript(){
  const qs=new URLSearchParams(location.search);
  const id=qs.get('id');
  const requestedVersion=qs.get('version');
  if(!id) return null;
  const rows=allPublicManuscriptVersions().filter(m=>m.id===id||m.slug===id||articleKey(m)===id);
  if(!rows.length) return null;
  if(requestedVersion){
    return rows.find(m=>String(m.version||'v1')===requestedVersion) || rows[0];
  }
  return latestVersionRows(rows)[0];
}
function renderDynamicManuscript(){
  const el=document.getElementById('dynamicManuscript'); if(!el)return;
  const m=findDynamicManuscript();
  if(!m){el.innerHTML='<div class="card"><h1>Manuscript not found</h1><p class="muted">This manuscript is not currently published.</p></div>';return;}
  let sections=m.sections&&m.sections.length?m.sections:window.AIBIO.sampleSections;
  if(m.abstract && !sections.some(sec=>String(sec.heading).toLowerCase()==='abstract')) sections=[{heading:'Abstract',text:m.abstract,legend:'',image:''},...sections];
  const citation=`${authorNames(m)}. ${String(m.date||'').slice(0,4)||new Date().getFullYear()}. ${m.title}. ${m.id}, ${m.version||'v1'}.`;
  const order=['Abstract','Introduction','Results','Discussion','Materials and Methods','References'];
  const links=[...new Set(sections.map(s=>s.heading).concat(['Rights and permissions']))];
  const seenHeadings={results:false};
  const bodyHtml=sections.map((sec,i)=>{
    let heading=sec.heading||'Section';
    const isResults=/^results$/i.test(String(heading));
    const showHeading=!(isResults&&seenHeadings.results);
    if(isResults) seenHeadings.results=true;
    const id=String(heading).toLowerCase().replace(/[^a-z0-9]+/g,'-');
    return `${showHeading?`<h2 id="${id}">${heading}</h2>`:''}<div class="article-section-text">${sec.text||''}</div>${sec.image?`<figure><img class="zoomable-image" src="${sec.image}" alt="Figure"><figcaption>${sec.legend||''}</figcaption></figure>`:''}`;
  }).join('');
  const vrows=versionsForArticle(m);
  const versionBox=vrows.length>1?`<div class="version-switcher"><strong>Versions</strong>${vrows.map(v=>`<a class="version-pill ${String(v.version||'v1')===String(m.version||'v1')?'active':''}" href="${versionHref(v)}">${escapeHtml(v.version||'v1')} <span>${escapeHtml(v.date||v.publishedAt||'')}</span></a>`).join('')}</div>`:'';
  el.innerHTML=`<div class="download-top"><div>${(m.submissionCategory||'AI Research')==='AI Idea'?'<span class=\"tag rose\" style=\"margin-bottom:12px\">Idea</span>':''}<h1 class="article-title">${(m.submissionCategory||'AI Research')==='AI Idea'?'Idea: ':''}${m.title}</h1><div class="authors">${authorLinks(m)}</div><p class="paper-meta">${articleKey(m)} · Published ${m.date||m.publishedAt||''} · ${m.topic||'Other'} · ${m.version||'v1'}</p></div><div class="article-side-actions">${pdfButtonHtml(m.pdf)}${versionBox}<button class="small-link article-report-link" type="button" data-report-article="${escapeHtml(articleKey(m))}">Report this article</button></div></div><div id="citation" class="citation-box"><strong>Citation:</strong> ${citation}</div><div class="reader-layout"><article class="article-body">${bodyHtml}<h2 id="rights-and-permissions">Rights and permissions</h2><p>${licenseHtml(m.license||'The author-selected license will be displayed here.')}</p></article><aside class="toc-card"><strong>On this page</strong>${links.map(x=>`<a href="#${String(x).toLowerCase().replace(/[^a-z0-9]+/g,'-')}">${x}</a>`).join('')}</aside></div><section class="peer-comments" id="peer-comments"></section>`;
  renderPeerComments(m);
  document.querySelectorAll('[data-report-article]').forEach(btn=>btn.addEventListener('click',()=>reportArticleVersion(m)));
  bindImageZoom();
}


function fallbackCurrentMember(){
  try{
    const email=String(localStorage.getItem('aibio_current_member_email')||'').trim().toLowerCase();
    if(!email) return null;
    const members=JSON.parse(localStorage.getItem('aibio_members')||'[]');
    return members.find(m=>String(m.email||'').trim().toLowerCase()===email)||null;
  }catch(e){return null;}
}
function hydrateStaticPeerComments(){
  const box=document.getElementById('peer-comments');
  if(!box || box.dataset.hydrated==='1') return;
  const manuscriptId=box.dataset.manuscriptId || document.querySelector('.paper-meta')?.textContent?.split('·')?.[0]?.trim() || location.pathname;
  renderPeerComments({id:manuscriptId});
  box.dataset.hydrated='1';
}

function commentKey(manuscriptId){return 'aibio_comments_'+String(manuscriptId||'').replace(/[^A-Za-z0-9_-]/g,'_');}
function getComments(manuscriptId){return safeLocal(commentKey(manuscriptId),[]).filter(c=>!c.deleted);}
function setComments(manuscriptId,rows){try{localStorage.setItem(commentKey(manuscriptId),JSON.stringify(rows));return true;}catch(e){alert('Could not save comment. Please try again.');return false;}}
function isCommentRestrictedMember(member){
  return !!(member&&(member.commentSuspended||member.commentStatus==='restricted'||member.commentsRestricted));
}
function commentRestrictionMessage(member){
  return member?.commentSuspensionReason?`Peer-comment privilege restricted: ${member.commentSuspensionReason}`:'Peer-comment privilege restricted. You may still use manuscript services unless your full account is separately suspended.';
}
async function checkArticleAdminSession(){
  if(window.AIBIO?.adminSessionChecked) return !!window.AIBIO.adminSessionActive;
  window.AIBIO=window.AIBIO||{};
  window.AIBIO.adminSessionChecked=true;
  try{
    const res=await fetch('/api/admin/session',{credentials:'include'});
    if(!res.ok) throw new Error('not admin');
    const data=await res.json().catch(()=>({}));
    window.AIBIO.adminSessionActive=true;
    window.AIBIO.adminAccount=data.account||'admin';
    document.body.classList.add('admin-session-active');
    return true;
  }catch(e){
    window.AIBIO.adminSessionActive=false;
    return false;
  }
}
async function deletePeerComment(manuscriptId, commentId){
  if(!window.AIBIO?.adminSessionActive){alert('Admin session required.');return;}
  try{
    await fetch('/api/comments/delete',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({manuscriptId,commentId})});
  }catch(e){console.warn('Comment delete API unavailable; using local fallback.',e);}
  const rows=safeLocal(commentKey(manuscriptId),[]);
  const next=rows.map(c=>c.id===commentId?{...c,deleted:true,deletedAt:new Date().toISOString(),deletedBy:'admin'}:c);
  setComments(manuscriptId,next);
  renderPeerComments({id:manuscriptId});
}
function renderPeerComments(m){
  const box=document.getElementById('peer-comments'); if(!box||!m)return;
  const member=(window.AIBIO?.memberCurrent?.()||fallbackCurrentMember());
  const rows=getComments(m.id);
  const accountSuspended=member&&window.AIBIO?.memberIsSuspended?.(member);
  const commentRestricted=member&&(window.AIBIO?.memberCommentRestricted?window.AIBIO.memberCommentRestricted(member):isCommentRestrictedMember(member));
  const adminActive=!!window.AIBIO?.adminSessionActive;
  let loginBlock='';
  if(member){
    if(accountSuspended){
      loginBlock=`<div class="auth-required"><h3>Account suspended</h3><p>${escapeHtml(window.AIBIO.memberSuspensionMessage(member))}</p><p class="muted">Suspended accounts can read comments but cannot post new peer comments or submit activity.</p></div>`;
    }else if(commentRestricted){
      const msg=window.AIBIO?.memberCommentRestrictionMessage?window.AIBIO.memberCommentRestrictionMessage(member):commentRestrictionMessage(member);
      loginBlock=`<div class="auth-required"><h3>Peer-comment privilege restricted</h3><p>${escapeHtml(msg)}</p><p class="muted">This restriction only blocks peer comments. It does not remove your published articles or prevent manuscript services unless your full account is separately suspended.</p></div>`;
    }else{
      loginBlock=`<form id="peerCommentForm" class="comment-form"><label>Peer comment</label><textarea id="peerCommentText" rows="5" placeholder="Write a constructive peer comment. Spam, harassment, personal attacks, and author-commenter arguments may lead to comment restriction." required></textarea><button class="btn btn-cyan" type="submit">Post peer comment</button></form>`;
    }
  }else{
    loginBlock=`<div class="auth-required"><h3>Member login required for peer comments</h3><p>Readers may view comments freely, but only verified members can post. Spam, harassment, repeated off-topic replies, and arguments with authors may lead to comment restriction.</p><div class="hero-actions"><a class="btn btn-cyan" href="/member/login/">Login</a><a class="btn btn-ghost" href="/member/register/">Register</a></div></div>`;
  }
  box.innerHTML=`<h2>Peer comments</h2><p class="muted">Comments are intended for constructive scientific feedback. AIBioTrXiv may remove spam, abusive content, personal attacks, and escalating disputes. Comment restrictions are handled separately from manuscript publication privileges.</p>${loginBlock}<div class="comment-list">${rows.length?rows.map(c=>`<article class="comment-card"><div class="comment-head"><div><strong>${escapeHtml(c.name||'Member')}</strong><span class="muted"> · ${escapeHtml(c.createdAt||'')}</span></div><div class="comment-actions"><button class="comment-report" type="button" data-report-comment="${escapeHtml(c.id)}">Report comment</button>${adminActive?` <button class="comment-report admin-delete-comment" type="button" data-delete-comment="${escapeHtml(c.id)}">Delete</button>`:''}</div></div><p>${escapeHtml(c.text).replace(/\n/g,'<br>')}</p></article>`).join(''):'<p class="muted">No peer comments yet.</p>'}</div>`;
  box.querySelectorAll('[data-report-comment]').forEach(btn=>btn.addEventListener('click',()=>reportPeerComment(m,btn.dataset.reportComment)));
  box.querySelectorAll('[data-delete-comment]').forEach(btn=>btn.addEventListener('click',()=>{if(confirm('Delete this peer comment?'))deletePeerComment(m.id,btn.dataset.deleteComment);}));
  const form=document.getElementById('peerCommentForm');
  if(form){form.addEventListener('submit',e=>{e.preventDefault();const text=document.getElementById('peerCommentText').value.trim();if(text.length<10){alert('Please write a more substantive peer comment.');return;}if(text.length>3000){alert('Please keep peer comments under 3000 characters.');return;}const banned=/(buy now|free money|casino|viagra|http:\/\/|https:\/\/)/i;if(banned.test(text)&&!confirm('This comment contains terms or links often associated with spam. Submit anyway?'))return;const rows=getComments(m.id);rows.push({id:'CMT-'+Date.now(),name:member.name||member.email,email:member.email,text,createdAt:new Date().toISOString(),deleted:false});setComments(m.id,rows);renderPeerComments(m);});}
}

async 
function openGmailReportCompose({subject,body}){
  const to='aibiotrxiv@gmail.com';
  const gmailUrl='https://mail.google.com/mail/?view=cm&fs=1'
    +'&to='+encodeURIComponent(to)
    +'&su='+encodeURIComponent(subject)
    +'&body='+encodeURIComponent(body);
  const opened=window.open(gmailUrl,'_blank','noopener,noreferrer');
  if(!opened){
    location.href='mailto:'+to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  }
}

function reportArticleVersion(m){
  const reason=prompt('Please describe why this article version should be reviewed. A prepared Gmail message will open and be addressed to aibiotrxiv@gmail.com.');
  if(!reason || reason.trim().length<5){alert('Please provide a brief reason for the report.');return;}
  const articleId=articleKey(m)||m.id||'';
  const subject='[AIBioTrXiv] Article report: '+articleId;
  const body=`Article ID: ${articleId}
Version: ${m.version||'v1'}
Title: ${m.title||''}
Author(s): ${authorNames(m)}

Report reason:
${reason.trim()}

Reported page:
${location.href}`;
  openGmailReportCompose({subject,body});
}


async function reportPeerComment(m, commentId){
  const rows=getComments(m.id);
  const comment=rows.find(c=>c.id===commentId);
  if(!comment){alert('Could not find this comment.');return;}
  const reason=prompt('Please describe why this peer comment should be reviewed. Reports are sent to aibiotrxiv@gmail.com.');
  if(!reason || reason.trim().length<5){alert('Please provide a brief reason for the report.');return;}
  const payload={manuscriptId:m.id,title:m.title||'',commentId,commentAuthor:comment.name||'',commentText:comment.text||'',reportReason:reason.trim(),reportedAt:new Date().toISOString()};
  try{
    const res=await fetch('/api/comments/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok) throw new Error(data.error||'Report endpoint not available.');
    if(data.emailSent){
      alert('Report sent to AIBioTrXiv.');
    }else{
      throw new Error('Email delivery is not configured; opening mail client.');
    }
  }catch(err){
    const subject=encodeURIComponent('[AIBioTrXiv] Peer comment report: '+(m.id||''));
    const body=encodeURIComponent(`Manuscript: ${m.id||''}
Title: ${m.title||''}
Comment ID: ${commentId}
Comment author: ${comment.name||''}

Comment text:
${comment.text||''}

Report reason:
${reason.trim()}`);
    alert('Your email app will open with a prepared report addressed to aibiotrxiv@gmail.com. Please send the email to complete the report.');
    location.href=`mailto:aibiotrxiv@gmail.com?subject=${subject}&body=${body}`;
  }
}


function bindArticleAnchorOffsets(){
  document.querySelectorAll('.toc-card a[href^="#"], a.article-anchor-link[href^="#"]').forEach(link=>{
    if(link.dataset.offsetBound==='1') return;
    link.dataset.offsetBound='1';
    link.addEventListener('click', e=>{
      const href=link.getAttribute('href');
      if(!href || href==='#') return;
      const target=document.querySelector(href);
      if(!target) return;
      e.preventDefault();
      const header=document.querySelector('.topbar');
      const headerHeight=header ? header.getBoundingClientRect().height : 0;
      const extra=28;
      const y=target.getBoundingClientRect().top + window.pageYOffset - headerHeight - extra;
      window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
      history.replaceState(null,'',href);
    });
  });
}

function bindImageZoom(){
  if(document.getElementById('imageModal')) return;
  const modal=document.createElement('div');modal.id='imageModal';modal.className='image-modal';modal.innerHTML='<button type="button" class="image-modal-close">×</button><img alt="Expanded figure"><p></p>';document.body.appendChild(modal);
  modal.querySelector('button').addEventListener('click',()=>modal.classList.remove('open'));
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open');});
  document.querySelectorAll('.article-body img,.zoomable-image').forEach(img=>{img.classList.add('zoomable-image');img.addEventListener('click',()=>{modal.querySelector('img').src=img.src;modal.querySelector('p').textContent=img.closest('figure')?.querySelector('figcaption')?.textContent||'';modal.classList.add('open');});});
}
document.addEventListener('DOMContentLoaded',async()=>{await loadRemoteKv();renderAreas('researchAreas');renderBrowse('browseList');bindSearchForms();renderDynamicManuscript();hydrateStaticPeerComments();bindArticleAnchorOffsets();bindImageZoom();checkArticleAdminSession().then(()=>{hydrateStaticPeerComments(); const box=document.getElementById('peer-comments'); if(box){const manuscriptId=box.dataset.manuscriptId || document.querySelector('.paper-meta')?.textContent?.split('·')?.[0]?.trim() || location.pathname; renderPeerComments({id:manuscriptId});}});});


// v46: responsive mobile/tablet navigation
function setupResponsiveNavigation(){
  document.querySelectorAll('.topbar .nav').forEach((nav,idx)=>{
    const links=nav.querySelector('.nav-links');
    if(!links || nav.querySelector('.mobile-menu-toggle')) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='mobile-menu-toggle';
    btn.setAttribute('aria-label','Open navigation menu');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<span class="menu-icon">☰</span><span class="menu-label">Menu</span>';
    nav.appendChild(btn);
    let backdrop=document.querySelector('.mobile-menu-backdrop');
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.className='mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }
    function closeMenu(){
      links.classList.remove('is-open');
      btn.setAttribute('aria-expanded','false');
      btn.setAttribute('aria-label','Open navigation menu');
      btn.querySelector('.menu-icon').textContent='☰';
      document.querySelectorAll('.topbar').forEach(h=>h.classList.remove('menu-open'));
      backdrop.classList.remove('is-open');
    }
    function openMenu(){
      links.classList.add('is-open');
      btn.setAttribute('aria-expanded','true');
      btn.setAttribute('aria-label','Close navigation menu');
      btn.querySelector('.menu-icon').textContent='×';
      nav.closest('.topbar')?.classList.add('menu-open');
      backdrop.classList.add('is-open');
    }
    btn.addEventListener('click',()=>links.classList.contains('is-open')?closeMenu():openMenu());
    backdrop.addEventListener('click',closeMenu);
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
    window.addEventListener('resize',()=>{if(window.innerWidth>1100) closeMenu();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape') closeMenu();});
  });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupResponsiveNavigation); else setupResponsiveNavigation();
