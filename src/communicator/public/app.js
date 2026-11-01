import {initialState,beginLoad,settleLoad,selectProject,beginDetail,settleDetail,view,followTaskProject} from './state.js';
import {mountMobileNavigation} from './mobile-navigation.js';
let state = initialState();
let retryFocusIntent = false;
let previewRetryFocus=false;
const project = document.getElementById('project');
const retry = document.getElementById('retry');
const heading = document.getElementById('heading');
const announcement = document.getElementById('announcement');
function render() {
  const previewModel=view({...state,section:'WIP app'});
  for(const [id,value] of [['preview-heading',previewModel.title],['preview-message',previewModel.body],['preview-identity',previewModel.projectName]])document.getElementById(id).textContent=value;
  const previewLink=document.getElementById('preview-open');previewLink.hidden=!previewModel.url;previewLink.removeAttribute('href');if(previewModel.url)previewLink.href=previewModel.url;document.getElementById('preview-note').hidden=!previewModel.url;
  const previewRetry=document.getElementById('preview-retry');const previewWasFocused=document.activeElement===previewRetry;previewRetry.hidden=!previewModel.retry;previewRetry.disabled=state.status==='loading'||state.detailLoading;
  if(!state.detailLoading&&state.status!=='loading'&&previewRetryFocus){
    if(previewWasFocused||document.activeElement===document.body){if(previewRetry.hidden)document.getElementById('preview-heading').focus();else previewRetry.focus();}
    previewRetryFocus=false;
  }
  const work=document.getElementById('project-work');if(work)work.hidden=state.section!=='Tasks'||!state.projectId;
  const model = view(state); const retryFocused = document.activeElement === retry;
  heading.textContent = model.title; document.getElementById('message').textContent = model.body;
  document.getElementById('identity').textContent = [model.projectName,model.displayPath].filter(Boolean).join(' · ');
  const link=document.getElementById('open-app');link.hidden=!model.url;link.removeAttribute('href');if(model.url)link.href=model.url;document.getElementById('new-tab-note').hidden=!model.url;
  project.replaceChildren(new Option(state.status === 'loading' ? 'Loading projects…' : 'Projects',''));
  for (const row of state.projects) project.add(new Option(row.name,row.id));
  project.value = state.projectId ?? ''; project.disabled = (state.status === 'loading' && !state.projects.length) || state.status === 'unavailable';
  document.getElementById('navigation-hint').hidden = Boolean(state.projectId);
  retry.hidden = !model.retry; retry.disabled = state.status === 'loading' || state.detailLoading;
  document.getElementById('card').classList.toggle('error',Boolean(state.error) || state.detail?.preview?.status==='invalid' || state.detail?.preview?.status==='unavailable');
  announcement.setAttribute('role',state.error ? 'alert' : 'status');announcement.setAttribute('aria-live',state.error ? 'assertive' : 'polite');
  const text = `${model.title} ${model.body}`.trim(); if (announcement.textContent !== text) announcement.textContent = text;
  if (retry.hidden && (retryFocused || (retryFocusIntent && document.activeElement === document.body))) heading.focus();
  if (state.status !== 'loading' && !state.detailLoading) {
    if (retryFocusIntent && document.activeElement === document.body && !retry.hidden && !retry.disabled) retry.focus();
    retryFocusIntent = false;
  }
}
async function json(resource) {
  const response=await fetch(resource);const data=await response.json();if(!response.ok)throw Object.assign(new Error('Unavailable'),{code:data.error?.code});return data;
}
async function load() {
  const generation = state.requestGeneration;
  try {
    const capabilities=await json('/api/capabilities');
    const inventory=capabilities.capabilities?.projects ? await json('/api/projects') : {projects:[]};
    state=settleLoad(state,generation,{...capabilities,...inventory});
  } catch(error) {state=settleLoad(state,generation,null,error.code ?? 'inventory');}
  render();
  if(!state.error)startWorkspace();
  if(generation===state.requestGeneration && state.projectId && !state.error){state=beginDetail(state);render();void loadDetail();}
}
async function loadDetail() {
  const generation=state.requestGeneration;const id=state.projectId;
  try {const detail=await json('/api/projects/'+encodeURIComponent(id));state=settleDetail(state,generation,detail);}
  catch(error){state=settleDetail(state,generation,null,error.code ?? 'inventory');}
  render();
}
retry.addEventListener('click',() => {
  const next=state.projectId ? beginDetail(state) : beginLoad(state);if(next===state)return;
  retryFocusIntent=document.activeElement===retry;state=next;render();void (state.projectId ? loadDetail() : load());
});
project.addEventListener('change',() => {retryFocusIntent=false;previewRetryFocus=false;state=selectProject(state,project.value);if(selectedTab.dataset.section)state={...state,section:selectedTab.dataset.section};render();if(state.projectId)void loadDetail();});
const shell=document.getElementById('app-shell');
const detail=document.getElementById('content');
const chat=document.getElementById('chat');
const preview=document.getElementById('preview');
const leftPane=document.getElementById('left-pane');
const chatToggle=document.getElementById('mobile-sidebar-toggle');
const leftToggle=document.getElementById('left-toggle');
const previewToggle=document.getElementById('preview-toggle');
const sectionTabs=[...document.querySelectorAll('[data-section]')];
const settingsTab=document.getElementById('settings-tab');
const settings=document.getElementById('settings');
const tabs=[chatToggle,...sectionTabs,...(settingsTab?[settingsTab]:[])];
const mobileViewport=typeof matchMedia==='function'?matchMedia('(max-width: 767px)'):null;
let workspace=mobileViewport?.matches?'left':'preview';
let selectedTab=chatToggle;
function syncNavigation(){
  const mobile=Boolean(mobileViewport?.matches);
  leftPane.hidden=mobile&&workspace!=='left';leftPane.inert=leftPane.hidden;
  chat.hidden=selectedTab!==chatToggle;chat.inert=chat.hidden||leftPane.hidden;
  detail.hidden=selectedTab===chatToggle||Boolean(settingsTab&&selectedTab===settingsTab);detail.inert=detail.hidden||leftPane.hidden;
  if(settings){settings.hidden=selectedTab!==settingsTab||leftPane.hidden;settings.inert=settings.hidden;}
  preview.hidden=mobile&&workspace!=='preview';preview.inert=preview.hidden;
  shell.dataset.workspace=workspace;
  leftToggle.textContent=selectedTab.textContent||'Chat';
  leftToggle.setAttribute('aria-pressed',String(workspace==='left'));
  previewToggle.setAttribute('aria-pressed',String(workspace==='preview'));
  for(const tab of tabs){
    const current=tab===selectedTab&&(!mobile||workspace==='left');
    tab.setAttribute('aria-selected',String(current));tab.setAttribute('tabindex',tab===selectedTab?'0':'-1');
    if(mobile&&current)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');
  }
  if(mobile&&workspace==='preview')previewToggle.setAttribute('aria-current','page');else previewToggle.removeAttribute('aria-current');
  detail.setAttribute('aria-labelledby',selectedTab.id);
  const title=document.getElementById('mobile-view-title');
  if(title)title.textContent=workspace==='preview'?'Preview':selectedTab.textContent||'Chat';
}
function selectTab(tab,focus=false){
  retryFocusIntent=false;previewRetryFocus=false;selectedTab=tab;
  if(tab.dataset.section)state={...state,section:tab.dataset.section};
  workspace='left';render();syncNavigation();if(focus)tab.focus();
}
for(const tab of tabs){
  tab.addEventListener('click',()=>selectTab(tab));
  tab.addEventListener('keydown',event=>{
    const current=tabs.indexOf(tab);let next;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(current+1)%tabs.length;
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(current+tabs.length-1)%tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=tabs.length-1;
    else return;
    event.preventDefault();selectTab(tabs[next],true);
  });
}
leftToggle.addEventListener('click',()=>{workspace='left';syncNavigation();selectedTab.focus();});
document.getElementById('workspace-skip')?.addEventListener('click',()=>{workspace='preview';syncNavigation();preview.focus();});
previewToggle.addEventListener('click',()=>{workspace='preview';syncNavigation();document.getElementById('preview-heading').focus();});
document.getElementById('preview-retry').addEventListener('click',()=>{
  const next=state.projectId?beginDetail(state):beginLoad(state);if(next===state)return;
  previewRetryFocus=document.activeElement===document.getElementById('preview-retry');state=next;render();void(state.projectId?loadDetail():load());
});
mobileViewport?.addEventListener?.('change',()=>{
  const focusInLeft=leftPane.contains(document.activeElement);const focusInPreview=preview.contains(document.activeElement);
  syncNavigation();
  if(leftPane.hidden&&focusInLeft)leftToggle.focus();else if(preview.hidden&&focusInPreview)previewToggle.focus();
});
if(mobileViewport)mountMobileNavigation({document,viewport:mobileViewport,onSelect:()=>{
  const target=workspace==='preview'?document.getElementById('preview-heading'):selectedTab===chatToggle?document.getElementById('chat-heading'):heading;
  target?.focus();
}});
syncNavigation();render();void load();

let workspaceStream;
let taskSequence=0;
function startWorkspace(){
  if(workspaceStream||typeof EventSource!=='function')return;
  workspaceStream=new EventSource('/api/workspace/events');
  workspaceStream.onmessage=event=>{
    let snapshot;
    try{snapshot=JSON.parse(event.data);if(snapshot.error||!Array.isArray(snapshot.projects)||snapshot.projects.some(row=>typeof row.id!=='string'||typeof row.name!=='string'))return;}catch{return;}
    const next=followTaskProject(state.projectId,taskSequence,snapshot);taskSequence=next.sequence;
    const changed=next.projectId!==state.projectId;
    state={...state,projects:snapshot.projects};
    if(changed){render();project.value=next.projectId||'';project.dispatchEvent(new Event('change'));}
    else {render();project.dispatchEvent(new Event('ned-work-refresh'));}
  };
}
