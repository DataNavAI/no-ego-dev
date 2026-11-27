import {mountPreview} from './preview-ui.js';
import {initialState,beginLoad,settleLoad,selectProject,beginDetail,settleDetail,view,followTaskProject} from './state.js';
import {apiFetch as fetch,ApiEventSource as EventSource} from './api-client.js';
let state = initialState();
let previewRetryFocus=false;
const project = document.getElementById('project');
function render() {
  const previewModel=view({...state,section:'WIP app'});
  for(const [id,value] of [['preview-heading',previewModel.title],['preview-message',previewModel.body],['preview-identity',previewModel.projectName]])document.getElementById(id).textContent=value;
  const previewLink=document.getElementById('preview-open');previewLink.hidden=!previewModel.url;previewLink.removeAttribute('href');if(previewModel.url)previewLink.href=previewModel.url;document.getElementById('preview-note').hidden=!previewModel.url;
  const previewRetry=document.getElementById('preview-retry');const previewWasFocused=document.activeElement===previewRetry;previewRetry.hidden=!previewModel.retry;previewRetry.disabled=state.status==='loading'||state.detailLoading;
  if(!state.detailLoading&&state.status!=='loading'&&previewRetryFocus){
    if(previewWasFocused||document.activeElement===document.body){if(previewRetry.hidden)document.getElementById('preview-heading').focus();else previewRetry.focus();}
    previewRetryFocus=false;
  }
  project.dataset.name=previewModel.projectName;
  const artifactsModel=view({...state,section:'Artifacts'});
  const artifactsStatus=document.getElementById('artifacts-status');
  if(artifactsStatus)artifactsStatus.textContent=state.status==='loading'||state.detailLoading?artifactsModel.title:state.error?[artifactsModel.title,artifactsModel.body].filter(Boolean).join(' '):state.projectId?artifactsModel.body||'Artifact browsing is not available yet.':'Choose a project to view artifacts.';
}
async function json(resource) {
  const response=await fetch(resource);const data=await response.json();if(!response.ok)throw Object.assign(new Error('Unavailable'),{code:data.error?.code});return data;
}
async function load() {
  const generation = state.requestGeneration;
  try {
    const capabilities=await json('/api/v1/capabilities');
    const inventory=capabilities.capabilities?.projects ? await json('/api/v1/projects') : {projects:[]};
    state=settleLoad(state,generation,{...capabilities,...inventory});
  } catch(error) {state=settleLoad(state,generation,null,error.code ?? 'inventory');}
  render();
  if(!state.error)startWorkspace();
  if(generation===state.requestGeneration && state.projectId && !state.error){state=beginDetail(state);render();void loadDetail();}
}
async function loadDetail() {
  const generation=state.requestGeneration;const id=state.projectId;
  try {const detail=await json('/api/v1/projects/'+encodeURIComponent(id));state=settleDetail(state,generation,detail);}
  catch(error){state=settleDetail(state,generation,null,error.code ?? 'inventory');}
  render();
}
project.addEventListener('change',() => {
  previewRetryFocus=false;
  state=selectProject(state,project.value);
  if(!project.value)state={...state,error:null};
  render();
  if(state.projectId)void loadDetail();
});
const chat=document.getElementById('chat');
const preview=document.getElementById('preview');
const leftPane=document.getElementById('left-pane');
const mobileNavigation=document.getElementById('mobile-navigation');
const navigationToggle=document.getElementById('navigation-toggle');
let navigationHadFocus=false,mobileProjectHadFocus=false,bottomHadFocus=false;
document.addEventListener('focusin',event=>{
  navigationHadFocus=mobileNavigation.contains(event.target);mobileProjectHadFocus=event.target?.id==='mobile-project-toggle';bottomHadFocus=Boolean(document.getElementById('mobile-bottom-nav')?.contains(event.target));
});
document.addEventListener('click',event=>{
  if(mobileNavigation.contains(event.target))return;
  navigationHadFocus=false;
  if(mobileViewport?.matches&&mobileNavigation.open)mobileNavigation.open=false;
});
mobileNavigation.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&mobileViewport?.matches&&mobileNavigation.open){
    event.stopPropagation();mobileNavigation.open=false;navigationToggle.focus();
  }
});
const leftToggle=document.getElementById('left-toggle');
const previewToggle=document.getElementById('preview-toggle');
const mobileViewport=typeof matchMedia==='function'?matchMedia('(max-width: 767px)'):null;
let workspace='left';
let contextOpen=true;
const shell=document.getElementById('app-shell');
const contextToggle=document.getElementById('context-toggle');
const contextClose=document.getElementById('context-close');
const mobileProjectToggle=document.getElementById('mobile-project-toggle');
const mobileBottom=document.getElementById('mobile-bottom-nav');
const navigationHome=mobileNavigation.parentElement;

let canvasView='Goals';
const canvasTabs=[document.getElementById('goals-pane-tab'),document.getElementById('artifacts-pane-tab'),document.getElementById('preview-tab'),document.getElementById('dashboard-tab'),document.getElementById('workspace-settings-tab')].filter(Boolean);
function selectCanvas(tab,focus=false){
  previewRetryFocus=false;
  canvasView=tab.textContent;contextOpen=true;workspace='preview';
  for(const item of canvasTabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;}
  syncNavigation();if(focus){if(mobileViewport?.matches)canvasHeading().focus();else tab.focus();}if(!mobileViewport?.matches)tab.scrollIntoView?.({block:'nearest',inline:'nearest'});
}
for(const tab of canvasTabs){
  tab.addEventListener('click',()=>selectCanvas(tab));
  tab.addEventListener('keydown',event=>{
    let next;if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(event.key)){const direction=['ArrowRight','ArrowDown'].includes(event.key)?1:-1;next=canvasTabs[(canvasTabs.indexOf(tab)+direction+canvasTabs.length)%canvasTabs.length];}else if(event.key==='Home')next=canvasTabs[0];else if(event.key==='End')next=canvasTabs.at(-1);else return;
    event.preventDefault();selectCanvas(next,true);
  });
}
const canvasHeading=()=>canvasView==='Artifacts'?document.getElementById('artifacts-panel'):canvasView==='Goals'?document.getElementById('goals-pane-heading')||document.getElementById('goals-panel'):canvasView==='Preview'?document.getElementById('preview-heading'):canvasView==='Settings'?document.getElementById('settings-heading'):document.getElementById('dashboard-heading')||document.getElementById('dashboard');
function syncNavigation(){
  const mobile=Boolean(mobileViewport?.matches);
  if(mobileBottom){const parent=mobile?mobileBottom:navigationHome;if(mobileNavigation.parentElement!==parent)parent.append(mobileNavigation);}
  leftPane.hidden=mobile&&workspace!=='left';leftPane.inert=leftPane.hidden;
  chat.inert=leftPane.hidden;
  preview.hidden=mobile?workspace!=='preview':!contextOpen;preview.inert=preview.hidden;
  shell.dataset.contextOpen=String(!preview.hidden);
  mobileProjectToggle?.setAttribute('aria-expanded',String(!preview.hidden));
  contextClose.setAttribute('aria-label',mobile?'Back to chat':'Close project panel');
  mobileNavigation.open=!mobile;
  contextToggle.setAttribute('aria-expanded',String(!preview.hidden));
  contextToggle.setAttribute('aria-label',preview.hidden?'Show project panel':'Hide project panel');
  contextToggle.setAttribute('title',preview.hidden?'Show project panel':'Hide project panel');
  previewToggle.setAttribute('aria-expanded',String(!preview.hidden));
  document.dispatchEvent(new Event('ned-context-layout'));
  if(mobile&&!preview.hidden)canvasTabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  document.getElementById('settings').hidden=canvasView!=='Settings'||preview.hidden;
  leftToggle.setAttribute('aria-pressed',String(workspace==='left'));
  previewToggle.setAttribute('aria-pressed',String(workspace==='preview'));
  const selected=workspace==='left'?'chat':canvasView.toLowerCase();
  for(const name of ['chat','goals','preview']){const button=document.getElementById(`mobile-${name}-nav`);if(button){if(name===selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}}
  if(mobile&&!['chat','goals','preview'].includes(selected))navigationToggle.setAttribute('aria-current','page');else navigationToggle.removeAttribute('aria-current');
}
document.addEventListener('ned-open-provider-settings',()=>{
  workspace='preview';mobileNavigation.open=false;
  selectCanvas(document.getElementById('workspace-settings-tab'),true);
});
const focusContextControl=()=> (mobileViewport?.matches?(mobileProjectToggle||navigationToggle):contextToggle).focus();
mobileProjectToggle?.addEventListener('click',()=>{workspace='preview';contextOpen=true;mobileNavigation.open=false;syncNavigation();canvasHeading().focus();});
function closeContext(){contextOpen=false;workspace='left';syncNavigation();focusContextControl();}
contextClose.addEventListener('click',closeContext);
contextToggle.addEventListener('click',()=>{
  if(!preview.hidden)closeContext();
  else{contextOpen=true;workspace='preview';syncNavigation();}
});
for(const [id,target] of [['goals-shortcut','goals-pane-tab'],['preview-shortcut','preview-tab'],['dashboard-shortcut','dashboard-tab'],['settings-shortcut','workspace-settings-tab'],['artifacts-shortcut','artifacts-pane-tab']]){
  document.getElementById(id)?.addEventListener('click',()=>{selectCanvas(document.getElementById(target),true);});
}
for(const [name,target] of [['goals','goals-pane-tab'],['preview','preview-tab']]){document.getElementById(`mobile-${name}-nav`)?.addEventListener('click',()=>selectCanvas(document.getElementById(target),true));}
document.getElementById('mobile-chat-nav')?.addEventListener('click',()=>leftToggle.click());
leftToggle.addEventListener('click',()=>{workspace='left';mobileNavigation.open=false;syncNavigation();chat.focus();});
document.getElementById('workspace-skip')?.addEventListener('click',()=>{workspace='preview';contextOpen=true;syncNavigation();preview.focus();});
previewToggle.addEventListener('click',()=>{workspace='preview';contextOpen=true;mobileNavigation.open=false;syncNavigation();canvasHeading().focus();});
document.getElementById('preview-retry').addEventListener('click',()=>{
  const next=state.projectId?beginDetail(state):beginLoad(state);if(next===state)return;
  previewRetryFocus=document.activeElement===document.getElementById('preview-retry');state=next;render();void(state.projectId?loadDetail():load());
});
mobileViewport?.addEventListener?.('change',()=>{
  const active=document.activeElement;
  const focusInBottom=Boolean(mobileBottom?.contains(active))||active===document.body&&bottomHadFocus;
  const focusInLeft=leftPane.contains(active),focusInPreview=preview.contains(active);
  // The disappearing menu can lose focus before the media-query event is delivered.
  const focusInMenu=mobileNavigation.contains(active)||active===document.body&&navigationHadFocus;
  const focusFromProject=active===mobileProjectToggle||active===document.body&&mobileProjectHadFocus;
  mobileNavigation.open=false;
  navigationHadFocus=false;mobileProjectHadFocus=false;
  if(mobileViewport.matches)workspace='left';
  syncNavigation();
  if(focusInBottom&&!mobileViewport.matches){(workspace==='left'?chat:canvasHeading()).focus();}
  else if(focusFromProject&&!mobileViewport.matches){chat.focus();}
  else if(focusInMenu&&!mobileViewport.matches&&active===document.body){
    const destination=workspace==='left'?chat:canvasHeading();
    destination.focus();
  }else if(leftPane.hidden&&focusInLeft||preview.hidden&&focusInPreview)focusContextControl();
});
if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>{if(!preview.hidden)canvasTabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.scrollIntoView?.({block:'nearest',inline:'nearest'});}).observe(canvasTabs[0].parentElement);}
syncNavigation();render();void load();
document.addEventListener('ned-auth-restored',()=>{workspaceStream?.close();workspaceStream=null;state=beginLoad(state);render();void load();});

let workspaceStream;
let taskSequence=0;
function startWorkspace(){
  if(workspaceStream||typeof EventSource!=='function')return;
  workspaceStream=new EventSource('/api/v1/workspace/events');
  workspaceStream.onmessage=event=>{
    let snapshot;
    try{snapshot=JSON.parse(event.data);if(snapshot.error||!Array.isArray(snapshot.projects)||snapshot.projects.some(row=>typeof row.id!=='string'||typeof row.name!=='string'))return;}catch{return;}
    const next=followTaskProject(state.projectId,taskSequence,snapshot);taskSequence=next.sequence;
    const changed=next.projectId!==state.projectId;
    state={...state,projects:snapshot.projects};
    project.dataset.name=snapshot.projects.find(row=>row.id===next.projectId)?.name||'';
    if(changed){project.value=next.projectId||'';project.dispatchEvent(new Event('change'));}
    else render();
    project.dispatchEvent(new Event('ned-work-refresh'));
  };
}

mountPreview({document});
