import { marked } from './vendor/marked.js';
import DOMPurify from './vendor/purify.js';
import { renderMarkdown } from './markdown.js';
const $ = id => document.getElementById(id);
const base = new URL('./',location.href);
let artifacts = [], selected = new URL(location.href).searchParams.get('artifact'), selectionVersion = 0, lastVersion = null;
const api = (name,path) => { const url = new URL('api/'+name,base); if (path !== undefined) url.searchParams.set('path',path); return url; };
const date = value => new Date(value).toLocaleString();
function showList() {
 $('artifacts').replaceChildren();
 for (const artifact of artifacts) {
  const link=document.createElement('a'); const url=new URL(base); url.searchParams.set('artifact',artifact.path);
  link.href=url; link.className='artifact'; link.setAttribute('aria-current',String(artifact.path===selected));
  const name=document.createElement('span'); name.className='artifact-name'; name.textContent=artifact.path;
  const details=document.createElement('span'); details.className='artifact-details'; details.textContent=`${artifact.type.toUpperCase()} · ${date(artifact.updatedAt)}`;
  link.append(name,details); link.addEventListener('click',event=>{event.preventDefault();history.pushState(null,'',url);selected=artifact.path;lastVersion=undefined;showList();void read();}); $('artifacts').append(link);
 }
}
async function read() {
 const version=++selectionVersion; const path=selected; if (!path) return;
 const artifact=artifacts.find(a=>a.path===path);
 $('title').textContent=path; $('metadata').textContent=artifact ? `${artifact.type.toUpperCase()} · Created ${date(artifact.createdAt)} · Modified ${date(artifact.modifiedAt)}` : 'Artifact unavailable in this review space';
 $('copy').disabled=true; $('content').textContent='Loading artifact…';
 try {
  if (!artifact) throw new Error('Artifact unavailable. It may have moved, been excluded, or exceeded the size limit.');
  const raw=api('artifact',path); const type=artifact.type;
  if (type==='markdown' || type==='text') {
   if (artifact.size>2*1024*1024) throw new Error('Text preview limit is 2 MB. Choose a smaller artifact.');
   const response=await fetch(raw); if (!response.ok) throw new Error('Artifact could not be read. Refresh the list and retry.');
   const text=await response.text(); if (version!==selectionVersion) return;
   $('content').replaceChildren();
   if (type==='markdown') {
    $('content').innerHTML=renderMarkdown(text,marked,DOMPurify,{path,artifacts,baseUrl:base.href});
    for (const a of $('content').querySelectorAll('a[href]')) {
     const url=new URL(a.href);
     if (url.origin!==base.origin || url.pathname!==base.pathname || !url.searchParams.has('artifact')) continue;
     a.addEventListener('click',event=>{
      if (event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();history.pushState(null,'',url);selected=url.searchParams.get('artifact');lastVersion=undefined;showList();void read();
     });
    }
   } else { const pre=document.createElement('pre'); pre.textContent=text; $('content').append(pre); }
  } else {
   // Verify availability without buffering media; browser-native elements stream ranges.
   const response=await fetch(raw,{method:'HEAD'}); if (!response.ok) throw new Error('Media unavailable or too large.');
   if (version!==selectionVersion) return;
   const tags={image:'img',video:'video',audio:'audio',pdf:'iframe'};
   if (!tags[type]) throw new Error('No preview is available for this file type.');
   const media=document.createElement(tags[type]); media.src=raw; media.referrerPolicy='no-referrer';
   if (type==='image') media.alt=path;
   if (type==='pdf') media.title=`PDF: ${path}`;
   if (type==='video'||type==='audio') { media.controls=true;media.preload='metadata'; }
   $('content').replaceChildren(media);
  }
  if (version===selectionVersion) { $('copy').disabled=false; lastVersion=artifact.updatedAt; }
 } catch(error) { if (version===selectionVersion) { $('content').textContent=error.message; lastVersion=undefined; } }
}
let refreshing=false;
async function refresh() {
 if (refreshing) return; refreshing=true;
 try {
  const response=await fetch(api('artifacts')); const data=await response.json(); if(!response.ok) throw new Error(data.error || 'Could not load artifacts');
  artifacts=data.artifacts; $('status').textContent=artifacts.length ? '' : 'No approved artifacts yet. Add a report or media file to the review directory.';
  showList(); if(selected && artifacts.find(a=>a.path===selected)?.updatedAt!==lastVersion) await read();
 } catch(error) { $('status').textContent=error.message+' · Use Refresh to retry.'; }
 finally { refreshing=false; }
}
$('refresh').addEventListener('click',()=>void refresh());
$('copy').addEventListener('click',async()=>{try {await navigator.clipboard.writeText(location.href);$('notice').textContent='Private reader link copied. Share only with intended reviewers.';}catch{$('notice').textContent='Copy is unavailable here. Copy the address from your browser.';}});
window.addEventListener('popstate',()=>{selected=new URL(location.href).searchParams.get('artifact');lastVersion=undefined;showList();if(selected)void read();else{$('title').textContent='Choose an artifact';$('content').textContent='Select an artifact from the list.';$('copy').disabled=true;}});
void refresh();setInterval(()=>{if(!document.hidden)void refresh();},4000);
